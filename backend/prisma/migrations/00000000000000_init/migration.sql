-- CharHub Database Schema - Consolidated Migration
-- This migration creates the complete database schema from scratch
-- IMPORTANT: All field names use CamelCase/PascalCase naming convention
-- DO NOT use snake_case - Prisma auto-migrations may break this convention

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE "AuthProvider" AS ENUM ('GOOGLE', 'FACEBOOK');
CREATE TYPE "UserRole" AS ENUM ('BASIC', 'PREMIUM', 'ADMIN');
CREATE TYPE "AgeRating" AS ENUM ('L', 'TEN', 'TWELVE', 'FOURTEEN', 'SIXTEEN', 'EIGHTEEN');
CREATE TYPE "ContentTag" AS ENUM ('VIOLENCE', 'GORE', 'SEXUAL', 'NUDITY', 'LANGUAGE', 'DRUGS', 'ALCOHOL', 'HORROR', 'PSYCHOLOGICAL', 'DISCRIMINATION', 'CRIME', 'GAMBLING');
CREATE TYPE "Visibility" AS ENUM ('PRIVATE', 'UNLISTED', 'PUBLIC');
CREATE TYPE "VisualStyle" AS ENUM ('ANIME', 'REALISTIC', 'SEMI_REALISTIC', 'CARTOON', 'MANGA', 'MANHWA', 'COMIC', 'CHIBI', 'PIXEL_ART', 'THREE_D');
CREATE TYPE "AvatarSource" AS ENUM ('PROVIDER', 'UPLOADED');
CREATE TYPE "StickerStatus" AS ENUM ('PENDING', 'GENERATING', 'COMPLETED', 'FAILED');
CREATE TYPE "ImageType" AS ENUM ('AVATAR', 'COVER', 'SAMPLE', 'STICKER', 'OTHER');
CREATE TYPE "TagType" AS ENUM ('CHARACTER', 'STORY', 'ASSET', 'GAME', 'MEDIA', 'GENERAL');
CREATE TYPE "SenderType" AS ENUM ('USER', 'CHARACTER', 'ASSISTANT', 'SYSTEM');
CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'MODERATOR', 'MEMBER', 'VIEWER');
CREATE TYPE "TranslationStatus" AS ENUM ('PENDING', 'ACTIVE', 'OUTDATED', 'FAILED', 'REVIEWED');
CREATE TYPE "CreditTransactionType" AS ENUM ('GRANT_INITIAL', 'GRANT_PLAN', 'PURCHASE', 'CONSUMPTION', 'SYSTEM_REWARD', 'REFUND', 'ADJUSTMENT', 'REFERRAL_BONUS', 'PROMOTIONAL');
CREATE TYPE "PlanTier" AS ENUM ('FREE', 'PLUS', 'PREMIUM');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED', 'PAYMENT_FAILED');

-- ============================================================================
-- TABLES
-- ============================================================================

-- User table
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "username" TEXT,
    "email" TEXT,
    "displayName" TEXT,
    "fullName" TEXT,
    "avatarUrl" TEXT,
    "avatarSource" "AvatarSource" NOT NULL DEFAULT 'PROVIDER',
    "avatarUpdatedAt" TIMESTAMP(3),
    "birthDate" TIMESTAMP(3),
    "gender" TEXT,
    "preferredLanguage" TEXT DEFAULT 'en',
    "role" "UserRole" NOT NULL DEFAULT 'BASIC',
    "lastLoginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "maxAgeRating" "AgeRating" NOT NULL DEFAULT 'EIGHTEEN',
    "blockedTags" "ContentTag"[],

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- ContentClassification table
CREATE TABLE "ContentClassification" (
    "id" TEXT NOT NULL,
    "ageRating" "AgeRating" NOT NULL,
    "contentTags" "ContentTag"[],
    "reason" TEXT,
    "contentType" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "autoClassified" BOOLEAN NOT NULL DEFAULT true,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentClassification_pkey" PRIMARY KEY ("id")
);

