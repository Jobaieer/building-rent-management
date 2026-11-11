import { prisma } from "@/lib/prisma";
import { createOperator, assignOperator, unassignOperator, toggleOperator } from "@/lib/actions/admin";
import { inp, btn, btn2 } from "@/lib/format";

export default async function Operators() {
  const [ops, buildings] = await Promise.all([
    prisma.profile.findMany({
      where: { role: "OPERATOR" }, orderBy: { createdAt: "desc" },
      include: { assignments: { include: { building: true } } },
    }),
    prisma.building.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return (
    <>
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">Team</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Managers</h1>
        <p className="mt-1 text-sm text-slate-500">Add managers and choose which buildings they can manage.</p>
      </div>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">Add a manager</h2>
        <p className="mt-1 mb-4 text-sm text-slate-500">Create a secure account for a building manager.</p>
        <form action={createOperator} className="grid gap-3 sm:grid-cols-5">
          <input name="name" placeholder="Full name" required className={inp} />
          <input name="email" type="email" placeholder="Email" required className={inp} />
          <input name="phone" placeholder="Phone (optional)" className={inp} />
          <input name="password" type="password" minLength={10} placeholder="Password (min 10)" required autoComplete="new-password" className={inp} />
          <button className={btn}>Create manager</button>
        </form>
      </section>
      <div className="space-y-3">
        {ops.map((o) => (
          <div key={o.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <div className="font-semibold text-slate-900">{o.name} {!o.active && <span className="ml-2 rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700">Disabled</span>}</div>
                <div className="text-sm text-slate-600">{o.email}{o.phone ? `, ${o.phone}` : ""}</div>
              </div>
              <form action={toggleOperator} className="ml-auto">
                <input type="hidden" name="userId" value={o.id} />
                <button className={btn2}>{o.active ? "Disable" : "Enable"}</button>
              </form>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {o.assignments.map((a) => (
                <form key={a.id} action={unassignOperator} className="flex items-center gap-1 rounded-full bg-teal-50 px-3 py-1 text-sm text-teal-800">
                  <input type="hidden" name="assignmentId" value={a.id} />
                  {a.building.name}
                  <button aria-label={`Remove ${a.building.name}`} className="px-1 text-slate-500 hover:text-red-700">x</button>
                </form>
              ))}
              {o.assignments.length === 0 && <span className="text-sm text-slate-400">No buildings assigned.</span>}
            </div>
            <form action={assignOperator} className="mt-3 flex gap-2">
              <input type="hidden" name="userId" value={o.id} />
              <select name="buildingId" required className={inp + " max-w-xs"}>
                {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <button className={btn2}>Assign building</button>
            </form>
          </div>
        ))}
        {ops.length === 0 && <p className="text-sm text-slate-500">No operators yet.</p>}
      </div>
    </>
  );
}
