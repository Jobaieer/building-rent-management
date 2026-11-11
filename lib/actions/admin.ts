"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function createBuilding(fd: FormData) {
  await requireAdmin();
  const d = z.object({
    name: z.string().trim().min(2).max(80),
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{2,8}$/),
    address: z.string().trim().max(200).optional(),
  }).parse(Object.fromEntries(fd));
  await prisma.building.create({ data: d });
  revalidatePath("/admin");
}

export async function updateBuilding(fd: FormData) {
  await requireAdmin();
  const d = z.object({
    id: z.string().min(1),
    name: z.string().trim().min(2).max(80),
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{2,8}$/),
    address: z.string().trim().max(200).optional(),
  }).parse(Object.fromEntries(fd));
  await prisma.building.update({
    where: { id: d.id },
    data: { name: d.name, code: d.code, address: d.address || null },
  });
  revalidatePath("/admin");
  revalidatePath(`/admin/buildings/${d.id}`);
}

export async function deleteBuilding(fd: FormData) {
  await requireAdmin();
  const id = z.string().min(1).parse(fd.get("buildingId"));
  await prisma.building.delete({ where: { id } });
  revalidatePath("/admin");
  redirect("/admin");
}

export async function createUnit(fd: FormData) {
  await requireAdmin();
  const d = z.object({
    buildingId: z.string().min(1),
    name: z.string().trim().min(1).max(20),
    baseRent: z.coerce.number().min(0).max(100000000),
  }).parse(Object.fromEntries(fd));
  await prisma.unit.create({ data: d });
  revalidatePath(`/admin/buildings/${d.buildingId}`);
}

export async function createExpense(fd: FormData) {
  await requireAdmin();
  const d = z.object({
    buildingId: z.string().min(1),
    year: z.coerce.number().int().min(2000).max(2100),
    month: z.coerce.number().int().min(1).max(12),
    category: z.string().trim().min(2).max(60),
    amount: z.coerce.number().positive().max(100000000),
    note: z.string().trim().max(200).optional(),
  }).parse(Object.fromEntries(fd));
  await prisma.expense.create({
    data: {
      buildingId: d.buildingId,
      year: d.year,
      month: d.month,
      category: d.category,
      amount: d.amount,
      note: d.note || null,
    },
  });
  const invoice = await prisma.invoice.findUnique({
    where: { buildingId_year_month: { buildingId: d.buildingId, year: d.year, month: d.month } },
  });
  if (invoice) {
    const total = await prisma.expense.aggregate({
      where: { buildingId: d.buildingId, year: d.year, month: d.month },
      _sum: { amount: true },
    });
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { totalExpense: total._sum.amount ?? 0 },
    });
  }
  revalidatePath(`/admin/buildings/${d.buildingId}`);
  revalidatePath("/admin");
}

export async function deleteExpense(fd: FormData) {
  await requireAdmin();
  const id = z.string().min(1).parse(fd.get("expenseId"));
  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense) throw new Error("Expense not found");
  await prisma.expense.delete({ where: { id } });
  const invoice = await prisma.invoice.findUnique({
    where: {
      buildingId_year_month: {
        buildingId: expense.buildingId,
        year: expense.year,
        month: expense.month,
      },
    },
  });
  if (invoice) {
    const total = await prisma.expense.aggregate({
      where: { buildingId: expense.buildingId, year: expense.year, month: expense.month },
      _sum: { amount: true },
    });
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { totalExpense: total._sum.amount ?? 0 },
    });
  }
  revalidatePath(`/admin/buildings/${expense.buildingId}`);
  revalidatePath("/admin");
}

export async function createOperator(fd: FormData) {
  await requireAdmin();
  const d = z.object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().email().max(200),
    phone: z.string().trim().max(30).optional(),
    password: z.string().min(10).max(100),
  }).parse(Object.fromEntries(fd));
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: d.email, password: d.password, email_confirm: true,
  });
  if (error || !data.user) throw new Error(error?.message ?? "Could not create user");
  try {
    await prisma.profile.create({
      data: { id: data.user.id, name: d.name, email: d.email, phone: d.phone || null, role: "OPERATOR" },
    });
  } catch (e) {
    await supabaseAdmin.auth.admin.deleteUser(data.user.id); // rollback
    throw e;
  }
  revalidatePath("/admin/operators");
}

export async function assignOperator(fd: FormData) {
  await requireAdmin();
  const d = z.object({ userId: z.string().min(1), buildingId: z.string().min(1) }).parse(Object.fromEntries(fd));
  const op = await prisma.profile.findFirst({ where: { id: d.userId, role: "OPERATOR" } });
  if (!op) throw new Error("Operator not found");
  await prisma.buildingAssignment.upsert({
    where: { userId_buildingId: d },
    create: d,
    update: {},
  });
  revalidatePath("/admin/operators");
  revalidatePath(`/admin/buildings/${d.buildingId}`);
}

export async function unassignOperator(fd: FormData) {
  await requireAdmin();
  const id = z.string().min(1).parse(fd.get("assignmentId"));
  await prisma.buildingAssignment.delete({ where: { id } });
  revalidatePath("/admin/operators");
}

export async function toggleOperator(fd: FormData) {
  await requireAdmin();
  const id = z.string().min(1).parse(fd.get("userId"));
  const op = await prisma.profile.findFirst({ where: { id, role: "OPERATOR" } });
  if (!op) throw new Error("Operator not found");
  const active = !op.active;
  await prisma.profile.update({ where: { id }, data: { active } });
  // Ban/unban at Supabase so existing sessions stop refreshing
  await supabaseAdmin.auth.admin.updateUserById(id, { ban_duration: active ? "none" : "876000h" });
  revalidatePath("/admin/operators");
}
