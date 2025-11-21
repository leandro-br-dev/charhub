-- Fix Credits System Schema
-- This migration aligns the database schema with the CREDITS_SYSTEM.md specification

-- Step 1: Add missing columns to UsageLog
ALTER TABLE "UsageLog" ADD COLUMN IF NOT EXISTS "conversationId" TEXT;
ALTER TABLE "UsageLog" ADD COLUMN IF NOT EXISTS "providerName" TEXT;
ALTER TABLE "UsageLog" ADD COLUMN IF NOT EXISTS "modelName" TEXT;
ALTER TABLE "UsageLog" ADD COLUMN IF NOT EXISTS "costUsd" DOUBLE PRECISION;
ALTER TABLE "UsageLog" ADD COLUMN IF NOT EXISTS "additionalMetadata" JSONB;
ALTER TABLE "UsageLog" ADD COLUMN IF NOT EXISTS "imagesProcessed" INTEGER;

-- Step 2: Rename characterCount to charactersProcessed in UsageLog
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM information_schema.columns
    WHERE table_name='UsageLog' AND column_name='characterCount') THEN
    ALTER TABLE "UsageLog" RENAME COLUMN "characterCount" TO "charactersProcessed";
  END IF;
END $$;

-- Step 3: Drop imageCount column if it exists (replaced by imagesProcessed)
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM information_schema.columns
    WHERE table_name='UsageLog' AND column_name='imageCount') THEN
    ALTER TABLE "UsageLog" DROP COLUMN "imageCount";
  END IF;
END $$;

-- Step 4: Change serviceType from enum to TEXT in UsageLog
-- First, alter the column to allow both enum and text temporarily
ALTER TABLE "UsageLog" ALTER COLUMN "serviceType" TYPE TEXT USING "serviceType"::TEXT;

-- Step 5: Update SubscriptionStatus enum (CANCELED → CANCELLED)
-- We need to handle the enum change carefully
DO $$
BEGIN
  -- Create a temporary column as TEXT
  ALTER TABLE "UserPlan" ADD COLUMN "status_new" TEXT;

  -- Copy values, replacing CANCELED with CANCELLED
  UPDATE "UserPlan" SET "status_new" =
    CASE
      WHEN "status"::TEXT = 'CANCELED' THEN 'CANCELLED'
      ELSE "status"::TEXT
    END;

  -- Drop the old column (this will drop the enum constraint)
  ALTER TABLE "UserPlan" DROP COLUMN "status";

  -- Drop and recreate the enum with corrected spelling
  DROP TYPE IF EXISTS "SubscriptionStatus" CASCADE;
  CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED', 'PAYMENT_FAILED');

  -- Rename the temporary column
  ALTER TABLE "UserPlan" RENAME COLUMN "status_new" TO "status";

  -- Add the enum constraint to the new column
  ALTER TABLE "UserPlan" ALTER COLUMN "status" TYPE "SubscriptionStatus"
    USING "status"::TEXT::"SubscriptionStatus";

  -- Set default value
  ALTER TABLE "UserPlan" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

  -- Add NOT NULL constraint if needed
  ALTER TABLE "UserPlan" ALTER COLUMN "status" SET NOT NULL;
END $$;

-- Step 6: Drop ServiceType enum (no longer used)
DROP TYPE IF EXISTS "ServiceType" CASCADE;

-- Step 7: Add index on UsageLog.creditsConsumed for filtering unprocessed logs
CREATE INDEX IF NOT EXISTS "UsageLog_creditsConsumed_idx" ON "UsageLog"("creditsConsumed");

-- Step 8: Verify that all required fields exist
DO $$
BEGIN
  -- Verify CreditTransaction has all required fields
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='CreditTransaction' AND column_name='balanceAfter') THEN
    RAISE EXCEPTION 'CreditTransaction.balanceAfter is missing!';
  END IF;

  -- Verify Plan has all required fields
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='Plan' AND column_name='priceMonthly') THEN
    RAISE EXCEPTION 'Plan.priceMonthly is missing!';
  END IF;

  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='Plan' AND column_name='creditsPerMonth') THEN
    RAISE EXCEPTION 'Plan.creditsPerMonth is missing!';
  END IF;

  -- Verify ServiceCreditCost has isActive
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='ServiceCreditCost' AND column_name='isActive') THEN
    RAISE EXCEPTION 'ServiceCreditCost.isActive is missing!';
  END IF;

  -- Verify UserMonthlyBalance has all required fields
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='UserMonthlyBalance' AND column_name='endingBalance') THEN
    RAISE EXCEPTION 'UserMonthlyBalance.endingBalance is missing!';
  END IF;

  -- Verify UserPlan has all required fields
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='UserPlan' AND column_name='cancelAtPeriodEnd') THEN
    RAISE EXCEPTION 'UserPlan.cancelAtPeriodEnd is missing!';
  END IF;

  -- Verify UserPlusAccess has isActive
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='UserPlusAccess' AND column_name='isActive') THEN
    RAISE EXCEPTION 'UserPlusAccess.isActive is missing!';
  END IF;

  RAISE NOTICE 'All required fields verified successfully!';
END $$;
