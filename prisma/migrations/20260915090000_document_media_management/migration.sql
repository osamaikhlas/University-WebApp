-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'ARCHIVE';
ALTER TYPE "AuditAction" ADD VALUE 'UNARCHIVE';
ALTER TYPE "AuditAction" ADD VALUE 'UNPUBLISH';
ALTER TYPE "AuditAction" ADD VALUE 'FILE_REPLACED';

-- AlterEnum
ALTER TYPE "ContentStatus" ADD VALUE 'ARCHIVED';

-- AlterTable
ALTER TABLE "documents" DROP COLUMN "fileUrl",
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "expiryDate" TIMESTAMP(3),
ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "publishDate" TIMESTAMP(3),
ADD COLUMN     "storedPath" TEXT;

-- AlterTable
ALTER TABLE "media_assets" DROP COLUMN "url",
ADD COLUMN     "category" TEXT,
ADD COLUMN     "mediaDate" TIMESTAMP(3),
ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "storedPath" TEXT;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

