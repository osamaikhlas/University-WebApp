-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'GRIEVANCE_ASSIGN';
ALTER TYPE "AuditAction" ADD VALUE 'GRIEVANCE_STATUS_CHANGE';
ALTER TYPE "AuditAction" ADD VALUE 'GRIEVANCE_NOTE_ADDED';
ALTER TYPE "AuditAction" ADD VALUE 'GRIEVANCE_RESPONSE_SENT';

-- AlterEnum
BEGIN;
CREATE TYPE "GrievanceStatus_new" AS ENUM ('NEW', 'ASSIGNED', 'UNDER_REVIEW', 'ACTION_REQUIRED', 'RESOLVED', 'CLOSED');
ALTER TABLE "public"."grievances" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "grievances" ALTER COLUMN "status" TYPE "GrievanceStatus_new" USING ("status"::text::"GrievanceStatus_new");
ALTER TYPE "GrievanceStatus" RENAME TO "GrievanceStatus_old";
ALTER TYPE "GrievanceStatus_new" RENAME TO "GrievanceStatus";
DROP TYPE "public"."GrievanceStatus_old";
ALTER TABLE "grievances" ALTER COLUMN "status" SET DEFAULT 'NEW';
COMMIT;

-- AlterTable
ALTER TABLE "grievances" DROP COLUMN "submitterContact",
ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "referenceNumber" TEXT NOT NULL,
ADD COLUMN     "subject" TEXT NOT NULL,
ADD COLUMN     "submitterEmail" TEXT NOT NULL,
ADD COLUMN     "submitterIpHash" TEXT,
ADD COLUMN     "submitterPhone" TEXT,
ALTER COLUMN "submitterName" SET NOT NULL,
ALTER COLUMN "category" SET NOT NULL;

-- CreateTable
CREATE TABLE "grievance_responses" (
    "id" TEXT NOT NULL,
    "grievanceId" TEXT NOT NULL,
    "respondedById" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grievance_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grievance_attachments" (
    "id" TEXT NOT NULL,
    "grievanceId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storedPath" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grievance_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limit_entries" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limit_entries_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "grievance_responses_grievanceId_idx" ON "grievance_responses"("grievanceId");

-- CreateIndex
CREATE INDEX "grievance_attachments_grievanceId_idx" ON "grievance_attachments"("grievanceId");

-- CreateIndex
CREATE UNIQUE INDEX "grievances_referenceNumber_key" ON "grievances"("referenceNumber");

-- AddForeignKey
ALTER TABLE "grievance_notes" ADD CONSTRAINT "grievance_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grievance_responses" ADD CONSTRAINT "grievance_responses_grievanceId_fkey" FOREIGN KEY ("grievanceId") REFERENCES "grievances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grievance_responses" ADD CONSTRAINT "grievance_responses_respondedById_fkey" FOREIGN KEY ("respondedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grievance_attachments" ADD CONSTRAINT "grievance_attachments_grievanceId_fkey" FOREIGN KEY ("grievanceId") REFERENCES "grievances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

