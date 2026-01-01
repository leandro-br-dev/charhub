-- Add gender and species columns to CuratedImage table
-- These columns are used for diversity tracking in character generation

-- Check if columns don't exist before adding (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'CuratedImage' AND column_name = 'gender'
    ) THEN
        ALTER TABLE "CuratedImage" ADD COLUMN "gender" TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'CuratedImage' AND column_name = 'species'
    ) THEN
        ALTER TABLE "CuratedImage" ADD COLUMN "species" TEXT;
    END IF;
END $$;
