-- CreateEnum
CREATE TYPE "CreditTransactionType" AS ENUM ('GRANT_INITIAL', 'GRANT_PLAN', 'PURCHASE', 'CONSUMPTION', 'SYSTEM_REWARD', 'REFUND', 'ADJUSTMENT', 'REFERRAL_BONUS', 'PROMOTIONAL');

-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('FREE', 'PLUS', 'PREMIUM');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELED', 'EXPIRED', 'PAYMENT_FAILED');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('LLM_CHAT_SAFE', 'LLM_CHAT_NSFW', 'LLM_STORY_GENERATION_SFW', 'LLM_STORY_GENERATION_NSFW', 'IMAGE_GENERATION', 'TTS_DEFAULT', 'STT_DEFAULT');

-- CreateTable
CREATE TABLE "credit_transactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "transaction_type" "CreditTransactionType" NOT NULL,
    "amount_credits" DOUBLE PRECISION NOT NULL,
    "balance_after" DOUBLE PRECISION,
    "notes" TEXT,
    "related_usage_log_id" TEXT,
    "related_plan_id" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_credit_costs" (
    "id" TEXT NOT NULL,
    "service_identifier" TEXT NOT NULL,
    "credits_per_unit" DOUBLE PRECISION NOT NULL,
    "unit_description" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_credit_costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "tier" "PlanTier" NOT NULL,
    "name" TEXT NOT NULL,
    "price_monthly" DOUBLE PRECISION NOT NULL,
    "credits_per_month" INTEGER NOT NULL,
    "description" TEXT,
    "features" JSONB,
    "stripe_price_id" TEXT,
    "stripe_product_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_plans" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "stripe_subscription_id" TEXT,
    "stripe_customer_id" TEXT,
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "canceled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_monthly_balances" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "month_start_date" TIMESTAMP(3) NOT NULL,
    "starting_balance" DOUBLE PRECISION NOT NULL,
    "credits_granted" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "credits_spent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ending_balance" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_monthly_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_plus_access" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "granted_by" TEXT,
    "reason" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_plus_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "service_type" "ServiceType" NOT NULL,
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "character_count" INTEGER,
    "image_count" INTEGER DEFAULT 1,
    "credits_consumed" DOUBLE PRECISION,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processed_at" TIMESTAMP(3),
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "credit_transactions_user_id_idx" ON "credit_transactions"("user_id");

-- CreateIndex
CREATE INDEX "credit_transactions_transaction_type_idx" ON "credit_transactions"("transaction_type");

-- CreateIndex
CREATE INDEX "credit_transactions_timestamp_idx" ON "credit_transactions"("timestamp");

-- CreateIndex
CREATE INDEX "credit_transactions_user_id_timestamp_idx" ON "credit_transactions"("user_id", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "service_credit_costs_service_identifier_key" ON "service_credit_costs"("service_identifier");

-- CreateIndex
CREATE INDEX "service_credit_costs_service_identifier_idx" ON "service_credit_costs"("service_identifier");

-- CreateIndex
CREATE INDEX "service_credit_costs_is_active_idx" ON "service_credit_costs"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "plans_tier_key" ON "plans"("tier");

-- CreateIndex
CREATE UNIQUE INDEX "plans_stripe_price_id_key" ON "plans"("stripe_price_id");

-- CreateIndex
CREATE INDEX "plans_tier_idx" ON "plans"("tier");

-- CreateIndex
CREATE INDEX "plans_is_active_idx" ON "plans"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "user_plans_stripe_subscription_id_key" ON "user_plans"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "user_plans_user_id_idx" ON "user_plans"("user_id");

-- CreateIndex
CREATE INDEX "user_plans_plan_id_idx" ON "user_plans"("plan_id");

-- CreateIndex
CREATE INDEX "user_plans_status_idx" ON "user_plans"("status");

-- CreateIndex
CREATE INDEX "user_plans_stripe_subscription_id_idx" ON "user_plans"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "user_plans_current_period_end_idx" ON "user_plans"("current_period_end");

-- CreateIndex
CREATE INDEX "user_monthly_balances_user_id_idx" ON "user_monthly_balances"("user_id");

-- CreateIndex
CREATE INDEX "user_monthly_balances_month_start_date_idx" ON "user_monthly_balances"("month_start_date");

-- CreateIndex
CREATE UNIQUE INDEX "user_monthly_balances_user_id_month_start_date_key" ON "user_monthly_balances"("user_id", "month_start_date");

-- CreateIndex
CREATE INDEX "user_plus_access_user_id_idx" ON "user_plus_access"("user_id");

-- CreateIndex
CREATE INDEX "user_plus_access_end_date_idx" ON "user_plus_access"("end_date");

-- CreateIndex
CREATE INDEX "user_plus_access_is_active_idx" ON "user_plus_access"("is_active");

-- CreateIndex
CREATE INDEX "usage_logs_user_id_idx" ON "usage_logs"("user_id");

-- CreateIndex
CREATE INDEX "usage_logs_service_type_idx" ON "usage_logs"("service_type");

-- CreateIndex
CREATE INDEX "usage_logs_processed_idx" ON "usage_logs"("processed");

-- CreateIndex
CREATE INDEX "usage_logs_timestamp_idx" ON "usage_logs"("timestamp");

-- CreateIndex
CREATE INDEX "usage_logs_user_id_processed_idx" ON "usage_logs"("user_id", "processed");

-- AddForeignKey
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_plans" ADD CONSTRAINT "user_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_plans" ADD CONSTRAINT "user_plans_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_monthly_balances" ADD CONSTRAINT "user_monthly_balances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_plus_access" ADD CONSTRAINT "user_plus_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
