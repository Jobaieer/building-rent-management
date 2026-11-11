import Shell from "@/components/Shell";
import { requireUser } from "@/lib/auth";

export default async function OperatorLayout({ children }: { children: React.ReactNode }) {
  const p = await requireUser();
  const links: [string, string][] = [["My buildings", "/operator"]];
  if (p.role === "ADMIN") links.push(["Admin panel", "/admin"]);
  return <Shell name={p.name} role={p.role} links={links}>{children}</Shell>;
}
