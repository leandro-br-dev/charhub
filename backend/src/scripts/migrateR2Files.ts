#!/usr/bin/env tsx
/**
 * Migrate R2 files to environment-prefixed paths
 *
 * This script moves actual files in R2 from root to environment-prefixed paths.
 * It copies files to new locations and deletes old files after successful copy.
 *
 * Process:
 * 1. Lists all objects in R2 bucket
 * 2. Copies objects without environment prefix to new prefixed path
 * 3. Verifies copy succeeded
 * 4. Deletes old object
 *
 * Usage:
 *   npm run migrate:r2-files          # Execute migration
 *   npm run migrate:r2-files:dry      # Dry run (preview changes)
 *
 * Environment:
 *   NODE_ENV - determines target environment (dev or prod)
 *   DRY_RUN - if true, only logs actions without executing (default: false)
 */

import { S3Client, ListObjectsV2Command, CopyObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
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

// Validate configuration
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

interface MigrationResult {
  totalObjects: number;
  migrated: number;
  skipped: number;
  failed: number;
  errors: Array<{ key: string; error: string }>;
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
    totalObjects: 0,
    migrated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  let continuationToken: string | undefined;

  do {
    // List objects in bucket
    const listCommand = new ListObjectsV2Command({
      Bucket: config.bucketName,
      ContinuationToken: continuationToken,
      MaxKeys: 1000,
    });

    const listResponse = await client.send(listCommand);
    const objects = listResponse.Contents || [];

    result.totalObjects += objects.length;
    logger.info({ count: objects.length, total: result.totalObjects }, 'Listed objects from R2');

    for (const object of objects) {
      const oldKey = object.Key;
      if (!oldKey) continue;

      // Skip if already in correct environment folder
      if (oldKey.startsWith(`${environment}/`)) {
        logger.debug({ key: oldKey }, 'Object already in correct environment folder, skipping');
        result.skipped++;
        continue;
      }

      // Skip if in different environment folder (other environment's data)
      const otherEnv = environment === 'dev' ? 'prod' : 'dev';
      if (oldKey.startsWith(`${otherEnv}/`)) {
        logger.debug({ key: oldKey, env: otherEnv }, 'Object belongs to different environment, skipping');
        result.skipped++;
        continue;
      }

      // Construct new key with environment prefix
      const newKey = `${environment}/${oldKey}`;

      logger.info({ oldKey, newKey, size: object.Size }, 'Migrating object');

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

          logger.debug({ newKey }, 'Object copied successfully');

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

          logger.debug({ oldKey }, 'Old object deleted');
          result.migrated++;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          logger.error({ oldKey, newKey, error: errorMsg }, 'Failed to migrate object');
          result.failed++;
          result.errors.push({ key: oldKey, error: errorMsg });
        }
      } else {
        result.migrated++;
      }
    }

    continuationToken = listResponse.NextContinuationToken;

    // Log progress every 1000 objects
    if (result.totalObjects % 1000 === 0) {
      logger.info({
        total: result.totalObjects,
        migrated: result.migrated,
        skipped: result.skipped,
        failed: result.failed,
      }, 'Migration progress');
    }
  } while (continuationToken);

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
          totalObjects: result.totalObjects,
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
