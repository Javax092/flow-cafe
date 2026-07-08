CREATE TYPE "StockUnit" AS ENUM ('UNIT', 'KG', 'G', 'L', 'ML');
CREATE TYPE "StockMovementType" AS ENUM ('ENTRY', 'OUT', 'SALE', 'REVERSAL', 'INVENTORY');

ALTER TABLE "Sale" ADD COLUMN "costTotal" DECIMAL(12,4) NOT NULL DEFAULT 0;
ALTER TABLE "SaleItem" ADD COLUMN "costSubtotal" DECIMAL(12,4) NOT NULL DEFAULT 0;

CREATE TABLE "Ingredient" (
  "id" TEXT NOT NULL, "businessId" TEXT NOT NULL, "name" TEXT NOT NULL,
  "unit" "StockUnit" NOT NULL, "currentStock" DECIMAL(14,3) NOT NULL DEFAULT 0,
  "minimumStock" DECIMAL(14,3) NOT NULL DEFAULT 0,
  "averageUnitCost" DECIMAL(14,4) NOT NULL DEFAULT 0, "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "RecipeItem" (
  "id" TEXT NOT NULL, "businessId" TEXT NOT NULL, "productId" TEXT NOT NULL,
  "ingredientId" TEXT NOT NULL, "quantity" DECIMAL(14,3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RecipeItem_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "StockMovement" (
  "id" TEXT NOT NULL, "businessId" TEXT NOT NULL, "ingredientId" TEXT NOT NULL,
  "userId" TEXT NOT NULL, "saleId" TEXT, "type" "StockMovementType" NOT NULL,
  "quantity" DECIMAL(14,3) NOT NULL, "balanceBefore" DECIMAL(14,3) NOT NULL,
  "balanceAfter" DECIMAL(14,3) NOT NULL, "unitCostSnapshot" DECIMAL(14,4) NOT NULL,
  "totalCost" DECIMAL(14,4) NOT NULL, "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "InventoryCount" (
  "id" TEXT NOT NULL, "businessId" TEXT NOT NULL, "userId" TEXT NOT NULL,
  "notes" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryCount_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "InventoryCountItem" (
  "id" TEXT NOT NULL, "businessId" TEXT NOT NULL, "inventoryCountId" TEXT NOT NULL,
  "ingredientId" TEXT NOT NULL, "expectedQuantity" DECIMAL(14,3) NOT NULL,
  "countedQuantity" DECIMAL(14,3) NOT NULL, "difference" DECIMAL(14,3) NOT NULL,
  CONSTRAINT "InventoryCountItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Ingredient_businessId_name_key" ON "Ingredient"("businessId", "name");
CREATE INDEX "Ingredient_businessId_isActive_idx" ON "Ingredient"("businessId", "isActive");
CREATE UNIQUE INDEX "RecipeItem_productId_ingredientId_key" ON "RecipeItem"("productId", "ingredientId");
CREATE INDEX "RecipeItem_businessId_idx" ON "RecipeItem"("businessId");
CREATE INDEX "RecipeItem_ingredientId_idx" ON "RecipeItem"("ingredientId");
CREATE INDEX "StockMovement_businessId_createdAt_idx" ON "StockMovement"("businessId", "createdAt");
CREATE INDEX "StockMovement_ingredientId_createdAt_idx" ON "StockMovement"("ingredientId", "createdAt");
CREATE INDEX "StockMovement_saleId_idx" ON "StockMovement"("saleId");
CREATE INDEX "InventoryCount_businessId_createdAt_idx" ON "InventoryCount"("businessId", "createdAt");
CREATE INDEX "InventoryCountItem_businessId_idx" ON "InventoryCountItem"("businessId");
CREATE INDEX "InventoryCountItem_inventoryCountId_idx" ON "InventoryCountItem"("inventoryCountId");
CREATE INDEX "InventoryCountItem_ingredientId_idx" ON "InventoryCountItem"("ingredientId");

ALTER TABLE "Ingredient" ADD CONSTRAINT "Ingredient_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RecipeItem" ADD CONSTRAINT "RecipeItem_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RecipeItem" ADD CONSTRAINT "RecipeItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RecipeItem" ADD CONSTRAINT "RecipeItem_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryCount" ADD CONSTRAINT "InventoryCount_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryCount" ADD CONSTRAINT "InventoryCount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryCountItem" ADD CONSTRAINT "InventoryCountItem_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryCountItem" ADD CONSTRAINT "InventoryCountItem_inventoryCountId_fkey" FOREIGN KEY ("inventoryCountId") REFERENCES "InventoryCount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryCountItem" ADD CONSTRAINT "InventoryCountItem_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
