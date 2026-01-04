import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { logger } from '../../config/logger';
import { callLLM, type LLMResponse } from '../llm';
import { trackFromLLMResponse } from '../llm/llmUsageTracker';
import { TranslationStatus } from '../../generated/prisma';
import crypto from 'crypto';

export interface TranslationRequest {
  contentType: string;
  contentId: string;
  fieldName: string;
  originalText: string;
  originalLanguageCode: string;
  targetLanguageCode: string;
  context?: Record<string, any>;
  sourceVersion?: number;
}

export interface TranslationResult {
  translatedText: string;
  provider: string;
  model: string;
  confidence?: number;
  translationTimeMs: number;
  cached: boolean;
  source: 'redis' | 'database' | 'llm';
}

export class TranslationService {
  private readonly DEFAULT_CACHE_TTL = 3600; // 1 hour
  private readonly DEFAULT_PROVIDER = 'gemini';
  private readonly DEFAULT_MODEL = 'gemini-2.5-flash-lite'; // Updated model

  /**
   * Translates content with multi-layer caching
   */
  async translate(request: TranslationRequest): Promise<TranslationResult> {
    const startTime = Date.now();

    try {
      // Validation
      if (!request.originalText?.trim()) {
        throw new Error('Original text is empty');
      }

      // Same language - return original (skip for 'auto' as we need to detect)
      if (request.originalLanguageCode !== 'auto' && request.originalLanguageCode === request.targetLanguageCode) {
        return {
          translatedText: request.originalText,
          provider: 'none',
          model: 'none',
          translationTimeMs: Date.now() - startTime,
          cached: true,
          source: 'redis',
        };
      }

      // 1. Try Redis cache
      const cached = await this.getFromRedis(request);
      if (cached) {
        logger.debug(
          {
            contentType: request.contentType,
            contentId: request.contentId,
            field: request.fieldName,
          },
          'Translation cache hit (Redis)'
        );

        // Track cached translation (Redis hit = 90% cost reduction)
        const userId = this.extractUserIdFromContext(request);
        this.trackCachedTranslation(cached, userId, request, 'redis');

        return {
          ...cached,
          translationTimeMs: Date.now() - startTime,
          cached: true,
          source: 'redis',
        };
      }

      // 2. Try Database
      const dbResult = await this.getFromDatabase(request);
      if (dbResult) {
        logger.debug(
          {
            contentType: request.contentType,
            contentId: request.contentId,
          },
          'Translation cache hit (Database)'
        );

        // Track cached translation (Database hit = 90% cost reduction)
        const userId = this.extractUserIdFromContext(request);
        this.trackCachedTranslation(dbResult, userId, request, 'database');

        // Save to Redis for next request
        await this.saveToRedis(request, dbResult);

        return {
          translatedText: dbResult.translatedText,
          provider: dbResult.translationProvider || this.DEFAULT_PROVIDER,
          model: dbResult.translationModel || this.DEFAULT_MODEL,
          confidence: dbResult.confidence || undefined,
          translationTimeMs: Date.now() - startTime,
          cached: true,
          source: 'database',
        };
      }

      // 3. Call LLM
      logger.info(
        {
          contentType: request.contentType,
          contentId: request.contentId,
          from: request.originalLanguageCode,
          to: request.targetLanguageCode,
        },
        'Translation cache miss - calling LLM'
      );

      const llmResult = await this.translateWithLLM(request);

      // 4. Save to database
      await this.saveToDatabase(request, llmResult, Date.now() - startTime);

      // 5. Save to Redis
      await this.saveToRedis(request, {
        translatedText: llmResult.content,
        translationProvider: llmResult.provider,
        translationModel: llmResult.model,
      });

      return {
        translatedText: llmResult.content,
        provider: llmResult.provider,
        model: llmResult.model,
        translationTimeMs: Date.now() - startTime,
        cached: false,
        source: 'llm',
      };
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          contentType: request.contentType,
          contentId: request.contentId,
        },
        'Translation failed'
      );

