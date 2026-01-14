#!/usr/bin/env tsx
/**
 * Migrate R2 URLs and keys to include environment prefix
 *
 * This script updates all database records to include environment prefixes
 * in R2 URLs and keys. This is necessary to separate development and production
 * storage in Cloudflare R2.
 *
 * Usage:
 *   npm run migrate:r2-paths           # Execute migration
 *   npm run migrate:r2-paths:dry       # Dry run (preview changes)
 *
 * Environment:
 *   NODE_ENV - determines target environment (dev or prod)
 *   DRY_RUN - if true, only logs changes without executing (default: false)
 */

import { prisma } from '../config/database';
import { logger } from '../config/logger';

const DRY_RUN = process.env.DRY_RUN === 'true';
const environment = (process.env.NODE_ENV || 'development').toLowerCase() === 'production' ? 'prod' : 'dev';

const R2_PUBLIC_URL_BASE = process.env.R2_PUBLIC_URL_BASE || 'https://media.charhub.app';

interface MigrationStats {
  characterImages: { total: number; updated: number; skipped: number };
  stories: { total: number; updated: number; skipped: number };
  curatedImages: { total: number; updated: number; skipped: number };
}

/**
 * Check if a URL already has the correct environment prefix
 */
function hasCorrectPrefix(url: string): boolean {
  return url.includes(`/${environment}/`);
}

/**
 * Check if a key already has the correct environment prefix
 */
function keyHasCorrectPrefix(key: string | null): boolean {
  if (!key) return false;
  return key.startsWith(`${environment}/`);
}

/**
 * Add environment prefix to R2 URL
 */
function addPrefixToUrl(url: string): string {
  return url.replace(
    `${R2_PUBLIC_URL_BASE}/`,
    `${R2_PUBLIC_URL_BASE}/${environment}/`
  );
}

/**
 * Add environment prefix to R2 key
 */
function addPrefixToKey(key: string): string {
  return `${environment}/${key}`;
}

