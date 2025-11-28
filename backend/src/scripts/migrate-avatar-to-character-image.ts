/**
 * Migration Script: Move avatar URLs from Character table to CharacterImage table
 *
 * This script:
 * 1. Finds all characters with avatar URLs
 * 2. Creates CharacterImage records with type=AVATAR
 * 3. Sets them as active (isActive=true)
 * 4. Preserves the original avatar URL in Character table (will be removed in schema migration)
 */

import { PrismaClient } from '../generated/prisma';
import { logger } from '../config/logger';

const prisma = new PrismaClient();

async function migrateAvatars() {
  try {
    logger.info('Starting avatar migration from Character to CharacterImage');

    // Find all characters with avatar URLs that don't have null/empty avatars
    const charactersWithAvatars = await prisma.character.findMany({
      where: {
        avatar: {
          not: null,
        },
      },
      select: {
        id: true,
        avatar: true,
        userId: true,
        firstName: true,
        lastName: true,
      },
    });

    logger.info(`Found ${charactersWithAvatars.length} characters with avatars to migrate`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const character of charactersWithAvatars) {
      try {
        // Check if this character already has an active AVATAR in CharacterImage
        const existingAvatar = await prisma.characterImage.findFirst({
          where: {
            characterId: character.id,
            type: 'AVATAR',
            isActive: true,
          },
        });

        if (existingAvatar) {
          logger.info(
            { characterId: character.id, name: `${character.firstName} ${character.lastName || ''}`.trim() },
            'Character already has active avatar in CharacterImage, skipping'
          );
          skipped++;
          continue;
        }

        // Create CharacterImage record for this avatar
        await prisma.$transaction(async (tx) => {
          // Deactivate any existing avatars for this character
          await tx.characterImage.updateMany({
            where: {
              characterId: character.id,
              type: 'AVATAR',
            },
            data: {
              isActive: false,
            },
          });

          // Create new active avatar record
          await tx.characterImage.create({
            data: {
              characterId: character.id,
              type: 'AVATAR',
              url: character.avatar!,
              isActive: true,
              ageRating: 'L', // Default to safest rating
              contentTags: [],
              description: 'Migrated from Character.avatar field',
            },
          });
        });

        logger.info(
          { characterId: character.id, name: `${character.firstName} ${character.lastName || ''}`.trim() },
          'Avatar migrated successfully'
        );
        migrated++;
      } catch (error) {
        logger.error(
          { err: error, characterId: character.id },
          'Failed to migrate avatar for character'
        );
        errors++;
      }
    }

    logger.info({
      total: charactersWithAvatars.length,
      migrated,
      skipped,
      errors,
    }, 'Avatar migration completed');

    if (errors > 0) {
      logger.warn(`Migration completed with ${errors} errors. Please review logs.`);
      process.exit(1);
    } else {
      logger.info('Migration completed successfully with no errors');
      process.exit(0);
    }
  } catch (error) {
    logger.error({ err: error }, 'Fatal error during avatar migration');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrateAvatars();
