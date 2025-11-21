-- Add VisualStyle enum and reference field to Character
-- This migration converts the style field from String to VisualStyle enum
-- and adds a new reference field for character source information

-- Step 1: Create VisualStyle enum
CREATE TYPE "VisualStyle" AS ENUM (
  'ANIME',
  'REALISTIC',
  'SEMI_REALISTIC',
  'CARTOON',
  'MANGA',
  'MANHWA',
  'COMIC',
  'CHIBI',
  'PIXEL_ART',
  'THREE_D'
);

-- Step 2: Add reference field (simple text field)
ALTER TABLE "Character" ADD COLUMN IF NOT EXISTS "reference" TEXT;

-- Step 3: Add temporary column for the new enum style
ALTER TABLE "Character" ADD COLUMN "styleNew" "VisualStyle";

-- Step 4: Migrate existing style values to the new enum
-- Map common text values to enum values, default to ANIME for unmapped values
UPDATE "Character" SET "styleNew" =
  CASE
    WHEN LOWER("style") LIKE '%anime%' THEN 'ANIME'::"VisualStyle"
    WHEN LOWER("style") LIKE '%realistic%' OR LOWER("style") LIKE '%real%' THEN 'REALISTIC'::"VisualStyle"
    WHEN LOWER("style") LIKE '%cartoon%' THEN 'CARTOON'::"VisualStyle"
    WHEN LOWER("style") LIKE '%manga%' THEN 'MANGA'::"VisualStyle"
    WHEN LOWER("style") LIKE '%manhwa%' OR LOWER("style") LIKE '%webtoon%' THEN 'MANHWA'::"VisualStyle"
    WHEN LOWER("style") LIKE '%comic%' THEN 'COMIC'::"VisualStyle"
    WHEN LOWER("style") LIKE '%chibi%' THEN 'CHIBI'::"VisualStyle"
    WHEN LOWER("style") LIKE '%pixel%' THEN 'PIXEL_ART'::"VisualStyle"
    WHEN LOWER("style") LIKE '%3d%' OR LOWER("style") LIKE '%three%' THEN 'THREE_D'::"VisualStyle"
    WHEN "style" IS NULL THEN 'ANIME'::"VisualStyle"
    ELSE 'ANIME'::"VisualStyle"
  END;

-- Step 5: Drop the old style column
ALTER TABLE "Character" DROP COLUMN IF EXISTS "style";

-- Step 6: Rename the new column to style
ALTER TABLE "Character" RENAME COLUMN "styleNew" TO "style";

-- Step 7: Set default value for style
ALTER TABLE "Character" ALTER COLUMN "style" SET DEFAULT 'ANIME'::"VisualStyle";

-- Step 8: Create index on reference field for better search performance
CREATE INDEX IF NOT EXISTS "Character_reference_idx" ON "Character"("reference");

-- Verify the migration
DO $$
BEGIN
  -- Check if VisualStyle enum exists
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'VisualStyle') THEN
    RAISE EXCEPTION 'VisualStyle enum was not created!';
  END IF;

  -- Check if reference column exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'Character' AND column_name = 'reference') THEN
    RAISE EXCEPTION 'Character.reference column was not created!';
  END IF;

  -- Check if style column is now VisualStyle type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns c
    JOIN pg_type t ON c.udt_name = t.typname
    WHERE c.table_name = 'Character'
    AND c.column_name = 'style'
    AND t.typname = 'VisualStyle'
  ) THEN
    RAISE EXCEPTION 'Character.style is not VisualStyle type!';
  END IF;

  RAISE NOTICE 'Migration completed successfully!';
END $$;
