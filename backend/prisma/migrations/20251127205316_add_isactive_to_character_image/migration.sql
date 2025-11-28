-- Add isActive field to CharacterImage
ALTER TABLE "CharacterImage" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT false;

-- Create composite index for efficient queries
CREATE INDEX "CharacterImage_characterId_type_isActive_idx" ON "CharacterImage"("characterId", "type", "isActive");

-- Set the most recent image of each type as active for each character
WITH RankedImages AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY "characterId", type ORDER BY "createdAt" DESC) as rn
  FROM "CharacterImage"
)
UPDATE "CharacterImage"
SET "isActive" = true
WHERE id IN (
  SELECT id FROM RankedImages WHERE rn = 1
);
