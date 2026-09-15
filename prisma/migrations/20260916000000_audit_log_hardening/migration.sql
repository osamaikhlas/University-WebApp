-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "metadata" JSONB;

-- Audit log immutability (CLAUDE.md rule 8, "audit records should not be editable"):
-- reject any UPDATE or DELETE against audit_logs at the database level, not just by omitting
-- edit/delete UI and Server Actions at the application layer. INSERT is untouched — this is
-- the only way rows are ever meant to enter this table.
CREATE OR REPLACE FUNCTION prevent_audit_log_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs rows are immutable: % is not permitted on this table', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_no_update
  BEFORE UPDATE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();

CREATE TRIGGER audit_logs_no_delete
  BEFORE DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();
