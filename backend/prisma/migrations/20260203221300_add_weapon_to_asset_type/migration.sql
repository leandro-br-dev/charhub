-- Add WEAPON to AssetType enum
ALTER TYPE "AssetType" ADD VALUE 'WEAPON';

-- Remove unnecessary fields from Asset table
ALTER TABLE "Asset" DROP COLUMN IF EXISTS "negativePrompt";
ALTER TABLE "Asset" DROP COLUMN IF EXISTS "placementDetail";
ALTER TABLE "Asset" DROP COLUMN IF EXISTS "placementZone";
ALTER TABLE "Asset" DROP COLUMN IF EXISTS "promptContext";
ALTER TABLE "Asset" DROP COLUMN IF EXISTS "promptPrimary";

-- Add contentTags to Scene table (if not exists)
ALTER TABLE "Scene" ADD COLUMN IF NOT EXISTS "contentTags" "ContentTag"[];
