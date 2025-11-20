-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'MODERATOR', 'MEMBER', 'VIEWER');

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "allowUserInvites" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isMultiUser" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxUsers" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "ownerUserId" TEXT,
ADD COLUMN     "requireApproval" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
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

-- CreateIndex
CREATE INDEX "UserConversationMembership_userId_idx" ON "UserConversationMembership"("userId");

-- CreateIndex
CREATE INDEX "UserConversationMembership_conversationId_idx" ON "UserConversationMembership"("conversationId");

-- CreateIndex
CREATE INDEX "UserConversationMembership_role_idx" ON "UserConversationMembership"("role");

-- CreateIndex
CREATE INDEX "UserConversationMembership_isActive_idx" ON "UserConversationMembership"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "UserConversationMembership_conversationId_userId_key" ON "UserConversationMembership"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "Conversation_ownerUserId_idx" ON "Conversation"("ownerUserId");

-- CreateIndex
CREATE INDEX "Conversation_isMultiUser_idx" ON "Conversation"("isMultiUser");

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserConversationMembership" ADD CONSTRAINT "UserConversationMembership_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserConversationMembership" ADD CONSTRAINT "UserConversationMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserConversationMembership" ADD CONSTRAINT "UserConversationMembership_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
