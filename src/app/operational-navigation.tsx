"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { logoutAction } from "@/app/login/actions";

const hiddenRoutes = new Set(["/", "/login", "/acesso-negado"]);

export function OperationalNavigation() {
  const pathname = usePathname();
  const router = useRouter();

  if (hiddenRoutes.has(pathname)) return null;

  return (
    <header className="border-b border-stone-200 bg-white text-zinc-950 shadow-sm">
      <nav
        aria-label="Navegação operacional"
        className="mx-auto flex w-full max-w-[1500px] flex-wrap items-center justify-between gap-3 px-5 py-3"
      >
        <Link href="/" className="text-base font-bold tracking-tight text-amber-950">
          Flow Café
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
          <Link href="/" className="rounded-xl border border-stone-300 bg-white px-4 py-2 font-semibold hover:bg-stone-50">
            Início
          </Link>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl border border-stone-300 bg-white px-4 py-2 font-semibold hover:bg-stone-50"
          >
            Voltar
          </button>
          <form action={logoutAction}>
            <button className="rounded-xl bg-zinc-900 px-4 py-2 font-semibold text-white hover:bg-zinc-700">
              Sair
            </button>
          </form>
        </div>
      </nav>
    </header>
  );
}