      // Fallback: return original text
      return {
        translatedText: request.originalText,
        provider: 'fallback',
        model: 'none',
        translationTimeMs: Date.now() - startTime,
        cached: false,
        source: 'llm',
      };
    }
  }

  /**
   * Get translation from Redis cache
   */
  private async getFromRedis(request: TranslationRequest): Promise<any | null> {
    try {
      const cacheKey = this.buildCacheKey(request);
      const cached = await redis.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      logger.error({ error }, 'Redis get failed');
    }

    return null;
  }

  /**
   * Get translation from database
   */
  private async getFromDatabase(request: TranslationRequest) {
    try {
      const translation = await prisma.contentTranslation.findUnique({
        where: {
          contentType_contentId_fieldName_targetLanguageCode: {
            contentType: request.contentType,
            contentId: request.contentId,
            fieldName: request.fieldName,
            targetLanguageCode: request.targetLanguageCode,
          },
        },
      });

      // Return only if active and version matches
      if (
        translation &&
        translation.status === TranslationStatus.ACTIVE &&
        (!request.sourceVersion || translation.sourceVersion === request.sourceVersion)
      ) {
        return translation;
      }
    } catch (error) {
      logger.error({ error }, 'Database get failed');
    }

    return null;
  }

  /**
   * Translate using LLM
   */
  private async translateWithLLM(request: TranslationRequest): Promise<LLMResponse> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(request);

    const response = await callLLM({
      provider: this.DEFAULT_PROVIDER,
      model: this.DEFAULT_MODEL,
      systemPrompt,
      userPrompt,
      temperature: 0.3,
      maxTokens: 2000,
    });

    // Track LLM usage for cost analysis
    // Extract userId from context if available (for character/story translations)
    const userId = this.extractUserIdFromContext(request);

    trackFromLLMResponse(response, {
      userId,
      feature: 'CONTENT_TRANSLATION',
      featureId: `${request.contentType}:${request.contentId}`,
      operation: `translate_${request.fieldName}`,
      cached: false, // Fresh translation
      metadata: {
        contentType: request.contentType,
        contentId: request.contentId,
        fieldName: request.fieldName,
        fromLanguage: request.originalLanguageCode,
        toLanguage: request.targetLanguageCode,
        characterCount: request.originalText.length,
      },
    });

    return response;
  }

  /**
   * Extract userId from translation request context
   * This is a helper to get userId for tracking when available
   */
  private extractUserIdFromContext(request: TranslationRequest): string | undefined {
    // For Character translations, userId is in the context
    if (request.context?.userId) {
      return request.context.userId;
    }
    // For Story translations, userId is also in context
    if (request.context?.authorId) {
      return request.context.authorId;
    }
    return undefined;
  }

  /**
   * Track cached translation usage
   * This tracks translations served from cache (Redis or Database)
   */
  private trackCachedTranslation(
    cached: any,
    userId: string | undefined,
    request: TranslationRequest,
    cacheSource: 'redis' | 'database'
  ): void {
    // Track cached usage with estimated token count based on character count
    // Rough estimate: 1 token ≈ 4 characters
    const estimatedInputTokens = Math.ceil(request.originalText.length / 4);
    const estimatedOutputTokens = Math.ceil((cached.translatedText?.length || request.originalText.length) / 4);

    // Determine provider from cached translation or use default
    const provider = cached.translationProvider || this.DEFAULT_PROVIDER;
    const model = cached.translationModel || this.DEFAULT_MODEL;

    // Map provider string to enum
    const providerMap: Record<string, any> = {
      gemini: 'GEMINI',
      openai: 'OPENAI',
      grok: 'GROK',
    };

    const providerEnum = providerMap[provider.toLowerCase()] || 'GEMINI';

    // Track asynchronously (don't block the response)
    const { trackLLMUsage } = require('../llm/llmUsageTracker');
    trackLLMUsage({
      userId,
      feature: 'CONTENT_TRANSLATION',
      featureId: `${request.contentType}:${request.contentId}`,
      provider: providerEnum,
      model,
      inputTokens: estimatedInputTokens,
      outputTokens: estimatedOutputTokens,
      cached: true, // Mark as cached (cost = 10% of original)
      operation: `translate_${request.fieldName}`,
      metadata: {
        contentType: request.contentType,
        contentId: request.contentId,
        fieldName: request.fieldName,
        fromLanguage: request.originalLanguageCode,
        toLanguage: request.targetLanguageCode,
        cacheSource,
        characterCount: request.originalText.length,
        estimatedTokens: true, // Flag that tokens are estimated, not from API
      },
    }).catch((error: Error) => {
      logger.debug({ error }, 'Failed to track cached translation');
    });
  }

  /**
   * Save translation to Redis
   */
  private async saveToRedis(request: TranslationRequest, data: any): Promise<void> {
    try {
      const cacheKey = this.buildCacheKey(request);
      await redis.setex(cacheKey, this.DEFAULT_CACHE_TTL, JSON.stringify(data));
    } catch (error) {
      logger.error({ error }, 'Redis save failed');
    }
  }

  /**
   * Save translation to database
   */
  private async saveToDatabase(
    request: TranslationRequest,
    llmResult: LLMResponse,
    translationTimeMs: number
  ): Promise<void> {
    try {
      await prisma.contentTranslation.upsert({
        where: {
          contentType_contentId_fieldName_targetLanguageCode: {
            contentType: request.contentType,
            contentId: request.contentId,
            fieldName: request.fieldName,
            targetLanguageCode: request.targetLanguageCode,
          },
        },
        create: {
          contentType: request.contentType,
          contentId: request.contentId,
          fieldName: request.fieldName,
          originalLanguageCode: request.originalLanguageCode,
          targetLanguageCode: request.targetLanguageCode,
          originalText: request.originalText,
          translatedText: llmResult.content,
          translationProvider: llmResult.provider,
          translationModel: llmResult.model,
          translationTimeMs,
          characterCount: request.originalText.length,
          sourceVersion: request.sourceVersion || 1,
          status: TranslationStatus.ACTIVE,
        },
        update: {
          translatedText: llmResult.content,
          translationProvider: llmResult.provider,
          translationModel: llmResult.model,
          translationTimeMs,
          characterCount: request.originalText.length,
          sourceVersion: request.sourceVersion || 1,
          status: TranslationStatus.ACTIVE,
        },
      });

      logger.info(
        {
          contentType: request.contentType,
          contentId: request.contentId,
          fieldName: request.fieldName,
        },
        'Translation saved to database'
      );
    } catch (error) {
      logger.error({ error }, 'Failed to save translation to database');
    }
  }

  /**
   * Invalidate all translations for a content item
   */
  async invalidateTranslations(contentType: string, contentId: string): Promise<void> {
    try {
      // Mark as OUTDATED in database
      await prisma.contentTranslation.updateMany({
        where: {
          contentType,
          contentId,
          status: TranslationStatus.ACTIVE,
        },
        data: {
          status: TranslationStatus.OUTDATED,
        },
      });

      // Remove from Redis
      const pattern = `translation:${contentType}:${contentId}:*`;
      const keys = await redis.keys(pattern);

      if (keys.length > 0) {
        await redis.del(...keys);
        logger.info(
          {
            contentType,
            contentId,
            count: keys.length,
          },
          'Invalidated translations in Redis'
        );
      }

      logger.info({ contentType, contentId }, 'Translations invalidated');
    } catch (error) {
      logger.error({ error, contentType, contentId }, 'Failed to invalidate translations');
    }
  }

  /**
   * Build cache key
   */
  private buildCacheKey(request: TranslationRequest): string {
    // Create a hash of the original text to ensure unique cache keys for different texts
    const textHash = crypto.createHash('md5').update(request.originalText).digest('hex').substring(0, 8);
    return `translation:${request.contentType}:${request.contentId}:${request.fieldName}:${textHash}:${request.targetLanguageCode}`;
  }

  /**
   * Build system prompt for translation
   */
  private buildSystemPrompt(): string {
    return `You are a professional translator specializing in creative content for a character roleplay platform.

Your task is to translate text while preserving:
- Tone and emotional nuance
- Character personality traits
- Cultural context and idioms
- Stylistic choices

RULES:
1. Translate ONLY the provided text - no explanations, notes, or additions
2. Maintain formatting (line breaks, punctuation, markdown)
3. Adapt idioms and expressions naturally to the target language
4. Keep proper nouns (character names, places) unless they have standard translations
5. Preserve the original meaning and intent
6. Use natural, fluent language in the target locale
7. For creative/personality descriptions, prioritize natural flow over literal translation

OUTPUT:
Return ONLY the translated text, nothing else.`;
  }

  /**
   * Build user prompt with context
   */
  private buildUserPrompt(request: TranslationRequest): string {
    const languageNames: Record<string, string> = {
      'en-US': 'American English',
      'pt-BR': 'Brazilian Portuguese',
      'es-ES': 'European Spanish',
      'ja-JP': 'Japanese',
      'zh-CN': 'Simplified Chinese',
      'ko-KR': 'Korean',
      'fr-FR': 'French',
      'de-DE': 'German',
      'it-IT': 'Italian',
      'ru-RU': 'Russian',
      'ar-SA': 'Arabic',
      'hi-IN': 'Hindi',
      'auto': 'auto-detected language',
    };

    const fromLang = languageNames[request.originalLanguageCode] || request.originalLanguageCode;
    const toLang = languageNames[request.targetLanguageCode] || request.targetLanguageCode;

    let contextInfo = '';
    if (request.context) {
      const contextParts: string[] = [];

      if (request.context.characterName) {
        contextParts.push(`Character: ${request.context.characterName}`);
      }
      if (request.context.gender) {
        contextParts.push(`Gender: ${request.context.gender}`);
      }
      if (request.context.age) {
        contextParts.push(`Age: ${request.context.age}`);
      }
      if (request.context.genre) {
        contextParts.push(`Genre: ${request.context.genre}`);
      }

      if (contextParts.length > 0) {
        contextInfo = `\n\nContext: ${contextParts.join(', ')}`;
      }
    }

    // For auto-detection, ask LLM to detect and translate
    if (request.originalLanguageCode === 'auto') {
      return `Detect the language of the following text and translate it to ${toLang}:

${request.originalText}${contextInfo}

Translation:`;
    }

    return `Translate the following ${request.fieldName} from ${fromLang} to ${toLang}:

${request.originalText}${contextInfo}

Translation:`;
  }
}

// Singleton export
export const translationService = new TranslationService();
