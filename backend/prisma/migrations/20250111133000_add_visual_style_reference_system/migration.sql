-- CreateEnum
CREATE TYPE "ModelType" AS ENUM ('CHECKPOINT', 'LORA_STYLE', 'LORA_CONTENT');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('GENERAL', 'FURRY', 'HENTAI', 'FANTASY', 'SCI_FI');

-- DropForeignKey
ALTER TABLE "Character" DROP CONSTRAINT "Character_speciesId_fkey";

-- AlterTable
ALTER TABLE "Species" ALTER COLUMN "ageRating" SET NOT NULL,
ALTER COLUMN "weight" SET NOT NULL,
ALTER COLUMN "searchable" SET NOT NULL,
ALTER COLUMN "createdAt" SET NOT NULL,
ALTER COLUMN "updatedAt" SET NOT NULL,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "StoryCharacter" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "VisualStyleConfig" (
    "id" TEXT NOT NULL,
    "style" "VisualStyle" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "defaultCheckpointId" TEXT,
    "positivePromptSuffix" TEXT,
    "negativePromptSuffix" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisualStyleConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StyleCheckpoint" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "civitaiUrl" TEXT,
    "modelType" "ModelType" NOT NULL,
    "config" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StyleCheckpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StyleLora" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "filepathRelative" TEXT,
    "civitaiUrl" TEXT,
    "modelType" "ModelType" NOT NULL,
    "triggerWords" TEXT,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StyleLora_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StyleLoraMapping" (
    "id" TEXT NOT NULL,
    "styleId" TEXT NOT NULL,
    "loraId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION,
    "priority" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StyleLoraMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StyleContentCheckpoint" (
    "id" TEXT NOT NULL,
    "styleId" TEXT NOT NULL,
    "checkpointId" TEXT NOT NULL,
    "contentType" "ContentType" NOT NULL,

    CONSTRAINT "StyleContentCheckpoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VisualStyleConfig_style_key" ON "VisualStyleConfig"("style");

-- CreateIndex
CREATE UNIQUE INDEX "StyleCheckpoint_filename_key" ON "StyleCheckpoint"("filename");

-- CreateIndex
CREATE INDEX "StyleCheckpoint_modelType_idx" ON "StyleCheckpoint"("modelType");

-- CreateIndex
CREATE INDEX "StyleCheckpoint_isActive_idx" ON "StyleCheckpoint"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "StyleLora_filename_key" ON "StyleLora"("filename");

-- CreateIndex
CREATE INDEX "StyleLora_modelType_idx" ON "StyleLora"("modelType");

-- CreateIndex
CREATE INDEX "StyleLora_isActive_idx" ON "StyleLora"("isActive");

-- CreateIndex
CREATE INDEX "StyleLoraMapping_styleId_idx" ON "StyleLoraMapping"("styleId");

-- CreateIndex
CREATE INDEX "StyleLoraMapping_loraId_idx" ON "StyleLoraMapping"("loraId");

-- CreateIndex
CREATE UNIQUE INDEX "StyleLoraMapping_styleId_loraId_key" ON "StyleLoraMapping"("styleId", "loraId");

-- CreateIndex
CREATE INDEX "StyleContentCheckpoint_styleId_idx" ON "StyleContentCheckpoint"("styleId");

-- CreateIndex
CREATE INDEX "StyleContentCheckpoint_contentType_idx" ON "StyleContentCheckpoint"("contentType");

-- CreateIndex
CREATE INDEX "StyleContentCheckpoint_checkpointId_idx" ON "StyleContentCheckpoint"("checkpointId");

-- CreateIndex
CREATE UNIQUE INDEX "StyleContentCheckpoint_styleId_contentType_key" ON "StyleContentCheckpoint"("styleId", "contentType");

-- CreateIndex
CREATE UNIQUE INDEX "Species_name_key" ON "Species"("name");

-- AddForeignKey
ALTER TABLE "VisualStyleConfig" ADD CONSTRAINT "VisualStyleConfig_defaultCheckpointId_fkey" FOREIGN KEY ("defaultCheckpointId") REFERENCES "StyleCheckpoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StyleLoraMapping" ADD CONSTRAINT "StyleLoraMapping_styleId_fkey" FOREIGN KEY ("styleId") REFERENCES "VisualStyleConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StyleLoraMapping" ADD CONSTRAINT "StyleLoraMapping_loraId_fkey" FOREIGN KEY ("loraId") REFERENCES "StyleLora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StyleContentCheckpoint" ADD CONSTRAINT "StyleContentCheckpoint_styleId_fkey" FOREIGN KEY ("styleId") REFERENCES "VisualStyleConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StyleContentCheckpoint" ADD CONSTRAINT "StyleContentCheckpoint_checkpointId_fkey" FOREIGN KEY ("checkpointId") REFERENCES "StyleCheckpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_speciesId_fkey" FOREIGN KEY ("speciesId") REFERENCES "Species"("id") ON DELETE SET NULL ON UPDATE CASCADE;
