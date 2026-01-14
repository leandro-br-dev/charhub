#!/usr/bin/env tsx
/**
 * Cleanup orphaned R2 files (files not in /dev/ or /prod/ folders)
 *
 * This script identifies and optionally deletes files that are NOT in
 * environment folders. These are typically old test files or leftover
 * files from before environment separation was implemented.
 *
 * Process:
 * 1. Lists all objects in R2 bucket
 * 2. Identifies objects NOT in environment folders (/dev/ or /prod/)
 * 3. Optionally deletes them (based on DRY_RUN flag)
 *
 * Usage:
 *   npm run cleanup:r2-orphans         # Dry run (preview only, safe)
 *   npm run cleanup:r2-orphans:exec    # Execute deletion
 *
 * Environment:
 *   DRY_RUN - if true (default), only lists files; if false, deletes them
 */

import { S3Client, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { logger } from '../config/logger';

// Default to DRY_RUN for safety
const DRY_RUN = process.env.DRY_RUN !== 'false';

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

interface CleanupResult {
  totalObjects: number;
  orphaned: number;
  deleted: number;
  failed: number;
  orphanedKeys: string[];
  errors: Array<{ key: string; error: string }>;
}

/**
 * Check if an object key is outside environment folders
 */
function isOrphan(key: string): boolean {
  return !key.startsWith('dev/') && !key.startsWith('prod/');
}

async function cleanupOrphans(): Promise<CleanupResult> {
  logger.info({ dryRun: DRY_RUN, bucket: config.bucketName }, 'Starting R2 orphan cleanup');

  const result: CleanupResult = {
    totalObjects: 0,
    orphaned: 0,
    deleted: 0,
    failed: 0,
    orphanedKeys: [],
    errors: [],
  };

  let continuationToken: string | undefined;

  do {
    const listCommand = new ListObjectsV2Command({
      Bucket: config.bucketName,
      ContinuationToken: continuationToken,
      MaxKeys: 1000,
    });

    const listResponse = await client.send(listCommand);
    const objects = listResponse.Contents || [];

    result.totalObjects += objects.length;

    for (const object of objects) {
      const key = object.Key;
      if (!key) continue;

      // Check if object is outside environment folders
      if (isOrphan(key)) {
        result.orphaned++;
        result.orphanedKeys.push(key);

        logger.info({
          key,
          size: object.Size,
          lastModified: object.LastModified,
        }, 'Found orphaned object');

        if (!DRY_RUN) {
          try {
            await client.send(
              new DeleteObjectCommand({
                Bucket: config.bucketName,
                Key: key,
              })
            );

            logger.debug({ key }, 'Deleted orphaned object');
            result.deleted++;
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            logger.error({ key, error: errorMsg }, 'Failed to delete orphaned object');
            result.failed++;
            result.errors.push({ key, error: errorMsg });
          }
        }
      }
    }

    continuationToken = listResponse.NextContinuationToken;

    // Log progress every 1000 objects
    if (result.totalObjects % 1000 === 0) {
      logger.info({
        total: result.totalObjects,
        orphaned: result.orphaned,
        deleted: result.deleted,
        failed: result.failed,
      }, 'Cleanup progress');
    }
  } while (continuationToken);

  return result;
}

// ============================================================================
// CLI
// ============================================================================

if (require.main === module) {
  cleanupOrphans()
    .then((result) => {
      logger.info({
        dryRun: DRY_RUN,
        result: {
          totalObjects: result.totalObjects,
          orphaned: result.orphaned,
          deleted: result.deleted,
          failed: result.failed,
        },
      }, 'R2 orphan cleanup completed');

      if (DRY_RUN) {
        logger.warn('DRY RUN MODE - No deletions were made.');
        logger.info({ count: result.orphanedKeys.length }, 'Orphaned files found (preview):');

        // Show first 50 orphaned files
        result.orphanedKeys.slice(0, 50).forEach((key) => {
          logger.info({ key }, 'Orphaned file');
        });

        if (result.orphanedKeys.length > 50) {
          logger.info(`... and ${result.orphanedKeys.length - 50} more`);
        }

        logger.warn('Run with DRY_RUN=false to delete these files.');
      } else {
        logger.info(`Successfully deleted ${result.deleted} orphaned files`);
      }

      if (result.failed > 0) {
        logger.error({ errors: result.errors }, `Cleanup completed with ${result.failed} failures`);
        process.exit(1);
      }

      process.exit(0);
    })
    .catch((error) => {
      logger.error({ error }, 'R2 orphan cleanup failed');
      process.exit(1);
    });
}

export { cleanupOrphans };
