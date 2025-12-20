-- AlterTable
ALTER TABLE "User" ADD COLUMN     "hasCompletedWelcome" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "maxAgeRating" SET DEFAULT 'L';
