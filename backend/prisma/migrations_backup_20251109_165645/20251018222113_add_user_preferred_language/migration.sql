-- AlterTable
ALTER TABLE "User" ADD COLUMN     "preferredLanguage" TEXT DEFAULT 'en',
ALTER COLUMN "username" DROP NOT NULL;
