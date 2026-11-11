import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export const getProfile = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return prisma.profile.findUnique({ where: { id: user.id } });
});

export async function requireUser() {
  const p = await getProfile();
  if (!p || !p.active) redirect("/login");
  return p;
}

export async function requireAdmin() {
  const p = await requireUser();
  if (p.role !== "ADMIN") redirect("/operator");
  return p;
}

// Admin: any building. Operator: only assigned buildings.
export async function requireBuildingAccess(buildingId: string) {
  const p = await requireUser();
  if (p.role === "ADMIN") return p;
  const a = await prisma.buildingAssignment.findUnique({
    where: { userId_buildingId: { userId: p.id, buildingId } },
  });
  if (!a) notFound(); // 404, do not reveal that the building exists
  return p;
}