-- Lora table
CREATE TABLE "Lora" (
    "id" TEXT NOT NULL,
    "civitaiModelId" TEXT,
    "civitaiVersionId" TEXT,
    "name" TEXT NOT NULL,
    "modelType" TEXT,
    "baseModel" TEXT,
    "downloadCount" INTEGER DEFAULT 0,
    "modelUrl" TEXT,
    "tags" TEXT[],
    "trainedWords" TEXT[],
    "nsfw" BOOLEAN NOT NULL DEFAULT false,
    "filename" TEXT,
    "filepathRelative" TEXT,
    "firstImageUrl" TEXT,
    "imageUrls" TEXT[],
    "category" TEXT,
    "term" TEXT,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lora_pkey" PRIMARY KEY ("id")
);

-- Attire table
CREATE TABLE "Attire" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "gender" TEXT,
    "promptHead" TEXT,
    "promptBody" TEXT,
    "promptFull" TEXT,
    "previewImageUrl" TEXT,
    "originalLanguageCode" TEXT,
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "userId" TEXT NOT NULL,
    "ageRating" "AgeRating" NOT NULL DEFAULT 'L',
    "contentTags" "ContentTag"[],
    "contentVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attire_pkey" PRIMARY KEY ("id")
);

-- Tag table
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "TagType" NOT NULL,
    "ageRating" "AgeRating" NOT NULL DEFAULT 'L',
    "contentTags" "ContentTag"[],
    "originalLanguageCode" TEXT,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "searchable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- Character table
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "age" INTEGER,
    "gender" TEXT,
    "species" TEXT,
    "style" "VisualStyle" DEFAULT 'ANIME',
    "reference" TEXT,
    "avatar" TEXT,
    "physicalCharacteristics" TEXT,
    "personality" TEXT,
    "history" TEXT,
    "visibility" "Visibility" NOT NULL DEFAULT 'PUBLIC',
    "isSystemCharacter" BOOLEAN NOT NULL DEFAULT false,
    "originalLanguageCode" TEXT,
    "ageRating" "AgeRating" NOT NULL DEFAULT 'L',
    "contentTags" "ContentTag"[],
    "userId" TEXT NOT NULL,
    "loraId" TEXT,
    "mainAttireId" TEXT,
    "contentVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CharacterSticker table
CREATE TABLE "CharacterSticker" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "emotionTag" TEXT,
    "actionTag" TEXT,
    "imageUrl" TEXT,
    "promptUsed" TEXT,
    "status" "StickerStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CharacterSticker_pkey" PRIMARY KEY ("id")
);

-- CharacterImage table
CREATE TABLE "CharacterImage" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "type" "ImageType" NOT NULL,
    "url" TEXT NOT NULL,
    "key" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "sizeBytes" INTEGER,
    "contentType" TEXT,
    "ageRating" "AgeRating" NOT NULL DEFAULT 'L',
    "contentTags" "ContentTag"[] DEFAULT ARRAY[]::"ContentTag"[],
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CharacterImage_pkey" PRIMARY KEY ("id")
);

-- Story table
CREATE TABLE "Story" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "synopsis" TEXT,
    "initialText" TEXT,
    "coverImage" TEXT,
    "objectives" JSONB,
    "authorId" TEXT NOT NULL,
    "ageRating" "AgeRating" NOT NULL DEFAULT 'L',
    "contentTags" "ContentTag"[],
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "contentVersion" INTEGER NOT NULL DEFAULT 1,
    "originalLanguageCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Story_pkey" PRIMARY KEY ("id")
);

-- Assistant table
CREATE TABLE "Assistant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "instructions" TEXT NOT NULL,
    "defaultCharacterId" TEXT,
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assistant_pkey" PRIMARY KEY ("id")
);

-- Conversation table
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'New Conversation',
    "isTitleUserEdited" BOOLEAN NOT NULL DEFAULT false,
    "isTitleSystemEdited" BOOLEAN NOT NULL DEFAULT false,
    "projectId" TEXT,
    "storyId" TEXT,
    "settings" JSONB,
    "lastMessageAt" TIMESTAMP(3),
    "titleLastUpdatedAt" TIMESTAMP(3),
    "memoryLastUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "isMultiUser" BOOLEAN NOT NULL DEFAULT false,
    "maxUsers" INTEGER NOT NULL DEFAULT 1,
    "ownerUserId" TEXT,
    "allowUserInvites" BOOLEAN NOT NULL DEFAULT false,
    "requireApproval" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- UserConversationMembership table
