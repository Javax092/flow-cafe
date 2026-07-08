import Link from "next/link";

import { formatCurrency } from "@/lib/format-currency";
import { requireAuthContext } from "@/server/auth/context";
import { can, type Permission } from "@/server/rbac/permissions";
import { DashboardService } from "@/server/services/dashboard.service";

const dashboardService = new DashboardService();

const shortcuts: { href: string; label: string; description: string; permission: Permission }[] = [
  { href: "/pdv", label: "PDV", description: "Registrar vendas no balcão", permission: "CREATE_SALE" },
  { href: "/mesas", label: "Mesas", description: "Acompanhar salão e comandas", permission: "MANAGE_TABS" },
  { href: "/caixa", label: "Caixa", description: "Sessões e movimentações", permission: "VIEW_CASH" },
  { href: "/estoque", label: "Estoque", description: "Insumos e alertas", permission: "VIEW_INVENTORY" },
  { href: "/impressoes", label: "Impressões", description: "Fila de comandas e cupons", permission: "VIEW_PRINT_QUEUE" },
  { href: "/catalogo", label: "Catálogo", description: "Produtos e categorias", permission: "MANAGE_PRODUCTS" },
  { href: "/gerencial", label: "Gerencial", description: "Resultados e relatórios", permission: "VIEW_REPORTS" },
  { href: "/auditoria", label: "Auditoria", description: "Ações e acessos", permission: "VIEW_AUDIT_LOGS" },
];

export default async function AdminPage() {
  const [dashboard, user] = await Promise.all([
    dashboardService.getOperationDashboard(),
    requireAuthContext(),
  ]);

  return (
    <main className="min-h-screen bg-stone-100 px-5 py-8 text-zinc-950">
      <div className="mx-auto w-full max-w-7xl">
        <header>
          <p className="text-sm font-semibold uppercase tracking-wider text-amber-800">Administração</p>
          <h1 className="mt-2 text-3xl font-semibold">Gestão do dia</h1>
          <p className="mt-2 text-sm text-zinc-600">{dashboard.date} · {user.name} · visão completa da operação</p>
        </header>

        <section aria-label="Indicadores do dia" className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <article className="rounded-2xl bg-zinc-900 p-5 text-white"><p className="text-sm text-zinc-300">Pedidos do dia</p><strong className="mt-2 block text-3xl">{dashboard.ordersToday}</strong></article>
          <article className="rounded-2xl border border-stone-200 bg-white p-5"><p className="text-sm text-zinc-600">Vendas concluídas</p><strong className="mt-2 block text-3xl">{dashboard.salesCount}</strong><p className="mt-1 text-xs text-zinc-500">{formatCurrency(dashboard.saleTotal)}</p></article>
          <article className="rounded-2xl border border-stone-200 bg-white p-5"><p className="text-sm text-zinc-600">Pedidos pendentes</p><strong className="mt-2 block text-3xl text-amber-800">{dashboard.pendingOrders}</strong></article>
          <article className="rounded-2xl border border-stone-200 bg-white p-5"><p className="text-sm text-zinc-600">Mesas abertas</p><strong className="mt-2 block text-3xl">{dashboard.openTables}</strong></article>
          <article className="rounded-2xl border border-stone-200 bg-white p-5"><p className="text-sm text-zinc-600">Alertas operacionais</p><strong className={`mt-2 block text-3xl ${dashboard.alerts.length ? "text-red-700" : "text-emerald-700"}`}>{dashboard.alerts.length}</strong></article>
        </section>

        <section className="mt-9">
          <h2 className="text-xl font-semibold">Acessos rápidos</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {shortcuts.filter((item) => can(user.role, item.permission)).map((item) => (
              <Link key={item.href} href={item.href} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-500 hover:shadow-md">
                <h3 className="text-lg font-semibold text-zinc-950">{item.label}</h3>
                <p className="mt-2 text-sm text-zinc-600">{item.description}</p>
                <span className="mt-5 block text-sm font-semibold text-amber-800">Acessar →</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-9 rounded-3xl border border-stone-200 bg-white p-6">
          <h2 className="text-xl font-semibold">Alertas operacionais</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {dashboard.alerts.map((alert, index) => (
              <Link key={`${alert.message}-${index}`} href={alert.href} className={`rounded-xl border p-4 text-sm font-medium ${alert.level === "critical" ? "border-red-300 bg-red-50 text-red-900" : "border-amber-300 bg-amber-50 text-amber-950"}`}>{alert.message}</Link>
            ))}
            {dashboard.alerts.length === 0 ? <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">Nenhum alerta operacional.</p> : null}
          </div>
        </section>
      </div>
    </main>
  );
}
