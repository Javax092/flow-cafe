CREATE TYPE "TabStatus" AS ENUM ('OPEN', 'CLOSED');

CREATE TABLE "DiningTable" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DiningTable_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Tab" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "currentTableId" TEXT NOT NULL,
  "openedByUserId" TEXT NOT NULL,
  "closedByUserId" TEXT,
  "status" "TabStatus" NOT NULL DEFAULT 'OPEN',
  "customerName" TEXT,
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Tab_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TabOrder" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "tabId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TabOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TabOrderItem" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "tabOrderId" TEXT NOT NULL,
  "productId" TEXT,
  "productNameSnapshot" TEXT NOT NULL,
  "unitPriceSnapshot" DECIMAL(10,2) NOT NULL,
  "quantity" INTEGER NOT NULL,
  "subtotal" DECIMAL(10,2) NOT NULL,
  "observation" TEXT,
  CONSTRAINT "TabOrderItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TabTransfer" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "tabId" TEXT NOT NULL,
  "fromTableId" TEXT NOT NULL,
  "toTableId" TEXT NOT NULL,
  "transferredByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TabTransfer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DiningTable_businessId_name_key" ON "DiningTable"("businessId", "name");
CREATE INDEX "DiningTable_businessId_sortOrder_idx" ON "DiningTable"("businessId", "sortOrder");
CREATE INDEX "Tab_businessId_status_idx" ON "Tab"("businessId", "status");
CREATE INDEX "Tab_currentTableId_status_idx" ON "Tab"("currentTableId", "status");
CREATE INDEX "Tab_openedAt_idx" ON "Tab"("openedAt");
CREATE UNIQUE INDEX "Tab_one_open_per_table_key" ON "Tab"("currentTableId") WHERE "status" = 'OPEN';
CREATE INDEX "TabOrder_businessId_idx" ON "TabOrder"("businessId");
CREATE INDEX "TabOrder_tabId_createdAt_idx" ON "TabOrder"("tabId", "createdAt");
CREATE INDEX "TabOrderItem_businessId_idx" ON "TabOrderItem"("businessId");
CREATE INDEX "TabOrderItem_tabOrderId_idx" ON "TabOrderItem"("tabOrderId");
CREATE INDEX "TabOrderItem_productId_idx" ON "TabOrderItem"("productId");
CREATE INDEX "TabTransfer_businessId_idx" ON "TabTransfer"("businessId");
CREATE INDEX "TabTransfer_tabId_createdAt_idx" ON "TabTransfer"("tabId", "createdAt");

ALTER TABLE "DiningTable" ADD CONSTRAINT "DiningTable_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Tab" ADD CONSTRAINT "Tab_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Tab" ADD CONSTRAINT "Tab_currentTableId_fkey" FOREIGN KEY ("currentTableId") REFERENCES "DiningTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Tab" ADD CONSTRAINT "Tab_openedByUserId_fkey" FOREIGN KEY ("openedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Tab" ADD CONSTRAINT "Tab_closedByUserId_fkey" FOREIGN KEY ("closedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TabOrder" ADD CONSTRAINT "TabOrder_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TabOrder" ADD CONSTRAINT "TabOrder_tabId_fkey" FOREIGN KEY ("tabId") REFERENCES "Tab"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TabOrder" ADD CONSTRAINT "TabOrder_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TabOrderItem" ADD CONSTRAINT "TabOrderItem_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TabOrderItem" ADD CONSTRAINT "TabOrderItem_tabOrderId_fkey" FOREIGN KEY ("tabOrderId") REFERENCES "TabOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TabOrderItem" ADD CONSTRAINT "TabOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TabTransfer" ADD CONSTRAINT "TabTransfer_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TabTransfer" ADD CONSTRAINT "TabTransfer_tabId_fkey" FOREIGN KEY ("tabId") REFERENCES "Tab"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TabTransfer" ADD CONSTRAINT "TabTransfer_fromTableId_fkey" FOREIGN KEY ("fromTableId") REFERENCES "DiningTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TabTransfer" ADD CONSTRAINT "TabTransfer_toTableId_fkey" FOREIGN KEY ("toTableId") REFERENCES "DiningTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TabTransfer" ADD CONSTRAINT "TabTransfer_transferredByUserId_fkey" FOREIGN KEY ("transferredByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
