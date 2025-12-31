-- Add Species table and CharacterGender enum for character filtering
-- This migration is NON-DESTRUCTIVE - it preserves all existing data
--
-- Production data to preserve:
-- Gender values: NULL, female, feminino, non-binary, male
-- Species values: Mushroom Folk, duckling, Advanced Android, celestial being,
--   anthropomorphic frog, anthropomorphic fox, Draconic Gryphonid, elf, humano,
--   human, cat, gnome, angel, Kemonomimi (Neko), Kitsunemimi,
--   Anthropomorphic Feline, Anthropomorphic Fox, AI Construct, Transformer,
--   Robot, Demônio, Koi Spirit, Cybertronian, System Entity, robot,
--   Totoro-like creature

-- ============================================================================
-- Step 1: Create ENUM
-- ============================================================================

-- Create CharacterGender enum
CREATE TYPE "CharacterGender" AS ENUM ('MALE', 'FEMALE', 'NON_BINARY', 'OTHER', 'UNKNOWN');

-- Create AuthProvider.SYSTEM (if not exists) for bot role support
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SYSTEM' AND enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'AuthProvider'
    )) THEN
        ALTER TYPE "AuthProvider" ADD VALUE 'SYSTEM';
    END IF;
END $$;

-- Create UserRole.BOT (if not exists)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'BOT' AND enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'UserRole'
    )) THEN
        ALTER TYPE "UserRole" ADD VALUE 'BOT';
    END IF;
END $$;

-- ============================================================================
-- Step 2: Create Species table
-- ============================================================================

CREATE TABLE "Species" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "ageRating" "AgeRating" DEFAULT 'L',
    "contentTags" "ContentTag"[],
    "description" TEXT,
    "originalLanguageCode" TEXT,
    "weight" INTEGER DEFAULT 1,
    "searchable" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Species_pkey" PRIMARY KEY ("id")
);

-- Create index on Species for filtering
CREATE INDEX "Species_category_idx" ON "Species"("category");
CREATE INDEX "Species_ageRating_idx" ON "Species"("ageRating");
CREATE INDEX "Species_searchable_idx" ON "Species"("searchable");

-- ============================================================================
-- Step 3: Rename old columns (PRESERVE DATA)
-- ============================================================================

-- Rename old Character.gender column to gender_old
ALTER TABLE "Character" RENAME COLUMN "gender" TO "gender_old";

-- Rename old Character.species column to species_old (if exists)
-- Note: The column might not exist in all databases, so we check first
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Character' AND column_name = 'species'
    ) THEN
        ALTER TABLE "Character" RENAME COLUMN "species" TO "species_old";
    END IF;
END $$;

-- ============================================================================
-- Step 4: Create new columns with proper types
-- ============================================================================

-- Add new gender column with enum type
ALTER TABLE "Character" ADD COLUMN "gender" "CharacterGender" DEFAULT 'UNKNOWN';

-- Add new speciesId column with FK reference
ALTER TABLE "Character" ADD COLUMN "speciesId" TEXT;

-- ============================================================================
-- Step 5: Create indexes and foreign key
-- ============================================================================

-- Create index on speciesId for faster lookups
CREATE INDEX "Character_speciesId_idx" ON "Character"("speciesId");

-- Add foreign key constraint
ALTER TABLE "Character" ADD CONSTRAINT "Character_speciesId_fkey"
    FOREIGN KEY ("speciesId") REFERENCES "Species"("id") ON DELETE SET NULL;

-- ============================================================================
-- Step 6: Add AvatarSource enum (if not exists)
-- ============================================================================

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AvatarSource') THEN
        CREATE TYPE "AvatarSource" AS ENUM ('PROVIDER', 'UPLOADED');
    END IF;
END $$;

-- Add avatarSource column to User if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'User' AND column_name = 'avatarSource'
    ) THEN
        ALTER TABLE "User" ADD COLUMN "avatarSource" "AvatarSource" DEFAULT 'PROVIDER';
    END IF;
END $$;

-- Add avatarUpdatedAt column to User if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'User' AND column_name = 'avatarUpdatedAt'
    ) THEN
        ALTER TABLE "User" ADD COLUMN "avatarUpdatedAt" TIMESTAMP(3);
    END IF;
END $$;

-- Add hasCompletedWelcome to User if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'User' AND column_name = 'hasCompletedWelcome'
    ) THEN
        ALTER TABLE "User" ADD COLUMN "hasCompletedWelcome" BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Add PaymentProvider enum (if not exists)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentProvider') THEN
        CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'PAYPAL');
    END IF;
END $$;

-- Add paymentProvider to Plan if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Plan' AND column_name = 'paymentProvider'
    ) THEN
        ALTER TABLE "Plan" ADD COLUMN "paymentProvider" "PaymentProvider" DEFAULT 'STRIPE';
    END IF;
END $$;

-- Add stripePriceId to Plan if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Plan' AND column_name = 'stripePriceId'
    ) THEN
        ALTER TABLE "Plan" ADD COLUMN "stripePriceId" TEXT UNIQUE;
    END IF;
END $$;

-- Add stripeProductId to Plan if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Plan' AND column_name = 'stripeProductId'
    ) THEN
        ALTER TABLE "Plan" ADD COLUMN "stripeProductId" TEXT;
    END IF;
END $$;
