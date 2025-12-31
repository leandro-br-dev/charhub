#!/usr/bin/env tsx
/**
 * Data Migration Script: Gender and Species
 *
 * This script migrates existing Character data from old string-based
 * gender/species to new enum-based values and Species foreign keys.
 *
 * RUN THIS AFTER: Migration 20251231102002_add_species_and_gender_enum
 * RUN THIS BEFORE: Removing gender_old and species_old columns
 *
 * Production data to migrate:
 * - Gender: NULL, female, feminino, non-binary, male
 * - Species: ~27 unique text values
 *
 * Usage:
 *   npm run db:migrate:gender-species
 */

import { prisma } from '../config/database';
import type { CharacterGender } from '../generated/prisma';

// ============================================================================
// MAPPINGS
// ============================================================================

/**
 * Gender mapping: old string values → new enum values
 * Case-insensitive, handles multilingual inputs
 */
const GENDER_MAP: Record<string, CharacterGender> = {
  'male': 'MALE',
  'masculino': 'MALE',

  'female': 'FEMALE',
  'feminino': 'FEMALE',

  'non-binary': 'NON_BINARY',
  'não-binário': 'NON_BINARY',
  'nao-binario': 'NON_BINARY',
  'non binary': 'NON_BINARY',
  'nonbinary': 'NON_BINARY',

  // Add more mappings as needed from production data
  'other': 'OTHER',
  'outro': 'OTHER',
};

/**
 * Species mapping: old string values → Species name (to lookup by name)
 * Based on production values and species.json definitions
 *
 * Strategy: Map to closest matching species, fallback to "Unknown" or "Other"
 */
const SPECIES_MAP: Record<string, string> = {
  // Direct matches (English)
  'human': 'Human',
  'elf': 'Elf',
  'cat': 'Catfolk',
  'gnome': 'Gnome',
  'angel': 'Angel',
  'robot': 'Robot',
  'demon': 'Demon',

  // Direct matches (Portuguese)
  'humano': 'Human',
  'demônio': 'Demon',

  // Anime/Japanese terms → closest match
  'kemonomimi (neko)': 'Nekomimi',
  'kitsunemimi': 'Foxkin',

  // Anthropomorphic → kin variant
  'anthropomorphic fox': 'Foxkin',
  'anthropomorphic feline': 'Catfolk',
  'anthropomorphic frog': 'Unknown',

  // Bird-like creatures
  'strigid': 'Unknown', // Owl-like species, map to Unknown // No direct match

  // Robot variants → Robot
  'transformer': 'Robot',
  'cybertronian': 'Robot',
  'ai construct': 'AI',
  'system entity': 'AI',

  // Fantasy/mythical → closest match
  'duckling': 'Unknown',
  'mushroom folk': 'Unknown',
  'celestial being': 'Angel',
  'draconic gryphonid': 'Griffin',
  'koi spirit': 'Unknown',
  'totoro-like creature': 'Unknown',

  // Add more mappings as needed from production data
};

// ============================================================================
// MIGRATION FUNCTIONS
// ============================================================================

/**
 * Get CharacterGender enum value from old string
 */
function mapGender(oldGender: string | null): CharacterGender {
  if (!oldGender || oldGender.trim() === '') {
    return 'UNKNOWN';
  }

  const normalized = oldGender.trim().toLowerCase();
  return GENDER_MAP[normalized] || 'UNKNOWN';
}

/**
 * Get Species ID from old species string
 * First maps to species name, then looks up UUID in database
 */
async function mapSpeciesId(oldSpecies: string | null): Promise<string | null> {
  if (!oldSpecies || oldSpecies.trim() === '') {
    return null;
  }

  const normalized = oldSpecies.trim();
  const speciesName = SPECIES_MAP[normalized.toLowerCase()];

  if (!speciesName) {
    console.warn(`  ⚠️  No species mapping for: "${normalized}"`);
    return null;
  }

  try {
    const species = await prisma.species.findUnique({
      where: { name: speciesName },
      select: { id: true },
    });

    if (!species) {
      console.warn(`  ⚠️  Species not found in database: "${speciesName}" (from "${normalized}")`);
      return null;
    }

    return species.id;
  } catch (error) {
    console.error(`  ❌ Error looking up species "${speciesName}":`, error);
    return null;
  }
}

