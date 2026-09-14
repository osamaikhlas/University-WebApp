-- Content approval workflow v2.
--
-- Replaces the old shared lifecycle (DRAFT -> PENDING_REVIEW -> APPROVED -> PUBLISHED,
-- ARCHIVED reachable from anywhere) with the required chain:
--   DRAFT -> SUBMITTED -> UNDER_REVIEW -> APPROVED -> PUBLISHED
--   PUBLISHED -> UPDATE_REQUIRED -> DRAFT
--
-- Existing rows are remapped rather than dropped (this is a real Postgres instance with
-- seeded/dev data, and CLAUDE.md rule 8 says never silently lose history):
--   PENDING_REVIEW -> SUBMITTED (nearest equivalent: awaiting a reviewer)
--   ARCHIVED       -> DRAFT     (ARCHIVED no longer exists; nearest inactive/editable state)

-- AlterEnum: new AuditAction values for the new transitions.
ALTER TYPE "AuditAction" ADD VALUE 'SUBMIT';
ALTER TYPE "AuditAction" ADD VALUE 'START_REVIEW';
ALTER TYPE "AuditAction" ADD VALUE 'REQUEST_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE 'RETURN_TO_DRAFT';

-- AlterEnum: ContentStatus, with data remapping for removed values.
BEGIN;
CREATE TYPE "ContentStatus_new" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'PUBLISHED', 'UPDATE_REQUIRED');

