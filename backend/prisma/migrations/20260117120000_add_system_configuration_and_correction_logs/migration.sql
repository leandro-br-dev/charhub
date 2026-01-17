-- CreateTable
CREATE TABLE "SystemConfiguration" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "SystemConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorrectionJobLog" (
    "id" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "targetCount" INTEGER NOT NULL,
    "successCount" INTEGER NOT NULL,
    "failureCount" INTEGER NOT NULL,
    "duration" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "errors" JSONB,
    "metadata" JSONB,

    CONSTRAINT "CorrectionJobLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SystemConfiguration_key_key" ON "SystemConfiguration"("key");

-- CreateIndex
CREATE INDEX "SystemConfiguration_category_idx" ON "SystemConfiguration"("category");

-- CreateIndex
CREATE INDEX "CorrectionJobLog_jobType_startedAt_idx" ON "CorrectionJobLog"("jobType", "startedAt");
