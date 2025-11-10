-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PRIVATE', 'UNLISTED', 'PUBLIC');

-- AlterTable Character: Add visibility column and migrate data
ALTER TABLE "Character" ADD COLUMN "visibility" "Visibility";

-- Migrate existing Character data: isPublic=true -> PUBLIC, isPublic=false -> PRIVATE
UPDATE "Character" SET "visibility" = 'PUBLIC' WHERE "isPublic" = true;
UPDATE "Character" SET "visibility" = 'PRIVATE' WHERE "isPublic" = false;

-- Make visibility NOT NULL with default PUBLIC for Character
ALTER TABLE "Character" ALTER COLUMN "visibility" SET NOT NULL;
ALTER TABLE "Character" ALTER COLUMN "visibility" SET DEFAULT 'PUBLIC';

-- Drop old isPublic column from Character
ALTER TABLE "Character" DROP COLUMN "isPublic";

-- Update index for Character
DROP INDEX IF EXISTS "Character_isPublic_idx";
CREATE INDEX "Character_visibility_idx" ON "Character"("visibility");

-- AlterTable Story: Add visibility column and migrate data
ALTER TABLE "Story" ADD COLUMN "visibility" "Visibility";

-- Migrate existing Story data: isPublic=true -> PUBLIC, isPublic=false -> PRIVATE
UPDATE "Story" SET "visibility" = 'PUBLIC' WHERE "isPublic" = true;
UPDATE "Story" SET "visibility" = 'PRIVATE' WHERE "isPublic" = false;

-- Make visibility NOT NULL with default PRIVATE for Story
ALTER TABLE "Story" ALTER COLUMN "visibility" SET NOT NULL;
ALTER TABLE "Story" ALTER COLUMN "visibility" SET DEFAULT 'PRIVATE';

-- Drop old isPublic column from Story
ALTER TABLE "Story" DROP COLUMN "isPublic";

-- Update index for Story
DROP INDEX IF EXISTS "Story_isPublic_idx";
CREATE INDEX "Story_visibility_idx" ON "Story"("visibility");

-- AlterTable Attire: Add visibility column and migrate data
ALTER TABLE "Attire" ADD COLUMN "visibility" "Visibility";

-- Migrate existing Attire data: isPublic=true -> PUBLIC, isPublic=false -> PRIVATE
UPDATE "Attire" SET "visibility" = 'PUBLIC' WHERE "isPublic" = true;
UPDATE "Attire" SET "visibility" = 'PRIVATE' WHERE "isPublic" = false;

-- Make visibility NOT NULL with default PRIVATE for Attire
ALTER TABLE "Attire" ALTER COLUMN "visibility" SET NOT NULL;
ALTER TABLE "Attire" ALTER COLUMN "visibility" SET DEFAULT 'PRIVATE';

-- Drop old isPublic column from Attire
ALTER TABLE "Attire" DROP COLUMN "isPublic";

-- Update index for Attire
DROP INDEX IF EXISTS "Attire_isPublic_idx";
CREATE INDEX "Attire_visibility_idx" ON "Attire"("visibility");

-- AlterTable Assistant: Add visibility column and migrate data
ALTER TABLE "Assistant" ADD COLUMN "visibility" "Visibility";

-- Migrate existing Assistant data: isPublic=true -> PUBLIC, isPublic=false -> PRIVATE
UPDATE "Assistant" SET "visibility" = 'PUBLIC' WHERE "isPublic" = true;
UPDATE "Assistant" SET "visibility" = 'PRIVATE' WHERE "isPublic" = false;

-- Make visibility NOT NULL with default PRIVATE for Assistant
ALTER TABLE "Assistant" ALTER COLUMN "visibility" SET NOT NULL;
ALTER TABLE "Assistant" ALTER COLUMN "visibility" SET DEFAULT 'PRIVATE';

-- Drop old isPublic column from Assistant
ALTER TABLE "Assistant" DROP COLUMN "isPublic";

-- Update index for Assistant
DROP INDEX IF EXISTS "Assistant_isPublic_idx";
CREATE INDEX "Assistant_visibility_idx" ON "Assistant"("visibility");
