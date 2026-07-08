CREATE TYPE "PrintDocumentType" AS ENUM ('COMMAND', 'RECEIPT');

ALTER TABLE "PrintJob"
ADD COLUMN "documentType" "PrintDocumentType" NOT NULL DEFAULT 'RECEIPT',
ADD COLUMN "sector" TEXT NOT NULL DEFAULT 'CAIXA';

ALTER TABLE "Category"
ADD COLUMN "printSector" TEXT NOT NULL DEFAULT 'COZINHA';

CREATE UNIQUE INDEX "PrintJob_businessId_orderId_documentType_sector_key"
ON "PrintJob"("businessId", "orderId", "documentType", "sector");

CREATE INDEX "PrintJob_businessId_status_createdAt_idx"
ON "PrintJob"("businessId", "status", "createdAt");