ALTER TABLE "public"."academic_calendar_entries" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."activities" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."admissions" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."affiliations" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."clubs" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."college_profiles" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."contacts" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."courses" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."departments" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."documents" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."enrollment_statistics" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."events" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."examinations" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."faculty" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."fee_structures" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."gallery_albums" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."gallery_items" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."infrastructure_items" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."locations" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."notices" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."policies" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."programs" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."regulations" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."results" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."scholarships" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."seminars" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."staff" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."student_support_services" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."timetables" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."workshops" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "college_profiles" ALTER COLUMN "status" TYPE "ContentStatus_new" USING ((CASE "status"::text WHEN 'PENDING_REVIEW' THEN 'SUBMITTED' WHEN 'ARCHIVED' THEN 'DRAFT' ELSE "status"::text END)::"ContentStatus_new");
ALTER TABLE "departments" ALTER COLUMN "status" TYPE "ContentStatus_new" USING ((CASE "status"::text WHEN 'PENDING_REVIEW' THEN 'SUBMITTED' WHEN 'ARCHIVED' THEN 'DRAFT' ELSE "status"::text END)::"ContentStatus_new");
ALTER TABLE "programs" ALTER COLUMN "status" TYPE "ContentStatus_new" USING ((CASE "status"::text WHEN 'PENDING_REVIEW' THEN 'SUBMITTED' WHEN 'ARCHIVED' THEN 'DRAFT' ELSE "status"::text END)::"ContentStatus_new");
ALTER TABLE "courses" ALTER COLUMN "status" TYPE "ContentStatus_new" USING ((CASE "status"::text WHEN 'PENDING_REVIEW' THEN 'SUBMITTED' WHEN 'ARCHIVED' THEN 'DRAFT' ELSE "status"::text END)::"ContentStatus_new");
ALTER TABLE "affiliations" ALTER COLUMN "status" TYPE "ContentStatus_new" USING ((CASE "status"::text WHEN 'PENDING_REVIEW' THEN 'SUBMITTED' WHEN 'ARCHIVED' THEN 'DRAFT' ELSE "status"::text END)::"ContentStatus_new");
ALTER TABLE "faculty" ALTER COLUMN "status" TYPE "ContentStatus_new" USING ((CASE "status"::text WHEN 'PENDING_REVIEW' THEN 'SUBMITTED' WHEN 'ARCHIVED' THEN 'DRAFT' ELSE "status"::text END)::"ContentStatus_new");
ALTER TABLE "staff" ALTER COLUMN "status" TYPE "ContentStatus_new" USING ((CASE "status"::text WHEN 'PENDING_REVIEW' THEN 'SUBMITTED' WHEN 'ARCHIVED' THEN 'DRAFT' ELSE "status"::text END)::"ContentStatus_new");
ALTER TABLE "clubs" ALTER COLUMN "status" TYPE "ContentStatus_new" USING ((CASE "status"::text WHEN 'PENDING_REVIEW' THEN 'SUBMITTED' WHEN 'ARCHIVED' THEN 'DRAFT' ELSE "status"::text END)::"ContentStatus_new");
ALTER TABLE "infrastructure_items" ALTER COLUMN "status" TYPE "ContentStatus_new" USING ((CASE "status"::text WHEN 'PENDING_REVIEW' THEN 'SUBMITTED' WHEN 'ARCHIVED' THEN 'DRAFT' ELSE "status"::text END)::"ContentStatus_new");
ALTER TABLE "notices" ALTER COLUMN "status" TYPE "ContentStatus_new" USING ((CASE "status"::text WHEN 'PENDING_REVIEW' THEN 'SUBMITTED' WHEN 'ARCHIVED' THEN 'DRAFT' ELSE "status"::text END)::"ContentStatus_new");
ALTER TABLE "events" ALTER COLUMN "status" TYPE "ContentStatus_new" USING ((CASE "status"::text WHEN 'PENDING_REVIEW' THEN 'SUBMITTED' WHEN 'ARCHIVED' THEN 'DRAFT' ELSE "status"::text END)::"ContentStatus_new");
ALTER TABLE "seminars" ALTER COLUMN "status" TYPE "ContentStatus_new" USING ((CASE "status"::text WHEN 'PENDING_REVIEW' THEN 'SUBMITTED' WHEN 'ARCHIVED' THEN 'DRAFT' ELSE "status"::text END)::"ContentStatus_new");
ALTER TABLE "workshops" ALTER COLUMN "status" TYPE "ContentStatus_new" USING ((CASE "status"::text WHEN 'PENDING_REVIEW' THEN 'SUBMITTED' WHEN 'ARCHIVED' THEN 'DRAFT' ELSE "status"::text END)::"ContentStatus_new");
ALTER TABLE "activities" ALTER COLUMN "status" TYPE "ContentStatus_new" USING ((CASE "status"::text WHEN 'PENDING_REVIEW' THEN 'SUBMITTED' WHEN 'ARCHIVED' THEN 'DRAFT' ELSE "status"::text END)::"ContentStatus_new");
ALTER TABLE "academic_calendar_entries" ALTER COLUMN "status" TYPE "ContentStatus_new" USING ((CASE "status"::text WHEN 'PENDING_REVIEW' THEN 'SUBMITTED' WHEN 'ARCHIVED' THEN 'DRAFT' ELSE "status"::text END)::"ContentStatus_new");
ALTER TABLE "timetables" ALTER COLUMN "status" TYPE "ContentStatus_new" USING ((CASE "status"::text WHEN 'PENDING_REVIEW' THEN 'SUBMITTED' WHEN 'ARCHIVED' THEN 'DRAFT' ELSE "status"::text END)::"ContentStatus_new");
ALTER TABLE "admissions" ALTER COLUMN "status" TYPE "ContentStatus_new" USING ((CASE "status"::text WHEN 'PENDING_REVIEW' THEN 'SUBMITTED' WHEN 'ARCHIVED' THEN 'DRAFT' ELSE "status"::text END)::"ContentStatus_new");
ALTER TABLE "fee_structures" ALTER COLUMN "status" TYPE "ContentStatus_new" USING ((CASE "status"::text WHEN 'PENDING_REVIEW' THEN 'SUBMITTED' WHEN 'ARCHIVED' THEN 'DRAFT' ELSE "status"::text END)::"ContentStatus_new");
ALTER TABLE "enrollment_statistics" ALTER COLUMN "status" TYPE "ContentStatus_new" USING ((CASE "status"::text WHEN 'PENDING_REVIEW' THEN 'SUBMITTED' WHEN 'ARCHIVED' THEN 'DRAFT' ELSE "status"::text END)::"ContentStatus_new");
ALTER TABLE "examinations" ALTER COLUMN "status" TYPE "ContentStatus_new" USING ((CASE "status"::text WHEN 'PENDING_REVIEW' THEN 'SUBMITTED' WHEN 'ARCHIVED' THEN 'DRAFT' ELSE "status"::text END)::"ContentStatus_new");
ALTER TABLE "results" ALTER COLUMN "status" TYPE "ContentStatus_new" USING ((CASE "status"::text WHEN 'PENDING_REVIEW' THEN 'SUBMITTED' WHEN 'ARCHIVED' THEN 'DRAFT' ELSE "status"::text END)::"ContentStatus_new");
ALTER TABLE "contacts" ALTER COLUMN "status" TYPE "ContentStatus_new" USING ((CASE "status"::text WHEN 'PENDING_REVIEW' THEN 'SUBMITTED' WHEN 'ARCHIVED' THEN 'DRAFT' ELSE "status"::text END)::"ContentStatus_new");
ALTER TABLE "locations" ALTER COLUMN "status" TYPE "ContentStatus_new" USING ((CASE "status"::text WHEN 'PENDING_REVIEW' THEN 'SUBMITTED' WHEN 'ARCHIVED' THEN 'DRAFT' ELSE "status"::text END)::"ContentStatus_new");
ALTER TABLE "gallery_albums" ALTER COLUMN "status" TYPE "ContentStatus_new" USING ((CASE "status"::text WHEN 'PENDING_REVIEW' THEN 'SUBMITTED' WHEN 'ARCHIVED' THEN 'DRAFT' ELSE "status"::text END)::"ContentStatus_new");
ALTER TABLE "gallery_items" ALTER COLUMN "status" TYPE "ContentStatus_new" USING ((CASE "status"::text WHEN 'PENDING_REVIEW' THEN 'SUBMITTED' WHEN 'ARCHIVED' THEN 'DRAFT' ELSE "status"::text END)::"ContentStatus_new");
ALTER TABLE "scholarships" ALTER COLUMN "status" TYPE "ContentStatus_new" USING ((CASE "status"::text WHEN 'PENDING_REVIEW' THEN 'SUBMITTED' WHEN 'ARCHIVED' THEN 'DRAFT' ELSE "status"::text END)::"ContentStatus_new");
ALTER TABLE "student_support_services" ALTER COLUMN "status" TYPE "ContentStatus_new" USING ((CASE "status"::text WHEN 'PENDING_REVIEW' THEN 'SUBMITTED' WHEN 'ARCHIVED' THEN 'DRAFT' ELSE "status"::text END)::"ContentStatus_new");
ALTER TABLE "policies" ALTER COLUMN "status" TYPE "ContentStatus_new" USING ((CASE "status"::text WHEN 'PENDING_REVIEW' THEN 'SUBMITTED' WHEN 'ARCHIVED' THEN 'DRAFT' ELSE "status"::text END)::"ContentStatus_new");
ALTER TABLE "regulations" ALTER COLUMN "status" TYPE "ContentStatus_new" USING ((CASE "status"::text WHEN 'PENDING_REVIEW' THEN 'SUBMITTED' WHEN 'ARCHIVED' THEN 'DRAFT' ELSE "status"::text END)::"ContentStatus_new");
ALTER TABLE "documents" ALTER COLUMN "status" TYPE "ContentStatus_new" USING ((CASE "status"::text WHEN 'PENDING_REVIEW' THEN 'SUBMITTED' WHEN 'ARCHIVED' THEN 'DRAFT' ELSE "status"::text END)::"ContentStatus_new");

