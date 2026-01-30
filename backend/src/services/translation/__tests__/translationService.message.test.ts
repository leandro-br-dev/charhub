/**
 * Translation Service - Message Translation Unit Tests
 * Tests for FEATURE-018: Real-time message translation for multi-user chats
 */
import { TranslationService } from '../translationService';
import { setupTestDatabase, cleanDatabase, teardownTestDatabase } from '../../../test-utils/database';
import { createTestUser, createTestMessage } from '../../../test-utils/factories';
import { getTestDb } from '../../../test-utils/database';
import { PrismaClient } from '../../../generated/prisma';

// Mock the LLM service
jest.mock('../../llm', () => ({
  callLLM: jest.fn(),
}));

// Mock the LLM usage tracker
jest.mock('../../llm/llmUsageTracker', () => ({
  trackFromLLMResponse: jest.fn(() => ({})),
  trackLLMUsage: jest.fn(() => Promise.resolve()),
}));

// Mock the encryption service - use a simple prefix instead of real encryption
jest.mock('../../../services/encryption', () => ({
  encryptMessage: (text: string) => `encrypted:${text}`,
  decryptMessage: (encrypted: string) => encrypted.replace('encrypted:', ''),
  isEncrypted: (text: string) => text.startsWith('encrypted:'),
}));

import { callLLM } from '../../llm';
import { encryptMessage } from '../../../services/encryption';

