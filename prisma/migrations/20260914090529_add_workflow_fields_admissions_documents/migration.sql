-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "publishedBy" TEXT,
ADD COLUMN     "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "updatedBy" TEXT;

-- AlterTable
ALTER TABLE "enrollment_statistics" ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "publishedBy" TEXT;

-- AlterTable
ALTER TABLE "fee_structures" ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "publishedBy" TEXT;

-- AlterTable
ALTER TABLE "results" ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "publishedBy" TEXT;