ALTER TYPE "ContentStatus" RENAME TO "ContentStatus_old";
ALTER TYPE "ContentStatus_new" RENAME TO "ContentStatus";
DROP TYPE "public"."ContentStatus_old";

ALTER TABLE "academic_calendar_entries" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
ALTER TABLE "activities" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
ALTER TABLE "admissions" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
ALTER TABLE "affiliations" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
ALTER TABLE "clubs" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
ALTER TABLE "college_profiles" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
ALTER TABLE "contacts" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
ALTER TABLE "courses" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
ALTER TABLE "departments" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
ALTER TABLE "documents" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
ALTER TABLE "enrollment_statistics" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
ALTER TABLE "events" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
ALTER TABLE "examinations" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
ALTER TABLE "faculty" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
ALTER TABLE "fee_structures" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
ALTER TABLE "gallery_albums" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
ALTER TABLE "gallery_items" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
ALTER TABLE "infrastructure_items" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
ALTER TABLE "locations" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
ALTER TABLE "notices" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
ALTER TABLE "policies" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
ALTER TABLE "programs" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
ALTER TABLE "regulations" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
ALTER TABLE "results" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
ALTER TABLE "scholarships" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
ALTER TABLE "seminars" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
ALTER TABLE "staff" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
ALTER TABLE "student_support_services" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
ALTER TABLE "timetables" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
ALTER TABLE "workshops" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- AlterTable: store the workflow transition's comment/reason (required for reject).
ALTER TABLE "audit_logs" ADD COLUMN "comment" TEXT;
