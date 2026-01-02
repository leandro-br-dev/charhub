-- AlterEnum: Add 'REFERENCE' to ImageType enum
ALTER TYPE "ImageType" ADD VALUE 'REFERENCE';

-- AlterTable: Add 'content' field to CharacterImage
ALTER TABLE "CharacterImage" ADD COLUMN "content" TEXT;
