import Link from "next/link";
import { redirect } from "next/navigation";

import { logoutAction } from "@/app/login/actions";
import { formatCurrency } from "@/lib/format-currency";
import { requireAuthContext } from "@/server/auth/context";
import { DashboardService } from "@/server/services/dashboard.service";
import { can } from "@/server/rbac/permissions";

import { OperationAutoRefresh } from "./operation-auto-refresh";
import { cancelSaleAction } from "./dashboard-actions";

const dashboardService = new DashboardService();
const paymentNames = {
  CASH: "Dinheiro",
  PIX: "PIX",
  CREDIT_CARD: "Crédito",
  DEBIT_CARD: "Débito",
} as const;

export default async function Home() {
  const [dashboard, user] = await Promise.all([
    dashboardService.getOperationDashboard(),
    requireAuthContext(),
  ]);
  if (user.role === "GARCOM" || user.role === "WAITER") redirect("/garcom");

  const canCancelSales = can(user.role, "CANCEL_SALE");
  const navigation = [
    { href: "/admin", label: "Admin", show: can(user.role, "VIEW_REPORTS") },
    { href: "/garcom", label: "Garçom", show: can(user.role, "MANAGE_TABS") },
    { href: "/pdv", label: "PDV", show: can(user.role, "CREATE_SALE") },
    { href: "/mesas", label: "Mesas", show: can(user.role, "MANAGE_TABS") },
    { href: "/caixa", label: "Caixa", show: can(user.role, "VIEW_CASH") },
    { href: "/estoque", label: "Estoque", show: can(user.role, "VIEW_INVENTORY") },
    { href: "/impressoes", label: "Impressões", show: can(user.role, "VIEW_PRINT_QUEUE") },
    { href: "/catalogo", label: "Catálogo", show: can(user.role, "MANAGE_PRODUCTS") },
    { href: "/gerencial", label: "Gerencial", show: can(user.role, "VIEW_REPORTS") },
    { href: "/auditoria", label: "Auditoria", show: can(user.role, "VIEW_AUDIT_LOGS") },
  ];

  return (
    <main className="min-h-screen bg-stone-100 px-5 py-8 text-zinc-950">
      <div className="mx-auto w-full max-w-7xl">
        <header className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-amber-800">Painel de operação</p>
            <h1 className="mt-2 text-3xl font-semibold">Visão do dia</h1>
            <p className="mt-1 text-sm text-zinc-500">{dashboard.date} · {user.name}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <OperationAutoRefresh />
            <form action={logoutAction}><button className="rounded-xl border border-zinc-300 bg-white px-4 py-2">Sair</button></form>
          </div>
        </header>

        <nav className="mt-6 flex flex-wrap gap-2 text-sm">
          {navigation.filter((item) => item.show).map(({ href, label }) => (
            <Link key={href} href={href} className="rounded-xl border border-zinc-200 bg-white px-4 py-2 font-medium">{label}</Link>
          ))}
        </nav>

        <section className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-2xl bg-zinc-900 p-5 text-white"><p className="text-sm text-zinc-300">Pedidos do dia</p><strong className="mt-2 block text-3xl">{dashboard.ordersToday}</strong><p className="mt-1 text-xs text-zinc-400">{dashboard.salesCount} vendas + {dashboard.tabOrdersCount} comandas</p></article>
          <article className="rounded-2xl border bg-white p-5"><p className="text-sm text-zinc-500">Mesas abertas</p><strong className="mt-2 block text-3xl">{dashboard.openTables}</strong></article>
          <article className="rounded-2xl border bg-white p-5"><p className="text-sm text-zinc-500">Pedidos pendentes</p><strong className="mt-2 block text-3xl text-amber-800">{dashboard.pendingOrders}</strong><p className="mt-1 text-xs text-zinc-400">Em comandas OPEN</p></article>
          <article className="rounded-2xl border bg-white p-5"><p className="text-sm text-zinc-500">Vendas concluídas</p><strong className="mt-2 block text-3xl">{formatCurrency(dashboard.saleTotal)}</strong></article>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          <div className="space-y-6">
            <article className="rounded-3xl border bg-white p-6">
              <h2 className="text-xl font-semibold">Recebimentos do dia</h2>
              <div className="mt-4 space-y-3">
                {Object.entries(paymentNames).map(([method, label]) => {
                  const total = dashboard.paymentTotals.find((item) => item.method === method)?.amount ?? 0;
                  return <div key={method} className="flex justify-between border-b border-zinc-100 pb-3"><span>{label}</span><strong>{formatCurrency(total)}</strong></div>;
                })}
              </div>
            </article>

            <article className="rounded-3xl border bg-white p-6">
              <h2 className="text-xl font-semibold">Alertas operacionais</h2>
              <div className="mt-4 space-y-3">
                {dashboard.alerts.map((alert, index) => (
                  <Link key={`${alert.message}-${index}`} href={alert.href} className={`block rounded-xl border p-4 text-sm ${alert.level === "critical" ? "border-red-300 bg-red-50 text-red-900" : "border-amber-300 bg-amber-50 text-amber-900"}`}>{alert.message}</Link>
                ))}
                {dashboard.alerts.length === 0 ? <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">Nenhum alerta operacional.</p> : null}
              </div>
            </article>
          </div>

          <article className="rounded-3xl border bg-white p-6">
            <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">Pedidos recentes</h2><time className="text-xs text-zinc-500">Atualizado {dashboard.generatedAt.toLocaleTimeString("pt-BR")}</time></div>
            <div className="mt-4 divide-y">
              {dashboard.recentOrders.map((order) => (
                <div key={`${order.type}-${order.id}`} className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div><p className="font-medium">{order.type} · {order.reference}</p><p className="text-xs text-zinc-500">{order.createdAt.toLocaleString("pt-BR")} · {order.id}</p></div>
                  <div className="text-right"><strong>{formatCurrency(order.total)}</strong>{order.pending ? <p className="text-xs font-semibold text-amber-700">PENDENTE</p> : <p className="text-xs text-emerald-700">CONCLUÍDO</p>}</div>
                  {canCancelSales && order.type === "Venda" ? (
                    <form action={cancelSaleAction.bind(null, order.id)} className="flex w-full gap-2 sm:w-auto">
                      <input name="reason" required minLength={5} maxLength={300} placeholder="Motivo do cancelamento" className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm" />
                      <button className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-800">Cancelar</button>
                    </form>
                  ) : null}
                </div>
              ))}
              {dashboard.recentOrders.length === 0 ? <p className="py-8 text-center text-zinc-500">Nenhum pedido registrado hoje.</p> : null}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
