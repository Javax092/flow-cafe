-- Preserve existing users while adopting the canonical initial roles.
ALTER TYPE "UserRole" RENAME VALUE 'ADMIN' TO 'OWNER';
ALTER TYPE "UserRole" RENAME VALUE 'ATTENDANT' TO 'CASHIER';
ALTER TYPE "UserRole" ADD VALUE 'WAITER';

ALTER TABLE "Business" ADD COLUMN "slug" TEXT;
UPDATE "Business" SET "slug" = 'business-' || "id" WHERE "slug" IS NULL;
ALTER TABLE "Business" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "Business_slug_key" ON "Business"("slug");

CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BusinessSettings" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'pt-BR',
    "timezone" TEXT NOT NULL DEFAULT 'America/Manaus',
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BusinessSettings_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "User" ADD COLUMN "branchId" TEXT;

CREATE INDEX "Branch_businessId_idx" ON "Branch"("businessId");
CREATE INDEX "Branch_businessId_isActive_idx" ON "Branch"("businessId", "isActive");
CREATE UNIQUE INDEX "Branch_businessId_code_key" ON "Branch"("businessId", "code");
CREATE UNIQUE INDEX "BusinessSettings_businessId_key" ON "BusinessSettings"("businessId");
CREATE INDEX "User_branchId_idx" ON "User"("branchId");

ALTER TABLE "Branch" ADD CONSTRAINT "Branch_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BusinessSettings" ADD CONSTRAINT "BusinessSettings_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
