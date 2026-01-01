#!/usr/bin/env tsx
/**
 * Database Migration Runner
 *
 * This script runs Prisma migrations AND data migrations in sequence.
 * Use this for production deployments to ensure all migrations are applied.
 *
 * Usage:
 *   npm run db:migrate:deploy
 *   OR
 *   tsx scripts/deploy/runMigration.ts
 *
 * Environment:
 *   DATABASE_URL must be set
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

interface AppliedMigration {
  migration_name: string;
  finished_at: string;
}

/**
 * Check if a specific migration has been applied
 */
function isMigrationApplied(migrationName: string): boolean {
  try {
    const result = execSync(
      `docker compose exec -T postgres psql -U charhub -d charhub_db -t -c "SELECT migration_name FROM _prisma_migrations WHERE migration_name = '${migrationName}';"`,
      { encoding: 'utf-8', stdio: 'pipe' }
    );

    return result.trim().includes(migrationName);
  } catch (error) {
    // If table doesn't exist yet, migration hasn't been applied
    return false;
  }
}

/**
 * Run Prisma schema migrations
 */
function runPrismaMigrations(): void {
  console.log('\n📦 Running Prisma schema migrations...\n');

  try {
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: { ...process.env },
    });
    console.log('\n✅ Prisma migrations applied successfully');
  } catch (error) {
    console.error('\n❌ Prisma migration failed:', error);
    throw error;
  }
}

/**
 * Run data migrations based on which schema migrations were applied
 */
async function runDataMigrations(): Promise<void> {
  console.log('\n🔄 Checking for data migrations...\n');

  // Check if species/gender migration was applied
  const speciesMigrationApplied = isMigrationApplied('20251231102002_add_species_and_gender_enum');

  if (speciesMigrationApplied) {
    console.log('  📋 Species/Gender migration detected - running data migration...');

    try {
      // Run the data migration script
      const { migrateGenderAndSpecies } = await import('../../src/scripts/migrateGenderAndSpecies');
      await migrateGenderAndSpecies();
      console.log('\n✅ Data migration completed successfully');
    } catch (error) {
      console.error('\n❌ Data migration failed:', error);
      throw error;
    }
  } else {
    console.log('  ℹ️  No data migrations needed for this deployment');
  }
}

/**
 * Main deployment flow
 */
async function main(): Promise<void> {
  console.log('============================================================');
  console.log('🚀 CharHub Database Migration Runner');
  console.log('============================================================');

  const startTime = Date.now();

  try {
    // Step 1: Run Prisma schema migrations
    runPrismaMigrations();

    // Step 2: Run data migrations if needed
    await runDataMigrations();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(60));
    console.log('✅ All migrations completed successfully!');
    console.log(`⏱️  Total time: ${duration}s`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ Migration failed!');
    console.error('='.repeat(60));
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { main as runMigration };
