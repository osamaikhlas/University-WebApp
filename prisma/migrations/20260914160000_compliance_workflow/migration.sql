-- Compliance module workflow.
--
-- Replaces the old ComplianceStatus lifecycle (NOT_STARTED -> IN_PROGRESS ->
-- SUBMITTED_FOR_REVIEW -> VERIFIED, with REJECTED looping back to IN_PROGRESS) with the
-- required set of statuses:
--   NOT_STARTED, IN_PROGRESS, READY_FOR_REVIEW, VERIFIED, NEEDS_UPDATE, NOT_APPLICABLE
--
-- Existing rows are remapped rather than dropped (CLAUDE.md rule 8 — never silently lose
-- history):
--   SUBMITTED_FOR_REVIEW -> READY_FOR_REVIEW (renamed, same meaning)
--   REJECTED             -> NEEDS_UPDATE     (renamed, same meaning: sent back with a reason)
-- Same remap applies to VerificationDecision (VERIFIED/REJECTED -> VERIFIED/NEEDS_UPDATE).

-- AlterEnum: new AuditAction values for the compliance workflow's own transitions.
ALTER TYPE "AuditAction" ADD VALUE 'COMPLIANCE_SUBMIT_FOR_REVIEW';
ALTER TYPE "AuditAction" ADD VALUE 'COMPLIANCE_VERIFY';
ALTER TYPE "AuditAction" ADD VALUE 'COMPLIANCE_REQUEST_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE 'COMPLIANCE_MARK_NOT_APPLICABLE';
ALTER TYPE "AuditAction" ADD VALUE 'COMPLIANCE_REOPEN';
ALTER TYPE "AuditAction" ADD VALUE 'COMPLIANCE_EVIDENCE_ADDED';

-- AlterEnum: ComplianceStatus, with data remapping for renamed values.
BEGIN;
CREATE TYPE "ComplianceStatus_new" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'READY_FOR_REVIEW', 'VERIFIED', 'NEEDS_UPDATE', 'NOT_APPLICABLE');
ALTER TABLE "public"."compliance_requirements" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "compliance_requirements" ALTER COLUMN "status" TYPE "ComplianceStatus_new" USING ((CASE "status"::text WHEN 'SUBMITTED_FOR_REVIEW' THEN 'READY_FOR_REVIEW' WHEN 'REJECTED' THEN 'NEEDS_UPDATE' ELSE "status"::text END)::"ComplianceStatus_new");
ALTER TYPE "ComplianceStatus" RENAME TO "ComplianceStatus_old";
ALTER TYPE "ComplianceStatus_new" RENAME TO "ComplianceStatus";
DROP TYPE "public"."ComplianceStatus_old";
ALTER TABLE "public"."compliance_requirements" ALTER COLUMN "status" SET DEFAULT 'NOT_STARTED';
COMMIT;

-- AlterEnum: VerificationDecision, with data remapping for the renamed value.
BEGIN;
CREATE TYPE "VerificationDecision_new" AS ENUM ('VERIFIED', 'NEEDS_UPDATE');
ALTER TABLE "compliance_verifications" ALTER COLUMN "decision" TYPE "VerificationDecision_new" USING ((CASE "decision"::text WHEN 'REJECTED' THEN 'NEEDS_UPDATE' ELSE "decision"::text END)::"VerificationDecision_new");
ALTER TYPE "VerificationDecision" RENAME TO "VerificationDecision_old";
ALTER TYPE "VerificationDecision_new" RENAME TO "VerificationDecision";
DROP TYPE "public"."VerificationDecision_old";
COMMIT;

-- Generalize the reviewer-notes column: it now carries free-text commentary on a VERIFIED
-- decision too, not just the mandatory reason for a NEEDS_UPDATE decision.
ALTER TABLE "compliance_verifications" RENAME COLUMN "rejectionReason" TO "note";
