-- AlterTable
ALTER TABLE "contacts" ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "publishedBy" TEXT;

-- AlterTable
ALTER TABLE "locations" ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "publishedBy" TEXT;
