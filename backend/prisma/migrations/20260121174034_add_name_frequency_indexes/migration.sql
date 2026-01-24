-- Create indexes for name frequency queries to improve performance
-- These indexes support the queries in NameFrequencyService.getTopNames()

-- Index for first name frequency queries (gender, createdAt, firstName)
-- Supports queries filtering by gender and date range, grouping by firstName
CREATE INDEX IF NOT EXISTS "idx_character_name_frequency_first"
  ON "Character"("gender", "createdAt" DESC, "firstName")
  WHERE "isSystemCharacter" = false AND "visibility" != 'PRIVATE';

-- Index for last name frequency queries (gender, createdAt, lastName)
-- Supports queries filtering by gender and date range, grouping by lastName
-- Only indexes non-null last names
CREATE INDEX IF NOT EXISTS "idx_character_name_frequency_last"
  ON "Character"("gender", "createdAt" DESC, "lastName")
  WHERE "isSystemCharacter" = false AND "visibility" != 'PRIVATE' AND "lastName" IS NOT NULL;

-- Index for recent characters queries (userId, createdAt)
-- Supports queries fetching last 10 bot-generated characters
CREATE INDEX IF NOT EXISTS "idx_character_recent_bot_generated"
  ON "Character"("userId", "createdAt" DESC)
  WHERE "isSystemCharacter" = false;
