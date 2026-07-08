import { formatCurrency } from "@/lib/format-currency";
import { CashService } from "@/server/services/cash.service";

import {
  addSupplyAction,
  addWithdrawalAction,
  closeCashAction,
  openCashAction,
} from "./actions";

const service = new CashService();

type Money = { toString(): string };

function sum(values: Money[]) {
  return values.reduce<number>((total, value) => total + Number(value.toString()), 0);
}

const paymentNames = {
  CASH: "Dinheiro",
  PIX: "PIX",
  CREDIT_CARD: "Crédito",
  DEBIT_CARD: "Débito",
} as const;

export default async function CashPage() {
  const { current, recentClosed } = await service.getDashboard();
  const payments = current?.sales.flatMap((sale) => sale.payments) ?? [];
  const receipts = Object.entries(paymentNames).map(([method, label]) => ({
    method,
    label,
    total: sum(payments.filter((payment) => payment.method === method).map((payment) => payment.amount)),
  }));
  const supplies = current ? sum(current.cashMovements.filter((item) => item.type === "CASH_IN").map((item) => item.amount)) : 0;
  const withdrawals = current ? sum(current.cashMovements.filter((item) => item.type === "CASH_OUT").map((item) => item.amount)) : 0;
  const cashReceipts = receipts.find((receipt) => receipt.method === "CASH")?.total ?? 0;
  const expected = current ? Number(current.openingAmount) + cashReceipts + supplies - withdrawals : 0;

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-10 text-zinc-950">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-amber-800">Financeiro</p>
        <h1 className="mt-2 text-3xl font-semibold">Caixa</h1>
      </div>

      {!current ? (
        <section className="mt-8 max-w-xl rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm">
          <h2 className="text-xl font-semibold">Abrir caixa</h2>
          <form action={openCashAction} className="mt-5 space-y-4">
            <label className="block text-sm font-medium">Valor inicial
              <input name="amount" required inputMode="decimal" defaultValue="0,00" className="mt-2 w-full rounded-xl border px-4 py-3" />
            </label>
            <label className="block text-sm font-medium">Observação
              <textarea name="notes" maxLength={500} className="mt-2 w-full rounded-xl border px-4 py-3" />
            </label>
            <button className="w-full rounded-xl bg-emerald-800 px-4 py-3 font-semibold text-white">Abrir caixa</button>
          </form>
        </section>
      ) : (
        <>
          <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-zinc-900 p-5 text-white"><p className="text-sm text-zinc-300">Esperado em dinheiro</p><strong className="mt-2 block text-2xl">{formatCurrency(expected)}</strong></div>
            <div className="rounded-2xl border bg-white p-5"><p className="text-sm text-zinc-500">Abertura</p><strong className="mt-2 block text-2xl">{formatCurrency(current.openingAmount.toString())}</strong></div>
            <div className="rounded-2xl border bg-white p-5"><p className="text-sm text-zinc-500">Suprimentos</p><strong className="mt-2 block text-2xl text-emerald-700">+ {formatCurrency(supplies)}</strong></div>
            <div className="rounded-2xl border bg-white p-5"><p className="text-sm text-zinc-500">Sangrias</p><strong className="mt-2 block text-2xl text-red-700">− {formatCurrency(withdrawals)}</strong></div>
          </section>

          <section className="mt-6 rounded-3xl border bg-white p-6">
            <div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-xl font-semibold">Caixa aberto</h2><p className="text-sm text-zinc-500">Por {current.openedByUser.name} em {current.openedAt.toLocaleString("pt-BR")}</p></div><span className="h-fit rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">OPEN</span></div>
            <h3 className="mt-6 font-semibold">Recebimentos</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {receipts.map((receipt) => <div key={receipt.method} className="rounded-xl bg-stone-50 p-4"><p className="text-sm text-zinc-500">{receipt.label}</p><strong className="mt-1 block">{formatCurrency(receipt.total)}</strong></div>)}
            </div>
          </section>

          <section className="mt-6 grid gap-5 lg:grid-cols-3">
            <form action={addSupplyAction} className="rounded-2xl border bg-white p-5">
              <h2 className="font-semibold text-emerald-800">Suprimento</h2>
              <input name="amount" required inputMode="decimal" placeholder="Valor" className="mt-4 w-full rounded-xl border px-3 py-2" />
              <input name="reason" required minLength={3} maxLength={200} placeholder="Justificativa" className="mt-3 w-full rounded-xl border px-3 py-2" />
              <button className="mt-4 w-full rounded-xl bg-emerald-800 px-4 py-2 text-white">Registrar entrada</button>
            </form>
            <form action={addWithdrawalAction} className="rounded-2xl border bg-white p-5">
              <h2 className="font-semibold text-red-800">Sangria</h2>
              <input name="amount" required inputMode="decimal" placeholder="Valor" className="mt-4 w-full rounded-xl border px-3 py-2" />
              <input name="reason" required minLength={3} maxLength={200} placeholder="Justificativa" className="mt-3 w-full rounded-xl border px-3 py-2" />
              <button className="mt-4 w-full rounded-xl bg-red-800 px-4 py-2 text-white">Registrar retirada</button>
            </form>
            <form action={closeCashAction} className="rounded-2xl border border-zinc-400 bg-white p-5">
              <h2 className="font-semibold">Fechar caixa</h2>
              <input name="amount" required inputMode="decimal" placeholder="Valor contado" className="mt-4 w-full rounded-xl border px-3 py-2" />
              <textarea name="notes" maxLength={500} placeholder="Observação" className="mt-3 w-full rounded-xl border px-3 py-2" />
              <button className="mt-4 w-full rounded-xl bg-zinc-900 px-4 py-2 text-white">Conferir e fechar</button>
            </form>
          </section>

          <section className="mt-6 rounded-3xl border bg-white p-6">
            <h2 className="text-xl font-semibold">Movimentações auditáveis</h2>
            <div className="mt-4 divide-y">
              {current.cashMovements.map((movement) => (
                <div key={movement.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                  <span><strong>{movement.type}</strong> · {movement.reason} · {movement.user.name}</span>
                  <span>{formatCurrency(movement.amount.toString())} · {movement.createdAt.toLocaleString("pt-BR")}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <section className="mt-10">
        <h2 className="text-2xl font-semibold">Fechamentos recentes</h2>
        <div className="mt-4 space-y-3">
          {recentClosed.map((session) => (
            <details key={session.id} className="rounded-2xl border bg-white p-5">
              <summary className="cursor-pointer font-medium">{session.dailyDate} · contado {formatCurrency(session.closingAmount?.toString() ?? 0)} · diferença {formatCurrency(session.difference?.toString() ?? 0)}</summary>
              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3"><p>Esperado: {formatCurrency(session.expectedAmount?.toString() ?? 0)}</p><p>Contado: {formatCurrency(session.closingAmount?.toString() ?? 0)}</p><p>Diferença: {formatCurrency(session.difference?.toString() ?? 0)}</p></div>
            </details>
          ))}
          {recentClosed.length === 0 ? <p className="text-zinc-500">Nenhum fechamento registrado.</p> : null}
        </div>
      </section>
    </main>
  );
}
