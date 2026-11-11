import { notFound } from "next/navigation";
import Shell from "@/components/Shell";
import { prisma } from "@/lib/prisma";
import { requireBuildingAccess } from "@/lib/auth";
import { money, MONTHS } from "@/lib/format";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inv = await prisma.invoice.findUnique({
    where: { id },
    include: { building: true, records: { include: { unit: true }, orderBy: { unit: { name: "asc" } } } },
  });
  if (!inv) notFound();
  const p = await requireBuildingAccess(inv.buildingId);
  const links: [string, string][] = p.role === "ADMIN" ? [["Admin panel", "/admin"]] : [["My buildings", "/operator"]];
  const utilitiesTotal = inv.records.reduce((sum, record) => sum + Number(record.utilities), 0);
  const rentTotal = Number(inv.totalRent) - utilitiesTotal;
  const isPaid = Number(inv.totalDue) === 0 && inv.records.length > 0;

  return (
    <Shell name={p.name} role={p.role} links={links}>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="flex flex-wrap justify-between gap-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">Invoice</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{inv.invoiceNo}</h1>
            <p className="mt-1 text-sm text-slate-600">{inv.building.name} ({inv.building.code})</p>
            {inv.building.address && <p className="text-sm text-slate-500">{inv.building.address}</p>}
          </div>
          <div className="text-right text-sm text-slate-500">
            <p className="font-semibold text-slate-300">Billing period</p>
            <p>{MONTHS[inv.month - 1]} {inv.year}</p>
            <p className="mt-1 text-xs">Created {inv.createdAt.toLocaleDateString("en-GB")}</p>
          </div>
        </div>
        <div className="mt-5 rounded-xl border border-teal-400/20 bg-teal-400/10 px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-teal-300">Transaction ID</p>
              <p className="mt-1 break-all font-mono text-sm text-teal-100">{inv.transactionId}</p>
              <p className="mt-1 text-xs text-slate-400">Use this ID to verify the invoice.</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${isPaid ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-300"}`}>
              {isPaid ? "Paid" : "Payment due"}
            </span>
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          {[
            ["Rent", money(rentTotal)],
            ["Utilities", money(utilitiesTotal)],
            ["Paid", money(inv.totalPaid)],
            ["Balance due", money(inv.totalDue)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-slate-950/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
              <p className="mt-2 text-lg font-bold text-slate-100">{value}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500"><tr>
            <th className="px-3 py-3">Flat</th><th className="px-3 py-3">Tenant</th><th className="px-3 py-3 text-right">Rent</th>
            <th className="px-3 py-3 text-right">Utilities</th><th className="px-3 py-3 text-right">Total</th>
            <th className="px-3 py-3 text-right">Advance used</th><th className="px-3 py-3 text-right">Paid</th><th className="px-3 py-3 text-right">Due</th><th className="px-3 py-3 text-right">Status</th>
          </tr></thead>
          <tbody>
            {inv.records.map((r) => (
              <tr key={r.id} className="border-b border-slate-100">
                <td className="px-3 py-3 font-semibold">{r.unit.name}</td>
                <td className="px-3 py-3">{r.unitStatus === "VACANT" ? "Vacant" : r.tenantName ?? r.unit.tenantName ?? "No tenant"}</td>
                <td className="px-3 py-3 text-right">{money(r.rentDue)}</td>
                <td className="px-3 py-3 text-right">{money(r.utilities)}</td>
                <td className="px-3 py-3 text-right font-medium">{money(Number(r.rentDue) + Number(r.utilities))}</td>
                <td className="px-3 py-3 text-right">{money(r.advanceApplied)}</td>
                <td className="px-3 py-3 text-right">{money(r.paid)}</td>
                <td className="px-3 py-3 text-right font-medium">{money(Math.max(Number(r.rentDue) + Number(r.utilities) - Number(r.paid), 0))}</td>
                <td className="px-3 py-3 text-right"><span className={`rounded-full px-2 py-1 text-xs font-semibold uppercase ${r.status === "PAID" ? "bg-emerald-400/15 text-emerald-300" : r.status === "PARTIAL" ? "bg-amber-400/15 text-amber-300" : "bg-red-400/15 text-red-300"}`}>{r.status.toLowerCase()}</span></td>
              </tr>
            ))}
          </tbody>
          <tfoot className="font-semibold"><tr>
            <td className="px-3 pt-4" colSpan={2}>Total</td>
            <td className="px-3 pt-4 text-right">{money(rentTotal)}</td>
            <td className="px-3 pt-4 text-right">{money(utilitiesTotal)}</td>
            <td className="px-3 pt-4 text-right">{money(inv.totalRent)}</td>
            <td className="px-3 pt-4 text-right">{money(inv.records.reduce((sum, record) => sum + Number(record.advanceApplied), 0))}</td>
            <td className="px-3 pt-4 text-right">{money(inv.totalPaid)}</td>
            <td className="px-3 pt-4 text-right">{money(inv.totalDue)}</td>
            <td />
          </tr></tfoot>
        </table>
        </div>
        <p className="no-print mt-4 text-xs text-slate-500">Print or save as PDF with Ctrl+P.</p>
      </div>
    </Shell>
  );
}
