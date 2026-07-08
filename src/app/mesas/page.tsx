import { formatCurrency } from "@/lib/format-currency";
import { requireAuthContext } from "@/server/auth/context";
import { can } from "@/server/rbac/permissions";
import { ProductService } from "@/server/services/product.service";
import { TabService } from "@/server/services/tab.service";

import {
  addOrderAction,
  closeTabAction,
  createTableAction,
  openTabAction,
  transferTabAction,
} from "./actions";

const tabService = new TabService();
const productService = new ProductService();

function orderTotal(orders: { items: { subtotal: { toString(): string } }[] }[]) {
  return orders.reduce(
    (total, order) => total + order.items.reduce(
      (orderSum, item) => orderSum + Number(item.subtotal.toString()),
      0,
    ),
    0,
  );
}

export default async function TablesPage() {
  const [{ tables, recentClosedTabs }, products, ctx] = await Promise.all([
    tabService.listTablesAndHistory(),
    productService.listSaleableProducts(),
    requireAuthContext(),
  ]);
  const freeTables = tables.filter((table) => table.tabs.length === 0);

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-10 text-zinc-950">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-amber-800">Salão</p>
          <h1 className="mt-2 text-3xl font-semibold">Mesas e comandas</h1>
        </div>
        {can(ctx.role, "CONFIGURE_TABLES") ? (
          <form action={createTableAction} className="flex flex-wrap gap-2 rounded-2xl border bg-white p-3">
            <input name="name" required maxLength={40} placeholder="Nova mesa" className="rounded-xl border px-3 py-2" />
            <input name="sortOrder" required type="number" min="0" defaultValue="0" aria-label="Ordem" className="w-20 rounded-xl border px-3 py-2" />
            <button className="rounded-xl bg-zinc-900 px-4 py-2 text-white">Criar</button>
          </form>
        ) : null}
      </div>

      <section className="mt-8 grid gap-5 lg:grid-cols-2">
        {tables.map((table) => {
          const tab = table.tabs[0];
          const total = tab ? orderTotal(tab.orders) : 0;
          return (
            <article key={table.id} className={`rounded-3xl border p-6 ${tab ? "border-amber-300 bg-amber-50/40" : "border-zinc-200 bg-white"}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold">{table.name}</h2>
                  <p className={`mt-1 text-sm font-semibold ${tab ? "text-amber-800" : "text-emerald-700"}`}>{tab ? "OPEN" : "LIVRE"}</p>
                </div>
                {tab ? <strong className="text-xl">{formatCurrency(total)}</strong> : null}
              </div>

              {!tab ? (
                <form action={openTabAction.bind(null, table.id)} className="mt-5 flex gap-2">
                  <input name="customerName" maxLength={80} placeholder="Cliente (opcional)" className="min-w-0 flex-1 rounded-xl border bg-white px-3 py-2" />
                  <button className="rounded-xl bg-amber-900 px-4 py-2 text-white">Abrir mesa</button>
                </form>
              ) : (
                <>
                  {tab.customerName ? <p className="mt-3 text-sm text-zinc-600">Cliente: {tab.customerName}</p> : null}
                  <div className="mt-5 max-h-64 space-y-3 overflow-auto">
                    {tab.orders.map((order, index) => (
                      <div key={order.id} className="rounded-xl border border-amber-200 bg-white p-3 text-sm">
                        <div className="flex justify-between text-xs text-zinc-500"><span>Pedido {index + 1} · {order.createdBy.name}</span><time>{order.createdAt.toLocaleString("pt-BR")}</time></div>
                        {order.items.map((item) => (
                          <div key={item.id} className="mt-2">
                            <div className="flex justify-between"><span>{item.quantity}× {item.productNameSnapshot}</span><strong>{formatCurrency(item.subtotal.toString())}</strong></div>
                            {item.observation ? <p className="text-zinc-500">Obs.: {item.observation}</p> : null}
                          </div>
                        ))}
                      </div>
                    ))}
                    {tab.orders.length === 0 ? <p className="text-sm text-zinc-500">Nenhum pedido adicionado.</p> : null}
                  </div>

                  <form action={addOrderAction.bind(null, tab.id)} className="mt-5 grid gap-2 sm:grid-cols-[1fr_5rem]">
                    <select name="productId" required className="rounded-xl border bg-white px-3 py-2">
                      <option value="">Selecione um produto</option>
                      {products.map((product) => <option key={product.id} value={product.id}>{product.name} — {formatCurrency(product.price.toString())}</option>)}
                    </select>
                    <input name="quantity" required type="number" min="1" max="99" defaultValue="1" aria-label="Quantidade" className="rounded-xl border bg-white px-3 py-2" />
                    <input name="observation" maxLength={200} placeholder="Observação do item" className="rounded-xl border bg-white px-3 py-2 sm:col-span-2" />
                    <button className="rounded-xl bg-amber-900 px-4 py-2 text-white sm:col-span-2">Adicionar pedido</button>
                  </form>

                  <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
                    <form action={transferTabAction.bind(null, tab.id)} className="flex gap-2">
                      <select name="destinationTableId" required className="min-w-0 flex-1 rounded-xl border bg-white px-3 py-2">
                        <option value="">Transferir para…</option>
                        {freeTables.map((destination) => <option key={destination.id} value={destination.id}>{destination.name}</option>)}
                      </select>
                      <button disabled={freeTables.length === 0} className="rounded-xl border border-zinc-400 px-3 py-2 disabled:opacity-40">Transferir</button>
                    </form>
                    <form action={closeTabAction.bind(null, tab.id)}>
                      <button className="w-full rounded-xl bg-zinc-900 px-4 py-2 text-white">Fechar mesa</button>
                    </form>
                  </div>
                  {tab.transfers.length > 0 ? (
                    <div className="mt-4 border-t pt-3 text-xs text-zinc-500">
                      {tab.transfers.map((transfer) => <p key={transfer.id}>Transferida: {transfer.fromTable.name} → {transfer.toTable.name}</p>)}
                    </div>
                  ) : null}
                </>
              )}
            </article>
          );
        })}
        {tables.length === 0 ? <p className="text-zinc-500">Nenhuma mesa cadastrada.</p> : null}
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold">Histórico de comandas</h2>
        <div className="mt-4 space-y-3">
          {recentClosedTabs.map((tab) => (
            <details key={tab.id} className="rounded-2xl border border-zinc-200 bg-white p-5">
              <summary className="cursor-pointer font-medium">
                {tab.currentTable.name} · CLOSED · {formatCurrency(orderTotal(tab.orders))} · {tab.closedAt?.toLocaleString("pt-BR")}
              </summary>
              <div className="mt-4 space-y-2 text-sm">
                <p>Aberta por {tab.openedBy.name}{tab.closedBy ? ` · fechada por ${tab.closedBy.name}` : ""}</p>
                {tab.orders.flatMap((order) => order.items).map((item) => (
                  <p key={item.id}>{item.quantity}× {item.productNameSnapshot} a {formatCurrency(item.unitPriceSnapshot.toString())} = {formatCurrency(item.subtotal.toString())}</p>
                ))}
                {tab.transfers.map((transfer) => <p key={transfer.id} className="text-zinc-500">Transferência: {transfer.fromTable.name} → {transfer.toTable.name}</p>)}
              </div>
            </details>
          ))}
          {recentClosedTabs.length === 0 ? <p className="text-zinc-500">Nenhuma comanda fechada.</p> : null}
        </div>
      </section>
    </main>
  );
}
