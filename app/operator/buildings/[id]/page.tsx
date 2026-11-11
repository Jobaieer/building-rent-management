import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireBuildingAccess } from "@/lib/auth";
import { saveRent, generateInvoice } from "@/lib/actions/rent";
import { inp, btn, btn2, MONTHS } from "@/lib/format";

export default async function RentEntry({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireBuildingAccess(id);
  const isAdmin = user.role === "ADMIN";
  const now = new Date();
  const year = Number(sp.year) || now.getFullYear();
  const month = Math.min(Math.max(Number(sp.month) || now.getMonth() + 1, 1), 12);

  const b = await prisma.building.findUnique({
    where: { id },
    include: { units: { orderBy: { name: "asc" }, include: { records: { where: { year, month } } } } },
  });
  if (!b) notFound();
  const invoice = await prisma.invoice.findUnique({ where: { buildingId_year_month: { buildingId: id, year, month } } });
  const hasRecords = b.units.some((unit) => unit.records.length > 0);
  const hasEditableRows = isAdmin || b.units.some((unit) => unit.records.length === 0);

  return (
    <>
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">Monthly rent</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{b.name}</h1>
        <p className="mt-1 text-sm text-slate-500">Enter rent, payment details, and create the invoice.</p>
        <p className="mt-2 text-xs text-slate-500">{b.units.length} flats - flat count and base rent are managed by admin.</p>
      </div>
      <form className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" method="get">
        <label className="text-sm font-medium text-slate-700">Month
          <select name="month" defaultValue={month} className={inp}>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">Year
          <input name="year" type="number" defaultValue={year} className={inp + " w-24"} />
        </label>
        <button className={btn2}>Show month</button>
        {invoice && <Link className="text-sm font-medium text-teal-700 hover:text-teal-900" href={`/invoices/${invoice.id}`}>View invoice {invoice.invoiceNo} →</Link>}
      </form>
      {!isAdmin && (
        <p className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          You can submit each flat once for this month. Saved rows can only be updated by an admin.
        </p>
      )}

      <form action={saveRent} className="space-y-3">
        <input type="hidden" name="buildingId" value={id} />
        <input type="hidden" name="year" value={year} />
        <input type="hidden" name="month" value={month} />
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500"><tr>
              <th className="p-4 font-semibold">Flat</th><th className="p-4 font-semibold">Status</th><th className="p-4 font-semibold">Tenant</th>
              <th className="p-4 font-semibold">Base rent</th><th className="p-4 font-semibold">Agreed rent</th><th className="p-4 font-semibold">Rent to charge</th>
              <th className="p-4 font-semibold">Advance months</th><th className="p-4 font-semibold">Advance balance</th><th className="p-4 font-semibold">Utilities</th><th className="p-4 font-semibold">Paid</th><th className="p-4 font-semibold">Payment status</th><th className="p-4 font-semibold">Invoice</th>
            </tr></thead>
            <tbody>
              {b.units.map((u) => {
                const r = u.records[0];
                const st = r?.unitStatus ?? u.status;
                const editable = isAdmin || !r;
                return (
                  <tr key={`${u.id}-${year}-${month}`} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="p-4 font-semibold">{u.name}</td>
                    <td className="p-4">
                      <select name={`status_${u.id}`} defaultValue={st} disabled={!editable} className={inp}>
                        <option value="OCCUPIED">Rented</option>
                        <option value="VACANT">Vacant</option>
                      </select>
                    </td>
                    <td className="p-4"><input name={`tenant_${u.id}`} disabled={!editable} defaultValue={u.tenantName ?? ""} className={inp} /></td>
                    <td className="p-4 font-medium text-slate-400">{Number(u.baseRent).toLocaleString("en-BD", { maximumFractionDigits: 2 })}</td>
                    <td className="p-4"><input name={`negotiated_${u.id}`} disabled={!editable} type="number" min="0" step="0.01" placeholder="Leave blank for base" defaultValue={r ? Number(r.rentDue) : ""} className={inp + " w-28"} /></td>
                    <td className="p-4 font-semibold text-teal-300">{Number(r?.rentDue ?? u.baseRent).toLocaleString("en-BD", { maximumFractionDigits: 2 })}</td>
                    <td className="p-4"><input name={`advanceMonths_${u.id}`} disabled={!editable || Boolean(r)} type="number" min="0" max="24" step="1" placeholder="0" className={inp + " w-24"} /></td>
                    <td className="p-4 font-medium text-amber-600">{Number(u.advanceBalance).toLocaleString("en-BD", { maximumFractionDigits: 2 })}</td>
                    <td className="p-4"><input name={`util_${u.id}`} disabled={!editable} type="number" min="0" step="0.01" defaultValue={Number(r?.utilities ?? 0)} className={inp + " w-24"} /></td>
                    <td className="p-4"><input name={`paid_${u.id}`} disabled={!editable} type="number" min="0" step="0.01" defaultValue={Number(r?.paid ?? 0)} className={inp + " w-28"} /></td>
                    <td className="p-4">
                      {isAdmin ? (
                        <select name={`payment_${u.id}`} defaultValue={r?.status ?? "UNPAID"} className={inp}>
                          <option value="UNPAID">Unpaid</option>
                          <option value="PARTIAL">Partial</option>
                          <option value="PAID">Paid</option>
                        </select>
                      ) : (
                        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{r?.status?.toLowerCase() ?? "not saved"}</span>
                      )}
                    </td>
                    <td className="p-4 text-xs font-medium uppercase tracking-wide text-slate-500">
                      {r ? (
                        <span className="inline-flex flex-col gap-1">
                          <span>{r.status.toLowerCase()} - {isAdmin ? "admin editable" : "locked"}</span>
                          {invoice ? (
                            <Link className="normal-case tracking-normal text-teal-700 hover:text-teal-900" href={`/invoices/${invoice.id}`}>View invoice</Link>
                          ) : (
                            <span className="normal-case tracking-normal text-slate-400">Not invoiced</span>
                          )}
                        </span>
                      ) : "not saved"}
                    </td>
                  </tr>
                );
              })}
              {b.units.length === 0 && <tr><td className="p-3 text-slate-500" colSpan={12}>No flats in this building yet.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500">Advance months is added only when saving a new month. The balance automatically pays future rent.</p>
        <button disabled={!hasEditableRows} className={btn}>{isAdmin ? "Save month" : "Save available flats"}</button>
      </form>

      <form action={generateInvoice}>
        <input type="hidden" name="buildingId" value={id} />
        <input type="hidden" name="year" value={year} />
        <input type="hidden" name="month" value={month} />
        {!hasRecords && (
          <p className="mb-2 text-sm text-amber-300">
            Save this month&apos;s rent first, then create the invoice.
          </p>
        )}
        <button disabled={!hasRecords} className={btn2}>
          {invoice ? "Update invoice" : "Create invoice"} for {MONTHS[month - 1]} {year}
        </button>
      </form>
    </>
  );
}
