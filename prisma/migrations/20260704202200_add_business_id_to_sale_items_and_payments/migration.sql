/*
  Warnings:

  - Added the required column `businessId` to the `Payment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `businessId` to the `SaleItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "businessId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "SaleItem" ADD COLUMN     "businessId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Payment_businessId_idx" ON "Payment"("businessId");

-- CreateIndex
CREATE INDEX "SaleItem_businessId_idx" ON "SaleItem"("businessId");

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
