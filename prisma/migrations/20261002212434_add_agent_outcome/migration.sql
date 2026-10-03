-- DropIndex
DROP INDEX "leads_priority_idx";

-- DropIndex
DROP INDEX "leads_source_idx";

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "converted_comment" TEXT,
ADD COLUMN     "dropped_comment" TEXT,
ADD COLUMN     "dropped_reason" TEXT,
ADD COLUMN     "property_id" INTEGER,
ADD COLUMN     "unit_id" INTEGER;
