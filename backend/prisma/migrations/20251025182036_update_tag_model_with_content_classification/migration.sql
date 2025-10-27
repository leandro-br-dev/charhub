-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TagType" ADD VALUE 'ASSET';
ALTER TYPE "TagType" ADD VALUE 'GAME';
ALTER TYPE "TagType" ADD VALUE 'MEDIA';
ALTER TYPE "TagType" ADD VALUE 'GENERAL';

-- AlterTable
ALTER TABLE "Tag" ADD COLUMN     "contentTags" "ContentTag"[],
ADD COLUMN     "searchable" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "Tag_searchable_idx" ON "Tag"("searchable");
