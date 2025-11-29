import { Request, Response, NextFunction } from 'express';
import { translationService } from '../services/translation/translationService';
import { logger } from '../config/logger';

/**
 * Configuration of translatable fields by content type
 */
const TRANSLATABLE_FIELDS: Record<string, string[]> = {
  Character: ['personality', 'history', 'physicalCharacteristics'],
  Story: ['title', 'synopsis', 'initialText'],
  Attire: ['name', 'description'],
  Tag: ['name', 'description'],
};

/**
 * Extract user's preferred language from multiple sources
 * Priority: 1. Database (req.user.preferredLanguage)
 *          2. Custom header (X-User-Language from frontend)
 *          3. Accept-Language header
 *          4. Fallback to 'en-US'
 */
function getUserLanguage(req: Request): string {
  // 1. Check database user preference (highest priority)
  const dbLanguage = (req.user as any)?.preferredLanguage;
  if (dbLanguage && dbLanguage !== 'en') {
    // Database stores ISO 639-1 codes like "en", convert to full format
    const langMap: Record<string, string> = {
      en: 'en-US',
      pt: 'pt-BR',
      es: 'es-ES',
      ja: 'ja-JP',
      zh: 'zh-CN',
      ko: 'ko-KR',
      fr: 'fr-FR',
      de: 'de-DE',
      it: 'it-IT',
      ru: 'ru-RU',
      ar: 'ar-SA',
      hi: 'hi-IN',
    };
    return langMap[dbLanguage] || dbLanguage;
  }

  // 2. Check custom header from frontend (i18next localStorage value)
  const customHeader = req.headers['x-user-language'] as string;
  if (customHeader) {
    return customHeader;
  }

  // 3. Parse Accept-Language header
  const acceptLanguage = req.headers['accept-language'];
  if (acceptLanguage) {
    // Parse "pt-BR,pt;q=0.9,en;q=0.8" format, get highest priority
    const languages = acceptLanguage
      .split(',')
      .map((lang) => {
        const [code, qValue] = lang.trim().split(';q=');
        const quality = qValue ? parseFloat(qValue) : 1.0;
        return { code: code.trim(), quality };
      })
      .sort((a, b) => b.quality - a.quality);

    if (languages.length > 0) {
      return languages[0].code;
    }
  }

  // 4. Fallback
  return 'en-US';
}

/**
 * Middleware that intercepts responses and translates content automatically
 */
export function translationMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Save original json method
    const originalJson = res.json.bind(res);

    // Override res.json
    res.json = function (data: any) {
      const userLanguage = getUserLanguage(req);

      // Translate content if needed
      translateResponseData(data, userLanguage)
        .then((translatedData) => {
          originalJson(translatedData);
        })
        .catch((error) => {
          logger.error({ error }, 'Translation middleware error');
          // Fallback: return original data
          originalJson(data);
        });

      // Return for Express compatibility
      return res;
    };

    next();
  };
}

/**
 * Translates response data recursively
 */
async function translateResponseData(data: any, targetLanguage: string): Promise<any> {
  // Null/undefined
  if (data == null) {
    return data;
  }

  // Array
  if (Array.isArray(data)) {
    return Promise.all(data.map((item) => translateResponseData(item, targetLanguage)));
  }

  // Object
  if (typeof data === 'object') {
    // Skip Date objects (they serialize to JSON strings automatically)
    if (data instanceof Date) {
      return data;
    }

    // Check for data wrapper (common API format)
    if (data.data !== undefined) {
      const translatedData = await translateResponseData(data.data, targetLanguage);
      return { ...data, data: translatedData };
    }

    // Check if it's translatable content
    if (shouldTranslateContent(data, targetLanguage)) {
      return translateContent(data, targetLanguage);
    }

    // Translate object properties recursively
    const translated: any = {};
    for (const [key, value] of Object.entries(data)) {
      translated[key] = await translateResponseData(value, targetLanguage);
    }
    return translated;
  }

  // Primitive types
  return data;
}

/**
 * Checks if content should be translated
 */
function shouldTranslateContent(data: any, targetLanguage: string): boolean {
  // Needs id and originalLanguageCode
  if (!data.id || !data.originalLanguageCode) {
    return false;
  }

  // Language is already the same
  if (data.originalLanguageCode === targetLanguage) {
    return false;
  }

  // Check if it's a supported content type
  const contentType = inferContentType(data);
  if (!contentType || !TRANSLATABLE_FIELDS[contentType]) {
    return false;
  }

  return true;
}

/**
 * Infers content type based on properties
 */
function inferContentType(data: any): string | null {
  // Check __typename if available (GraphQL)
  if (data.__typename) {
    return data.__typename;
  }

  // Infer based on present fields
  if ('firstName' in data && 'personality' in data) {
    return 'Character';
  }

  if ('title' in data && 'synopsis' in data && 'initialText' in data) {
    return 'Story';
  }

  if ('promptHead' in data || 'promptBody' in data) {
    return 'Attire';
  }

  if ('type' in data && 'weight' in data && 'searchable' in data) {
    return 'Tag';
  }

  return null;
}

/**
 * Translates a content object
 */
async function translateContent(data: any, targetLanguage: string): Promise<any> {
  const contentType = inferContentType(data);
  if (!contentType) {
    return data;
  }

  const fields = TRANSLATABLE_FIELDS[contentType] || [];
  const translated = { ...data };

  // Translate each field in parallel
  await Promise.all(
    fields.map(async (fieldName) => {
      const originalText = data[fieldName];

      // Skip if field is empty
      if (!originalText || typeof originalText !== 'string') {
        return;
      }

      try {
        const result = await translationService.translate({
          contentType,
          contentId: data.id,
          fieldName,
          originalText,
          originalLanguageCode: data.originalLanguageCode,
          targetLanguageCode: targetLanguage,
          context: buildContext(data, contentType),
          sourceVersion: data.contentVersion,
        });

        translated[fieldName] = result.translatedText;

        // Add translation metadata (optional)
        if (!translated._translations) {
          translated._translations = {};
        }
        translated._translations[fieldName] = {
          from: data.originalLanguageCode,
          to: targetLanguage,
          cached: result.cached,
          provider: result.provider,
        };
      } catch (error) {
        logger.error(
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            contentId: data.id,
          },
          `Failed to translate ${contentType}.${fieldName}`
        );
        // Fallback: keep original text
      }
    })
  );

  return translated;
}

/**
 * Builds context to improve translation quality
 */
function buildContext(data: any, contentType: string): Record<string, any> {
  const context: Record<string, any> = {};

  if (contentType === 'Character') {
    if (data.firstName) {
      context.characterName = `${data.firstName} ${data.lastName || ''}`.trim();
    }
    if (data.gender) context.gender = data.gender;
    if (data.age) context.age = data.age;
    if (data.species) context.species = data.species;
  }

  if (contentType === 'Story') {
    if (data.ageRating) context.ageRating = data.ageRating;
  }

  return context;
}
