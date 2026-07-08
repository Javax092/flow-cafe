-- CreateEnum
CREATE TYPE "PrintJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'PRINTED', 'FAILED', 'CANCELLED', 'STUCK');

-- CreateTable
CREATE TABLE "PrintJob" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "PrintJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "printerName" TEXT,
    "payload" JSONB,
    "lastError" TEXT,
    "nextRetryAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "printedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrintJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrintJob_businessId_idx" ON "PrintJob"("businessId");

-- CreateIndex
CREATE INDEX "PrintJob_orderId_idx" ON "PrintJob"("orderId");

-- CreateIndex
CREATE INDEX "PrintJob_status_idx" ON "PrintJob"("status");

-- CreateIndex
CREATE INDEX "PrintJob_nextRetryAt_idx" ON "PrintJob"("nextRetryAt");

-- CreateIndex
CREATE INDEX "PrintJob_lockedAt_idx" ON "PrintJob"("lockedAt");

-- CreateIndex
CREATE INDEX "PrintJob_createdAt_idx" ON "PrintJob"("createdAt");