describe('TranslationService - Message Translation (FEATURE-018)', () => {
  let translationService: TranslationService;
  let db: PrismaClient;

  beforeAll(async () => {
    await setupTestDatabase();
    db = getTestDb();
    translationService = new TranslationService();
  });

  beforeEach(async () => {
    await cleanDatabase();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('translateMessage', () => {
    let testUser: any;
    let testConversation: any;
    let testMessage: any;

    beforeEach(async () => {
      // Setup test data
      testUser = await createTestUser();

      // Create conversation
      testConversation = await db.conversation.create({
        data: {
          userId: testUser.id,
          title: 'Test Conversation',
          isMultiUser: true,
        },
      });

      // Create message with encrypted content
      const plaintextContent = 'Hello, this is a test message';
      const encryptedContent = encryptMessage(plaintextContent);

      testMessage = await createTestMessage(
        testConversation.id,
        testUser.id,
        'USER',
        encryptedContent
      );
    });

    it('should translate a message to target language and cache it', async () => {
      const translatedText = 'Olá, esta é uma mensagem de teste';

      (callLLM as jest.Mock).mockResolvedValue({
        content: translatedText,
        provider: 'gemini',
        model: 'gemini-2.5-flash-lite',
      });

      const result = await translationService.translateMessage(
        testMessage.id,
        'pt-BR'
      );

      expect(result).toBe(translatedText);
      expect(callLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'gemini',
          model: 'gemini-2.5-flash-lite',
        })
      );

      // Verify translation was cached
      const cachedTranslation = await db.messageTranslation.findUnique({
        where: {
          messageId_targetLanguage: {
            messageId: testMessage.id,
            targetLanguage: 'pt-BR',
          },
        },
      });

      expect(cachedTranslation).toBeDefined();
      expect(cachedTranslation?.translatedText).toBe(translatedText);
      expect(cachedTranslation?.provider).toBe('gemini');
    });

    it('should return cached translation if it exists', async () => {
      const cachedTranslation = 'Hola, este es un mensaje de prueba';

      // Create cached translation
      await db.messageTranslation.create({
        data: {
          messageId: testMessage.id,
          targetLanguage: 'es-ES',
          translatedText: cachedTranslation,
          provider: 'gemini',
        },
      });

      const result = await translationService.translateMessage(
        testMessage.id,
        'es-ES'
      );

      expect(result).toBe(cachedTranslation);
      expect(callLLM).not.toHaveBeenCalled();
    });

    it('should skip translation when source and target languages are the same', async () => {
      // Create a message with Portuguese content indicators
      const portugueseMessage = await createTestMessage(
        testConversation.id,
        testUser.id,
        'USER',
        encryptMessage('Olá, como você está?')
      );

      const result = await translationService.translateMessage(
        portugueseMessage.id,
        'pt-BR'
      );

      expect(result).toBe('Olá, como você está?');
      expect(callLLM).not.toHaveBeenCalled();
    });

    it('should detect Portuguese and translate to English', async () => {
      const portugueseMessage = await createTestMessage(
        testConversation.id,
        testUser.id,
        'USER',
        encryptMessage('Olá, como você está? Estou bem, obrigado.')
      );

      const translatedText = 'Hello, how are you? I am fine, thanks.';

      (callLLM as jest.Mock).mockResolvedValue({
        content: translatedText,
        provider: 'gemini',
        model: 'gemini-2.5-flash-lite',
      });

      const result = await translationService.translateMessage(
        portugueseMessage.id,
        'en-US'
      );

      expect(result).toBe(translatedText);
      expect(callLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          userPrompt: expect.stringContaining('Brazilian Portuguese'),
        })
      );
    });

    it('should throw error when message does not exist', async () => {
      await expect(
        translationService.translateMessage('nonexistent-message-id', 'pt-BR')
      ).rejects.toThrow('Message not found');
    });

    it('should handle decryption failure gracefully', async () => {
      // Create message with invalid encrypted content
      const invalidMessage = await createTestMessage(
        testConversation.id,
        testUser.id,
        'USER',
        'invalid-encrypted-content'
      );

      const translatedText = 'Translated text';

      (callLLM as jest.Mock).mockResolvedValue({
        content: translatedText,
        provider: 'gemini',
        model: 'gemini-2.5-flash-lite',
      });

      const result = await translationService.translateMessage(
        invalidMessage.id,
        'pt-BR'
      );

      // Should translate the content as-is when decryption fails
      expect(result).toBe(translatedText);
    });

    it('should enforce unique constraint on (messageId, targetLanguage)', async () => {
      const translatedText = 'Translated text';

      (callLLM as jest.Mock).mockResolvedValue({
        content: translatedText,
        provider: 'gemini',
        model: 'gemini-2.5-flash-lite',
      });

      // First translation
      await translationService.translateMessage(testMessage.id, 'pt-BR');

      // Verify cached translation exists
      const cached = await db.messageTranslation.findUnique({
        where: {
          messageId_targetLanguage: {
            messageId: testMessage.id,
            targetLanguage: 'pt-BR',
          },
        },
      });
      expect(cached).toBeDefined();

      // Second translation should use cache (not create duplicate)
      await translationService.translateMessage(testMessage.id, 'pt-BR');

      // Verify only one translation exists
      const translations = await db.messageTranslation.findMany({
        where: {
          messageId: testMessage.id,
          targetLanguage: 'pt-BR',
        },
      });

      expect(translations).toHaveLength(1);
      expect(callLLM).toHaveBeenCalledTimes(1); // Called only once
    });
  });

  describe('translateMessageBatch', () => {
    let testUser: any;
    let testConversation: any;
    let testMessage: any;

    beforeEach(async () => {
      testUser = await createTestUser();

      testConversation = await db.conversation.create({
        data: {
          userId: testUser.id,
          title: 'Test Conversation',
          isMultiUser: true,
        },
      });

      const plaintextContent = 'Hello, this is a batch test';
      const encryptedContent = encryptMessage(plaintextContent);

      testMessage = await createTestMessage(
        testConversation.id,
        testUser.id,
        'USER',
        encryptedContent
      );
    });

    it('should translate message to multiple languages', async () => {
      const translations = {
        'pt-BR': 'Olá, este é um teste em lote',
        'es-ES': 'Hola, esta es una prueba por lotes',
        'ja-JP': 'こんにちは、これはバッチテストです',
      };

      let translationIndex = 0;
      (callLLM as jest.Mock).mockImplementation(async () => {
        const langs = ['pt-BR', 'es-ES', 'ja-JP'];
        const lang = langs[translationIndex];
        translationIndex++;

        return {
          content: translations[lang as keyof typeof translations],
          provider: 'gemini',
          model: 'gemini-2.5-flash-lite',
        };
      });

      const result = await translationService.translateMessageBatch(
        testMessage.id,
        ['pt-BR', 'es-ES', 'ja-JP']
      );

      expect(result.size).toBe(3);
      expect(result.get('pt-BR')).toBe(translations['pt-BR']);
      expect(result.get('es-ES')).toBe(translations['es-ES']);
      expect(result.get('ja-JP')).toBe(translations['ja-JP']);
      expect(callLLM).toHaveBeenCalledTimes(3);

      // Verify all translations were cached
      const cachedTranslations = await db.messageTranslation.findMany({
        where: {
          messageId: testMessage.id,
          targetLanguage: { in: ['pt-BR', 'es-ES', 'ja-JP'] },
        },
      });

      expect(cachedTranslations).toHaveLength(3);
    });

    it('should use cached translations and only translate missing languages', async () => {
      // Pre-cache Portuguese translation
      await db.messageTranslation.create({
        data: {
          messageId: testMessage.id,
          targetLanguage: 'pt-BR',
          translatedText: 'Olá, teste em cache',
          provider: 'gemini',
        },
      });

      (callLLM as jest.Mock).mockResolvedValue({
        content: 'Hola, traducción no cacheada',
        provider: 'gemini',
        model: 'gemini-2.5-flash-lite',
      });

      const result = await translationService.translateMessageBatch(
        testMessage.id,
        ['pt-BR', 'es-ES']
      );

      expect(result.size).toBe(2);
      expect(result.get('pt-BR')).toBe('Olá, teste em cache'); // From cache
      expect(result.get('es-ES')).toBe('Hola, traducción no cacheada'); // From LLM
      expect(callLLM).toHaveBeenCalledTimes(1); // Only called for Spanish
    });

    it('should return empty map when no translations requested', async () => {
      const result = await translationService.translateMessageBatch(
        testMessage.id,
        []
      );

      expect(result.size).toBe(0);
      expect(callLLM).not.toHaveBeenCalled();
    });

    it('should throw error when message does not exist', async () => {
      await expect(
        translationService.translateMessageBatch('nonexistent-id', ['pt-BR', 'es-ES'])
      ).rejects.toThrow('Message not found');
    });

    it('should handle partial failures gracefully', async () => {
      // Mock: First translation succeeds, second fails
      let callCount = 0;
      (callLLM as jest.Mock).mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return {
            content: 'Olá, sucesso parcial',
            provider: 'gemini',
            model: 'gemini-2.5-flash-lite',
          };
        }
        throw new Error('Translation service error');
      });

      const result = await translationService.translateMessageBatch(
        testMessage.id,
        ['pt-BR', 'es-ES']
      );

      // Should have the successful translation
      expect(result.get('pt-BR')).toBe('Olá, sucesso parcial');
      // Failed translation should not be in result
      expect(result.has('es-ES')).toBe(false);
    });

    it('should handle all cached translations scenario', async () => {
      // Pre-cache all translations
      await db.messageTranslation.createMany({
        data: [
          {
            messageId: testMessage.id,
            targetLanguage: 'pt-BR',
            translatedText: 'Olá',
            provider: 'gemini',
          },
          {
            messageId: testMessage.id,
            targetLanguage: 'es-ES',
            translatedText: 'Hola',
            provider: 'gemini',
          },
        ],
      });

      const result = await translationService.translateMessageBatch(
        testMessage.id,
        ['pt-BR', 'es-ES']
      );

      expect(result.size).toBe(2);
      expect(result.get('pt-BR')).toBe('Olá');
      expect(result.get('es-ES')).toBe('Hola');
      expect(callLLM).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases & Error Handling', () => {
    let testUser: any;
    let testConversation: any;

    beforeEach(async () => {
      testUser = await createTestUser();

      testConversation = await db.conversation.create({
        data: {
          userId: testUser.id,
          title: 'Test Conversation',
          isMultiUser: true,
        },
      });
    });

    it('should handle empty message content', async () => {
      const emptyMessage = await createTestMessage(
        testConversation.id,
        testUser.id,
        'USER',
        ''
      );

      (callLLM as jest.Mock).mockResolvedValue({
        content: '',
        provider: 'gemini',
        model: 'gemini-2.5-flash-lite',
      });

      const result = await translationService.translateMessage(
        emptyMessage.id,
        'pt-BR'
      );

      expect(result).toBe('');
    });

    it('should handle special characters in message content', async () => {
      const specialContent = 'Test with émojis 🎉 and spëcial çharacters';
      const specialMessage = await createTestMessage(
        testConversation.id,
        testUser.id,
        'USER',
        encryptMessage(specialContent)
      );

      (callLLM as jest.Mock).mockResolvedValue({
        content: 'Teste com émojis 🎉 e çaracteres espëciais',
        provider: 'gemini',
        model: 'gemini-2.5-flash-lite',
      });

      const result = await translationService.translateMessage(
        specialMessage.id,
        'pt-BR'
      );

      expect(result).toContain('🎉');
    });

    it('should handle very long messages', async () => {
      const longContent = 'A'.repeat(2000);
      const longMessage = await createTestMessage(
        testConversation.id,
        testUser.id,
        'USER',
        encryptMessage(longContent)
      );

      (callLLM as jest.Mock).mockResolvedValue({
        content: 'Á'.repeat(2000),
        provider: 'gemini',
        model: 'gemini-2.5-flash-lite',
      });

      const result = await translationService.translateMessage(
        longMessage.id,
        'pt-BR'
      );

      expect(result).toBe('Á'.repeat(2000));
    });
  });

  describe('Language Detection', () => {
    let testUser: any;
    let testConversation: any;

    beforeEach(async () => {
      testUser = await createTestUser();
      testConversation = await db.conversation.create({
        data: {
          userId: testUser.id,
          title: 'Test Conversation',
          isMultiUser: true,
        },
      });
    });

    it('should detect Portuguese from common words', async () => {
      const portugueseMessage = await createTestMessage(
        testConversation.id,
        testUser.id,
        'USER',
        encryptMessage('Olá, como você está? Estou bem, obrigado.')
      );

      (callLLM as jest.Mock).mockResolvedValue({
        content: 'Hello, how are you? I am fine, thanks.',
        provider: 'gemini',
        model: 'gemini-2.5-flash-lite',
      });

      await translationService.translateMessage(portugueseMessage.id, 'en-US');

      expect(callLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          userPrompt: expect.stringContaining('Brazilian Portuguese'),
        })
      );
    });

    it('should detect Spanish from common words', async () => {
      // Use words that are uniquely Spanish (los, las instead of os, as)
      const spanishMessage = await createTestMessage(
        testConversation.id,
        testUser.id,
        'USER',
        encryptMessage('Los animales son grandes')
      );

      (callLLM as jest.Mock).mockResolvedValue({
        content: 'The animals are big',
        provider: 'gemini',
        model: 'gemini-2.5-flash-lite',
      });

      await translationService.translateMessage(spanishMessage.id, 'en-US');

      expect(callLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          userPrompt: expect.stringContaining('European Spanish'),
        })
      );
    });

    it('should default to English for undetectable language', async () => {
      const englishMessage = await createTestMessage(
        testConversation.id,
        testUser.id,
        'USER',
        encryptMessage('Hello world')
      );

      (callLLM as jest.Mock).mockResolvedValue({
        content: 'Olá mundo',
        provider: 'gemini',
        model: 'gemini-2.5-flash-lite',
      });

      await translationService.translateMessage(englishMessage.id, 'pt-BR');

      expect(callLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          userPrompt: expect.stringContaining('American English'),
        })
      );
    });
  });
});
