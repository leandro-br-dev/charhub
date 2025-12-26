-- CreateEnum
CREATE TYPE "CurationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "CuratedImage" (
    "id" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "sourceId" TEXT,
    "sourcePlatform" TEXT NOT NULL DEFAULT 'civitai',
    "tags" TEXT[],
    "sourceRating" DOUBLE PRECISION,
    "author" TEXT,
    "license" TEXT,
    "status" "CurationStatus" NOT NULL DEFAULT 'PENDING',
    "ageRating" "AgeRating",
    "qualityScore" DOUBLE PRECISION,
    "contentTags" "ContentTag"[],
    "description" TEXT,
    "localPath" TEXT,
    "uploadedToR2" BOOLEAN NOT NULL DEFAULT false,
    "r2Url" TEXT,
    "r2Key" TEXT,
    "generatedCharId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,

    CONSTRAINT "CuratedImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatchGenerationLog" (
    "id" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "targetCount" INTEGER NOT NULL,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "selectedImages" TEXT[],
    "generatedCharIds" TEXT[],
    "errors" JSONB,
    "duration" INTEGER,
    "costEstimate" DOUBLE PRECISION,

    CONSTRAINT "BatchGenerationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CuratedImage_sourceUrl_key" ON "CuratedImage"("sourceUrl");

-- CreateIndex
CREATE UNIQUE INDEX "CuratedImage_generatedCharId_key" ON "CuratedImage"("generatedCharId");

-- CreateIndex
CREATE INDEX "CuratedImage_status_ageRating_idx" ON "CuratedImage"("status", "ageRating");

-- CreateIndex
CREATE INDEX "CuratedImage_createdAt_idx" ON "CuratedImage"("createdAt");

-- CreateIndex
CREATE INDEX "CuratedImage_processedAt_idx" ON "CuratedImage"("processedAt");

-- CreateIndex
CREATE INDEX "BatchGenerationLog_scheduledAt_idx" ON "BatchGenerationLog"("scheduledAt");

-- CreateIndex
CREATE INDEX "BatchGenerationLog_executedAt_idx" ON "BatchGenerationLog"("executedAt");

-- AddForeignKey
ALTER TABLE "CuratedImage" ADD CONSTRAINT "CuratedImage_generatedCharId_fkey" FOREIGN KEY ("generatedCharId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;
