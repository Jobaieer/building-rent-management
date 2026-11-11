import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createBuilding, deleteBuilding } from "@/lib/actions/admin";
import { inp, btn, money, MONTHS } from "@/lib/format";

export default async function AdminHome() {
  const buildings = await prisma.building.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { units: true } },
      units: { where: { status: "OCCUPIED" }, select: { id: true } },
      invoices: {
        orderBy: [{ year: "desc" }, { month: "desc" }],
        select: { id: true, invoiceNo: true, year: true, month: true, totalPaid: true, totalDue: true, totalExpense: true },
      },
      expenses: { select: { year: true, month: true, amount: true } },
    },
  });
  const totalUnits = buildings.reduce((sum, building) => sum + building._count.units, 0);
  const occupiedUnits = buildings.reduce((sum, building) => sum + building.units.length, 0);
  const outstanding = buildings.reduce((sum, building) => sum + Number(building.invoices[0]?.totalDue ?? 0), 0);
  const currentYear = new Date().getFullYear();
  const monthly = MONTHS.map((name, index) => {
    const month = index + 1;
    const invoices = buildings.flatMap((building) => building.invoices).filter((invoice) => invoice.year === currentYear && invoice.month === month);
    const expenses = buildings.flatMap((building) => building.expenses).filter((expense) => expense.year === currentYear && expense.month === month);
    const collected = invoices.reduce((sum, invoice) => sum + Number(invoice.totalPaid), 0);
    const due = invoices.reduce((sum, invoice) => sum + Number(invoice.totalDue), 0);
    const cost = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
    return { name, collected, due, cost, net: collected - cost };
  });
  const maxMonthlyValue = Math.max(...monthly.map((item) => Math.max(item.collected, item.cost, 1)));
  return (
    <>
      <section className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">Overview</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Buildings</h1>
          <p className="mt-1 text-sm text-slate-500">See your buildings and the latest rent updates.</p>
        </div>
        <span className="text-sm text-slate-500">{buildings.length} {buildings.length === 1 ? "building" : "buildings"}</span>
      </section>
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ["Total buildings", buildings.length.toString(), "Buildings you manage"],
          ["Occupied flats", `${occupiedUnits} / ${totalUnits}`, "Current occupancy"],
          ["Outstanding", money(outstanding), "Latest invoice totals"],
        ].map(([label, value, hint]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
            <p className="mt-1 text-xs text-slate-400">{hint}</p>
          </div>
        ))}
      </section>
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Your buildings</h2>
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Latest activity</span>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500"><tr>
              <th className="p-4 font-semibold">Building</th><th className="p-4 font-semibold">Flats</th><th className="p-4 font-semibold">Occupied</th>
              <th className="p-4 font-semibold">Latest invoice</th><th className="p-4 text-right font-semibold">Due</th><th className="p-4 text-right font-semibold">Actions</th>
            </tr></thead>
            <tbody>
              {buildings.map((b) => {
                const inv = b.invoices[0];
                return (
                  <tr key={b.id} className="border-t border-slate-100 hover:bg-teal-50/40">
                    <td className="p-4"><Link className="font-semibold text-teal-700 hover:text-teal-900" href={`/admin/buildings/${b.id}`}>{b.name} <span className="font-normal text-slate-400">({b.code})</span></Link></td>
                    <td className="p-4 text-slate-600">{b._count.units}</td>
                    <td className="p-4"><span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">{b.units.length}</span></td>
                    <td className="p-4">{inv ? <Link className="text-slate-600 hover:text-teal-700" href={`/invoices/${inv.id}`}>{inv.invoiceNo} <span className="text-slate-400">({MONTHS[inv.month - 1]} {inv.year})</span></Link> : <span className="text-slate-400">None yet</span>}</td>
                    <td className="p-4 text-right font-medium text-slate-700">{inv ? money(inv.totalDue) : "-"}</td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <Link className="text-sm font-medium text-teal-700 hover:text-teal-900" href={`/admin/buildings/${b.id}`}>Edit</Link>
                        <form action={deleteBuilding}>
                          <input type="hidden" name="buildingId" value={b.id} />
                          <button className="text-sm font-medium text-red-400 hover:text-red-300">Remove</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {buildings.length === 0 && <tr><td className="p-5 text-slate-500" colSpan={6}>No buildings yet. Add the first one below.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Earning overview</h2>
            <p className="mt-1 text-sm text-slate-500">Collected rent, expenses, and net earning for {currentYear}.</p>
          </div>
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Monthly view</span>
        </div>
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
          {monthly.map((item) => (
            <div key={item.name} className="flex min-w-0 flex-col items-center gap-2">
              <div className="flex h-32 w-full items-end justify-center gap-1 rounded-lg bg-slate-50 p-1">
                <div title={`Collected ${money(item.collected)}`} className="w-1/2 rounded-t bg-teal-500" style={{ height: `${Math.max((item.collected / maxMonthlyValue) * 100, item.collected ? 4 : 0)}%` }} />
                <div title={`Expenses ${money(item.cost)}`} className="w-1/2 rounded-t bg-amber-400" style={{ height: `${Math.max((item.cost / maxMonthlyValue) * 100, item.cost ? 4 : 0)}%` }} />
              </div>
              <span className="text-xs text-slate-500">{item.name}</span>
              <span className={`text-[10px] font-semibold ${item.net < 0 ? "text-red-600" : "text-slate-500"}`}>{money(item.net)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
          <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-teal-500" />Collected</span>
          <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-400" />Expenses</span>
        </div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">Add a building</h2>
        <p className="mt-1 mb-4 text-sm text-slate-500">Add a building to start tracking flats and rent.</p>
        <form action={createBuilding} className="grid gap-3 sm:grid-cols-4">
          <input name="name" placeholder="Building name" required className={inp} />
          <input name="code" placeholder="Code (e.g. B1)" required className={inp} />
          <input name="address" placeholder="Address (optional)" className={inp} />
          <button className={btn}>Add building</button>
        </form>
      </section>
    </>
  );
}
