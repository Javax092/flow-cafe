ALTER TABLE "Product"
ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "Product_businessId_sortOrder_idx"
ON "Product"("businessId", "sortOrder");
