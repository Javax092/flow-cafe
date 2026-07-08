"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { CategoryService } from "@/server/services/category.service";
import { ProductService } from "@/server/services/product.service";
import { guardAuthenticatedAction } from "@/server/security/actions";
import {
  idSchema,
  positiveMoneySchema,
  optionalTextSchema,
  textSchema,
} from "@/server/security/validation";

const categoryService = new CategoryService();
const productService = new ProductService();

const orderSchema = z.coerce.number().int().min(0).max(100_000);

const categorySchema = z.object({
  name: textSchema(2, 80),
  sortOrder: orderSchema,
  printSector: textSchema(2, 40),
});

const productSchema = z.object({
  name: textSchema(2, 120),
  description: optionalTextSchema(500),
  price: positiveMoneySchema,
  categoryId: idSchema.optional(),
  sortOrder: orderSchema,
});

function refreshCatalog() {
  revalidatePath("/catalogo");
  revalidatePath("/pdv");
}

export async function createCategoryAction(formData: FormData) {
  const input = categorySchema.parse({
    name: formData.get("name"),
    sortOrder: formData.get("sortOrder"),
    printSector: formData.get("printSector"),
  });
  await guardAuthenticatedAction({
    action: "category:create",
    duplicateKey: `${input.name}:${input.printSector}`,
  });
  await categoryService.createCategory(input.name, input.sortOrder, input.printSector.toLocaleUpperCase("pt-BR"));
  refreshCatalog();
}

export async function setCategoryPrintSectorAction(categoryId: string, formData: FormData) {
  const parsedId = idSchema.parse(categoryId);
  const sector = textSchema(2, 40).parse(formData.get("printSector"));
  await guardAuthenticatedAction({ action: "category:sector", duplicateKey: `${parsedId}:${sector}` });
  await categoryService.setCategoryPrintSector(parsedId, sector.toLocaleUpperCase("pt-BR"));
  refreshCatalog();
}

export async function setCategoryActiveAction(categoryId: string, active: boolean) {
  const parsedId = idSchema.parse(categoryId);
  const parsedActive = z.boolean().parse(active);
  await guardAuthenticatedAction({ action: "category:active", duplicateKey: `${parsedId}:${parsedActive}` });
  await categoryService.setCategoryActive(parsedId, parsedActive);
  refreshCatalog();
}

export async function setCategoryOrderAction(categoryId: string, formData: FormData) {
  const parsedId = idSchema.parse(categoryId);
  const sortOrder = orderSchema.parse(formData.get("sortOrder"));
  await guardAuthenticatedAction({ action: "category:order", duplicateKey: `${parsedId}:${sortOrder}` });
  await categoryService.setCategorySortOrder(
    parsedId,
    sortOrder,
  );
  refreshCatalog();
}

export async function createProductAction(formData: FormData) {
  const input = productSchema.parse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    price: formData.get("price"),
    categoryId: formData.get("categoryId") || undefined,
    sortOrder: formData.get("sortOrder"),
  });
  await guardAuthenticatedAction({
    action: "product:create",
    duplicateKey: `${input.name}:${input.price}:${input.categoryId ?? ""}`,
  });
  await productService.createProduct(input);
  refreshCatalog();
}

export async function setProductStatusAction(productId: string, active: boolean) {
  const parsedId = idSchema.parse(productId);
  const status = z.boolean().parse(active) ? "ACTIVE" : "INACTIVE";
  await guardAuthenticatedAction({ action: "product:status", duplicateKey: `${parsedId}:${status}` });
  await productService.setProductStatus(
    parsedId,
    status,
  );
  refreshCatalog();
}

export async function setProductOrderAction(productId: string, formData: FormData) {
  const parsedId = idSchema.parse(productId);
  const sortOrder = orderSchema.parse(formData.get("sortOrder"));
  await guardAuthenticatedAction({ action: "product:order", duplicateKey: `${parsedId}:${sortOrder}` });
  await productService.setProductSortOrder(
    parsedId,
    sortOrder,
  );
  refreshCatalog();
}
