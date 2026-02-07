-- Asset Management System (FEATURE-021)
-- Migration: add_asset_system
-- Date: 2026-01-30

-- Create AssetType enum
CREATE TYPE "AssetType" AS ENUM ('CLOTHING', 'ACCESSORY', 'SCAR', 'HAIRSTYLE', 'OBJECT', 'VEHICLE', 'FURNITURE', 'PROP');

-- Create AssetCategory enum
CREATE TYPE "AssetCategory" AS ENUM ('WEARABLE', 'HOLDABLE', 'ENVIRONMENTAL');

-- Create Asset table
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "AssetType" NOT NULL,
    "category" "AssetCategory" NOT NULL,
    "promptPrimary" TEXT,
    "promptContext" TEXT,
    "negativePrompt" TEXT,
    "placementZone" TEXT,
    "placementDetail" TEXT,
    "previewImageUrl" TEXT,
    "style" "VisualStyle",
    "ageRating" "AgeRating" NOT NULL DEFAULT 'L',
    "contentTags" "ContentTag"[],
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "authorId" TEXT NOT NULL,
    "contentVersion" INTEGER NOT NULL DEFAULT 1,
    "originalLanguageCode" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- Create AssetImage table
CREATE TABLE "AssetImage" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "imageType" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetImage_pkey" PRIMARY KEY ("id")
);

-- Create AssetTag table
CREATE TABLE "AssetTag" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "AssetTag_pkey" PRIMARY KEY ("id")
);

-- Create CharacterAsset table
CREATE TABLE "CharacterAsset" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "placementZone" TEXT,
    "placementDetail" TEXT,
    "contextNote" TEXT,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CharacterAsset_pkey" PRIMARY KEY ("id")
);

-- Create indexes for Asset
CREATE INDEX "Asset_type_idx" ON "Asset"("type");
CREATE INDEX "Asset_category_idx" ON "Asset"("category");
CREATE INDEX "Asset_authorId_idx" ON "Asset"("authorId");
CREATE INDEX "Asset_visibility_idx" ON "Asset"("visibility");
CREATE INDEX "Asset_ageRating_idx" ON "Asset"("ageRating");
CREATE INDEX "Asset_style_idx" ON "Asset"("style");

-- Create indexes for AssetImage
CREATE INDEX "AssetImage_assetId_idx" ON "AssetImage"("assetId");

-- Create indexes for AssetTag
CREATE UNIQUE INDEX "AssetTag_assetId_tagId_key" ON "AssetTag"("assetId", "tagId");
CREATE INDEX "AssetTag_assetId_idx" ON "AssetTag"("assetId");
CREATE INDEX "AssetTag_tagId_idx" ON "AssetTag"("tagId");

-- Create indexes for CharacterAsset
CREATE UNIQUE INDEX "CharacterAsset_characterId_assetId_key" ON "CharacterAsset"("characterId", "assetId");
CREATE INDEX "CharacterAsset_characterId_idx" ON "CharacterAsset"("characterId");
CREATE INDEX "CharacterAsset_assetId_idx" ON "CharacterAsset"("assetId");

-- Add foreign key constraints for Asset
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Add foreign key constraints for AssetImage
ALTER TABLE "AssetImage" ADD CONSTRAINT "AssetImage_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Add foreign key constraints for AssetTag
ALTER TABLE "AssetTag" ADD CONSTRAINT "AssetTag_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssetTag" ADD CONSTRAINT "AssetTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Add foreign key constraints for CharacterAsset
ALTER TABLE "CharacterAsset" ADD CONSTRAINT "CharacterAsset_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CharacterAsset" ADD CONSTRAINT "CharacterAsset_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"(id) ON DELETE CASCADE ON UPDATE CASCADE;
