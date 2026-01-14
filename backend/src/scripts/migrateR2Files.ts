#!/usr/bin/env tsx
/**
 * Migrate R2 files to environment-prefixed paths
 *
 * This script moves actual files in R2 from root to environment-prefixed paths.
 * It ONLY migrates files that are referenced in the LOCAL database, leaving
 * all other files untouched (for other environments to migrate later).
 *
 * Process:
 * 1. Query LOCAL database for all R2 keys (CharacterImage, CuratedImage, Story)
 * 2. For each key found in database, copy file to new environment-prefixed path
 * 3. Verify copy succeeded
 * 4. Delete old file
 *
 * IMPORTANT: Files NOT in the local database are LEFT UNTOUCHED!
 *
 * Usage:
 *   npm run migrate:r2-files          # Execute migration
 *   npm run migrate:r2-files:dry      # Dry run (preview changes)
 *
 * Environment:
 *   NODE_ENV - determines target environment (dev or prod)
 *   DRY_RUN - if true, only logs actions without executing (default: false)
 */

import { S3Client, CopyObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from '../config/database';
import { logger } from '../config/logger';

const DRY_RUN = process.env.DRY_RUN === 'true';
const environment = (process.env.NODE_ENV || 'development').toLowerCase() === 'production' ? 'prod' : 'dev';

const config = {
  bucketName: process.env.R2_BUCKET_NAME,
  accountId: process.env.R2_ACCOUNT_ID,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  endpointUrl: process.env.R2_ENDPOINT_URL,
};

// Validate R2 configuration
if (!config.bucketName || !config.accountId || !config.accessKeyId || !config.secretAccessKey || !config.endpointUrl) {
  logger.error('Missing R2 configuration. Check environment variables.');
  throw new Error('Missing R2 configuration. Check environment variables.');
}

const client = new S3Client({
  region: 'auto',
  endpoint: config.endpointUrl,
  forcePathStyle: true,
  credentials: {
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
  },
});

const R2_PUBLIC_URL_BASE = process.env.R2_PUBLIC_URL_BASE || 'https://media.charhub.app';

interface MigrationResult {
  totalInDatabase: number;
  migrated: number;
  skipped: number;
  failed: number;
  errors: Array<{ key: string; error: string }>;
}

/**
 * Extract R2 key from URL
 * Handles URLs like: https://media.charhub.app/characters/123/avatar.webp
 */
function extractKeyFromUrl(url: string): string | null {
  if (!url.startsWith(R2_PUBLIC_URL_BASE)) {
    return null;
  }
  const key = url.replace(R2_PUBLIC_URL_BASE + '/', '');
  return key;
}

/**
 * Get all R2 keys referenced in the local database
 */
async function getDatabaseKeys(): Promise<Set<string>> {
  const keys = new Set<string>();

  logger.info('Fetching R2 keys from CharacterImage table...');
  const characterImages = await prisma.characterImage.findMany({
    where: { key: { not: null } },
    select: { key: true },
  });
  for (const img of characterImages) {
    if (img.key) keys.add(img.key);
  }
  logger.info({ count: characterImages.length }, 'CharacterImage keys loaded');

  logger.info('Fetching R2 keys from CuratedImage table...');
  const curatedImages = await prisma.curatedImage.findMany({
    where: { r2Key: { not: null }, uploadedToR2: true },
    select: { r2Key: true },
  });
  for (const img of curatedImages) {
    if (img.r2Key) keys.add(img.r2Key);
  }
  logger.info({ count: curatedImages.length }, 'CuratedImage keys loaded');

  logger.info('Extracting R2 keys from Story.coverImage URLs...');
  const stories = await prisma.story.findMany({
    where: { coverImage: { not: null } },
    select: { coverImage: true },
  });
  for (const story of stories) {
    if (story.coverImage) {
      const key = extractKeyFromUrl(story.coverImage);
      if (key) keys.add(key);
    }
  }
  logger.info({ count: stories.length }, 'Story cover image keys loaded');

  logger.info({ totalUniqueKeys: keys.size }, 'Total unique R2 keys found in database');

  return keys;
}

/**
 * Verify that an object exists at the given key
 */
async function verifyObjectExists(key: string): Promise<boolean> {
  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: config.bucketName,
        Key: key,
      })
    );
    return true;
  } catch (error) {
    logger.warn({ key, error }, 'Object verification failed');
    return false;
  }
}

async function migrateR2Files(): Promise<MigrationResult> {
  logger.info({ environment, dryRun: DRY_RUN, bucket: config.bucketName }, 'Starting R2 file migration');

  const result: MigrationResult = {
    totalInDatabase: 0,
    migrated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  // Step 1: Get all keys from local database
  const databaseKeys = await getDatabaseKeys();
  result.totalInDatabase = databaseKeys.size;

  if (databaseKeys.size === 0) {
    logger.warn('No R2 keys found in local database. Nothing to migrate.');
    return result;
  }

  // Step 2: Migrate each key found in database
  for (const oldKey of databaseKeys) {
    // Skip if already in correct environment folder
    if (oldKey.startsWith(`${environment}/`)) {
      logger.debug({ key: oldKey }, 'Key already has environment prefix, skipping');
      result.skipped++;
      continue;
    }

    // Skip if in different environment folder (shouldn't happen, but safety check)
    const otherEnv = environment === 'dev' ? 'prod' : 'dev';
    if (oldKey.startsWith(`${otherEnv}/`)) {
      logger.debug({ key: oldKey, env: otherEnv }, 'Key belongs to different environment, skipping');
      result.skipped++;
      continue;
    }

    // Construct new key with environment prefix
    const newKey = `${environment}/${oldKey}`;

    logger.info({ oldKey, newKey }, 'Migrating file referenced in database');

    if (!DRY_RUN) {
      try {
        // Copy object to new location
        await client.send(
          new CopyObjectCommand({
            Bucket: config.bucketName,
            CopySource: `${config.bucketName}/${oldKey}`,
            Key: newKey,
            MetadataDirective: 'COPY', // Preserve metadata
          })
        );

        logger.debug({ newKey }, 'File copied successfully');

        // Verify copy succeeded
        const verified = await verifyObjectExists(newKey);
        if (!verified) {
          throw new Error('Copy verification failed');
        }

        // Delete old object
        await client.send(
          new DeleteObjectCommand({
            Bucket: config.bucketName,
            Key: oldKey,
          })
        );

        logger.debug({ oldKey }, 'Old file deleted');
        result.migrated++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        logger.error({ oldKey, newKey, error: errorMsg }, 'Failed to migrate file');
        result.failed++;
        result.errors.push({ key: oldKey, error: errorMsg });
      }
    } else {
      result.migrated++;
    }
  }

  return result;
}

// ============================================================================
// CLI
// ============================================================================

if (require.main === module) {
  migrateR2Files()
    .then((result) => {
      logger.info({
        dryRun: DRY_RUN,
        environment,
        bucket: config.bucketName,
        result: {
          totalInDatabase: result.totalInDatabase,
          migrated: result.migrated,
          skipped: result.skipped,
          failed: result.failed,
        },
      }, 'R2 file migration completed');

      if (DRY_RUN) {
        logger.warn('DRY RUN MODE - No changes were made. Run with DRY_RUN=false to apply changes.');
      } else {
        logger.info('Migration applied successfully!');
      }

      if (result.failed > 0) {
        logger.error({ errors: result.errors }, `Migration completed with ${result.failed} failures`);
        process.exit(1);
      }

      process.exit(0);
    })
    .catch((error) => {
      logger.error({ error }, 'R2 file migration failed');
      process.exit(1);
    });
}

export { migrateR2Files };
