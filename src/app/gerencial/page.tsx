import Link from "next/link";

import { formatCurrency } from "@/lib/format-currency";
import { formatDate } from "@/lib/format-date";
import {
  defaultReportPeriod,
  normalizeReportMode,
  ReportService,
} from "@/server/services/report.service";

const service = new ReportService();

const paymentNames = {
  CASH: "Dinheiro",
  PIX: "PIX",
  CREDIT_CARD: "Crédito",
  DEBIT_CARD: "Débito",
} as const;

type ManagementPageProps = {
  searchParams: Promise<{ de?: string; ate?: string; tipo?: string }>;
};

function exportHref(format: "csv" | "pdf", params: { from: string; to: string; mode: string }) {
  const query = new URLSearchParams({
    formato: format,
    tipo: params.mode,
    de: params.from,
    ate: params.to,
  });
  return `/gerencial/export?${query.toString()}`;
}

export default async function ManagementPage({ searchParams }: ManagementPageProps) {
  const query = await searchParams;
  const mode = normalizeReportMode(query.tipo);
  const defaults = defaultReportPeriod(mode);
  const from = query.de ?? defaults.from;
  const to = query.ate ?? defaults.to;
  const report = await service.getReport({ from, to, mode });

  return (
    <main className="min-h-screen bg-stone-100 px-5 py-8 text-zinc-950">
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-amber-800">Gestão</p>
            <h1 className="mt-2 text-3xl font-semibold">Relatórios profissionais</h1>
            <p className="mt-2 text-sm text-zinc-600">
              Período: {report.period.from} a {report.period.to} · gerado em {formatDate(report.generatedAt, { dateStyle: "short", timeStyle: "short" })}
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <form className="flex flex-wrap items-end gap-3 rounded-2xl border bg-white p-4">
              <label className="text-sm font-medium">
                Tipo
                <select name="tipo" defaultValue={mode} className="mt-1 block rounded-lg border px-3 py-2">
                  <option value="daily">Diário</option>
                  <option value="monthly">Mensal</option>
                </select>
              </label>
              <label className="text-sm font-medium">
                De
                <input name="de" type="date" required defaultValue={from} className="mt-1 block rounded-lg border px-3 py-2" />
              </label>
              <label className="text-sm font-medium">
                Até
                <input name="ate" type="date" required defaultValue={to} className="mt-1 block rounded-lg border px-3 py-2" />
              </label>
              <button className="rounded-xl bg-zinc-900 px-5 py-2 text-white">Aplicar</button>
            </form>
            <div className="flex gap-2">
              <Link className="rounded-xl border bg-white px-4 py-2 font-medium" href={exportHref("csv", { from, to, mode })}>CSV</Link>
              <Link className="rounded-xl bg-amber-800 px-4 py-2 font-medium text-white" href={exportHref("pdf", { from, to, mode })}>PDF</Link>
            </div>
          </div>
        </div>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <article className="rounded-2xl bg-zinc-900 p-5 text-white">
            <p className="text-sm text-zinc-300">Faturamento líquido</p>
            <strong className="mt-2 block text-3xl">{formatCurrency(report.summary.revenue)}</strong>
          </article>
          <article className="rounded-2xl border bg-white p-5">
            <p className="text-sm text-zinc-500">Vendas</p>
            <strong className="mt-2 block text-3xl">{report.summary.salesCount}</strong>
          </article>
          <article className="rounded-2xl border bg-white p-5">
            <p className="text-sm text-zinc-500">Ticket médio</p>
            <strong className="mt-2 block text-3xl">{formatCurrency(report.summary.averageTicket)}</strong>
          </article>
          <article className="rounded-2xl border bg-white p-5">
            <p className="text-sm text-zinc-500">Descontos</p>
            <strong className="mt-2 block text-3xl text-red-700">{formatCurrency(report.summary.discount)}</strong>
          </article>
          <article className="rounded-2xl border bg-white p-5">
            <p className="text-sm text-zinc-500">CMV</p>
            <strong className="mt-2 block text-3xl text-red-700">{formatCurrency(report.summary.cost)}</strong>
          </article>
          <article className="rounded-2xl border bg-white p-5">
            <p className="text-sm text-zinc-500">Margem bruta</p>
            <strong className="mt-2 block text-3xl text-emerald-700">{formatCurrency(report.summary.grossMargin)}</strong>
            <p className="mt-1 text-xs text-zinc-400">{report.summary.grossMarginPercent.toFixed(1)}%</p>
          </article>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <article className="rounded-3xl border bg-white p-6">
            <h2 className="text-xl font-semibold">Conferência de caixa</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b text-xs uppercase text-zinc-500">
                  <tr><th className="py-2">Data</th><th>Operador</th><th>Esperado</th><th>Contado</th><th>Diferença</th><th>Vendas</th></tr>
                </thead>
                <tbody className="divide-y">
                  {report.cashClosures.map((cash) => (
                    <tr key={cash.id}>
                      <td className="py-3">{cash.dailyDate}<span className="ml-2 text-xs text-zinc-400">{cash.status}</span></td>
                      <td>{cash.openedBy}</td>
                      <td>{formatCurrency(cash.expectedAmount)}</td>
                      <td>{cash.closingAmount == null ? "Em aberto" : formatCurrency(cash.closingAmount)}</td>
                      <td className={cash.difference != null && cash.difference !== 0 ? "font-semibold text-red-700" : ""}>
                        {cash.difference == null ? "Em aberto" : formatCurrency(cash.difference)}
                      </td>
                      <td>{formatCurrency(Number(cash.totalSales))} · {cash.salesCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {report.cashClosures.length === 0 ? <p className="py-6 text-zinc-500">Nenhum caixa no período.</p> : null}
            </div>
          </article>

          <article className="rounded-3xl border bg-white p-6">
            <h2 className="text-xl font-semibold">Formas de pagamento</h2>
            <div className="mt-5 space-y-4">
              {report.paymentMethodOrder.map((method) => {
                const payment = report.paymentTotals.find((item) => item.method === method);
                return (
                  <div key={method} className="flex justify-between border-b border-zinc-100 pb-4">
                    <span>{paymentNames[method]}</span>
                    <strong>{formatCurrency(payment?.amount ?? 0)} <span className="text-sm font-normal text-zinc-400">({payment?.count ?? 0})</span></strong>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 rounded-2xl bg-stone-50 p-4 text-sm">
              <p>Cancelamentos: <strong>{report.summary.cancelledSalesCount}</strong></p>
              <p className="mt-1">Valor cancelado: <strong>{formatCurrency(report.summary.cancelledTotal)}</strong></p>
            </div>
          </article>
        </section>

        <section className="mt-6 rounded-3xl border bg-white p-6">
          <h2 className="text-xl font-semibold">Fechamento por operador</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b text-xs uppercase text-zinc-500">
                <tr><th className="py-2">Operador</th><th>Vendas</th><th>Faturamento</th><th>Descontos</th><th>CMV</th><th>Margem</th><th>Ticket</th></tr>
              </thead>
              <tbody className="divide-y">
                {report.operators.map((operator) => (
                  <tr key={operator.userId}>
                    <td className="py-3 font-medium">{operator.name}</td>
                    <td>{operator.salesCount}</td>
                    <td>{formatCurrency(operator.revenue)}</td>
                    <td>{formatCurrency(operator.discount)}</td>
                    <td>{formatCurrency(operator.cost)}</td>
                    <td>{formatCurrency(operator.grossMargin)}</td>
                    <td>{formatCurrency(operator.averageTicket)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {report.operators.length === 0 ? <p className="py-6 text-zinc-500">Nenhuma venda por operador no período.</p> : null}
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <article className="rounded-3xl border bg-white p-6">
            <h2 className="text-xl font-semibold">Produtos</h2>
            <div className="mt-4 divide-y">
              {report.products.slice(0, 12).map((product) => (
                <div key={product.key} className="grid gap-2 py-3 text-sm sm:grid-cols-[1fr_auto_auto]">
                  <span><strong>{product.name}</strong><span className="ml-2 text-zinc-400">{product.category}</span></span>
                  <span>{product.quantity} un.</span>
                  <strong>{formatCurrency(product.revenue)}</strong>
                </div>
              ))}
              {report.products.length === 0 ? <p className="py-6 text-zinc-500">Nenhum produto vendido no período.</p> : null}
            </div>
          </article>

          <article className="rounded-3xl border bg-white p-6">
            <h2 className="text-xl font-semibold">Categorias</h2>
            <div className="mt-4 divide-y">
              {report.categories.map((category) => (
                <div key={category.key} className="grid gap-2 py-3 text-sm sm:grid-cols-[1fr_auto_auto]">
                  <strong>{category.name}</strong>
                  <span>{category.quantity} un.</span>
                  <span>{formatCurrency(category.revenue)} · margem {formatCurrency(category.grossMargin)}</span>
                </div>
              ))}
              {report.categories.length === 0 ? <p className="py-6 text-zinc-500">Nenhuma categoria vendida no período.</p> : null}
            </div>
          </article>
        </section>

        <section className="mt-6 rounded-3xl border bg-white p-6">
          <h2 className="text-xl font-semibold">Vendas por dia</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b text-xs uppercase text-zinc-500">
                <tr><th className="py-2">Data</th><th>Vendas</th><th>Faturamento</th><th>Descontos</th><th>CMV</th><th>Margem</th></tr>
              </thead>
              <tbody className="divide-y">
                {report.dailySales.map((day) => (
                  <tr key={day.date}>
                    <td className="py-3">{day.date}</td>
                    <td>{day.salesCount}</td>
                    <td>{formatCurrency(day.revenue)}</td>
                    <td>{formatCurrency(day.discount)}</td>
                    <td>{formatCurrency(day.cost)}</td>
                    <td>{formatCurrency(day.grossMargin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {report.dailySales.length === 0 ? <p className="py-6 text-zinc-500">Nenhuma venda no período.</p> : null}
          </div>
        </section>
      </div>
    </main>
  );
}
