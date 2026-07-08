import Link from "next/link";

import { logoutAction } from "@/app/login/actions";
import { requireAuthContext } from "@/server/auth/context";
import { DashboardService } from "@/server/services/dashboard.service";
import { TabService } from "@/server/services/tab.service";

const dashboardService = new DashboardService();
const tabService = new TabService();

export default async function WaiterPage() {
  const [dashboard, { tables }, user] = await Promise.all([
    dashboardService.getOperationDashboard(),
    tabService.listTablesAndHistory(),
    requireAuthContext(),
  ]);
  const openTables = tables.filter((table) => table.tabs.length > 0);
  const orders = openTables.flatMap((table) => table.tabs[0].orders.map((order) => ({ ...order, tableName: table.name })));
  const lastOrder = orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

  return (
    <main className="min-h-screen bg-stone-100 px-4 py-7 text-zinc-950">
      <div className="mx-auto w-full max-w-6xl">
        <header>
          <p className="text-sm font-semibold uppercase tracking-wider text-amber-800">Operação do salão</p>
          <h1 className="mt-2 text-3xl font-semibold">Olá, {user.name}</h1>
          <p className="mt-2 text-zinc-600">{dashboard.openTables} mesa(s) aberta(s) · {dashboard.pendingOrders} pedido(s) pendente(s)</p>
        </header>

        <section aria-label="Ações rápidas" className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/mesas#nova-mesa" className="flex min-h-28 flex-col justify-between rounded-2xl bg-amber-900 p-5 text-white shadow-sm"><strong className="text-lg">Abrir mesa</strong><span className="text-sm text-amber-100">Selecionar uma mesa livre →</span></Link>
          <Link href="/mesas" className="flex min-h-28 flex-col justify-between rounded-2xl bg-zinc-900 p-5 text-white shadow-sm"><strong className="text-lg">Selecionar mesa</strong><span className="text-sm text-zinc-300">Ver todas as mesas →</span></Link>
          <Link href="/mesas" className="flex min-h-28 flex-col justify-between rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"><strong className="text-lg">Lançar pedido</strong><span className="text-sm text-zinc-600">Adicionar itens à comanda →</span></Link>
          <Link href="/impressoes" className="flex min-h-28 flex-col justify-between rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"><strong className="text-lg">Imprimir comanda</strong><span className="text-sm text-zinc-600">Acompanhar impressões →</span></Link>
          <Link href="/garcom" className="flex min-h-28 flex-col justify-between rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"><strong className="text-lg">Voltar ao início do garçom</strong><span className="text-sm text-zinc-600">Atualizar painel →</span></Link>
          <form action={logoutAction}><button className="flex min-h-28 w-full flex-col justify-between rounded-2xl bg-red-900 p-5 text-left text-white shadow-sm"><strong className="text-lg">Sair</strong><span className="text-sm text-red-100">Encerrar sessão →</span></button></form>
        </section>

        <section className="mt-9">
          <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">Mesas abertas</h2><Link href="/mesas" className="text-sm font-semibold text-amber-800">Ver todas</Link></div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {openTables.map((table) => {
              const tab = table.tabs[0];
              return (
                <Link key={table.id} href={`/mesas#mesa-${table.id}`} className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
                  <div><h3 className="text-lg font-semibold">{table.name}</h3><p className="mt-1 text-xs font-semibold uppercase text-amber-800">Aberta</p></div>
                  <p className="mt-4 text-sm text-zinc-700">{tab.customerName || "Cliente não informado"} · {tab.orders.length} pedido(s)</p>
                </Link>
              );
            })}
            {openTables.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-7 text-center sm:col-span-2 lg:col-span-3"><p className="font-medium">Nenhuma mesa aberta no momento.</p><Link href="/mesas" className="mt-4 inline-block rounded-xl bg-amber-900 px-5 py-3 font-semibold text-white">Selecionar mesa livre</Link></div>
            ) : null}
          </div>
        </section>

        <section className="mt-9 grid gap-4 sm:grid-cols-2">
          <article className="rounded-2xl border border-stone-200 bg-white p-5"><h2 className="text-lg font-semibold">Pedidos em andamento</h2><p className="mt-3 text-zinc-700">{orders.length ? `${orders.length} pedido(s) em comandas abertas.` : "Nenhum pedido em andamento."}</p></article>
          <article className="rounded-2xl border border-stone-200 bg-white p-5"><h2 className="text-lg font-semibold">Último pedido lançado</h2><p className="mt-3 text-zinc-700">{lastOrder ? `${lastOrder.tableName} · ${lastOrder.createdAt.toLocaleString("pt-BR")}` : "Nenhum pedido em andamento."}</p></article>
        </section>
      </div>
    </main>
  );
}
