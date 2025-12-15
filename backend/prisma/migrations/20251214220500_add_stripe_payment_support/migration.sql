-- CreateEnum: PaymentProvider
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'PAYPAL');

-- AlterTable Plan: Add payment provider support
ALTER TABLE "Plan"
  ADD COLUMN "paymentProvider" "PaymentProvider" NOT NULL DEFAULT 'STRIPE',
  ADD COLUMN "stripePriceId" TEXT,
  ADD COLUMN "stripeProductId" TEXT;

-- AlterTable UserPlan: Add Stripe fields
ALTER TABLE "UserPlan"
  ADD COLUMN "paymentProvider" "PaymentProvider",
  ADD COLUMN "stripeSubscriptionId" TEXT,
  ADD COLUMN "stripeCustomerId" TEXT;

-- Update existing Plans with PayPal configuration to use PAYPAL provider
UPDATE "Plan"
SET "paymentProvider" = 'PAYPAL'
WHERE "paypalPlanId" IS NOT NULL;

-- Update existing UserPlans with PayPal subscriptions
UPDATE "UserPlan"
SET "paymentProvider" = 'PAYPAL'
WHERE "paypalSubscriptionId" IS NOT NULL;

-- CreateIndex: Add indexes for new fields
CREATE INDEX "Plan_paymentProvider_idx" ON "Plan"("paymentProvider");
CREATE UNIQUE INDEX "Plan_stripePriceId_key" ON "Plan"("stripePriceId");

CREATE INDEX "UserPlan_paymentProvider_idx" ON "UserPlan"("paymentProvider");
CREATE UNIQUE INDEX "UserPlan_stripeSubscriptionId_key" ON "UserPlan"("stripeSubscriptionId");
