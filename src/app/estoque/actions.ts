"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { guardAuthenticatedAction } from "@/server/security/actions";
import { idSchema, optionalTextSchema, textSchema } from "@/server/security/validation";
import { InventoryService } from "@/server/services/inventory.service";

const service = new InventoryService();
const quantity = z.string().trim().regex(/^\d+(?:[.,]\d{1,3})?$/).transform((value) => value.replace(",", "."));
const cost = z.string().trim().regex(/^\d+(?:[.,]\d{1,4})?$/).transform((value) => value.replace(",", "."));

function refresh() {
  revalidatePath("/estoque");
  revalidatePath("/gerencial");
}

export async function createIngredientAction(formData: FormData) {
  const input = {
    name: textSchema(2, 100).parse(formData.get("name")),
    unit: z.enum(["UNIT", "KG", "G", "L", "ML"]).parse(formData.get("unit")),
    minimumStock: quantity.parse(formData.get("minimumStock")),
  };
  await guardAuthenticatedAction({ action: "ingredient:create", duplicateKey: `${input.name}:${input.unit}` });
  await service.createIngredient(input);
  refresh();
}

export async function stockEntryAction(formData: FormData) {
  const ingredientId = idSchema.parse(formData.get("ingredientId"));
  const parsedQuantity = quantity.parse(formData.get("quantity"));
  const unitCost = cost.parse(formData.get("unitCost"));
  const reason = textSchema(3, 200).parse(formData.get("reason"));
  await guardAuthenticatedAction({
    action: "stock:entry",
    duplicateKey: `${ingredientId}:${parsedQuantity}:${unitCost}:${reason}`,
  });
  await service.addEntry(
    ingredientId,
    parsedQuantity,
    unitCost,
    reason,
  );
  refresh();
}

export async function stockOutputAction(formData: FormData) {
  const ingredientId = idSchema.parse(formData.get("ingredientId"));
  const parsedQuantity = quantity.parse(formData.get("quantity"));
  const reason = textSchema(3, 200).parse(formData.get("reason"));
  await guardAuthenticatedAction({
    action: "stock:output",
    duplicateKey: `${ingredientId}:${parsedQuantity}:${reason}`,
  });
  await service.addOutput(
    ingredientId,
    parsedQuantity,
    reason,
  );
  refresh();
}

export async function setRecipeAction(formData: FormData) {
  const productId = idSchema.parse(formData.get("productId"));
  const ingredientId = idSchema.parse(formData.get("ingredientId"));
  const parsedQuantity = quantity.parse(formData.get("quantity"));
  await guardAuthenticatedAction({
    action: "recipe:set",
    duplicateKey: `${productId}:${ingredientId}:${parsedQuantity}`,
  });
  await service.setRecipe(
    productId,
    ingredientId,
    parsedQuantity,
  );
  refresh();
}

export async function inventoryCountAction(formData: FormData) {
  const ingredientId = idSchema.parse(formData.get("ingredientId"));
  const counted = quantity.parse(formData.get("counted"));
  const notes = optionalTextSchema(300).parse(formData.get("notes"));
  await guardAuthenticatedAction({
    action: "inventory:count",
    duplicateKey: `${ingredientId}:${counted}:${notes ?? ""}`,
  });
  await service.countInventory(
    ingredientId,
    counted,
    notes,
  );
  refresh();
}
