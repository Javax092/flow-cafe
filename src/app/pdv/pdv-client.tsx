"use client";

import { useActionState, useMemo, useState } from "react";

import { createSaleAction, type SaleActionState } from "./actions";

type Product = {
  id: string;
  name: string;
  price: string;
  category: string;
};

type CartItem = Product & { quantity: number; observation: string };

const initialState: SaleActionState = { success: false };
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function PdvClient({ products, canDiscount }: { products: Product[]; canDiscount: boolean }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [state, formAction, pending] = useActionState(
    async (previousState: SaleActionState, formData: FormData) => {
      const result = await createSaleAction(previousState, formData);
      if (result.success) setCart([]);
      return result;
    },
    initialState,
  );

  const visibleProducts = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    if (!term) return products;
    return products.filter((product) =>
      `${product.name} ${product.category}`.toLocaleLowerCase("pt-BR").includes(term),
    );
  }, [products, search]);

  const subtotal = cart.reduce(
    (sum, item) => sum + Math.round(Number(item.price) * 100) * item.quantity,
    0,
  );

  function addProduct(product: Product) {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        return current.map((item) => item.id === product.id && item.quantity < 99
          ? { ...item, quantity: item.quantity + 1 }
          : item);
      }
      return [...current, { ...product, quantity: 1, observation: "" }];
    });
  }

  function updateItem(id: string, changes: Partial<Pick<CartItem, "quantity" | "observation">>) {
    setCart((current) => current.map((item) => item.id === id ? { ...item, ...changes } : item));
  }

  return (
    <main className="mx-auto grid w-full max-w-[1500px] gap-6 px-5 py-8 lg:grid-cols-[1fr_25rem]">
      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-sm font-semibold uppercase tracking-wider text-amber-800">Venda</p><h1 className="mt-2 text-3xl font-semibold">PDV</h1></div>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar produto ou categoria" className="w-full rounded-xl border border-zinc-300 px-4 py-3 sm:w-80" />
        </div>
        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleProducts.map((product) => (
            <button key={product.id} type="button" onClick={() => addProduct(product)} className="rounded-2xl border border-zinc-200 bg-white p-5 text-left shadow-sm transition hover:border-amber-500 hover:shadow-md">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{product.category}</p>
              <h2 className="mt-2 text-lg font-semibold">{product.name}</h2>
              <p className="mt-4 text-xl font-bold text-amber-900">{currency.format(Number(product.price))}</p>
            </button>
          ))}
          {visibleProducts.length === 0 ? <p className="text-zinc-500">Nenhum produto disponível para venda.</p> : null}
        </div>
      </section>

      <aside className="h-fit rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm lg:sticky lg:top-6">
        <h2 className="text-xl font-semibold">Carrinho</h2>
        <div className="mt-5 space-y-4">
          {cart.map((item) => (
            <article key={item.id} className="rounded-xl bg-stone-50 p-4">
              <div className="flex justify-between gap-3"><strong>{item.name}</strong><button type="button" onClick={() => setCart((current) => current.filter((entry) => entry.id !== item.id))} className="text-sm text-red-700">Remover</button></div>
              <div className="mt-3 flex items-center gap-2">
                <button type="button" onClick={() => item.quantity === 1 ? setCart((current) => current.filter((entry) => entry.id !== item.id)) : updateItem(item.id, { quantity: item.quantity - 1 })} className="h-8 w-8 rounded-lg border">−</button>
                <span className="min-w-6 text-center">{item.quantity}</span>
                <button type="button" onClick={() => item.quantity < 99 && updateItem(item.id, { quantity: item.quantity + 1 })} className="h-8 w-8 rounded-lg border">+</button>
                <span className="ml-auto font-medium">{currency.format(Number(item.price) * item.quantity)}</span>
              </div>
              <input value={item.observation} onChange={(event) => updateItem(item.id, { observation: event.target.value })} maxLength={200} placeholder="Observação do item" className="mt-3 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm" />
            </article>
          ))}
          {cart.length === 0 ? <p className="py-8 text-center text-sm text-zinc-500">Selecione produtos para iniciar.</p> : null}
        </div>

        <form action={formAction} className="mt-6 border-t border-zinc-200 pt-5">
          <input type="hidden" name="cart" value={JSON.stringify(cart.map((item) => ({ productId: item.id, quantity: item.quantity, observation: item.observation || undefined })))} />
          <label className="block text-sm font-medium">Forma de pagamento
            <select name="paymentMethod" className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-3">
              <option value="PIX">PIX</option><option value="CASH">Dinheiro</option><option value="CREDIT_CARD">Cartão de crédito</option><option value="DEBIT_CARD">Cartão de débito</option>
            </select>
          </label>
          {canDiscount ? <label className="mt-4 block text-sm font-medium">Desconto
            <input name="discount" inputMode="decimal" defaultValue="0,00" className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-3" />
          </label> : <input type="hidden" name="discount" value="0" />}
          <label className="mt-4 block text-sm font-medium">Observação geral
            <textarea name="notes" maxLength={500} className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-3" />
          </label>
          <div className="mt-5 flex justify-between text-lg"><span>Subtotal visual</span><strong>{currency.format(subtotal / 100)}</strong></div>
          <p className="mt-1 text-xs text-zinc-500">O total definitivo é recalculado no servidor.</p>
          {state.message ? <p role="status" className={`mt-4 rounded-lg px-3 py-2 text-sm ${state.success ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{state.message}</p> : null}
          <button disabled={pending || cart.length === 0} className="mt-5 w-full rounded-xl bg-amber-900 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
            {pending ? "Salvando…" : "Finalizar venda"}
          </button>
        </form>
      </aside>
    </main>
  );
}
