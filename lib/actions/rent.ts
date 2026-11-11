"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireBuildingAccess } from "@/lib/auth";

const period = z.object({
  buildingId: z.string().min(1),
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});
const amount = z.coerce.number().min(0).max(100000000).catch(0);
const optionalAmount = z.preprocess(
  (value) => value === "" || value === null || value === undefined ? null : value,
  z.coerce.number().min(0).max(100000000).nullable(),
);
const paymentOverride = z.enum(["UNPAID", "PARTIAL", "PAID"]).nullable();
const advanceMonths = z.coerce.number().int().min(0).max(24).catch(0);

export async function saveRent(fd: FormData) {
  const { buildingId, year, month } = period.parse(Object.fromEntries(fd));
  const user = await requireBuildingAccess(buildingId);
  // Units come from DB for THIS building only; client-sent unit ids are never trusted.
  const units = await prisma.unit.findMany({ where: { buildingId } });
  const savedRecords = await prisma.rentRecord.findMany({
    where: { year, month, unit: { buildingId } },
    select: { unitId: true },
  });
  const savedUnitIds = new Set(savedRecords.map((record) => record.unitId));
  const editableUnits = user.role === "ADMIN"
    ? units
    : units.filter((unit) => !savedUnitIds.has(unit.id));

  const ops = editableUnits.flatMap((u) => {
    const occupied = fd.get(`status_${u.id}`) === "OCCUPIED";
    const tenant = String(fd.get(`tenant_${u.id}`) ?? "").trim().slice(0, 80) || null;
    const negotiatedRent = optionalAmount.parse(fd.get(`negotiated_${u.id}`));
    const rentDue = occupied ? negotiatedRent ?? Number(u.baseRent) : 0;
    const utilities = occupied ? amount.parse(fd.get(`util_${u.id}`)) : 0;
    const enteredPaid = occupied ? amount.parse(fd.get(`paid_${u.id}`)) : 0;
    const total = rentDue + utilities;
    const isNewRecord = !savedUnitIds.has(u.id);
    const newAdvanceMonths = occupied && isNewRecord ? advanceMonths.parse(fd.get(`advanceMonths_${u.id}`)) : 0;
    const advanceDeposit = rentDue * newAdvanceMonths;
    const availableAdvance = Number(u.advanceBalance) + advanceDeposit;
    const advanceApplied = occupied ? Math.min(availableAdvance, total) : 0;
    const remainingAdvance = Math.max(availableAdvance - advanceApplied, 0);
    const override = user.role === "ADMIN" ? paymentOverride.parse(fd.get(`payment_${u.id}`) || null) : null;
    const paid = override === "PAID" ? total : override === "UNPAID" ? 0 : Math.min(total, enteredPaid + advanceApplied);
    const status = override ?? (!occupied || paid <= 0 ? "UNPAID" : paid >= total ? "PAID" : "PARTIAL");
    const unitStatus = occupied ? "OCCUPIED" : "VACANT";
    return [
      prisma.unit.update({
        where: { id: u.id },
        data: { status: unitStatus, tenantName: occupied ? tenant : null, advanceBalance: remainingAdvance },
      }),
      prisma.rentRecord.upsert({
        where: { unitId_year_month: { unitId: u.id, year, month } },
        create: { unitId: u.id, year, month, unitStatus, tenantName: tenant, rentDue, utilities, advanceApplied, paid, status, createdById: user.id },
        update: { unitStatus, tenantName: tenant, rentDue, utilities, paid, status },
      }),
    ];
  });
  await prisma.$transaction(ops);
  revalidatePath(`/operator/buildings/${buildingId}`);
}

export async function generateInvoice(fd: FormData) {
  const { buildingId, year, month } = period.parse(Object.fromEntries(fd));
  await requireBuildingAccess(buildingId);
  const building = await prisma.building.findUniqueOrThrow({ where: { id: buildingId } });
  const records = await prisma.rentRecord.findMany({ where: { year, month, unit: { buildingId } } });
  if (records.length === 0) throw new Error("Save rent entries for this month first.");

  const totalRent = records.reduce((s, r) => s + Number(r.rentDue) + Number(r.utilities), 0);
  const totalPaid = records.reduce((s, r) => s + Number(r.paid), 0);
  const exp = await prisma.expense.aggregate({ where: { buildingId, year, month }, _sum: { amount: true } });
  const data = {
    totalRent, totalPaid, totalDue: Math.max(totalRent - totalPaid, 0),
    totalExpense: Number(exp._sum.amount ?? 0),
  };
  const invoiceNo = `${building.code}-${year}-${String(month).padStart(2, "0")}`;
  const invoice = await prisma.invoice.upsert({
    where: { buildingId_year_month: { buildingId, year, month } },
    create: { invoiceNo, buildingId, year, month, ...data },
    update: data,
  });
  await prisma.rentRecord.updateMany({
    where: { year, month, unit: { buildingId } },
    data: { invoiceId: invoice.id },
  });
  redirect(`/invoices/${invoice.id}`);
}
