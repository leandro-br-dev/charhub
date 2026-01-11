-- Visual Style Reference System Migration
-- Adds models for managing checkpoints and LoRAs per visual style

-- Create ModelType enum
CREATE TYPE "ModelType" AS ENUM ('CHECKPOINT', 'LORA_STYLE', 'LORA_CONTENT');

-- Create ContentType enum
CREATE TYPE "ContentType" AS ENUM ('GENERAL', 'FURRY', 'HENTAI', 'FANTASY', 'SCI_FI');

-- Create VisualStyleConfig table
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

-- Create StyleCheckpoint table
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

-- Create StyleLora table
CREATE TABLE "StyleLora" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "civitaiUrl" TEXT,
    "modelType" "ModelType" NOT NULL,
    "triggerWords" TEXT,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StyleLora_pkey" PRIMARY KEY ("id")
);

-- Create StyleLoraMapping table
CREATE TABLE "StyleLoraMapping" (
    "id" TEXT NOT NULL,
    "styleId" TEXT NOT NULL,
    "loraId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION,
    "priority" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StyleLoraMapping_pkey" PRIMARY KEY ("id")
);

-- Create StyleContentCheckpoint table
CREATE TABLE "StyleContentCheckpoint" (
    "id" TEXT NOT NULL,
    "styleId" TEXT NOT NULL,
    "checkpointId" TEXT NOT NULL,
    "contentType" "ContentType" NOT NULL,

    CONSTRAINT "StyleContentCheckpoint_pkey" PRIMARY KEY ("id")
);

-- Create unique indexes
CREATE UNIQUE INDEX "VisualStyleConfig_style_key" ON "VisualStyleConfig"("style");
CREATE UNIQUE INDEX "StyleCheckpoint_filename_key" ON "StyleCheckpoint"("filename");
CREATE UNIQUE INDEX "StyleLora_filename_key" ON "StyleLora"("filename");
CREATE UNIQUE INDEX "StyleLoraMapping_styleId_loraId_key" ON "StyleLoraMapping"("styleId", "loraId");
CREATE UNIQUE INDEX "StyleContentCheckpoint_styleId_contentType_key" ON "StyleContentCheckpoint"("styleId", "contentType");

-- Create indexes
CREATE INDEX "StyleCheckpoint_modelType_idx" ON "StyleCheckpoint"("modelType");
CREATE INDEX "StyleCheckpoint_isActive_idx" ON "StyleCheckpoint"("isActive");
CREATE INDEX "StyleLora_modelType_idx" ON "StyleLora"("modelType");
CREATE INDEX "StyleLora_isActive_idx" ON "StyleLora"("isActive");
CREATE INDEX "StyleLoraMapping_styleId_idx" ON "StyleLoraMapping"("styleId");
CREATE INDEX "StyleLoraMapping_loraId_idx" ON "StyleLoraMapping"("loraId");
CREATE INDEX "StyleContentCheckpoint_styleId_idx" ON "StyleContentCheckpoint"("styleId");
CREATE INDEX "StyleContentCheckpoint_contentType_idx" ON "StyleContentCheckpoint"("contentType");
CREATE INDEX "StyleContentCheckpoint_checkpointId_idx" ON "StyleContentCheckpoint"("checkpointId");

-- Create foreign key constraints
ALTER TABLE "VisualStyleConfig" ADD CONSTRAINT "VisualStyleConfig_defaultCheckpointId_StyleCheckpoint_id_fk" FOREIGN KEY ("defaultCheckpointId") REFERENCES "StyleCheckpoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StyleLoraMapping" ADD CONSTRAINT "StyleLoraMapping_styleIdVisualStyleConfig_id_fk" FOREIGN KEY ("styleId") REFERENCES "VisualStyleConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StyleLoraMapping" ADD CONSTRAINT "StyleLoraMapping_loraIdStyleLora_id_fk" FOREIGN KEY ("loraId") REFERENCES "StyleLora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StyleContentCheckpoint" ADD CONSTRAINT "StyleContentCheckpoint_styleIdVisualStyleConfig_id_fk" FOREIGN KEY ("styleId") REFERENCES "VisualStyleConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StyleContentCheckpoint" ADD CONSTRAINT "StyleContentCheckpoint_checkpointIdStyleCheckpoint_id_fk" FOREIGN KEY ("checkpointId") REFERENCES "StyleCheckpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
