-- CreateEnum (not needed - using existing enums)

-- Create SceneImage table
CREATE TABLE "SceneImage" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "imageType" TEXT NOT NULL,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SceneImage_pkey" PRIMARY KEY ("id")
);

-- Create SceneTag table
CREATE TABLE "SceneTag" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "SceneTag_pkey" PRIMARY KEY ("id")
);

-- Create Scene table
CREATE TABLE "Scene" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "shortDescription" TEXT,
    "genre" TEXT,
    "era" TEXT,
    "mood" TEXT,
    "style" "VisualStyle",
    "imagePrompt" TEXT,
    "mapPrompt" TEXT,
    "coverImageUrl" TEXT,
    "mapImageUrl" TEXT,
    "ageRating" "AgeRating" NOT NULL DEFAULT 'L',
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "authorId" TEXT NOT NULL,
    "contentVersion" INTEGER NOT NULL DEFAULT 1,
    "originalLanguageCode" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scene_pkey" PRIMARY KEY ("id")
);

-- Create SceneArea table
CREATE TABLE "SceneArea" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "shortDescription" TEXT,
    "imagePrompt" TEXT,
    "mapPrompt" TEXT,
    "environmentImageUrl" TEXT,
    "mapImageUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isAccessible" BOOLEAN NOT NULL DEFAULT true,
    "contentVersion" INTEGER NOT NULL DEFAULT 1,
    "originalLanguageCode" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SceneArea_pkey" PRIMARY KEY ("id")
);

-- Create SceneAreaImage table
CREATE TABLE "SceneAreaImage" (
    "id" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "imageType" TEXT NOT NULL,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SceneAreaImage_pkey" PRIMARY KEY ("id")
);

-- Create SceneAreaAsset table
CREATE TABLE "SceneAreaAsset" (
    "id" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "position" TEXT,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "isInteractable" BOOLEAN NOT NULL DEFAULT true,
    "discoveryHint" TEXT,
    "metadata" JSONB,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SceneAreaAsset_pkey" PRIMARY KEY ("id")
);

-- Create SceneAreaConnection table
CREATE TABLE "SceneAreaConnection" (
    "id" TEXT NOT NULL,
    "fromAreaId" TEXT NOT NULL,
    "toAreaId" TEXT NOT NULL,
    "direction" TEXT,
    "description" TEXT,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockHint" TEXT,

    CONSTRAINT "SceneAreaConnection_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "SceneImage_sceneId_idx" ON "SceneImage"("sceneId");

CREATE UNIQUE INDEX "SceneTag_sceneId_tagId_key" ON "SceneTag"("sceneId", "tagId");
CREATE INDEX "SceneTag_sceneId_idx" ON "SceneTag"("sceneId");
CREATE INDEX "SceneTag_tagId_idx" ON "SceneTag"("tagId");

CREATE INDEX "Scene_authorId_idx" ON "Scene"("authorId");
CREATE INDEX "Scene_visibility_idx" ON "Scene"("visibility");
CREATE INDEX "Scene_ageRating_idx" ON "Scene"("ageRating");
CREATE INDEX "Scene_style_idx" ON "Scene"("style");

CREATE INDEX "SceneArea_sceneId_idx" ON "SceneArea"("sceneId");
CREATE INDEX "SceneArea_displayOrder_idx" ON "SceneArea"("displayOrder");

CREATE INDEX "SceneAreaImage_areaId_idx" ON "SceneAreaImage"("areaId");

CREATE UNIQUE INDEX "SceneAreaAsset_areaId_assetId_key" ON "SceneAreaAsset"("areaId", "assetId");
CREATE INDEX "SceneAreaAsset_areaId_idx" ON "SceneAreaAsset"("areaId");
CREATE INDEX "SceneAreaAsset_assetId_idx" ON "SceneAreaAsset"("assetId");

CREATE UNIQUE INDEX "SceneAreaConnection_fromAreaId_toAreaId_key" ON "SceneAreaConnection"("fromAreaId", "toAreaId");
CREATE INDEX "SceneAreaConnection_fromAreaId_idx" ON "SceneAreaConnection"("fromAreaId");
CREATE INDEX "SceneAreaConnection_toAreaId_idx" ON "SceneAreaConnection"("toAreaId");

-- Add foreign keys
ALTER TABLE "SceneImage" ADD CONSTRAINT "SceneImage_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SceneTag" ADD CONSTRAINT "SceneTag_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SceneTag" ADD CONSTRAINT "SceneTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Scene" ADD CONSTRAINT "Scene_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SceneArea" ADD CONSTRAINT "SceneArea_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SceneAreaImage" ADD CONSTRAINT "SceneAreaImage_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "SceneArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SceneAreaAsset" ADD CONSTRAINT "SceneAreaAsset_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "SceneArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SceneAreaAsset" ADD CONSTRAINT "SceneAreaAsset_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SceneAreaConnection" ADD CONSTRAINT "SceneAreaConnection_fromAreaId_fkey" FOREIGN KEY ("fromAreaId") REFERENCES "SceneArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SceneAreaConnection" ADD CONSTRAINT "SceneAreaConnection_toAreaId_fkey" FOREIGN KEY ("toAreaId") REFERENCES "SceneArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
