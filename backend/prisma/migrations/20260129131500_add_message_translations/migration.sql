-- Create MessageTranslation table
CREATE TABLE "MessageTranslation" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "targetLanguage" TEXT NOT NULL,
    "translatedText" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'gemini',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageTranslation_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint
CREATE UNIQUE INDEX "MessageTranslation_messageId_targetLanguage_key"
ON "MessageTranslation"("messageId", "targetLanguage");

-- Create indexes
CREATE INDEX "MessageTranslation_messageId_idx" ON "MessageTranslation"("messageId");
CREATE INDEX "MessageTranslation_targetLanguage_idx" ON "MessageTranslation"("targetLanguage");

-- Add foreign key
ALTER TABLE "MessageTranslation" ADD CONSTRAINT "MessageTranslation_messageId_fkey"
FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
