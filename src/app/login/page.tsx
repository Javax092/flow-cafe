import { redirect } from "next/navigation";

import { APP } from "@/config/constants";
import { getCurrentAuthSession } from "@/server/auth/session";

import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (await getCurrentAuthSession()) redirect("/");

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-100 px-6 py-12 text-zinc-950">
      <section className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-8 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-800">{APP.name}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Acesse sua conta</h1>
        <p className="mt-2 text-sm text-zinc-600">Use suas credenciais para continuar.</p>
        <LoginForm />
      </section>
    </main>
  );
}