async function migrateR2Paths(): Promise<MigrationStats> {
  logger.info({ environment, dryRun: DRY_RUN, r2BaseUrl: R2_PUBLIC_URL_BASE }, 'Starting R2 path migration');

  const stats: MigrationStats = {
    characterImages: { total: 0, updated: 0, skipped: 0 },
    stories: { total: 0, updated: 0, skipped: 0 },
    curatedImages: { total: 0, updated: 0, skipped: 0 },
  };

  // ========================================================================
  // 1. Migrate CharacterImage URLs and keys
  // ========================================================================

  logger.info('Migrating CharacterImage records...');

  const characterImages = await prisma.characterImage.findMany({
    where: {
      OR: [
        { url: { not: { startsWith: `${R2_PUBLIC_URL_BASE}/${environment}/` } } },
        { key: { not: null, not: { startsWith: `${environment}/` } } },
      ],
    },
  });

  stats.characterImages.total = characterImages.length;
  logger.info({ count: characterImages.length }, 'Found CharacterImage records to migrate');

  for (const image of characterImages) {
    let newUrl = image.url;
    let newKey = image.key;
    let needsUpdate = false;

    // Update URL if needed
    if (!hasCorrectPrefix(image.url)) {
      newUrl = addPrefixToUrl(image.url);
      needsUpdate = true;
    }

    // Update key if needed and exists
    if (image.key && !keyHasCorrectPrefix(image.key)) {
      newKey = addPrefixToKey(image.key);
      needsUpdate = true;
    }

    if (needsUpdate) {
      logger.debug({
        id: image.id,
        characterId: image.characterId,
        type: image.type,
        oldUrl: image.url,
        newUrl,
        oldKey: image.key,
        newKey,
      }, 'Migrating CharacterImage');

      if (!DRY_RUN) {
        await prisma.characterImage.update({
          where: { id: image.id },
          data: {
            url: newUrl,
            key: newKey,
          },
        });
      }

      stats.characterImages.updated++;
    } else {
      stats.characterImages.skipped++;
    }
  }

  logger.info({
    total: stats.characterImages.total,
    updated: stats.characterImages.updated,
    skipped: stats.characterImages.skipped,
  }, 'CharacterImage migration completed');

  // ========================================================================
  // 2. Migrate Story cover images
  // ========================================================================

  logger.info('Migrating Story cover images...');

  const stories = await prisma.story.findMany({
    where: {
      coverImage: {
        not: null,
        not: { startsWith: `${R2_PUBLIC_URL_BASE}/${environment}/` },
      },
    },
  });

  stats.stories.total = stories.length;
  logger.info({ count: stories.length }, 'Found Story records to migrate');

  for (const story of stories) {
    if (!story.coverImage) continue;

    const newUrl = addPrefixToUrl(story.coverImage);

    logger.debug({
      id: story.id,
      title: story.title,
      oldUrl: story.coverImage,
      newUrl,
    }, 'Migrating Story cover');

    if (!DRY_RUN) {
      await prisma.story.update({
        where: { id: story.id },
        data: { coverImage: newUrl },
      });
    }

    stats.stories.updated++;
  }

  logger.info({
    total: stats.stories.total,
    updated: stats.stories.updated,
    skipped: stats.stories.skipped,
  }, 'Story migration completed');

  // ========================================================================
  // 3. Migrate CuratedImage URLs and keys
  // ========================================================================

  logger.info('Migrating CuratedImage records...');

  const curatedImages = await prisma.curatedImage.findMany({
    where: {
      uploadedToR2: true,
      OR: [
        { r2Url: { not: null, not: { startsWith: `${R2_PUBLIC_URL_BASE}/${environment}/` } } },
        { r2Key: { not: null, not: { startsWith: `${environment}/` } } },
      ],
    },
  });

  stats.curatedImages.total = curatedImages.length;
  logger.info({ count: curatedImages.length }, 'Found CuratedImage records to migrate');

  for (const image of curatedImages) {
    let newUrl = image.r2Url;
    let newKey = image.r2Key;
    let needsUpdate = false;

    if (image.r2Url && !hasCorrectPrefix(image.r2Url)) {
      newUrl = addPrefixToUrl(image.r2Url);
      needsUpdate = true;
    }

    if (image.r2Key && !keyHasCorrectPrefix(image.r2Key)) {
      newKey = addPrefixToKey(image.r2Key);
      needsUpdate = true;
    }

    if (needsUpdate) {
      logger.debug({
        id: image.id,
        filename: image.filename,
        oldUrl: image.r2Url,
        newUrl,
        oldKey: image.r2Key,
        newKey,
      }, 'Migrating CuratedImage');

      if (!DRY_RUN) {
        await prisma.curatedImage.update({
          where: { id: image.id },
          data: {
            r2Url: newUrl,
            r2Key: newKey,
          },
        });
      }

      stats.curatedImages.updated++;
    } else {
      stats.curatedImages.skipped++;
    }
  }

  logger.info({
    total: stats.curatedImages.total,
    updated: stats.curatedImages.updated,
    skipped: stats.curatedImages.skipped,
  }, 'CuratedImage migration completed');

  return stats;
}

// ============================================================================
// CLI
// ============================================================================

if (require.main === module) {
  migrateR2Paths()
    .then((stats) => {
      logger.info({
        dryRun: DRY_RUN,
        environment,
        stats: {
          characterImages: {
            total: stats.characterImages.total,
            updated: stats.characterImages.updated,
            skipped: stats.characterImages.skipped,
          },
          stories: {
            total: stats.stories.total,
            updated: stats.stories.updated,
            skipped: stats.stories.skipped,
          },
          curatedImages: {
            total: stats.curatedImages.total,
            updated: stats.curatedImages.updated,
            skipped: stats.curatedImages.skipped,
          },
        },
      }, 'R2 path migration completed');

      if (DRY_RUN) {
        logger.warn('DRY RUN MODE - No changes were made. Run with DRY_RUN=false to apply changes.');
      } else {
        logger.info('Migration applied successfully!');
      }

      return prisma.$disconnect();
    })
    .then(() => process.exit(0))
    .catch((error) => {
      logger.error({ error }, 'R2 path migration failed');
      return prisma.$disconnect().then(() => process.exit(1));
    });
}

export { migrateR2Paths };
