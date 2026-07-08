CREATE UNIQUE INDEX "CashSession_one_open_per_business_key"
ON "CashSession"("businessId") WHERE "status" = 'OPEN';
