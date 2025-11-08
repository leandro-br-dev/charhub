-- CreateEnum
CREATE TYPE "TranslationStatus" AS ENUM ('PENDING', 'ACTIVE', 'OUTDATED', 'FAILED', 'REVIEWED');

-- AlterTable
ALTER TABLE "Attire" ADD COLUMN     "contentVersion" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "contentVersion" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Story" ADD COLUMN     "contentVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "originalLanguageCode" TEXT;

-- CreateTable
CREATE TABLE "ContentTranslation" (
    "id" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "originalLanguageCode" TEXT NOT NULL,
    "targetLanguageCode" TEXT NOT NULL,
    "originalText" TEXT NOT NULL,
    "translatedText" TEXT NOT NULL,
    "translationProvider" TEXT,
    "translationModel" TEXT,
    "confidence" DOUBLE PRECISION,
    "status" "TranslationStatus" NOT NULL DEFAULT 'ACTIVE',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "translationTimeMs" INTEGER,
    "characterCount" INTEGER,
    "sourceVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentTranslation_contentType_contentId_idx" ON "ContentTranslation"("contentType", "contentId");

-- CreateIndex
CREATE INDEX "ContentTranslation_targetLanguageCode_idx" ON "ContentTranslation"("targetLanguageCode");

-- CreateIndex
CREATE INDEX "ContentTranslation_status_idx" ON "ContentTranslation"("status");

-- CreateIndex
CREATE INDEX "ContentTranslation_originalLanguageCode_targetLanguageCode_idx" ON "ContentTranslation"("originalLanguageCode", "targetLanguageCode");

-- CreateIndex
CREATE UNIQUE INDEX "ContentTranslation_contentType_contentId_fieldName_targetLa_key" ON "ContentTranslation"("contentType", "contentId", "fieldName", "targetLanguageCode");
