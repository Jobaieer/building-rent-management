import Link from "next/link";
import { logout } from "@/app/login/actions";
import { btn2 } from "@/lib/format";

export default function Shell({ name, role, links, children }: {
  name: string; role: string; links: [string, string][]; children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-10 border-b border-slate-800/80 bg-slate-950/75 shadow-lg shadow-black/10 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="mr-2 flex items-center gap-2.5 text-base font-bold tracking-tight text-slate-100">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 text-sm font-black text-slate-950 shadow-lg shadow-teal-500/20">R</span>
            <span>Rent Manager</span>
          </Link>
          <nav className="order-3 flex w-full gap-1 border-t border-slate-800/80 pt-2 text-sm sm:order-none sm:w-auto sm:border-0 sm:pt-0">
            {links.map(([label, href]) => (
              <Link key={href} href={href} className="rounded-lg px-3 py-1.5 font-medium text-slate-400 hover:bg-teal-400/10 hover:text-teal-300">{label}</Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm text-slate-300">
            <span className="hidden text-right sm:block">
              <span className="block font-medium text-slate-100">{name}</span>
              <span className="text-xs uppercase tracking-wider text-teal-300">{role === "OPERATOR" ? "manager" : "admin"}</span>
            </span>
            <form action={logout}><button className={btn2 + " border-slate-700 bg-slate-900/80 text-slate-300 hover:border-teal-400/50 hover:bg-teal-400/10 hover:text-teal-200"}>Log out</button></form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
