-- SimplifySystemConfiguration
-- Remove description, category, updatedAt, updatedBy columns

-- Alter table to remove columns
ALTER TABLE "SystemConfiguration" DROP COLUMN IF EXISTS "description";
ALTER TABLE "SystemConfiguration" DROP COLUMN IF EXISTS "category";
ALTER TABLE "SystemConfiguration" DROP COLUMN IF EXISTS "updatedAt";
ALTER TABLE "SystemConfiguration" DROP COLUMN IF EXISTS "updatedBy";

-- Remove the category index (no longer needed)
DROP INDEX IF EXISTS "SystemConfiguration_category_idx";
