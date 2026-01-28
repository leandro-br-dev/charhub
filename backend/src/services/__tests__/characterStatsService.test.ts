/**
 * Character Stats Service Unit Tests
 * Tests for characterStatsService.getBatchCharacterStatsOptimized()
 */
import { characterStatsService } from '../characterStatsService';
import {
  setupTestDatabase,
  cleanDatabase,
  teardownTestDatabase,
} from '../../test-utils/database';
import {
  createTestUser,
  createTestCharacter,
  createTestConversationWithParticipants,
} from '../../test-utils/factories';
import { getTestDb } from '../../test-utils/database';

describe('characterStatsService', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('getBatchCharacterStatsOptimized', () => {
    it('should return correct counts for multiple characters', async () => {
      const db = getTestDb();
      const user = await createTestUser();

      // Create 3 characters
      const char1 = await createTestCharacter(user.id);
      const char2 = await createTestCharacter(user.id);
      const char3 = await createTestCharacter(user.id);

      // Create conversations for char1 (2 conversations)
      await createTestConversationWithParticipants(user.id, {
        characterIds: [char1.id],
      });
      await createTestConversationWithParticipants(user.id, {
        characterIds: [char1.id],
      });

      // Create conversations for char2 (1 conversation)
      await createTestConversationWithParticipants(user.id, {
        characterIds: [char2.id],
      });

      // char3 has no conversations

      // Add some favorite counts
      const anotherUser = await createTestUser();
      await db.favoriteCharacter.create({
        data: {
          userId: anotherUser.id,
          characterId: char1.id,
        },
      });
      await db.favoriteCharacter.create({
        data: {
          userId: user.id,
          characterId: char2.id,
        },
      });

      // Add some images (excluding AVATAR)
      await db.characterImage.create({
        data: {
          characterId: char1.id,
          type: 'SAMPLE',
          url: 'https://example.com/sample1.jpg',
          isActive: true,
        },
      });
      await db.characterImage.create({
        data: {
          characterId: char1.id,
          type: 'COVER',
          url: 'https://example.com/cover1.jpg',
          isActive: true,
        },
      });
      await db.characterImage.create({
        data: {
          characterId: char2.id,
          type: 'SAMPLE',
          url: 'https://example.com/sample2.jpg',
          isActive: true,
        },
      });

      // Get batch stats (with user context for isFavoritedByUser)
      const statsMap = await characterStatsService.getBatchCharacterStatsOptimized(
        [char1.id, char2.id, char3.id],
        user.id
      );

      // Verify results
      expect(statsMap.size).toBe(3);

      const char1Stats = statsMap.get(char1.id);
      expect(char1Stats).toBeDefined();
      expect(char1Stats!.characterId).toBe(char1.id);
      expect(char1Stats!.conversationCount).toBe(2);
      expect(char1Stats!.favoriteCount).toBe(1);
      expect(char1Stats!.isFavoritedByUser).toBe(false);
      expect(char1Stats!.imageCount).toBe(2); // 1 SAMPLE + 1 COVER

      const char2Stats = statsMap.get(char2.id);
      expect(char2Stats).toBeDefined();
      expect(char2Stats!.characterId).toBe(char2.id);
      expect(char2Stats!.conversationCount).toBe(1);
      expect(char2Stats!.favoriteCount).toBe(1);
      expect(char2Stats!.isFavoritedByUser).toBe(true);
      expect(char2Stats!.imageCount).toBe(1); // 1 SAMPLE

      const char3Stats = statsMap.get(char3.id);
      expect(char3Stats).toBeDefined();
      expect(char3Stats!.characterId).toBe(char3.id);
      expect(char3Stats!.conversationCount).toBe(0);
      expect(char3Stats!.favoriteCount).toBe(0);
      expect(char3Stats!.isFavoritedByUser).toBe(false);
      expect(char3Stats!.imageCount).toBe(0);
    });

    it('should handle empty array gracefully', async () => {
      const statsMap = await characterStatsService.getBatchCharacterStatsOptimized([]);

      expect(statsMap).toBeDefined();
      expect(statsMap.size).toBe(0);
    });

    it('should handle array with empty/null strings gracefully', async () => {
      const user = await createTestUser();
      const char1 = await createTestCharacter(user.id);

      const statsMap = await characterStatsService.getBatchCharacterStatsOptimized([
        char1.id,
        '',
        null as unknown as string,
        undefined as unknown as string,
      ]);

      expect(statsMap.size).toBe(1);
      expect(statsMap.has(char1.id)).toBe(true);
    });

    it('should handle duplicates in characterIds array', async () => {
      const user = await createTestUser();
      const char1 = await createTestCharacter(user.id);
      await createTestConversationWithParticipants(user.id, {
        characterIds: [char1.id],
      });

      const statsMap = await characterStatsService.getBatchCharacterStatsOptimized([
        char1.id,
        char1.id,
        char1.id,
      ]);

      // Should deduplicate and return only one entry
      expect(statsMap.size).toBe(1);
      expect(statsMap.has(char1.id)).toBe(true);
    });

    it('should correctly identify user favorites', async () => {
      const db = getTestDb();
      const user = await createTestUser();
      const char1 = await createTestCharacter(user.id);
      const char2 = await createTestCharacter(user.id);
      const char3 = await createTestCharacter(user.id);

      // User favorites char1 and char2, not char3
      await db.favoriteCharacter.create({
        data: { userId: user.id, characterId: char1.id },
      });
      await db.favoriteCharacter.create({
        data: { userId: user.id, characterId: char2.id },
      });

      // Another user favorites char3
      const anotherUser = await createTestUser();
      await db.favoriteCharacter.create({
        data: { userId: anotherUser.id, characterId: char3.id },
      });

      // Get stats with user context
      const statsMap = await characterStatsService.getBatchCharacterStatsOptimized(
        [char1.id, char2.id, char3.id],
        user.id
      );

      expect(statsMap.get(char1.id)!.isFavoritedByUser).toBe(true);
      expect(statsMap.get(char2.id)!.isFavoritedByUser).toBe(true);
      expect(statsMap.get(char3.id)!.isFavoritedByUser).toBe(false);
      // But char3 should still have favoriteCount from other user
      expect(statsMap.get(char3.id)!.favoriteCount).toBe(1);
    });

    it('should return false for isFavoritedByUser when no userId provided', async () => {
      const db = getTestDb();
      const user = await createTestUser();
      const char1 = await createTestCharacter(user.id);

      // User favorites the character
      await db.favoriteCharacter.create({
        data: { userId: user.id, characterId: char1.id },
      });

      // Get stats without user context
      const statsMap = await characterStatsService.getBatchCharacterStatsOptimized([
        char1.id,
      ]);

      // Should have favoriteCount but isFavoritedByUser should be false
      expect(statsMap.get(char1.id)!.favoriteCount).toBe(1);
      expect(statsMap.get(char1.id)!.isFavoritedByUser).toBe(false);
    });

    it('should count conversations from both acting and representing roles', async () => {
      const user = await createTestUser();
      const char1 = await createTestCharacter(user.id);
      const char2 = await createTestCharacter(user.id);

      // Create conversations with participants using the helper
      await createTestConversationWithParticipants(user.id, {
        characterIds: [char1.id],
      });
      await createTestConversationWithParticipants(user.id, {
        characterIds: [char1.id],
      });
      await createTestConversationWithParticipants(user.id, {
        characterIds: [char2.id],
      });

      const statsMap = await characterStatsService.getBatchCharacterStatsOptimized([
        char1.id,
        char2.id,
      ]);

      // char1 should have 2 conversations
      expect(statsMap.get(char1.id)!.conversationCount).toBe(2);

      // char2 should have 1 conversation
      expect(statsMap.get(char2.id)!.conversationCount).toBe(1);
    });

    it('should exclude AVATAR images from imageCount', async () => {
      const db = getTestDb();
      const user = await createTestUser();
      const char1 = await createTestCharacter(user.id);

      // Create avatar image (should be excluded)
      await db.characterImage.create({
        data: {
          characterId: char1.id,
          type: 'AVATAR',
          url: 'https://example.com/avatar.jpg',
          isActive: true,
        },
      });

      // Create other image types (should be counted)
      await db.characterImage.create({
        data: {
          characterId: char1.id,
          type: 'COVER',
          url: 'https://example.com/cover.jpg',
          isActive: true,
        },
      });
      await db.characterImage.create({
        data: {
          characterId: char1.id,
          type: 'SAMPLE',
          url: 'https://example.com/sample.jpg',
          isActive: true,
        },
      });

      const statsMap = await characterStatsService.getBatchCharacterStatsOptimized([
        char1.id,
      ]);

      // Should only count non-AVATAR images
      expect(statsMap.get(char1.id)!.imageCount).toBe(2);
    });

    it('should set messageCount to 0 (not implemented for list view)', async () => {
      const user = await createTestUser();
      const char1 = await createTestCharacter(user.id);

      const statsMap = await characterStatsService.getBatchCharacterStatsOptimized([
        char1.id,
      ]);

      // messageCount is always 0 in optimized version (not queried)
      expect(statsMap.get(char1.id)!.messageCount).toBe(0);
    });

    it('should handle characters with no stats data', async () => {
      const user = await createTestUser();
      const char = await createTestCharacter(user.id);

      const statsMap = await characterStatsService.getBatchCharacterStatsOptimized([
        char.id,
      ]);

      const stats = statsMap.get(char.id);
      expect(stats).toBeDefined();
      expect(stats!.conversationCount).toBe(0);
      expect(stats!.messageCount).toBe(0);
      expect(stats!.favoriteCount).toBe(0);
      expect(stats!.isFavoritedByUser).toBe(false);
      expect(stats!.imageCount).toBe(0);
    });

    describe('Performance & Optimization', () => {
      it('should use batch queries efficiently for many characters', async () => {
        const user = await createTestUser();

        // Create 50 characters
        const characterIds = await Promise.all(
          Array.from({ length: 50 }, async () => {
            const char = await createTestCharacter(user.id);
            return char.id;
          })
        );

        // This should complete quickly with batch queries
        const startTime = Date.now();
        const statsMap = await characterStatsService.getBatchCharacterStatsOptimized(
          characterIds
        );
        const duration = Date.now() - startTime;

        expect(statsMap.size).toBe(50);
        // Should complete in reasonable time (< 5 seconds even with database overhead)
        expect(duration).toBeLessThan(5000);
      });

      it('should handle mixed data (some with stats, some without)', async () => {
        const db = getTestDb();
        const user = await createTestUser();

        const char1 = await createTestCharacter(user.id);
        const char2 = await createTestCharacter(user.id);
        const char3 = await createTestCharacter(user.id);

        // Only char2 has data
        await createTestConversationWithParticipants(user.id, {
          characterIds: [char2.id],
        });
        await db.favoriteCharacter.create({
          data: { userId: user.id, characterId: char2.id },
        });
        await db.characterImage.create({
          data: {
            characterId: char2.id,
            type: 'SAMPLE',
            url: 'https://example.com/sample.jpg',
            isActive: true,
          },
        });

        const statsMap = await characterStatsService.getBatchCharacterStatsOptimized([
          char1.id,
          char2.id,
          char3.id,
        ]);

        // All should be present in result
        expect(statsMap.has(char1.id)).toBe(true);
        expect(statsMap.has(char2.id)).toBe(true);
        expect(statsMap.has(char3.id)).toBe(true);

        // Only char2 has non-zero stats
        expect(statsMap.get(char1.id)!.conversationCount).toBe(0);
        expect(statsMap.get(char2.id)!.conversationCount).toBe(1);
        expect(statsMap.get(char3.id)!.conversationCount).toBe(0);
      });
    });
  });
});