CREATE TABLE "UserConversationMembership" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'MEMBER',
    "canWrite" BOOLEAN NOT NULL DEFAULT true,
    "canInvite" BOOLEAN NOT NULL DEFAULT false,
    "canModerate" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invitedBy" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "UserConversationMembership_pkey" PRIMARY KEY ("id")
);

-- ConversationParticipant table
CREATE TABLE "ConversationParticipant" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT,
    "actingCharacterId" TEXT,
    "actingAssistantId" TEXT,
    "representingCharacterId" TEXT,
    "configOverride" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("id")
);

-- Message table
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderType" "SenderType" NOT NULL,
    "content" TEXT NOT NULL,
    "attachments" TEXT,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- FavoriteCharacter table
CREATE TABLE "FavoriteCharacter" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoriteCharacter_pkey" PRIMARY KEY ("id")
);

-- ContentTranslation table
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

-- ConversationMemory table
CREATE TABLE "ConversationMemory" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "keyEvents" JSONB NOT NULL,
    "messageCount" INTEGER NOT NULL,
    "startMessageId" TEXT,
    "endMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationMemory_pkey" PRIMARY KEY ("id")
);

-- CreditTransaction table
CREATE TABLE "CreditTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "transactionType" "CreditTransactionType" NOT NULL,
    "amountCredits" DOUBLE PRECISION NOT NULL,
    "balanceAfter" DOUBLE PRECISION,
    "notes" TEXT,
    "relatedUsageLogId" TEXT,
    "relatedPlanId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditTransaction_pkey" PRIMARY KEY ("id")
);

-- Plan table
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "tier" "PlanTier" NOT NULL,
    "name" TEXT NOT NULL,
    "priceMonthly" DOUBLE PRECISION NOT NULL,
    "creditsPerMonth" INTEGER NOT NULL,
    "description" TEXT,
    "features" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paypalPlanId" TEXT,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- ServiceCreditCost table
CREATE TABLE "ServiceCreditCost" (
    "id" TEXT NOT NULL,
    "serviceIdentifier" TEXT NOT NULL,
    "creditsPerUnit" DOUBLE PRECISION NOT NULL,
    "unitDescription" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceCreditCost_pkey" PRIMARY KEY ("id")
);

-- UsageLog table
CREATE TABLE "UsageLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conversationId" TEXT,
    "serviceType" TEXT NOT NULL,
    "providerName" TEXT,
    "modelName" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "charactersProcessed" INTEGER,
    "imagesProcessed" INTEGER,
    "costUsd" DOUBLE PRECISION,
    "creditsConsumed" DOUBLE PRECISION,
    "additionalMetadata" JSONB,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageLog_pkey" PRIMARY KEY ("id")
);

-- UserMonthlyBalance table
CREATE TABLE "UserMonthlyBalance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "monthStartDate" TIMESTAMP(3) NOT NULL,
    "startingBalance" DOUBLE PRECISION NOT NULL,
    "creditsGranted" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "creditsSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "endingBalance" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserMonthlyBalance_pkey" PRIMARY KEY ("id")
);

-- UserPlan table
CREATE TABLE "UserPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastCreditsGrantedAt" TIMESTAMP(3),
    "paypalSubscriptionId" TEXT,

    CONSTRAINT "UserPlan_pkey" PRIMARY KEY ("id")
);

-- UserPlusAccess table
CREATE TABLE "UserPlusAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "grantedBy" TEXT,
    "reason" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPlusAccess_pkey" PRIMARY KEY ("id")
);

-- Many-to-many relation tables
CREATE TABLE "_CharacterAttires" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CharacterAttires_AB_pkey" PRIMARY KEY ("A","B")
);

CREATE TABLE "_CharacterToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CharacterToTag_AB_pkey" PRIMARY KEY ("A","B")
);

CREATE TABLE "_CharacterToStory" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CharacterToStory_AB_pkey" PRIMARY KEY ("A","B")
);

