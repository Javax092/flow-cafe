ALTER TABLE "AuditLog"
ADD COLUMN "before" JSONB,
ADD COLUMN "after" JSONB,
ADD COLUMN "reason" TEXT;

CREATE INDEX "AuditLog_businessId_createdAt_idx"
ON "AuditLog"("businessId", "createdAt");

CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "AuditLog_prevent_update_delete"
BEFORE UPDATE OR DELETE ON "AuditLog"
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();
