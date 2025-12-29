-- Create StoryCharacterRole enum
CREATE TYPE "StoryCharacterRole" AS ENUM ('MAIN', 'SECONDARY');

-- Create StoryCharacter table
CREATE TABLE "StoryCharacter" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "role" "StoryCharacterRole" NOT NULL DEFAULT 'SECONDARY',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryCharacter_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on storyId + characterId
ALTER TABLE "StoryCharacter" ADD CONSTRAINT "StoryCharacter_storyId_characterId_key" UNIQUE ("storyId", "characterId");

-- Create indexes
CREATE INDEX "StoryCharacter_storyId_idx" ON "StoryCharacter"("storyId");
CREATE INDEX "StoryCharacter_characterId_idx" ON "StoryCharacter"("characterId");
CREATE INDEX "StoryCharacter_role_idx" ON "StoryCharacter"("role");

-- Add foreign key constraints
ALTER TABLE "StoryCharacter" ADD CONSTRAINT "StoryCharacter_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoryCharacter" ADD CONSTRAINT "StoryCharacter_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop the old _CharacterToStory table
DROP TABLE "_CharacterToStory";
