-- CreateEnum
CREATE TYPE "LLMProvider" AS ENUM ('GEMINI', 'OPENAI', 'GROK', 'ANTHROPIC', 'TOGETHER_AI', 'GROQ');

-- CreateEnum
CREATE TYPE "FeatureType" AS ENUM ('CHARACTER_GENERATION', 'STORY_GENERATION', 'CONTENT_TRANSLATION', 'CHAT_MESSAGE', 'AUTOMATED_GENERATION', 'IMAGE_ANALYSIS', 'OTHER');

-- CreateTable
CREATE TABLE "LLMUsageLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "feature" "FeatureType" NOT NULL,
    "featureId" TEXT,
    "provider" "LLMProvider" NOT NULL,
    "model" TEXT NOT NULL,
    "operation" TEXT,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "inputCost" DECIMAL(10,6) NOT NULL,
    "outputCost" DECIMAL(10,6) NOT NULL,
    "totalCost" DECIMAL(10,6) NOT NULL,
    "latency" INTEGER,
    "cached" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LLMUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LLMPricing" (
    "id" TEXT NOT NULL,
    "provider" "LLMProvider" NOT NULL,
    "model" TEXT NOT NULL,
    "inputPricePerMillion" DECIMAL(10,4) NOT NULL,
    "outputPricePerMillion" DECIMAL(10,4) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "source" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LLMPricing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LLMUsageLog_userId_feature_createdAt_idx" ON "LLMUsageLog"("userId", "feature", "createdAt");

-- CreateIndex
CREATE INDEX "LLMUsageLog_feature_createdAt_idx" ON "LLMUsageLog"("feature", "createdAt");

-- CreateIndex
CREATE INDEX "LLMUsageLog_createdAt_idx" ON "LLMUsageLog"("createdAt");

-- CreateIndex
CREATE INDEX "LLMUsageLog_provider_model_idx" ON "LLMUsageLog"("provider", "model");

-- CreateIndex
CREATE INDEX "LLMPricing_provider_model_idx" ON "LLMPricing"("provider", "model");

-- CreateIndex
CREATE INDEX "LLMPricing_isActive_idx" ON "LLMPricing"("isActive");

-- CreateIndex
CREATE INDEX "LLMPricing_effectiveFrom_idx" ON "LLMPricing"("effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "LLMPricing_provider_model_effectiveFrom_key" ON "LLMPricing"("provider", "model", "effectiveFrom");

-- AddForeignKey
ALTER TABLE "LLMUsageLog" ADD CONSTRAINT "LLMUsageLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
