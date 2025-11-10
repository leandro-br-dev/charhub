/*
  Warnings:

  - You are about to drop the column `creatorId` on the `Story` table. All the data in the column will be lost.
  - Added the required column `authorId` to the `Story` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Story" DROP CONSTRAINT "Story_creatorId_fkey";

-- DropIndex
DROP INDEX "public"."Story_creatorId_idx";

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "storyId" TEXT;

-- AlterTable
ALTER TABLE "Story" DROP COLUMN "creatorId",
ADD COLUMN     "ageRating" "AgeRating" NOT NULL DEFAULT 'L',
ADD COLUMN     "authorId" TEXT NOT NULL,
ADD COLUMN     "contentTags" "ContentTag"[],
ADD COLUMN     "coverImage" TEXT,
ADD COLUMN     "initialText" TEXT,
ADD COLUMN     "objectives" JSONB;

-- CreateTable
CREATE TABLE "_CharacterToStory" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CharacterToStory_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_CharacterToStory_B_index" ON "_CharacterToStory"("B");

-- CreateIndex
CREATE INDEX "Conversation_storyId_idx" ON "Conversation"("storyId");

-- CreateIndex
CREATE INDEX "Story_authorId_idx" ON "Story"("authorId");

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CharacterToStory" ADD CONSTRAINT "_CharacterToStory_A_fkey" FOREIGN KEY ("A") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CharacterToStory" ADD CONSTRAINT "_CharacterToStory_B_fkey" FOREIGN KEY ("B") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
