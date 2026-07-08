import "server-only";

import { Prisma } from "@prisma/client";

type SaleStockItem = { productId?: string; quantity: number };

export async function consumeStockForSale(
  tx: Prisma.TransactionClient,
  data: {
    businessId: string;
    userId: string;
    saleId: string;
    items: SaleStockItem[];
  },
) {
  const productIds = data.items.flatMap((item) => item.productId ? [item.productId] : []);
  const recipes = await tx.recipeItem.findMany({
    where: { businessId: data.businessId, productId: { in: productIds } },
  });
  const ingredientIds = [...new Set(recipes.map((recipe) => recipe.ingredientId))].sort();
  if (ingredientIds.length === 0) return new Map<string, Prisma.Decimal>();

  await tx.$queryRaw(Prisma.sql`
    SELECT "id" FROM "Ingredient"
    WHERE "businessId" = ${data.businessId}
      AND "id" IN (${Prisma.join(ingredientIds)})
    ORDER BY "id" FOR UPDATE
  `);
  const ingredients = await tx.ingredient.findMany({
    where: { businessId: data.businessId, id: { in: ingredientIds }, isActive: true },
  });
  if (ingredients.length !== ingredientIds.length) throw new Error("A ficha técnica possui insumo inativo ou inválido.");

  const soldByProduct = new Map(data.items.map((item) => [item.productId, item.quantity]));
  const requiredByIngredient = new Map<string, Prisma.Decimal>();
  const costByProduct = new Map<string, Prisma.Decimal>();

  for (const recipe of recipes) {
    const sold = soldByProduct.get(recipe.productId) ?? 0;
    const required = recipe.quantity.mul(sold);
    requiredByIngredient.set(
      recipe.ingredientId,
      (requiredByIngredient.get(recipe.ingredientId) ?? new Prisma.Decimal(0)).add(required),
    );
    const ingredient = ingredients.find((item) => item.id === recipe.ingredientId);
    if (!ingredient) throw new Error("Insumo da ficha técnica não encontrado.");
    costByProduct.set(
      recipe.productId,
      (costByProduct.get(recipe.productId) ?? new Prisma.Decimal(0)).add(required.mul(ingredient.averageUnitCost)),
    );
  }

  for (const ingredient of ingredients) {
    const required = requiredByIngredient.get(ingredient.id) ?? new Prisma.Decimal(0);
    if (ingredient.currentStock.lt(required)) {
      throw new Error(
        `Estoque insuficiente de ${ingredient.name}: disponível ${ingredient.currentStock.toString()} ${ingredient.unit}, necessário ${required.toString()} ${ingredient.unit}.`,
      );
    }
    const balanceAfter = ingredient.currentStock.sub(required);
    await tx.ingredient.update({
      where: { id: ingredient.id },
      data: { currentStock: balanceAfter },
    });
    await tx.stockMovement.create({
      data: {
        businessId: data.businessId,
        ingredientId: ingredient.id,
        userId: data.userId,
        saleId: data.saleId,
        type: "SALE",
        quantity: required,
        balanceBefore: ingredient.currentStock,
        balanceAfter,
        unitCostSnapshot: ingredient.averageUnitCost,
        totalCost: required.mul(ingredient.averageUnitCost),
        reason: `Baixa automática da venda ${data.saleId}`,
      },
    });
  }
  return costByProduct;
}

export async function reverseStockForSale(
  tx: Prisma.TransactionClient,
  data: { businessId: string; userId: string; saleId: string },
) {
  const movements = await tx.stockMovement.findMany({
    where: { businessId: data.businessId, saleId: data.saleId, type: "SALE" },
    orderBy: { ingredientId: "asc" },
  });
  const ids = [...new Set(movements.map((movement) => movement.ingredientId))];
  if (ids.length === 0) return;
  await tx.$queryRaw(Prisma.sql`
    SELECT "id" FROM "Ingredient" WHERE "id" IN (${Prisma.join(ids)}) ORDER BY "id" FOR UPDATE
  `);
  for (const movement of movements) {
    const ingredient = await tx.ingredient.findUniqueOrThrow({ where: { id: movement.ingredientId } });
    const balanceAfter = ingredient.currentStock.add(movement.quantity);
    await tx.ingredient.update({ where: { id: ingredient.id }, data: { currentStock: balanceAfter } });
    await tx.stockMovement.create({
      data: {
        businessId: data.businessId,
        ingredientId: ingredient.id,
        userId: data.userId,
        saleId: data.saleId,
        type: "REVERSAL",
        quantity: movement.quantity,
        balanceBefore: ingredient.currentStock,
        balanceAfter,
        unitCostSnapshot: movement.unitCostSnapshot,
        totalCost: movement.totalCost,
        reason: `Estorno automático do cancelamento ${data.saleId}`,
      },
    });
  }
}
