-- Remove deprecated gender_old and species_old columns from Character table
-- These columns were renamed in migration 20251231102002_add_species_and_gender_enum
-- Data has already been migrated to the new gender (enum) and speciesId (FK) columns

-- Drop gender_old column (if exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Character' AND column_name = 'gender_old'
    ) THEN
        ALTER TABLE "Character" DROP COLUMN "gender_old";
    END IF;
END $$;

-- Drop species_old column (if exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Character' AND column_name = 'species_old'
    ) THEN
        ALTER TABLE "Character" DROP COLUMN "species_old";
    END IF;
END $$;
