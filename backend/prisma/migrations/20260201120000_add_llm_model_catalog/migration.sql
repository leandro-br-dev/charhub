-- CreateEnum
CREATE TYPE "LLMModelCategory" AS ENUM ('CHAT', 'CODING', 'REASONING', 'VISION', 'SPEECH', 'TRANSLATION', 'AGENTIC', 'EMBEDDING');

-- CreateEnum
CREATE TYPE "LLMModelType" AS ENUM ('TEXT', 'MULTIMODAL', 'REASONING', 'SPEECH', 'EMBEDDING');

-- CreateTable
CREATE TABLE "LLMModelCatalog" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "category" "LLMModelCategory" NOT NULL,
    "type" "LLMModelType" NOT NULL,
    "contextWindow" INTEGER NOT NULL,
    "maxOutput" INTEGER NOT NULL,
    "supportsTools" BOOLEAN NOT NULL DEFAULT false,
    "supportsVision" BOOLEAN NOT NULL DEFAULT false,
    "supportsReasoning" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LLMModelCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LLMModelCatalog_provider_name_key" ON "LLMModelCatalog"("provider", "name");

-- CreateIndex
CREATE INDEX "LLMModelCatalog_provider_idx" ON "LLMModelCatalog"("provider");

-- CreateIndex
CREATE INDEX "LLMModelCatalog_category_idx" ON "LLMModelCatalog"("category");

-- CreateIndex
CREATE INDEX "LLMModelCatalog_type_idx" ON "LLMModelCatalog"("type");

-- CreateIndex
CREATE INDEX "LLMModelCatalog_isActive_isAvailable_idx" ON "LLMModelCatalog"("isActive", "isAvailable");

-- CreateIndex
CREATE INDEX "LLMModelCatalog_provider_isActive_idx" ON "LLMModelCatalog"("provider", "isActive");