// ============================================================================
// MAIN MIGRATION
// ============================================================================

interface MigrationStats {
  gender: { migrated: number; unknown: number; errors: number };
  species: { migrated: number; notFound: number; errors: number };
  total: number;
}

async function migrateGenderAndSpecies(): Promise<void> {
  console.log('🔄 Starting gender and species data migration...\n');

  const stats: MigrationStats = {
    gender: { migrated: 0, unknown: 0, errors: 0 },
    species: { migrated: 0, notFound: 0, errors: 0 },
    total: 0,
  };

  try {
    // Get all characters that need migration (have old columns set)
    // Use raw query because _old columns are temporary and not in Prisma schema
    const characters = await prisma.$queryRaw<Array<{
      id: string;
      gender_old: string | null;
      species_old: string | null;
    }>>`
      SELECT id, "gender_old", "species_old"
      FROM "Character"
      WHERE "gender_old" IS NOT NULL OR "species_old" IS NOT NULL
    `;

    stats.total = characters.length;
    console.log(`📊 Found ${stats.total} characters to migrate\n`);

    // Process each character
    for (const char of characters) {
      try {
        const updates: Partial<{
          gender: CharacterGender;
          speciesId: string;
        }> = {};

        // Migrate gender
        if (char.gender_old !== null) {
          const newGender = mapGender(char.gender_old);
          updates.gender = newGender;

          if (newGender === 'UNKNOWN') {
            stats.gender.unknown++;
          } else {
            stats.gender.migrated++;
          }

          if (stats.gender.migrated % 50 === 0) {
            console.log(`  Progress: ${stats.gender.migrated} genders migrated...`);
          }
        }

        // Migrate species
        if (char.species_old !== null && char.species_old !== '') {
          const newSpeciesId = await mapSpeciesId(char.species_old);

          if (newSpeciesId) {
            updates.speciesId = newSpeciesId;
            stats.species.migrated++;
          } else {
            stats.species.notFound++;
          }

          if (stats.species.migrated % 50 === 0) {
            console.log(`  Progress: ${stats.species.migrated} species migrated...`);
          }
        }

        // Apply updates if any
        if (Object.keys(updates).length > 0) {
          await prisma.character.update({
            where: { id: char.id },
            data: updates,
          });
        }

      } catch (error) {
        console.error(`  ❌ Error migrating character ${char.id}:`, error);
        stats.gender.errors++;
        stats.species.errors++;
      }
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total characters processed: ${stats.total}`);
  console.log(`\n👤 Gender:`);
  console.log(`  Migrated:  ${stats.gender.migrated}`);
  console.log(`  Unknown:   ${stats.gender.unknown}`);
  console.log(`  Errors:    ${stats.gender.errors}`);
  console.log(`\n🧬 Species:`);
  console.log(`  Migrated:  ${stats.species.migrated}`);
  console.log(`  Not Found: ${stats.species.notFound}`);
  console.log(`  Errors:    ${stats.species.errors}`);
  console.log('='.repeat(60));

  if (stats.gender.errors > 0 || stats.species.errors > 0) {
    console.log('\n⚠️  Some errors occurred. Please review the logs above.');
    process.exit(1);
  } else {
    console.log('\n✅ Migration completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Verify the migrated data');
    console.log('   2. If satisfied, you can drop the old columns:');
    console.log('      ALTER TABLE "Character" DROP COLUMN "gender_old";');
    console.log('      ALTER TABLE "Character" DROP COLUMN "species_old";');
  }
}

// ============================================================================
// CLI
// ============================================================================

if (require.main === module) {
  migrateGenderAndSpecies()
    .then(() => prisma.$disconnect())
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Migration failed:', error);
      return prisma.$disconnect().then(() => process.exit(1));
    });
}

export { migrateGenderAndSpecies };
