import { formatCurrency } from "@/lib/format-currency";
import { requireAuthContext } from "@/server/auth/context";
import { can } from "@/server/rbac/permissions";
import { InventoryService } from "@/server/services/inventory.service";

import {
  createIngredientAction,
  inventoryCountAction,
  setRecipeAction,
  stockEntryAction,
  stockOutputAction,
} from "./actions";

const service = new InventoryService();
const unitNames = { UNIT: "un.", KG: "kg", G: "g", L: "l", ML: "ml" } as const;

export default async function InventoryPage() {
  const [{ ingredients, products, movements, inventories }, ctx] = await Promise.all([
    service.getDashboard(),
    requireAuthContext(),
  ]);
  const canManage = can(ctx.role, "MANAGE_INVENTORY");
  const lowStock = ingredients.filter((item) => item.currentStock.lte(item.minimumStock));

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-10 text-zinc-950">
      <div><p className="text-sm font-semibold uppercase tracking-wider text-amber-800">Gestão</p><h1 className="mt-2 text-3xl font-semibold">Estoque inteligente</h1><p className="mt-2 text-sm text-zinc-500">Estoque negativo é bloqueado em saídas e vendas.</p></div>

      {lowStock.length > 0 ? <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-900"><strong>{lowStock.length} insumo(s) no estoque mínimo:</strong> {lowStock.map((item) => item.name).join(", ")}</div> : null}

      {canManage ? (
        <section className="mt-7 grid gap-5 lg:grid-cols-2">
          <form action={createIngredientAction} className="rounded-2xl border bg-white p-5">
            <h2 className="font-semibold">Novo insumo</h2><div className="mt-4 grid gap-3 sm:grid-cols-3"><input name="name" required placeholder="Nome" className="rounded-xl border px-3 py-2" /><select name="unit" className="rounded-xl border px-3 py-2"><option value="UNIT">Unidade</option><option value="KG">kg</option><option value="G">g</option><option value="L">litro</option><option value="ML">ml</option></select><input name="minimumStock" required inputMode="decimal" defaultValue="0" placeholder="Estoque mínimo" className="rounded-xl border px-3 py-2" /><button className="rounded-xl bg-zinc-900 px-4 py-2 text-white sm:col-span-3">Cadastrar</button></div>
          </form>
          <form action={setRecipeAction} className="rounded-2xl border bg-white p-5">
            <h2 className="font-semibold">Ficha técnica</h2><div className="mt-4 grid gap-3 sm:grid-cols-3"><select name="productId" required className="rounded-xl border px-3 py-2"><option value="">Produto</option>{products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select name="ingredientId" required className="rounded-xl border px-3 py-2"><option value="">Insumo</option>{ingredients.map((item) => <option key={item.id} value={item.id}>{item.name} ({unitNames[item.unit]})</option>)}</select><input name="quantity" required inputMode="decimal" placeholder="Qtd. por produto" className="rounded-xl border px-3 py-2" /><button className="rounded-xl bg-zinc-900 px-4 py-2 text-white sm:col-span-3">Salvar ficha</button></div>
          </form>
          <form action={stockEntryAction} className="rounded-2xl border bg-white p-5"><h2 className="font-semibold text-emerald-800">Entrada</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><select name="ingredientId" required className="rounded-xl border px-3 py-2"><option value="">Insumo</option>{ingredients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input name="quantity" required inputMode="decimal" placeholder="Quantidade" className="rounded-xl border px-3 py-2" /><input name="unitCost" required inputMode="decimal" placeholder="Custo por unidade" className="rounded-xl border px-3 py-2" /><input name="reason" required minLength={3} placeholder="Origem/motivo" className="rounded-xl border px-3 py-2" /><button className="rounded-xl bg-emerald-800 px-4 py-2 text-white sm:col-span-2">Registrar entrada</button></div></form>
          <form action={stockOutputAction} className="rounded-2xl border bg-white p-5"><h2 className="font-semibold text-red-800">Saída manual</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><select name="ingredientId" required className="rounded-xl border px-3 py-2"><option value="">Insumo</option>{ingredients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input name="quantity" required inputMode="decimal" placeholder="Quantidade" className="rounded-xl border px-3 py-2" /><input name="reason" required minLength={3} placeholder="Perda/uso/motivo" className="rounded-xl border px-3 py-2 sm:col-span-2" /><button className="rounded-xl bg-red-800 px-4 py-2 text-white sm:col-span-2">Registrar saída</button></div></form>
          <form action={inventoryCountAction} className="rounded-2xl border bg-white p-5 lg:col-span-2"><h2 className="font-semibold">Contagem de inventário</h2><div className="mt-4 grid gap-3 sm:grid-cols-3"><select name="ingredientId" required className="rounded-xl border px-3 py-2"><option value="">Insumo</option>{ingredients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input name="counted" required inputMode="decimal" placeholder="Quantidade contada" className="rounded-xl border px-3 py-2" /><input name="notes" placeholder="Observação" className="rounded-xl border px-3 py-2" /><button className="rounded-xl bg-amber-900 px-4 py-2 text-white sm:col-span-3">Ajustar pelo inventário</button></div></form>
        </section>
      ) : null}

      <section className="mt-8"><h2 className="text-xl font-semibold">Insumos</h2><div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{ingredients.map((item) => <article key={item.id} className={`rounded-2xl border bg-white p-5 ${item.currentStock.lte(item.minimumStock) ? "border-amber-400" : "border-zinc-200"}`}><div className="flex justify-between gap-3"><strong>{item.name}</strong><span>{item.currentStock.toString()} {unitNames[item.unit]}</span></div><p className="mt-2 text-sm text-zinc-500">Mínimo: {item.minimumStock.toString()} · Custo médio: {formatCurrency(item.averageUnitCost.toString())}/{unitNames[item.unit]}</p><div className="mt-3 text-xs text-zinc-500">{item.recipeItems.map((recipe) => <p key={recipe.id}>{recipe.product.name}: {recipe.quantity.toString()} {unitNames[item.unit]}</p>)}</div></article>)}</div></section>

      <section className="mt-8 rounded-2xl border bg-white p-5"><h2 className="text-xl font-semibold">Movimentações</h2><div className="mt-4 divide-y">{movements.map((item) => <div key={item.id} className="grid gap-2 py-3 text-sm md:grid-cols-[1fr_auto_auto]"><span><strong>{item.type}</strong> · {item.ingredient.name} · {item.reason}</span><span>{item.quantity.toString()} {unitNames[item.ingredient.unit]} · {item.balanceBefore.toString()} → {item.balanceAfter.toString()}</span><span>{item.user.name} · {item.createdAt.toLocaleString("pt-BR")}</span></div>)}</div></section>

      <section className="mt-8"><h2 className="text-xl font-semibold">Inventários recentes</h2><div className="mt-4 space-y-3">{inventories.map((inventory) => <article key={inventory.id} className="rounded-2xl border bg-white p-4 text-sm"><strong>{inventory.createdAt.toLocaleString("pt-BR")} · {inventory.user.name}</strong>{inventory.items.map((item) => <p key={item.id} className="mt-2">{item.ingredient.name}: esperado {item.expectedQuantity.toString()}, contado {item.countedQuantity.toString()}, diferença {item.difference.toString()} {unitNames[item.ingredient.unit]}</p>)}</article>)}</div></section>
    </main>
  );
}
