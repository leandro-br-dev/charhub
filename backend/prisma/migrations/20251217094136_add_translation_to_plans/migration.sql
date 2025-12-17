-- DropIndex
DROP INDEX "Character_reference_idx";

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "contentVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "originalLanguageCode" TEXT NOT NULL DEFAULT 'en-US';

-- CreateIndex
CREATE INDEX "UserPlan_stripeSubscriptionId_idx" ON "UserPlan"("stripeSubscriptionId");

-- RenameIndex
ALTER INDEX "ContentTranslation_contentType_contentId_fieldName_targetLangua" RENAME TO "ContentTranslation_contentType_contentId_fieldName_targetLa_key";
