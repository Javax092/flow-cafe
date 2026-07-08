import { formatCurrency } from "@/lib/format-currency";
import { CategoryService } from "@/server/services/category.service";
import { ProductService } from "@/server/services/product.service";

import {
  createCategoryAction,
  createProductAction,
  setCategoryActiveAction,
  setCategoryOrderAction,
  setCategoryPrintSectorAction,
  setProductOrderAction,
  setProductStatusAction,
} from "./actions";

const categoryService = new CategoryService();
const productService = new ProductService();

type CatalogPageProps = { searchParams: Promise<{ busca?: string }> };

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const search = (await searchParams).busca?.trim() ?? "";
  const [categories, products] = await Promise.all([
    categoryService.listCategories(),
    productService.listProducts(search),
  ]);

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-10 text-zinc-950">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-amber-800">Gestão</p>
          <h1 className="mt-2 text-3xl font-semibold">Catálogo de produtos</h1>
        </div>
        <form className="flex gap-2" role="search">
          <input name="busca" defaultValue={search} placeholder="Buscar produto" className="rounded-xl border border-zinc-300 px-4 py-2" />
          <button className="rounded-xl bg-zinc-900 px-4 py-2 text-white">Buscar</button>
        </form>
      </div>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <form action={createCategoryAction} className="rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="text-xl font-semibold">Nova categoria</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input name="name" required minLength={2} maxLength={80} placeholder="Nome" className="rounded-xl border border-zinc-300 px-4 py-3" />
            <input name="sortOrder" required type="number" min="0" defaultValue="0" aria-label="Ordem" className="rounded-xl border border-zinc-300 px-4 py-3" />
            <input name="printSector" required defaultValue="COZINHA" maxLength={40} placeholder="Setor de impressão" className="rounded-xl border border-zinc-300 px-4 py-3" />
            <button className="rounded-xl bg-amber-900 px-5 py-3 font-medium text-white">Adicionar</button>
          </div>
        </form>

        <form action={createProductAction} className="rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="text-xl font-semibold">Novo produto</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input name="name" required minLength={2} maxLength={120} placeholder="Nome" className="rounded-xl border border-zinc-300 px-4 py-3" />
            <input name="price" required inputMode="decimal" placeholder="Preço (ex.: 12,90)" className="rounded-xl border border-zinc-300 px-4 py-3" />
            <select name="categoryId" className="rounded-xl border border-zinc-300 px-4 py-3">
              <option value="">Sem categoria</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            <input name="sortOrder" required type="number" min="0" defaultValue="0" aria-label="Ordem" className="rounded-xl border border-zinc-300 px-4 py-3" />
            <textarea name="description" maxLength={500} placeholder="Descrição" className="rounded-xl border border-zinc-300 px-4 py-3 sm:col-span-2" />
            <button className="rounded-xl bg-amber-900 px-5 py-3 font-medium text-white sm:col-span-2">Cadastrar produto</button>
          </div>
        </form>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Categorias</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <article key={category.id} className="rounded-2xl border border-zinc-200 bg-white p-4">
              <div className="flex justify-between gap-3"><strong>{category.name}</strong><span className="text-sm text-zinc-500">{category._count.products} produtos</span></div>
              <div className="mt-4 flex items-center gap-2">
                <form action={setCategoryOrderAction.bind(null, category.id)} className="flex gap-2">
                  <input name="sortOrder" type="number" min="0" defaultValue={category.sortOrder} aria-label={`Ordem de ${category.name}`} className="w-20 rounded-lg border border-zinc-300 px-2 py-1" />
                  <button className="text-sm underline">Ordenar</button>
                </form>
                <form action={setCategoryActiveAction.bind(null, category.id, !category.isActive)} className="ml-auto">
                  <button className={`rounded-lg px-3 py-1 text-sm ${category.isActive ? "bg-emerald-100 text-emerald-800" : "bg-zinc-200 text-zinc-700"}`}>
                    {category.isActive ? "Ativa" : "Inativa"}
                  </button>
                </form>
              </div>
              <form action={setCategoryPrintSectorAction.bind(null, category.id)} className="mt-3 flex gap-2">
                <input name="printSector" required defaultValue={category.printSector} maxLength={40} aria-label={`Setor de ${category.name}`} className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-2 py-1 text-sm" />
                <button className="text-sm underline">Salvar setor</button>
              </form>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Produtos ({products.length})</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <article key={product.id} className="rounded-2xl border border-zinc-200 bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div><h3 className="font-semibold">{product.name}</h3><p className="mt-1 text-sm text-zinc-500">{product.category?.name ?? "Sem categoria"}</p></div>
                <strong>{formatCurrency(product.price.toString())}</strong>
              </div>
              {product.description ? <p className="mt-3 text-sm text-zinc-600">{product.description}</p> : null}
              <div className="mt-5 flex items-center gap-2">
                <form action={setProductOrderAction.bind(null, product.id)} className="flex gap-2">
                  <input name="sortOrder" type="number" min="0" defaultValue={product.sortOrder} aria-label={`Ordem de ${product.name}`} className="w-20 rounded-lg border border-zinc-300 px-2 py-1" />
                  <button className="text-sm underline">Ordenar</button>
                </form>
                <form action={setProductStatusAction.bind(null, product.id, product.status !== "ACTIVE")} className="ml-auto">
                  <button className={`rounded-lg px-3 py-1 text-sm ${product.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800" : "bg-zinc-200 text-zinc-700"}`}>
                    {product.status === "ACTIVE" ? "Ativo" : "Inativo"}
                  </button>
                </form>
              </div>
            </article>
          ))}
          {products.length === 0 ? <p className="text-zinc-500">Nenhum produto encontrado.</p> : null}
        </div>
      </section>
    </main>
  );
}
