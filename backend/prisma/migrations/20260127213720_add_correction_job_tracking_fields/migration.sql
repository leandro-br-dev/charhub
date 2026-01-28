-- Add individual correction tracking fields to CorrectionJobLog
-- Migration: add_correction_job_tracking_fields
-- Date: 2026-01-27

-- Add characterId column for individual corrections
ALTER TABLE "CorrectionJobLog" ADD COLUMN "characterId" TEXT;

-- Add fieldsCorrected array to track which fields were corrected
ALTER TABLE "CorrectionJobLog" ADD COLUMN "fieldsCorrected" TEXT[] DEFAULT '{}';

-- Add details column for additional correction metadata
ALTER TABLE "CorrectionJobLog" ADD COLUMN "details" JSONB;

-- Create index on characterId for faster lookups
CREATE INDEX "CorrectionJobLog_characterId_idx" ON "CorrectionJobLog"("characterId");

-- Add foreign key constraint to Character table
ALTER TABLE "CorrectionJobLog" ADD CONSTRAINT "CorrectionJobLog_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"(id) ON UPDATE CASCADE ON DELETE SET NULL;
