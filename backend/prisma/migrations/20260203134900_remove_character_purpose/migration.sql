-- Remove deprecated character purpose column and update visibility default
ALTER TABLE "Character"
  DROP COLUMN IF EXISTS "purpose";

ALTER TABLE "Character"
  ALTER COLUMN "isPublic" SET DEFAULT TRUE;
