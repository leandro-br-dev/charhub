-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('GOOGLE', 'FACEBOOK');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('BASIC', 'PREMIUM', 'ADMIN');

-- CreateEnum
CREATE TYPE "AgeRating" AS ENUM ('L', 'TEN', 'TWELVE', 'FOURTEEN', 'SIXTEEN', 'EIGHTEEN');

-- CreateEnum
CREATE TYPE "ContentTag" AS ENUM ('VIOLENCE', 'GORE', 'SEXUAL', 'NUDITY', 'LANGUAGE', 'DRUGS', 'ALCOHOL', 'HORROR', 'PSYCHOLOGICAL', 'DISCRIMINATION', 'CRIME', 'GAMBLING');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PRIVATE', 'UNLISTED', 'PUBLIC');

-- CreateEnum
CREATE TYPE "AvatarSource" AS ENUM ('PROVIDER', 'UPLOADED');

-- CreateEnum
CREATE TYPE "StickerStatus" AS ENUM ('PENDING', 'GENERATING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ImageType" AS ENUM ('AVATAR', 'COVER', 'SAMPLE', 'STICKER', 'OTHER');

-- CreateEnum
CREATE TYPE "TagType" AS ENUM ('CHARACTER', 'STORY', 'ASSET', 'GAME', 'MEDIA', 'GENERAL');

-- CreateEnum
CREATE TYPE "SenderType" AS ENUM ('USER', 'CHARACTER', 'ASSISTANT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "TranslationStatus" AS ENUM ('PENDING', 'ACTIVE', 'OUTDATED', 'FAILED', 'REVIEWED');

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "age" INTEGER,
    "gender" TEXT,
    "species" TEXT,
    "style" TEXT,
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "FavoriteCharacter" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoriteCharacter_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "_CharacterAttires" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CharacterAttires_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_CharacterToStory" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CharacterToStory_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_CharacterToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CharacterToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_StoryToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_StoryToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_provider_providerAccountId_key" ON "User"("provider", "providerAccountId");

-- CreateIndex
CREATE INDEX "ContentClassification_ageRating_idx" ON "ContentClassification"("ageRating");

-- CreateIndex
CREATE INDEX "ContentClassification_contentType_idx" ON "ContentClassification"("contentType");

-- CreateIndex
CREATE UNIQUE INDEX "ContentClassification_contentType_contentId_key" ON "ContentClassification"("contentType", "contentId");

-- CreateIndex
CREATE UNIQUE INDEX "Lora_civitaiVersionId_key" ON "Lora"("civitaiVersionId");

-- CreateIndex
CREATE INDEX "Lora_civitaiModelId_idx" ON "Lora"("civitaiModelId");

-- CreateIndex
CREATE INDEX "Lora_civitaiVersionId_idx" ON "Lora"("civitaiVersionId");

-- CreateIndex
CREATE INDEX "Lora_deleted_idx" ON "Lora"("deleted");

-- CreateIndex
CREATE INDEX "Attire_userId_idx" ON "Attire"("userId");

-- CreateIndex
CREATE INDEX "Attire_visibility_idx" ON "Attire"("visibility");

-- CreateIndex
CREATE INDEX "Attire_ageRating_idx" ON "Attire"("ageRating");

-- CreateIndex
CREATE INDEX "Tag_type_idx" ON "Tag"("type");

-- CreateIndex
CREATE INDEX "Tag_ageRating_idx" ON "Tag"("ageRating");

-- CreateIndex
CREATE INDEX "Tag_searchable_idx" ON "Tag"("searchable");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_type_key" ON "Tag"("name", "type");

-- CreateIndex
CREATE INDEX "Character_userId_idx" ON "Character"("userId");

-- CreateIndex
CREATE INDEX "Character_visibility_idx" ON "Character"("visibility");

-- CreateIndex
CREATE INDEX "Character_isSystemCharacter_idx" ON "Character"("isSystemCharacter");

-- CreateIndex
CREATE INDEX "Character_ageRating_idx" ON "Character"("ageRating");

-- CreateIndex
CREATE INDEX "Character_loraId_idx" ON "Character"("loraId");

-- CreateIndex
CREATE INDEX "Character_mainAttireId_idx" ON "Character"("mainAttireId");

-- CreateIndex
CREATE INDEX "CharacterSticker_characterId_idx" ON "CharacterSticker"("characterId");

-- CreateIndex
CREATE INDEX "CharacterSticker_status_idx" ON "CharacterSticker"("status");

-- CreateIndex
CREATE INDEX "CharacterImage_characterId_idx" ON "CharacterImage"("characterId");

-- CreateIndex
CREATE INDEX "CharacterImage_type_idx" ON "CharacterImage"("type");

-- CreateIndex
CREATE INDEX "CharacterImage_ageRating_idx" ON "CharacterImage"("ageRating");

-- CreateIndex
CREATE INDEX "Story_authorId_idx" ON "Story"("authorId");

-- CreateIndex
CREATE INDEX "Story_visibility_idx" ON "Story"("visibility");

-- CreateIndex
CREATE INDEX "Assistant_userId_idx" ON "Assistant"("userId");

-- CreateIndex
CREATE INDEX "Assistant_visibility_idx" ON "Assistant"("visibility");

-- CreateIndex
CREATE INDEX "Assistant_defaultCharacterId_idx" ON "Assistant"("defaultCharacterId");

-- CreateIndex
CREATE INDEX "Conversation_userId_idx" ON "Conversation"("userId");

-- CreateIndex
CREATE INDEX "Conversation_lastMessageAt_idx" ON "Conversation"("lastMessageAt");

-- CreateIndex
CREATE INDEX "Conversation_projectId_idx" ON "Conversation"("projectId");

-- CreateIndex
CREATE INDEX "Conversation_storyId_idx" ON "Conversation"("storyId");

-- CreateIndex
CREATE INDEX "ConversationParticipant_conversationId_idx" ON "ConversationParticipant"("conversationId");

-- CreateIndex
CREATE INDEX "ConversationParticipant_userId_idx" ON "ConversationParticipant"("userId");

-- CreateIndex
CREATE INDEX "ConversationParticipant_actingCharacterId_idx" ON "ConversationParticipant"("actingCharacterId");

-- CreateIndex
CREATE INDEX "ConversationParticipant_actingAssistantId_idx" ON "ConversationParticipant"("actingAssistantId");

-- CreateIndex
CREATE INDEX "ConversationParticipant_representingCharacterId_idx" ON "ConversationParticipant"("representingCharacterId");

-- CreateIndex
CREATE INDEX "ConversationParticipant_conversationId_actingCharacterId_idx" ON "ConversationParticipant"("conversationId", "actingCharacterId");

-- CreateIndex
CREATE INDEX "ConversationParticipant_conversationId_actingAssistantId_idx" ON "ConversationParticipant"("conversationId", "actingAssistantId");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE INDEX "Message_conversationId_timestamp_idx" ON "Message"("conversationId", "timestamp");

-- CreateIndex
CREATE INDEX "FavoriteCharacter_userId_idx" ON "FavoriteCharacter"("userId");

-- CreateIndex
CREATE INDEX "FavoriteCharacter_characterId_idx" ON "FavoriteCharacter"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteCharacter_userId_characterId_key" ON "FavoriteCharacter"("userId", "characterId");

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

-- CreateIndex
CREATE INDEX "_CharacterAttires_B_index" ON "_CharacterAttires"("B");

-- CreateIndex
CREATE INDEX "_CharacterToStory_B_index" ON "_CharacterToStory"("B");

-- CreateIndex
CREATE INDEX "_CharacterToTag_B_index" ON "_CharacterToTag"("B");

-- CreateIndex
CREATE INDEX "_StoryToTag_B_index" ON "_StoryToTag"("B");

-- AddForeignKey
ALTER TABLE "Attire" ADD CONSTRAINT "Attire_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_loraId_fkey" FOREIGN KEY ("loraId") REFERENCES "Lora"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_mainAttireId_fkey" FOREIGN KEY ("mainAttireId") REFERENCES "Attire"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterSticker" ADD CONSTRAINT "CharacterSticker_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterImage" ADD CONSTRAINT "CharacterImage_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assistant" ADD CONSTRAINT "Assistant_defaultCharacterId_fkey" FOREIGN KEY ("defaultCharacterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assistant" ADD CONSTRAINT "Assistant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_actingCharacterId_fkey" FOREIGN KEY ("actingCharacterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_actingAssistantId_fkey" FOREIGN KEY ("actingAssistantId") REFERENCES "Assistant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_representingCharacterId_fkey" FOREIGN KEY ("representingCharacterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteCharacter" ADD CONSTRAINT "FavoriteCharacter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CharacterAttires" ADD CONSTRAINT "_CharacterAttires_A_fkey" FOREIGN KEY ("A") REFERENCES "Attire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CharacterAttires" ADD CONSTRAINT "_CharacterAttires_B_fkey" FOREIGN KEY ("B") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CharacterToStory" ADD CONSTRAINT "_CharacterToStory_A_fkey" FOREIGN KEY ("A") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CharacterToStory" ADD CONSTRAINT "_CharacterToStory_B_fkey" FOREIGN KEY ("B") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CharacterToTag" ADD CONSTRAINT "_CharacterToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CharacterToTag" ADD CONSTRAINT "_CharacterToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StoryToTag" ADD CONSTRAINT "_StoryToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StoryToTag" ADD CONSTRAINT "_StoryToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
