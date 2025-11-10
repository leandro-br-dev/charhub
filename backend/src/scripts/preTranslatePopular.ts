#!/usr/bin/env node
import { prisma } from '../config/database';
import { translationService } from '../services/translation/translationService';
import { logger } from '../config/logger';
import { Visibility } from '../generated/prisma';

const POPULAR_LANGUAGES = ['en-US', 'pt-BR', 'es-ES', 'ja-JP', 'zh-CN', 'ko-KR', 'fr-FR', 'de-DE'];
const DELAY_MS = 100; // Delay between requests to avoid rate limiting

async function preTranslatePopularCharacters() {
  logger.info('Starting pre-translation of popular characters');

  try {
    // Fetch public characters (ordered by creation date for now)
    // TODO: Order by views/favorites when those metrics are implemented
    const characters = await prisma.character.findMany({
      where: { visibility: Visibility.PUBLIC },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    logger.info(`Found ${characters.length} characters to translate`);

    let totalTranslations = 0;
    let successfulTranslations = 0;
    let failedTranslations = 0;

    for (const character of characters) {
      if (!character.originalLanguageCode) {
        logger.debug(`Skipping character ${character.id} - no original language code`);
        continue;
      }

      logger.info(
        `Processing character: ${character.firstName} ${character.lastName || ''} (${character.id})`
      );

      for (const targetLang of POPULAR_LANGUAGES) {
        // Skip if same as original language
        if (character.originalLanguageCode === targetLang) {
          continue;
        }

        // Translate fields
        const fields = ['personality', 'history', 'physicalCharacteristics'];

        for (const field of fields) {
          const text = (character as any)[field];
          if (!text) continue;

          totalTranslations++;

          try {
            await translationService.translate({
              contentType: 'Character',
              contentId: character.id,
              fieldName: field,
              originalText: text,
              originalLanguageCode: character.originalLanguageCode,
              targetLanguageCode: targetLang,
              sourceVersion: character.contentVersion,
            });

            successfulTranslations++;

            logger.info({
              characterId: character.id,
              field,
              from: character.originalLanguageCode,
              to: targetLang,
            }, 'Pre-translated');
          } catch (error) {
            failedTranslations++;
            logger.error({
              characterId: character.id,
              field,
              from: character.originalLanguageCode,
              to: targetLang,
              error: error instanceof Error ? error.message : 'Unknown error',
            }, 'Pre-translation failed');
          }

          // Delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
        }
      }
    }

    logger.info({
      totalTranslations,
      successfulTranslations,
      failedTranslations,
      successRate: `${((successfulTranslations / totalTranslations) * 100).toFixed(2)}%`,
    }, 'Pre-translation completed');
  } catch (error) {
    logger.error({ error }, 'Pre-translation script failed');
    throw error;
  }
}

// Execute
if (require.main === module) {
  preTranslatePopularCharacters()
    .then(() => {
      logger.info('Pre-translation script finished successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error({ error }, 'Pre-translation script failed');
      process.exit(1);
    });
}

export { preTranslatePopularCharacters };