CREATE TABLE "_StoryToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_StoryToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- ============================================================================
-- UNIQUE CONSTRAINTS
-- ============================================================================

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_provider_providerAccountId_key" ON "User"("provider", "providerAccountId");
CREATE UNIQUE INDEX "ContentClassification_contentType_contentId_key" ON "ContentClassification"("contentType", "contentId");
CREATE UNIQUE INDEX "Lora_civitaiVersionId_key" ON "Lora"("civitaiVersionId");
CREATE UNIQUE INDEX "Tag_name_type_key" ON "Tag"("name", "type");
CREATE UNIQUE INDEX "UserConversationMembership_conversationId_userId_key" ON "UserConversationMembership"("conversationId", "userId");
CREATE UNIQUE INDEX "FavoriteCharacter_userId_characterId_key" ON "FavoriteCharacter"("userId", "characterId");
CREATE UNIQUE INDEX "ContentTranslation_contentType_contentId_fieldName_targetLanguageCode_key" ON "ContentTranslation"("contentType", "contentId", "fieldName", "targetLanguageCode");
CREATE UNIQUE INDEX "Plan_tier_key" ON "Plan"("tier");
CREATE UNIQUE INDEX "Plan_paypalPlanId_key" ON "Plan"("paypalPlanId");
CREATE UNIQUE INDEX "ServiceCreditCost_serviceIdentifier_key" ON "ServiceCreditCost"("serviceIdentifier");
CREATE UNIQUE INDEX "UserMonthlyBalance_userId_monthStartDate_key" ON "UserMonthlyBalance"("userId", "monthStartDate");
CREATE UNIQUE INDEX "UserPlan_paypalSubscriptionId_key" ON "UserPlan"("paypalSubscriptionId");

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX "ContentClassification_ageRating_idx" ON "ContentClassification"("ageRating");
CREATE INDEX "ContentClassification_contentType_idx" ON "ContentClassification"("contentType");
CREATE INDEX "Lora_civitaiModelId_idx" ON "Lora"("civitaiModelId");
CREATE INDEX "Lora_civitaiVersionId_idx" ON "Lora"("civitaiVersionId");
CREATE INDEX "Lora_deleted_idx" ON "Lora"("deleted");
CREATE INDEX "Attire_userId_idx" ON "Attire"("userId");
CREATE INDEX "Attire_visibility_idx" ON "Attire"("visibility");
CREATE INDEX "Attire_ageRating_idx" ON "Attire"("ageRating");
CREATE INDEX "Tag_type_idx" ON "Tag"("type");
CREATE INDEX "Tag_ageRating_idx" ON "Tag"("ageRating");
CREATE INDEX "Tag_searchable_idx" ON "Tag"("searchable");
CREATE INDEX "Character_userId_idx" ON "Character"("userId");
CREATE INDEX "Character_visibility_idx" ON "Character"("visibility");
CREATE INDEX "Character_isSystemCharacter_idx" ON "Character"("isSystemCharacter");
CREATE INDEX "Character_ageRating_idx" ON "Character"("ageRating");
CREATE INDEX "Character_loraId_idx" ON "Character"("loraId");
CREATE INDEX "Character_mainAttireId_idx" ON "Character"("mainAttireId");
CREATE INDEX "Character_reference_idx" ON "Character"("reference");
CREATE INDEX "CharacterSticker_characterId_idx" ON "CharacterSticker"("characterId");
CREATE INDEX "CharacterSticker_status_idx" ON "CharacterSticker"("status");
CREATE INDEX "CharacterImage_characterId_idx" ON "CharacterImage"("characterId");
CREATE INDEX "CharacterImage_type_idx" ON "CharacterImage"("type");
CREATE INDEX "CharacterImage_ageRating_idx" ON "CharacterImage"("ageRating");
CREATE INDEX "Story_authorId_idx" ON "Story"("authorId");
CREATE INDEX "Story_visibility_idx" ON "Story"("visibility");
CREATE INDEX "Assistant_userId_idx" ON "Assistant"("userId");
CREATE INDEX "Assistant_visibility_idx" ON "Assistant"("visibility");
CREATE INDEX "Assistant_defaultCharacterId_idx" ON "Assistant"("defaultCharacterId");
CREATE INDEX "Conversation_userId_idx" ON "Conversation"("userId");
CREATE INDEX "Conversation_ownerUserId_idx" ON "Conversation"("ownerUserId");
CREATE INDEX "Conversation_isMultiUser_idx" ON "Conversation"("isMultiUser");
CREATE INDEX "Conversation_lastMessageAt_idx" ON "Conversation"("lastMessageAt");
CREATE INDEX "Conversation_projectId_idx" ON "Conversation"("projectId");
CREATE INDEX "Conversation_storyId_idx" ON "Conversation"("storyId");
CREATE INDEX "UserConversationMembership_userId_idx" ON "UserConversationMembership"("userId");
CREATE INDEX "UserConversationMembership_conversationId_idx" ON "UserConversationMembership"("conversationId");
CREATE INDEX "UserConversationMembership_role_idx" ON "UserConversationMembership"("role");
CREATE INDEX "UserConversationMembership_isActive_idx" ON "UserConversationMembership"("isActive");
CREATE INDEX "ConversationParticipant_conversationId_idx" ON "ConversationParticipant"("conversationId");
CREATE INDEX "ConversationParticipant_userId_idx" ON "ConversationParticipant"("userId");
CREATE INDEX "ConversationParticipant_actingCharacterId_idx" ON "ConversationParticipant"("actingCharacterId");
CREATE INDEX "ConversationParticipant_actingAssistantId_idx" ON "ConversationParticipant"("actingAssistantId");
CREATE INDEX "ConversationParticipant_representingCharacterId_idx" ON "ConversationParticipant"("representingCharacterId");
CREATE INDEX "ConversationParticipant_conversationId_actingCharacterId_idx" ON "ConversationParticipant"("conversationId", "actingCharacterId");
CREATE INDEX "ConversationParticipant_conversationId_actingAssistantId_idx" ON "ConversationParticipant"("conversationId", "actingAssistantId");
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");
CREATE INDEX "Message_conversationId_timestamp_idx" ON "Message"("conversationId", "timestamp");
CREATE INDEX "FavoriteCharacter_userId_idx" ON "FavoriteCharacter"("userId");
CREATE INDEX "FavoriteCharacter_characterId_idx" ON "FavoriteCharacter"("characterId");
CREATE INDEX "ContentTranslation_contentType_contentId_idx" ON "ContentTranslation"("contentType", "contentId");
CREATE INDEX "ContentTranslation_targetLanguageCode_idx" ON "ContentTranslation"("targetLanguageCode");
CREATE INDEX "ContentTranslation_status_idx" ON "ContentTranslation"("status");
CREATE INDEX "ContentTranslation_originalLanguageCode_targetLanguageCode_idx" ON "ContentTranslation"("originalLanguageCode", "targetLanguageCode");
CREATE INDEX "ConversationMemory_conversationId_idx" ON "ConversationMemory"("conversationId");
CREATE INDEX "ConversationMemory_createdAt_idx" ON "ConversationMemory"("createdAt");
CREATE INDEX "CreditTransaction_userId_idx" ON "CreditTransaction"("userId");
CREATE INDEX "CreditTransaction_userId_timestamp_idx" ON "CreditTransaction"("userId", "timestamp");
CREATE INDEX "CreditTransaction_transactionType_idx" ON "CreditTransaction"("transactionType");
CREATE INDEX "CreditTransaction_timestamp_idx" ON "CreditTransaction"("timestamp");
CREATE INDEX "Plan_tier_idx" ON "Plan"("tier");
CREATE INDEX "Plan_isActive_idx" ON "Plan"("isActive");
CREATE INDEX "ServiceCreditCost_serviceIdentifier_idx" ON "ServiceCreditCost"("serviceIdentifier");
CREATE INDEX "ServiceCreditCost_isActive_idx" ON "ServiceCreditCost"("isActive");
CREATE INDEX "UsageLog_userId_idx" ON "UsageLog"("userId");
CREATE INDEX "UsageLog_userId_processed_idx" ON "UsageLog"("userId", "processed");
CREATE INDEX "UsageLog_serviceType_idx" ON "UsageLog"("serviceType");
CREATE INDEX "UsageLog_timestamp_idx" ON "UsageLog"("timestamp");
CREATE INDEX "UsageLog_processed_idx" ON "UsageLog"("processed");
CREATE INDEX "UsageLog_creditsConsumed_idx" ON "UsageLog"("creditsConsumed");
CREATE INDEX "UserMonthlyBalance_userId_idx" ON "UserMonthlyBalance"("userId");
CREATE INDEX "UserMonthlyBalance_monthStartDate_idx" ON "UserMonthlyBalance"("monthStartDate");
CREATE INDEX "UserPlan_userId_idx" ON "UserPlan"("userId");
CREATE INDEX "UserPlan_planId_idx" ON "UserPlan"("planId");
CREATE INDEX "UserPlan_status_idx" ON "UserPlan"("status");
CREATE INDEX "UserPlan_currentPeriodEnd_idx" ON "UserPlan"("currentPeriodEnd");
CREATE INDEX "UserPlan_paypalSubscriptionId_idx" ON "UserPlan"("paypalSubscriptionId");
CREATE INDEX "UserPlusAccess_userId_idx" ON "UserPlusAccess"("userId");
CREATE INDEX "UserPlusAccess_isActive_idx" ON "UserPlusAccess"("isActive");
CREATE INDEX "UserPlusAccess_endDate_idx" ON "UserPlusAccess"("endDate");

