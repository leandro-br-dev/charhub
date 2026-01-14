#!/usr/bin/env tsx
/**
 * Revert R2 path prefixes from database
 *
 * This script removes environment prefixes from database URLs and keys.
 * Use this to undo a migrateR2Paths operation and prepare for proper migration order.
 *
 * Proper migration order:
 * 1. migrateR2Files (moves physical files first)
 * 2. migrateR2Paths (updates database after files are moved)
 *
 * Usage:
 *   npm run revert:r2-paths:dry    # Preview changes
 *   npm run revert:r2-paths        # Execute reversion
 */

import { prisma } from '../config/database';
import { logger } from '../config/logger';

const DRY_RUN = process.env.DRY_RUN === 'true';
const environment = (process.env.NODE_ENV || 'development').toLowerCase() === 'production' ? 'prod' : 'dev';

const R2_PUBLIC_URL_BASE = process.env.R2_PUBLIC_URL_BASE || 'https://media.charhub.app';

interface RevertStats {
  characterImages: { total: number; reverted: number };
  stories: { total: number; reverted: number };
  curatedImages: { total: number; reverted: number };
}

/**
 * Remove environment prefix from R2 URL
 */
function removePrefixFromUrl(url: string): string {
  if (!url.includes(`/${environment}/`)) {
    return url; // No prefix to remove
  }
  return url.replace(`/${environment}/`, '/');
}

/**
 * Remove environment prefix from R2 key
 */
function removePrefixFromKey(key: string | null): string | null {
  if (!key) return null;
  if (key.startsWith(`${environment}/`)) {
    return key.substring(`${environment}/`.length);
  }
  return key;
}

async function revertR2Paths(): Promise<RevertStats> {
  logger.info({ environment, dryRun: DRY_RUN }, 'Starting R2 path reversion');

  const stats: RevertStats = {
    characterImages: { total: 0, reverted: 0 },
    stories: { total: 0, reverted: 0 },
    curatedImages: { total: 0, reverted: 0 },
  };

  // 1. Revert CharacterImage URLs and keys
  const characterImages = await prisma.characterImage.findMany({
    where: {
      OR: [
        { url: { startsWith: `${R2_PUBLIC_URL_BASE}/${environment}/` } },
        { key: { startsWith: `${environment}/` } },
      ],
    },
  });

  stats.characterImages.total = characterImages.length;
  logger.info({ count: characterImages.length }, 'Found CharacterImage records to revert');

  for (const image of characterImages) {
    const newUrl = removePrefixFromUrl(image.url);
    const newKey = removePrefixFromKey(image.key);

    if (newUrl !== image.url || newKey !== image.key) {
      logger.debug({
        id: image.id,
        oldUrl: image.url,
        newUrl,
        oldKey: image.key,
        newKey,
      }, 'Reverting CharacterImage');

      if (!DRY_RUN) {
        await prisma.characterImage.update({
          where: { id: image.id },
          data: {
            url: newUrl,
            key: newKey,
          },
        });
      }

      stats.characterImages.reverted++;
    }
  }

  // 2. Revert Story cover images
  const stories = await prisma.story.findMany({
    where: {
      coverImage: {
        startsWith: `${R2_PUBLIC_URL_BASE}/${environment}/`,
      },
    },
  });

  stats.stories.total = stories.length;
  logger.info({ count: stories.length }, 'Found Story records to revert');

  for (const story of stories) {
    if (!story.coverImage) continue;

    const newUrl = removePrefixFromUrl(story.coverImage);

    logger.debug({
      id: story.id,
      oldUrl: story.coverImage,
      newUrl,
    }, 'Reverting Story cover');

    if (!DRY_RUN) {
      await prisma.story.update({
        where: { id: story.id },
        data: { coverImage: newUrl },
      });
    }

    stats.stories.reverted++;
  }

  // 3. Revert CuratedImage URLs and keys
  const curatedImages = await prisma.curatedImage.findMany({
    where: {
      uploadedToR2: true,
      OR: [
        { r2Url: { startsWith: `${R2_PUBLIC_URL_BASE}/${environment}/` } },
        { r2Key: { startsWith: `${environment}/` } },
      ],
    },
  });

  stats.curatedImages.total = curatedImages.length;
  logger.info({ count: curatedImages.length }, 'Found CuratedImage records to revert');

  for (const image of curatedImages) {
    const newUrl = removePrefixFromUrl(image.r2Url || '');
    const newKey = removePrefixFromKey(image.r2Key);

    if (newUrl !== (image.r2Url || '') || newKey !== image.r2Key) {
      logger.debug({
        id: image.id,
        oldUrl: image.r2Url,
        newUrl,
        oldKey: image.r2Key,
        newKey,
      }, 'Reverting CuratedImage');

      if (!DRY_RUN) {
        await prisma.curatedImage.update({
          where: { id: image.id },
          data: {
            r2Url: newUrl || null,
            r2Key: newKey,
          },
        });
      }

      stats.curatedImages.reverted++;
    }
  }

  return stats;
}

// ============================================================================
// CLI
// ============================================================================

if (require.main === module) {
  revertR2Paths()
    .then((stats) => {
      logger.info({
        dryRun: DRY_RUN,
        environment,
        stats,
      }, 'R2 path reversion completed');

      if (DRY_RUN) {
        logger.warn('DRY RUN MODE - No changes were made. Run with DRY_RUN=false to apply changes.');
      } else {
        logger.info('Reversion applied successfully!');
      }

      process.exit(0);
    })
    .catch((error) => {
      logger.error({ error }, 'R2 path reversion failed');
      process.exit(1);
    });
}

export { revertR2Paths };
