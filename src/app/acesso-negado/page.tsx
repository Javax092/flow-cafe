import Link from "next/link";

export default function AccessDeniedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-100 px-6 text-center">
      <section className="max-w-md rounded-3xl bg-white p-10 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wider text-red-700">Acesso negado</p>
        <h1 className="mt-3 text-3xl font-semibold">Operação não permitida</h1>
        <p className="mt-3 text-zinc-600">Seu perfil não possui permissão para acessar esta área.</p>
        <Link href="/" className="mt-7 inline-block rounded-xl bg-zinc-900 px-5 py-3 text-white">
          Voltar ao início
        </Link>
      </section>
    </main>
  );
}