-- Many-to-many indexes
CREATE INDEX "_CharacterAttires_B_index" ON "_CharacterAttires"("B");
CREATE INDEX "_CharacterToTag_B_index" ON "_CharacterToTag"("B");
CREATE INDEX "_CharacterToStory_B_index" ON "_CharacterToStory"("B");
CREATE INDEX "_StoryToTag_B_index" ON "_StoryToTag"("B");

-- ============================================================================
-- FOREIGN KEYS
-- ============================================================================

ALTER TABLE "Attire" ADD CONSTRAINT "Attire_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Character" ADD CONSTRAINT "Character_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Character" ADD CONSTRAINT "Character_loraId_fkey" FOREIGN KEY ("loraId") REFERENCES "Lora"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Character" ADD CONSTRAINT "Character_mainAttireId_fkey" FOREIGN KEY ("mainAttireId") REFERENCES "Attire"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CharacterSticker" ADD CONSTRAINT "CharacterSticker_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CharacterImage" ADD CONSTRAINT "CharacterImage_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Story" ADD CONSTRAINT "Story_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Assistant" ADD CONSTRAINT "Assistant_defaultCharacterId_fkey" FOREIGN KEY ("defaultCharacterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Assistant" ADD CONSTRAINT "Assistant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserConversationMembership" ADD CONSTRAINT "UserConversationMembership_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserConversationMembership" ADD CONSTRAINT "UserConversationMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserConversationMembership" ADD CONSTRAINT "UserConversationMembership_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_actingCharacterId_fkey" FOREIGN KEY ("actingCharacterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_actingAssistantId_fkey" FOREIGN KEY ("actingAssistantId") REFERENCES "Assistant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_representingCharacterId_fkey" FOREIGN KEY ("representingCharacterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FavoriteCharacter" ADD CONSTRAINT "FavoriteCharacter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConversationMemory" ADD CONSTRAINT "ConversationMemory_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UsageLog" ADD CONSTRAINT "UsageLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserMonthlyBalance" ADD CONSTRAINT "UserMonthlyBalance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserPlan" ADD CONSTRAINT "UserPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserPlan" ADD CONSTRAINT "UserPlan_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserPlusAccess" ADD CONSTRAINT "UserPlusAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Many-to-many foreign keys
ALTER TABLE "_CharacterAttires" ADD CONSTRAINT "_CharacterAttires_A_fkey" FOREIGN KEY ("A") REFERENCES "Attire"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_CharacterAttires" ADD CONSTRAINT "_CharacterAttires_B_fkey" FOREIGN KEY ("B") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_CharacterToTag" ADD CONSTRAINT "_CharacterToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_CharacterToTag" ADD CONSTRAINT "_CharacterToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_CharacterToStory" ADD CONSTRAINT "_CharacterToStory_A_fkey" FOREIGN KEY ("A") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_CharacterToStory" ADD CONSTRAINT "_CharacterToStory_B_fkey" FOREIGN KEY ("B") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_StoryToTag" ADD CONSTRAINT "_StoryToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_StoryToTag" ADD CONSTRAINT "_StoryToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
