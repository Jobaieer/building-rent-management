import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createExpense, createUnit, deleteBuilding, deleteExpense, updateBuilding } from "@/lib/actions/admin";
import { inp, btn, btn2, money, MONTHS } from "@/lib/format";

export default async function AdminBuilding({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await prisma.building.findUnique({
    where: { id },
    include: {
      units: { orderBy: { name: "asc" } },
      assignments: { include: { user: true } },
      invoices: { orderBy: [{ year: "desc" }, { month: "desc" }] },
      expenses: { orderBy: [{ year: "desc" }, { month: "desc" }, { category: "asc" }] },
    },
  });
  if (!b) notFound();
  const totalCollected = b.invoices.reduce((sum, invoice) => sum + Number(invoice.totalPaid), 0);
  const totalOutstanding = b.invoices.reduce((sum, invoice) => sum + Number(invoice.totalDue), 0);
  const totalExpenses = b.expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const netEarning = totalCollected - totalExpenses;
  const occupancyRate = b.units.length ? Math.round((b.units.filter((unit) => unit.status === "OCCUPIED").length / b.units.length) * 100) : 0;
  const collectionRate = totalCollected + totalOutstanding > 0
    ? Math.round((totalCollected / (totalCollected + totalOutstanding)) * 100)
    : 0;
  const expenseCategories = Object.entries(b.expenses.reduce<Record<string, number>>((summary, expense) => {
    summary[expense.category] = (summary[expense.category] ?? 0) + Number(expense.amount);
    return summary;
  }, {})).sort(([, a], [, z]) => z - a);
  return (
    <>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">Property</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{b.name} <span className="font-normal text-slate-400">({b.code})</span></h1>
        </div>
        <Link className={btn2} href={`/operator/buildings/${b.id}`}>Open rent entry</Link>
      </div>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Property details</h2>
          <p className="mt-1 text-sm text-slate-500">Update the building information or remove this property.</p>
        </div>
        <form action={updateBuilding} className="grid gap-3 sm:grid-cols-4">
          <input type="hidden" name="id" value={b.id} />
          <input name="name" defaultValue={b.name} required className={inp} />
          <input name="code" defaultValue={b.code} required className={inp} />
          <input name="address" defaultValue={b.address ?? ""} placeholder="Address (optional)" className={inp} />
          <button className={btn}>Save changes</button>
        </form>
        <form action={deleteBuilding} className="mt-3">
          <input type="hidden" name="buildingId" value={b.id} />
          <button className="text-sm font-medium text-red-400 hover:text-red-300">Remove this building</button>
        </form>
      </section>
      <p className="rounded-xl border border-teal-100 bg-teal-50/60 px-4 py-3 text-sm text-teal-900">
        <span className="font-semibold">Managers:</span> {b.assignments.length ? b.assignments.map((a) => a.user.name).join(", ") : "none assigned"}
      </p>
      <section className="grid gap-4 sm:grid-cols-6">
        {[
          ["Collected", totalCollected, "Money received"],
          ["Outstanding", totalOutstanding, "Still to collect"],
          ["Expenses", totalExpenses, "Recorded costs"],
          ["Net earning", netEarning, "Collected minus expenses"],
          ["Occupancy", `${occupancyRate}%`, "Currently rented"],
          ["Collection", `${collectionRate}%`, "Rent successfully collected"],
        ].map(([label, value, hint]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{label}</p>
            <p className={`mt-2 text-2xl font-bold tracking-tight ${label === "Net earning" && Number(value) < 0 ? "text-red-600" : "text-slate-900"}`}>{money(value)}</p>
            <p className="mt-1 text-xs text-slate-400">{hint}</p>
          </div>
        ))}
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Expense by category</h2>
          <p className="mt-1 text-sm text-slate-500">Where this building&apos;s operating cost goes.</p>
          <div className="mt-4 space-y-3">
            {expenseCategories.map(([category, value]) => (
              <div key={category}>
                <div className="mb-1 flex justify-between text-sm"><span className="font-medium text-slate-700">{category}</span><span className="text-slate-500">{money(value)}</span></div>
                <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-amber-400" style={{ width: `${totalExpenses ? (value / totalExpenses) * 100 : 0}%` }} /></div>
              </div>
            ))}
            {expenseCategories.length === 0 && <p className="text-sm text-slate-500">No expense data yet.</p>}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Management indicators</h2>
          <div className="mt-4 space-y-4 text-sm">
            <div><div className="mb-1 flex justify-between"><span className="text-slate-600">Occupancy</span><span className="font-semibold">{occupancyRate}%</span></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-teal-500" style={{ width: `${occupancyRate}%` }} /></div></div>
            <div><div className="mb-1 flex justify-between"><span className="text-slate-600">Rent collection</span><span className="font-semibold">{collectionRate}%</span></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-teal-500" style={{ width: `${collectionRate}%` }} /></div></div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Flats</h2>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500"><tr>
              <th className="p-4 font-semibold">Flat</th><th className="p-4 font-semibold">Status</th><th className="p-4 font-semibold">Tenant</th><th className="p-4 text-right font-semibold">Base rent</th>
            </tr></thead>
            <tbody>
              {b.units.map((u) => (
                <tr key={u.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="p-4 font-medium">{u.name}</td>
                  <td className="p-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${u.status === "OCCUPIED" ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-600"}`}>{u.status === "OCCUPIED" ? "Rented" : "Vacant"}</span></td>
                  <td className="p-4 text-slate-600">{u.tenantName ?? "-"}</td>
                  <td className="p-4 text-right font-medium">{money(u.baseRent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form action={createUnit} className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-4">
          <input type="hidden" name="buildingId" value={b.id} />
          <input name="name" placeholder="Flat name (e.g. 2A)" required className={inp} />
          <input name="baseRent" type="number" min="0" step="0.01" placeholder="Base rent" required className={inp} />
          <button className={btn}>Add flat</button>
        </form>
      </section>

      <section>
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-slate-900">Operating expenses</h2>
          <p className="mt-1 text-sm text-slate-500">Track repairs, utilities, staff costs, and other building expenses to see real profit.</p>
        </div>
        <form action={createExpense} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-6">
          <input type="hidden" name="buildingId" value={b.id} />
          <input name="year" type="number" defaultValue={new Date().getFullYear()} min="2000" max="2100" required className={inp} />
          <select name="month" defaultValue={new Date().getMonth() + 1} className={inp}>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <input name="category" placeholder="Category (e.g. Repair)" required className={inp} />
          <input name="amount" type="number" min="0.01" step="0.01" placeholder="Amount" required className={inp} />
          <input name="note" placeholder="Short note (optional)" className={inp} />
          <button className={btn}>Add expense</button>
        </form>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500"><tr>
              <th className="p-4 font-semibold">Month</th><th className="p-4 font-semibold">Category</th><th className="p-4 font-semibold">Note</th><th className="p-4 text-right font-semibold">Amount</th><th className="p-4 text-right font-semibold">Action</th>
            </tr></thead>
            <tbody>
              {b.expenses.map((expense) => (
                <tr key={expense.id} className="border-t border-slate-100">
                  <td className="p-4">{MONTHS[expense.month - 1]} {expense.year}</td>
                  <td className="p-4 font-medium">{expense.category}</td>
                  <td className="p-4 text-slate-500">{expense.note ?? "-"}</td>
                  <td className="p-4 text-right font-medium">{money(expense.amount)}</td>
                  <td className="p-4 text-right">
                    <form action={deleteExpense}><input type="hidden" name="expenseId" value={expense.id} /><button className="text-sm font-medium text-red-500 hover:text-red-700">Delete</button></form>
                  </td>
                </tr>
              ))}
              {b.expenses.length === 0 && <tr><td className="p-4 text-slate-500" colSpan={5}>No expenses recorded yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Invoices</h2>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500"><tr>
              <th className="p-4 font-semibold">Invoice</th><th className="p-4 font-semibold">Month</th><th className="p-4 text-right font-semibold">Billed</th>
              <th className="p-4 text-right font-semibold">Collected</th><th className="p-4 text-right font-semibold">Due</th><th className="p-4 text-right font-semibold">Expense</th>
            </tr></thead>
            <tbody>
              {b.invoices.map((i) => (
                <tr key={i.id} className="border-t border-slate-200">
                  <td className="p-2"><Link className="text-teal-700 underline" href={`/invoices/${i.id}`}>{i.invoiceNo}</Link></td>
                  <td className="p-2">{MONTHS[i.month - 1]} {i.year}</td>
                  <td className="p-2 text-right">{money(i.totalRent)}</td>
                  <td className="p-2 text-right">{money(i.totalPaid)}</td>
                  <td className="p-2 text-right">{money(i.totalDue)}</td>
                  <td className="p-2 text-right">{money(i.totalExpense)}</td>
                </tr>
              ))}
              {b.invoices.length === 0 && <tr><td className="p-3 text-slate-500" colSpan={6}>No invoices yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
