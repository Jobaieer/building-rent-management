import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export default async function OperatorHome() {
  const p = await requireUser();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const buildings = await prisma.building.findMany({
    where: p.role === "ADMIN" ? {} : { assignments: { some: { userId: p.id } } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      _count: { select: { units: true } },
      units: {
        select: {
          records: { where: { year, month }, select: { status: true, paid: true, rentDue: true, utilities: true } },
        },
      },
    },
  });
  const totalFlats = buildings.reduce((sum, building) => sum + building._count.units, 0);
  const savedRecords = buildings.reduce((sum, building) => sum + building.units.filter((unit) => unit.records.length).length, 0);
  const paidRecords = buildings.reduce((sum, building) => sum + building.units.filter((unit) => unit.records[0]?.status === "PAID").length, 0);
  const totalDue = buildings.reduce((sum, building) => sum + building.units.reduce((unitSum, unit) => {
    const record = unit.records[0];
    return unitSum + (record ? Math.max(Number(record.rentDue) + Number(record.utilities) - Number(record.paid), 0) : 0);
  }, 0), 0);
  return (
    <>
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">Buildings</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">My buildings</h1>
        <p className="mt-1 text-sm text-slate-500">Manage rent entries for {month}/{year} and keep collection up to date.</p>
      </div>
      <section className="grid gap-4 sm:grid-cols-4">
        {[
          ["Buildings", buildings.length.toString(), "Assigned properties"],
          ["Monthly progress", `${savedRecords} / ${totalFlats}`, "Flats with saved entries"],
          ["Paid flats", paidRecords.toString(), "Marked as paid"],
          ["Total due", totalDue.toLocaleString("en-BD", { maximumFractionDigits: 2 }), "Outstanding this month"],
        ].map(([label, value, hint]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
            <p className="mt-1 text-xs text-slate-400">{hint}</p>
          </div>
        ))}
      </section>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {buildings.map((b) => (
          <Link key={b.id} href={`/operator/buildings/${b.id}?year=${year}&month=${month}`} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-slate-900">{b.name}</div>
                <div className="mt-1 text-sm text-slate-500">{b._count.units} flats · {b.units.filter((unit) => unit.records.length).length} saved</div>
              </div>
              <span className="text-lg text-slate-300 transition group-hover:translate-x-1 group-hover:text-teal-700">→</span>
            </div>
            <div className="mt-4 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-teal-500" style={{ width: `${b._count.units ? (b.units.filter((unit) => unit.records.length).length / b._count.units) * 100 : 0}%` }} /></div>
            <p className="mt-2 text-xs text-slate-500">{b._count.units ? Math.round((b.units.filter((unit) => unit.records.length).length / b._count.units) * 100) : 0}% monthly entry complete</p>
          </Link>
        ))}
        {buildings.length === 0 && <p className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6 text-sm text-slate-500">No building assigned yet. Ask the admin to assign one.</p>}
      </div>
    </>
  );
}
