"use client";
import { useActionState } from "react";
import { login } from "./actions";
import { inp, btn } from "@/lib/format";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-700 text-lg font-bold text-white shadow-lg shadow-teal-700/20">R</div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">Rent Manager</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to manage your buildings and rent records.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8">
          <form action={action} className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Email
              <input name="email" type="email" placeholder="you@example.com" autoComplete="username" required className={inp + " mt-1.5"} />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Password
              <input name="password" type="password" placeholder="Enter your password" autoComplete="current-password" required className={inp + " mt-1.5"} />
            </label>
        {state?.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
            <button disabled={pending} className={btn + " w-full"}>{pending ? "Logging in..." : "Log in"}</button>
          </form>
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">Secure access for your property team</p>
      </div>
    </main>
  );
}
