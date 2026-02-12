/**
 * System Configuration Seed Script (Simplified)
 *
 * Populates the database with default system configuration parameters.
 * Uses upsert pattern to avoid overwriting existing database values.
 *
 * Simplified format: key-value pairs only (no metadata, categories, or descriptions)
 */

import { PrismaClient } from '../../generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

interface ConfigParameter {
  key: string;
  envVar: string;
  defaultValue: string | number | boolean;
}

/**
 * All configuration parameters to seed (simplified)
 */
export const CONFIG_PARAMETERS: ConfigParameter[] = [
  // Translation settings
  { key: 'translation.default_provider', envVar: 'TRANSLATION_DEFAULT_PROVIDER', defaultValue: 'gemini' },
  { key: 'translation.default_model', envVar: 'TRANSLATION_DEFAULT_MODEL', defaultValue: 'gemini-2.5-flash' },
  { key: 'translation.cache_ttl', envVar: 'TRANSLATION_CACHE_TTL', defaultValue: 3600 },
  { key: 'translation.enable_pre_translation', envVar: 'TRANSLATION_ENABLE_PRE_TRANSLATION', defaultValue: false },

  // Context settings
  { key: 'context.max_tokens', envVar: 'MAX_CONTEXT_TOKENS', defaultValue: 8000 },

  // Generation settings
  { key: 'generation.daily_limit', envVar: 'GENERATION_DAILY_LIMIT', defaultValue: 5 },
  { key: 'generation.batch_enabled', envVar: 'BATCH_GENERATION_ENABLED', defaultValue: false },
  { key: 'generation.batch_size_per_run', envVar: 'BATCH_SIZE_PER_RUN', defaultValue: 24 },
  { key: 'generation.batch_retry_attempts', envVar: 'BATCH_RETRY_ATTEMPTS', defaultValue: 3 },
  { key: 'generation.batch_timeout_minutes', envVar: 'BATCH_TIMEOUT_MINUTES', defaultValue: 5 },

  // Correction settings
  { key: 'correction.enabled', envVar: 'CORRECTION_ENABLED', defaultValue: true },
  { key: 'correction.avatar_daily_limit', envVar: 'CORRECTION_AVATAR_DAILY_LIMIT', defaultValue: 5 },
  { key: 'correction.data_daily_limit', envVar: 'CORRECTION_DATA_DAILY_LIMIT', defaultValue: 10 },

  // Curation settings
  { key: 'curation.search_keywords', envVar: 'CIVITAI_SEARCH_KEYWORDS', defaultValue: 'anime,fantasy,sci-fi' },
  { key: 'curation.anime_model_ids', envVar: 'CIVITAI_ANIME_MODEL_IDS', defaultValue: '' },
  { key: 'curation.auto_approval_threshold', envVar: 'AUTO_APPROVAL_THRESHOLD', defaultValue: 4.5 },
  { key: 'curation.require_manual_review', envVar: 'REQUIRE_MANUAL_REVIEW', defaultValue: false },
  { key: 'curation.image_limit', envVar: 'CURATION_IMAGE_LIMIT', defaultValue: 50 },
  { key: 'curation.rate_limit', envVar: 'CIVITAI_RATE_LIMIT', defaultValue: 1000 },
  { key: 'curation.max_image_size', envVar: 'MAX_IMAGE_SIZE', defaultValue: 10485760 },
  { key: 'curation.min_rating', envVar: 'CIVITAI_MIN_RATING', defaultValue: 3.0 },

  // Moderation settings
  { key: 'moderation.nsfw_filter_enabled', envVar: 'NSFW_FILTER_ENABLED', defaultValue: true },
  { key: 'moderation.nsfw_filter_strictness', envVar: 'NSFW_FILTER_STRICTNESS', defaultValue: 'medium' },

  // Scheduling settings
  { key: 'scheduling.daily_curation_hour', envVar: 'DAILY_CURATION_HOUR', defaultValue: 3 },
];

/**
 * Seed system configuration parameters (simplified)
 * Uses upsert with empty update to preserve existing database values
 */
export async function seedSystemConfiguration(options: { verbose?: boolean; dryRun?: boolean } = {}): Promise<{
  created: number;
  skipped: number;
  errors: string[];
}> {
  const stats: { created: number; skipped: number; errors: string[] } = { created: 0, skipped: 0, errors: [] };

  console.log('\n Seeding system configuration parameters...');

  for (const param of CONFIG_PARAMETERS) {
    try {
      // Get value from .env or use default
      const envValue = process.env[param.envVar];
      const value = envValue ?? String(param.defaultValue);

      // Check if already exists
      const existing = await prisma.systemConfiguration.findUnique({
        where: { key: param.key },
      });

      if (existing) {
        stats.skipped++;
        if (options.verbose) {
          console.log(`   Skipped (already exists): ${param.key}`);
        }
        continue;
      }

      if (options.dryRun) {
        stats.created++;
        if (options.verbose) {
          console.log(`  [DRY RUN] Would create: ${param.key} = ${value}`);
        }
        continue;
      }

      // Create new configuration (simplified - only key and value)
      await prisma.systemConfiguration.create({
        data: {
          key: param.key,
          value: String(value),
        },
      });

      stats.created++;
      console.log(`   Created: ${param.key} = ${value}`);
    } catch (error) {
      const errorMsg = `Error processing "${param.key}": ${error}`;
      stats.errors.push(errorMsg);
      console.error(`   ${errorMsg}`);
    }
  }

  console.log(`\n System configuration: ${stats.created} created, ${stats.skipped} skipped`);

  if (stats.errors.length > 0) {
    console.log(`   ${stats.errors.length} error(s) occurred`);
  }

  return stats;
}

// Run seed if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    verbose: args.includes('--verbose') || args.includes('-v'),
    dryRun: args.includes('--dry-run') || args.includes('--dry'),
  };

  seedSystemConfiguration(options)
    .then(() => {
      return prisma.$disconnect();
    })
    .then(() => pool.end())
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Seed failed:', error);
      return prisma.$disconnect()
        .then(() => pool.end())
        .then(() => process.exit(1));
    });
}
