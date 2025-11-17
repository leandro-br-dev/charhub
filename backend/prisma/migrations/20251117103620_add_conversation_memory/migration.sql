/*
  Warnings:

  - You are about to drop the `credit_transactions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `plans` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `service_credit_costs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `usage_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_monthly_balances` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_plans` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_plus_access` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."credit_transactions" DROP CONSTRAINT "credit_transactions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."usage_logs" DROP CONSTRAINT "usage_logs_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."user_monthly_balances" DROP CONSTRAINT "user_monthly_balances_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."user_plans" DROP CONSTRAINT "user_plans_plan_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."user_plans" DROP CONSTRAINT "user_plans_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."user_plus_access" DROP CONSTRAINT "user_plus_access_user_id_fkey";

-- DropTable
DROP TABLE "public"."credit_transactions";

-- DropTable
DROP TABLE "public"."plans";

-- DropTable
DROP TABLE "public"."service_credit_costs";

-- DropTable
DROP TABLE "public"."usage_logs";

-- DropTable
DROP TABLE "public"."user_monthly_balances";

-- DropTable
DROP TABLE "public"."user_plans";

-- DropTable
DROP TABLE "public"."user_plus_access";

-- CreateTable
CREATE TABLE "ConversationMemory" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "keyEvents" JSONB NOT NULL,
    "messageCount" INTEGER NOT NULL,
    "startMessageId" TEXT,
    "endMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationMemory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "transactionType" "CreditTransactionType" NOT NULL,
    "amountCredits" DOUBLE PRECISION NOT NULL,
    "balanceAfter" DOUBLE PRECISION,
    "notes" TEXT,
    "relatedUsageLogId" TEXT,
    "relatedPlanId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "tier" "PlanTier" NOT NULL,
    "name" TEXT NOT NULL,
    "priceMonthly" DOUBLE PRECISION NOT NULL,
    "creditsPerMonth" INTEGER NOT NULL,
    "description" TEXT,
    "features" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paypalPlanId" TEXT,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceCreditCost" (
    "id" TEXT NOT NULL,
    "serviceIdentifier" TEXT NOT NULL,
    "creditsPerUnit" DOUBLE PRECISION NOT NULL,
    "unitDescription" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceCreditCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "characterCount" INTEGER,
    "imageCount" INTEGER DEFAULT 1,
    "creditsConsumed" DOUBLE PRECISION,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMonthlyBalance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "monthStartDate" TIMESTAMP(3) NOT NULL,
    "startingBalance" DOUBLE PRECISION NOT NULL,
    "creditsGranted" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "creditsSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "endingBalance" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserMonthlyBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastCreditsGrantedAt" TIMESTAMP(3),
    "paypalSubscriptionId" TEXT,

    CONSTRAINT "UserPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPlusAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "grantedBy" TEXT,
    "reason" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPlusAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConversationMemory_conversationId_idx" ON "ConversationMemory"("conversationId");

-- CreateIndex
CREATE INDEX "ConversationMemory_createdAt_idx" ON "ConversationMemory"("createdAt");

-- CreateIndex
CREATE INDEX "CreditTransaction_userId_idx" ON "CreditTransaction"("userId");

-- CreateIndex
CREATE INDEX "CreditTransaction_userId_timestamp_idx" ON "CreditTransaction"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "CreditTransaction_transactionType_idx" ON "CreditTransaction"("transactionType");

-- CreateIndex
CREATE INDEX "CreditTransaction_timestamp_idx" ON "CreditTransaction"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_tier_key" ON "Plan"("tier");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_paypalPlanId_key" ON "Plan"("paypalPlanId");

-- CreateIndex
CREATE INDEX "Plan_tier_idx" ON "Plan"("tier");

-- CreateIndex
CREATE INDEX "Plan_isActive_idx" ON "Plan"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCreditCost_serviceIdentifier_key" ON "ServiceCreditCost"("serviceIdentifier");

-- CreateIndex
CREATE INDEX "ServiceCreditCost_serviceIdentifier_idx" ON "ServiceCreditCost"("serviceIdentifier");

-- CreateIndex
CREATE INDEX "ServiceCreditCost_isActive_idx" ON "ServiceCreditCost"("isActive");

-- CreateIndex
CREATE INDEX "UsageLog_userId_idx" ON "UsageLog"("userId");

-- CreateIndex
CREATE INDEX "UsageLog_userId_processed_idx" ON "UsageLog"("userId", "processed");

-- CreateIndex
CREATE INDEX "UsageLog_serviceType_idx" ON "UsageLog"("serviceType");

-- CreateIndex
CREATE INDEX "UsageLog_timestamp_idx" ON "UsageLog"("timestamp");

-- CreateIndex
CREATE INDEX "UsageLog_processed_idx" ON "UsageLog"("processed");

-- CreateIndex
CREATE INDEX "UserMonthlyBalance_userId_idx" ON "UserMonthlyBalance"("userId");

-- CreateIndex
CREATE INDEX "UserMonthlyBalance_monthStartDate_idx" ON "UserMonthlyBalance"("monthStartDate");

-- CreateIndex
CREATE UNIQUE INDEX "UserMonthlyBalance_userId_monthStartDate_key" ON "UserMonthlyBalance"("userId", "monthStartDate");

-- CreateIndex
CREATE UNIQUE INDEX "UserPlan_paypalSubscriptionId_key" ON "UserPlan"("paypalSubscriptionId");

-- CreateIndex
CREATE INDEX "UserPlan_userId_idx" ON "UserPlan"("userId");

-- CreateIndex
CREATE INDEX "UserPlan_planId_idx" ON "UserPlan"("planId");

-- CreateIndex
CREATE INDEX "UserPlan_status_idx" ON "UserPlan"("status");

-- CreateIndex
CREATE INDEX "UserPlan_currentPeriodEnd_idx" ON "UserPlan"("currentPeriodEnd");

-- CreateIndex
CREATE INDEX "UserPlan_paypalSubscriptionId_idx" ON "UserPlan"("paypalSubscriptionId");

-- CreateIndex
CREATE INDEX "UserPlusAccess_userId_idx" ON "UserPlusAccess"("userId");

-- CreateIndex
CREATE INDEX "UserPlusAccess_isActive_idx" ON "UserPlusAccess"("isActive");

-- CreateIndex
CREATE INDEX "UserPlusAccess_endDate_idx" ON "UserPlusAccess"("endDate");

-- AddForeignKey
ALTER TABLE "ConversationMemory" ADD CONSTRAINT "ConversationMemory_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageLog" ADD CONSTRAINT "UsageLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMonthlyBalance" ADD CONSTRAINT "UserMonthlyBalance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPlan" ADD CONSTRAINT "UserPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPlan" ADD CONSTRAINT "UserPlan_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPlusAccess" ADD CONSTRAINT "UserPlusAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
