import "server-only";

import { Prisma, type StockUnit } from "@prisma/client";

import { appendAuditLog } from "@/server/audit/audit.service";
import { prisma } from "@/server/db/prisma";
import { requirePermission } from "@/server/rbac/permissions";

function positiveDecimal(value: string, label: string) {
  const number = new Prisma.Decimal(value);
  if (!number.isPositive()) throw new Error(`${label} deve ser maior que zero.`);
  return number;
}

export class InventoryService {
  async getDashboard() {
    const ctx = await requirePermission("VIEW_INVENTORY");
    const [ingredients, products, movements, inventories] = await Promise.all([
      prisma.ingredient.findMany({
        where: { businessId: ctx.businessId, isActive: true },
        include: { recipeItems: { include: { product: { select: { id: true, name: true } } } } },
        orderBy: { name: "asc" },
      }),
      prisma.product.findMany({
        where: { businessId: ctx.businessId, status: "ACTIVE" },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.stockMovement.findMany({
        where: { businessId: ctx.businessId },
        include: { ingredient: { select: { name: true, unit: true } }, user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.inventoryCount.findMany({
        where: { businessId: ctx.businessId },
        include: { items: { include: { ingredient: { select: { name: true, unit: true } } } }, user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);
    return { ingredients, products, movements, inventories };
  }

  async createIngredient(input: { name: string; unit: StockUnit; minimumStock: string }) {
    const ctx = await requirePermission("MANAGE_INVENTORY");
    const minimumStock = new Prisma.Decimal(input.minimumStock);
    if (minimumStock.isNegative()) throw new Error("Estoque mínimo não pode ser negativo.");
    return prisma.$transaction(async (tx) => {
      const ingredient = await tx.ingredient.create({
        data: { businessId: ctx.businessId, name: input.name, unit: input.unit, minimumStock },
      });
      await appendAuditLog({
        businessId: ctx.businessId, userId: ctx.userId, action: "INGREDIENT_CREATED",
        entity: "Ingredient", entityId: ingredient.id,
        after: { name: ingredient.name, unit: ingredient.unit, minimumStock: ingredient.minimumStock.toString() },
      }, tx);
      return ingredient;
    });
  }

  async addEntry(ingredientId: string, quantityValue: string, unitCostValue: string, reason: string) {
    const ctx = await requirePermission("MANAGE_INVENTORY");
    const quantity = positiveDecimal(quantityValue, "Quantidade");
    const unitCost = positiveDecimal(unitCostValue, "Custo unitário");
    return prisma.$transaction(async (tx) => {
      const ingredient = await this.lockIngredient(tx, ctx.businessId, ingredientId);
      const balanceAfter = ingredient.currentStock.add(quantity);
      const averageUnitCost = ingredient.currentStock.mul(ingredient.averageUnitCost)
        .add(quantity.mul(unitCost)).div(balanceAfter);
      const updated = await tx.ingredient.update({
        where: { id: ingredient.id },
        data: { currentStock: balanceAfter, averageUnitCost },
      });
      const movement = await tx.stockMovement.create({ data: {
        businessId: ctx.businessId, ingredientId, userId: ctx.userId, type: "ENTRY",
        quantity, balanceBefore: ingredient.currentStock, balanceAfter,
        unitCostSnapshot: unitCost, totalCost: quantity.mul(unitCost), reason,
      } });
      await appendAuditLog({
        businessId: ctx.businessId, userId: ctx.userId, action: "STOCK_ENTRY_CREATED",
        entity: "StockMovement", entityId: movement.id, reason,
        before: { stock: ingredient.currentStock.toString(), averageUnitCost: ingredient.averageUnitCost.toString() },
        after: { stock: updated.currentStock.toString(), averageUnitCost: updated.averageUnitCost.toString() },
      }, tx);
      return movement;
    });
  }

  async addOutput(ingredientId: string, quantityValue: string, reason: string) {
    const ctx = await requirePermission("MANAGE_INVENTORY");
    const quantity = positiveDecimal(quantityValue, "Quantidade");
    return prisma.$transaction(async (tx) => {
      const ingredient = await this.lockIngredient(tx, ctx.businessId, ingredientId);
      if (ingredient.currentStock.lt(quantity)) throw new Error("Saída recusada: estoque negativo não é permitido.");
      const balanceAfter = ingredient.currentStock.sub(quantity);
      await tx.ingredient.update({ where: { id: ingredient.id }, data: { currentStock: balanceAfter } });
      const movement = await tx.stockMovement.create({ data: {
        businessId: ctx.businessId, ingredientId, userId: ctx.userId, type: "OUT",
        quantity, balanceBefore: ingredient.currentStock, balanceAfter,
        unitCostSnapshot: ingredient.averageUnitCost,
        totalCost: quantity.mul(ingredient.averageUnitCost), reason,
      } });
      await appendAuditLog({
        businessId: ctx.businessId, userId: ctx.userId, action: "STOCK_OUTPUT_CREATED",
        entity: "StockMovement", entityId: movement.id, reason,
        before: { stock: ingredient.currentStock.toString() }, after: { stock: balanceAfter.toString() },
      }, tx);
      return movement;
    });
  }

  async setRecipe(productId: string, ingredientId: string, quantityValue: string) {
    const ctx = await requirePermission("MANAGE_INVENTORY");
    const quantity = positiveDecimal(quantityValue, "Quantidade da ficha técnica");
    return prisma.$transaction(async (tx) => {
      const [product, ingredient] = await Promise.all([
        tx.product.findFirst({ where: { id: productId, businessId: ctx.businessId }, select: { id: true } }),
        tx.ingredient.findFirst({ where: { id: ingredientId, businessId: ctx.businessId, isActive: true }, select: { id: true } }),
      ]);
      if (!product || !ingredient) throw new Error("Produto ou insumo inválido.");
      const before = await tx.recipeItem.findUnique({ where: { productId_ingredientId: { productId, ingredientId } } });
      const recipe = await tx.recipeItem.upsert({
        where: { productId_ingredientId: { productId, ingredientId } },
        update: { quantity },
        create: { businessId: ctx.businessId, productId, ingredientId, quantity },
      });
      await appendAuditLog({
        businessId: ctx.businessId, userId: ctx.userId,
        action: before ? "RECIPE_ITEM_CHANGED" : "RECIPE_ITEM_CREATED",
        entity: "RecipeItem", entityId: recipe.id,
        before: before ? { quantity: before.quantity.toString() } : undefined,
        after: { productId, ingredientId, quantity: recipe.quantity.toString() },
      }, tx);
      return recipe;
    });
  }

  async countInventory(ingredientId: string, countedValue: string, notes?: string) {
    const ctx = await requirePermission("MANAGE_INVENTORY");
    const counted = new Prisma.Decimal(countedValue);
    if (counted.isNegative()) throw new Error("A contagem não pode ser negativa.");
    return prisma.$transaction(async (tx) => {
      const ingredient = await this.lockIngredient(tx, ctx.businessId, ingredientId);
      const difference = counted.sub(ingredient.currentStock);
      const inventory = await tx.inventoryCount.create({
        data: {
          businessId: ctx.businessId, userId: ctx.userId, notes,
          items: { create: {
            businessId: ctx.businessId, ingredientId,
            expectedQuantity: ingredient.currentStock, countedQuantity: counted, difference,
          } },
        },
      });
      await tx.ingredient.update({ where: { id: ingredient.id }, data: { currentStock: counted } });
      await tx.stockMovement.create({ data: {
        businessId: ctx.businessId, ingredientId, userId: ctx.userId, type: "INVENTORY",
        quantity: difference.abs(), balanceBefore: ingredient.currentStock, balanceAfter: counted,
        unitCostSnapshot: ingredient.averageUnitCost,
        totalCost: difference.abs().mul(ingredient.averageUnitCost),
        reason: notes ?? `Inventário ${inventory.id}`,
      } });
      await appendAuditLog({
        businessId: ctx.businessId, userId: ctx.userId, action: "INVENTORY_COUNTED",
        entity: "InventoryCount", entityId: inventory.id, reason: notes,
        before: { stock: ingredient.currentStock.toString() },
        after: { stock: counted.toString(), difference: difference.toString() },
      }, tx);
      return inventory;
    });
  }

  private async lockIngredient(tx: Prisma.TransactionClient, businessId: string, ingredientId: string) {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "Ingredient"
      WHERE "id" = ${ingredientId} AND "businessId" = ${businessId} AND "isActive" = true
      FOR UPDATE
    `;
    if (!rows[0]) throw new Error("Insumo não encontrado.");
    return tx.ingredient.findUniqueOrThrow({ where: { id: ingredientId } });
  }
}
