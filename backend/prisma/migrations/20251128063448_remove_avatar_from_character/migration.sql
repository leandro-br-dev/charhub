-- Remove avatar column from Character table
-- All avatar data has been migrated to CharacterImage table with type='AVATAR'

ALTER TABLE "Character" DROP COLUMN "avatar";
