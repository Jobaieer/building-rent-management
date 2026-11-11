import Shell from "@/components/Shell";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const p = await requireAdmin();
  return (
    <Shell name={p.name} role={p.role} links={[["Buildings", "/admin"], ["Managers", "/admin/operators"]]}>
      {children}
    </Shell>
  );
}
