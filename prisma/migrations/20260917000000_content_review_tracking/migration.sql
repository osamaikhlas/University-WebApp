-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'MARK_REVIEWED';

-- AlterTable
ALTER TABLE "academic_calendar_entries" ADD COLUMN     "lastReviewedAt" TIMESTAMP(3),
ADD COLUMN     "lastReviewedById" TEXT;

-- AlterTable
ALTER TABLE "admissions" ADD COLUMN     "lastReviewedAt" TIMESTAMP(3),
ADD COLUMN     "lastReviewedById" TEXT;

-- AlterTable
ALTER TABLE "faculty" ADD COLUMN     "lastReviewedAt" TIMESTAMP(3),
ADD COLUMN     "lastReviewedById" TEXT;

-- AlterTable
ALTER TABLE "notices" ADD COLUMN     "lastReviewedAt" TIMESTAMP(3),
ADD COLUMN     "lastReviewedById" TEXT;

-- AlterTable
ALTER TABLE "timetables" ADD COLUMN     "lastReviewedAt" TIMESTAMP(3),
ADD COLUMN     "lastReviewedById" TEXT;

-- CreateTable
CREATE TABLE "review_period_settings" (
    "id" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "periodDays" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "review_period_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "review_period_settings_moduleKey_key" ON "review_period_settings"("moduleKey");

