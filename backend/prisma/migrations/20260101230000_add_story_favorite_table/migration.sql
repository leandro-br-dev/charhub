-- Create StoryFavorite table
CREATE TABLE "StoryFavorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryFavorite_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "StoryFavorite_userId_idx" ON "StoryFavorite"("userId");
CREATE INDEX "StoryFavorite_storyId_idx" ON "StoryFavorite"("storyId");

-- Create unique constraint
CREATE UNIQUE INDEX "StoryFavorite_userId_storyId_key" ON "StoryFavorite"("userId", "storyId");

-- Add foreign keys
ALTER TABLE "StoryFavorite" ADD CONSTRAINT "StoryFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoryFavorite" ADD CONSTRAINT "StoryFavorite_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
