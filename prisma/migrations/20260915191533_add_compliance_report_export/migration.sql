-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'COMPLIANCE_REPORT_GENERATED';
ALTER TYPE "AuditAction" ADD VALUE 'COMPLIANCE_REPORT_SUBMITTED';

-- CreateTable
CREATE TABLE "compliance_report_exports" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedById" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "websiteUrl" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "submittedById" TEXT,

    CONSTRAINT "compliance_report_exports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "compliance_report_exports_collegeId_idx" ON "compliance_report_exports"("collegeId");

-- CreateIndex
CREATE INDEX "compliance_report_exports_generatedAt_idx" ON "compliance_report_exports"("generatedAt");

-- AddForeignKey
ALTER TABLE "compliance_report_exports" ADD CONSTRAINT "compliance_report_exports_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "colleges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_report_exports" ADD CONSTRAINT "compliance_report_exports_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_report_exports" ADD CONSTRAINT "compliance_report_exports_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
