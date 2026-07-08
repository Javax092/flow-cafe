import { requireAuthContext } from "@/server/auth/context";
import { can } from "@/server/rbac/permissions";
import { ProductService } from "@/server/services/product.service";

import { PdvClient } from "./pdv-client";

const productService = new ProductService();

export default async function PdvPage() {
  const [products, ctx] = await Promise.all([
    productService.listSaleableProducts(),
    requireAuthContext(),
  ]);

  return (
    <PdvClient
      canDiscount={can(ctx.role, "APPLY_DISCOUNT")}
      canManageCatalog={can(ctx.role, "MANAGE_PRODUCTS")}
      products={products.map((product) => ({
        id: product.id,
        name: product.name,
        price: product.price.toString(),
        category: product.category?.name ?? "Geral",
      }))}
    />
  );
}
