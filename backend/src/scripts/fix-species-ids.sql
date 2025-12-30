-- Fix Species IDs inconsistency
-- This script:
-- 1. Creates a proper "Unknown" species with UUID
-- 2. Moves all characters from species-* IDs to the new Unknown species
-- 3. Removes the species with species-* ID format

-- Step 1: Create the "Unknown" species with proper UUID
INSERT INTO "Species" (id, name, "ageRating", "category", "contentTags", "searchable", weight, "createdAt", "updatedAt")
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Unknown',
  'L',
  'other',
  '{}',
  true,
  1,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Update all characters with species-* IDs to use the new Unknown species
UPDATE "Character"
SET "speciesId" = '00000000-0000-0000-0000-000000000001'
WHERE "speciesId" LIKE 'species-%';

-- Step 3: Delete all species with species-* ID format
DELETE FROM "Species"
WHERE id LIKE 'species-%';

-- Verification query (run separately to verify)
-- SELECT id, name FROM "Species" ORDER BY name LIMIT 20;
-- SELECT "speciesId", COUNT(*) FROM "Character" GROUP BY "speciesId";
