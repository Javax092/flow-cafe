/*
  Warnings:

  - A unique constraint covering the columns `[sessionTokenHash]` on the table `AuthSession` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `sessionTokenHash` to the `AuthSession` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AuthSession" ADD COLUMN     "lastSeenAt" TIMESTAMP(3),
ADD COLUMN     "revokedReason" TEXT,
ADD COLUMN     "sessionTokenHash" TEXT NOT NULL,
ALTER COLUMN "refreshTokenHash" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_sessionTokenHash_key" ON "AuthSession"("sessionTokenHash");

-- CreateIndex
CREATE INDEX "AuthSession_lastSeenAt_idx" ON "AuthSession"("lastSeenAt");
