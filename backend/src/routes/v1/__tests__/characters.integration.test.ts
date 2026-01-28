/**
 * Characters API Integration Tests
 * Tests characters endpoint with includeStats and fields parameters
 */
import request from 'supertest';
import { createTestApp } from '../../../test-utils/app';
import {
  setupTestDatabase,
  cleanDatabase,
  teardownTestDatabase,
} from '../../../test-utils/database';
import {
  createAuthenticatedTestUser,
  getAuthHeader,
} from '../../../test-utils/auth';
import {
  createTestCharacter,
  createTestConversationWithParticipants,
} from '../../../test-utils/factories';
import { getTestDb } from '../../../test-utils/database';

const app = createTestApp();

describe('Characters API Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('GET /api/v1/characters with includeStats', () => {
    it('should include stats object when includeStats=true', async () => {
      const { user, token } = await createAuthenticatedTestUser();

      // Create a character
      const character = await createTestCharacter(user.id);

      // Add some conversations
      await createTestConversationWithParticipants(user.id, {
        characterIds: [character.id],
      });
      await createTestConversationWithParticipants(user.id, {
        characterIds: [character.id],
      });

      // Add favorite
      const db = getTestDb();
      await db.favoriteCharacter.create({
        data: { userId: user.id, characterId: character.id },
      });

      // Add images
      await db.characterImage.create({
        data: {
          characterId: character.id,
          type: 'SAMPLE',
          url: 'https://example.com/sample.jpg',
          isActive: true,
        },
      });

      const response = await request(app)
        .get('/api/v1/characters?includeStats=true&public=false')
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.length).toBeGreaterThan(0);

      const charResponse = response.body.data[0];
      expect(charResponse.stats).toBeDefined();
      expect(charResponse.stats.conversationCount).toBe(2);
      expect(charResponse.stats.favoriteCount).toBe(1);
      expect(charResponse.stats.isFavoritedByUser).toBe(true);
      expect(charResponse.stats.imageCount).toBe(1);
    });

    it('should not include stats object when includeStats is not specified', async () => {
      const { user, token } = await createAuthenticatedTestUser();
      await createTestCharacter(user.id);

      const response = await request(app)
        .get('/api/v1/characters?public=false')
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.length).toBeGreaterThan(0);

      const charResponse = response.body.data[0];
      expect(charResponse.stats).toBeUndefined();
    });

    it('should include stats for all characters in list', async () => {
      const { user, token } = await createAuthenticatedTestUser();

      // Create 3 characters
      const char1 = await createTestCharacter(user.id);
      const char2 = await createTestCharacter(user.id);
      const char3 = await createTestCharacter(user.id);

      // Add different stats to each
      await createTestConversationWithParticipants(user.id, {
        characterIds: [char1.id],
      });
      await createTestConversationWithParticipants(user.id, {
        characterIds: [char1.id],
      });

      await createTestConversationWithParticipants(user.id, {
        characterIds: [char2.id],
      });

      // char3 has no conversations

      // Get characters with stats
      const response = await request(app)
        .get('/api/v1/characters?includeStats=true&public=false')
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(3);

      // Find our characters in the response
      const char1Response = response.body.data.find((c: any) => c.id === char1.id);
      const char2Response = response.body.data.find((c: any) => c.id === char2.id);
      const char3Response = response.body.data.find((c: any) => c.id === char3.id);

      expect(char1Response).toBeDefined();
      expect(char1Response.stats).toBeDefined();
      expect(char1Response.stats.conversationCount).toBe(2);

      expect(char2Response).toBeDefined();
      expect(char2Response.stats).toBeDefined();
      expect(char2Response.stats.conversationCount).toBe(1);

      expect(char3Response).toBeDefined();
      expect(char3Response.stats).toBeDefined();
      expect(char3Response.stats.conversationCount).toBe(0);
    });

    it('should correctly identify user favorites', async () => {
      const db = getTestDb();
      const { user, token } = await createAuthenticatedTestUser();
      const character = await createTestCharacter(user.id);

      // User favorites the character
      await db.favoriteCharacter.create({
        data: { userId: user.id, characterId: character.id },
      });

      const response = await request(app)
        .get('/api/v1/characters?includeStats=true&public=false')
        .set(getAuthHeader(token))
        .expect(200);

      const charResponse = response.body.data.find(
        (c: any) => c.id === character.id
      );
      expect(charResponse.stats.isFavoritedByUser).toBe(true);
    });
  });

  describe('GET /api/v1/characters with fields parameter', () => {
    it('should return only requested fields', async () => {
      const { user, token } = await createAuthenticatedTestUser();
      await createTestCharacter(user.id);

      const response = await request(app)
        .get(`/api/v1/characters?fields=id,firstName,lastName&public=false`)
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.success).toBe(true);
      const char = response.body.data[0];

      // Should only have requested fields plus 'id' (always included)
      expect(Object.keys(char)).toEqual(['id', 'firstName', 'lastName']);
    });

    it('should auto-include stats when includeStats=true', async () => {
      const { user, token } = await createAuthenticatedTestUser();
      await createTestCharacter(user.id);

      const response = await request(app)
        .get(`/api/v1/characters?fields=id,firstName&includeStats=true&public=false`)
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.success).toBe(true);
      const char = response.body.data[0];

      // Should include stats even though not explicitly in fields
      expect(char.stats).toBeDefined();
      expect(Object.keys(char)).toContain('stats');
    });

    it('should support nested fields like creator.username', async () => {
      const { user, token } = await createAuthenticatedTestUser();
      await createTestCharacter(user.id);

      const response = await request(app)
        .get(`/api/v1/characters?fields=id,firstName,creator.username&public=false`)
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.success).toBe(true);
      const char = response.body.data[0];

      expect(char.id).toBeDefined();
      expect(char.firstName).toBeDefined();
      expect(char.creator).toBeDefined();
      expect(char.creator.username).toBeDefined();
    });

    it('should include stats in fields when explicitly requested', async () => {
      const { user, token } = await createAuthenticatedTestUser();
      await createTestCharacter(user.id);

      const response = await request(app)
        .get(`/api/v1/characters?fields=id,firstName,stats&includeStats=true&public=false`)
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.success).toBe(true);
      const char = response.body.data[0];

      expect(char.id).toBeDefined();
      expect(char.firstName).toBeDefined();
      expect(char.stats).toBeDefined();
    });

    it('should handle empty fields parameter gracefully', async () => {
      const { user, token } = await createAuthenticatedTestUser();
      await createTestCharacter(user.id);

      const response = await request(app)
        .get(`/api/v1/characters?fields=&public=false`)
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should return all fields when fields is empty
      expect(response.body.data[0]).toBeDefined();
    });

    it('should handle invalid field names gracefully', async () => {
      const { user, token } = await createAuthenticatedTestUser();
      await createTestCharacter(user.id);

      const response = await request(app)
        .get(`/api/v1/characters?fields=id,nonexistent,firstName&public=false`)
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should only include valid fields
      const char = response.body.data[0];
      expect(char.id).toBeDefined();
      expect(char.firstName).toBeDefined();
      expect(char.nonexistent).toBeUndefined();
    });
  });

  describe('GET /api/v1/characters with includeStats and fields combined', () => {
    it('should work correctly with both parameters', async () => {
      const { user, token } = await createAuthenticatedTestUser();
      const character = await createTestCharacter(user.id);

      // Add some data
      await createTestConversationWithParticipants(user.id, {
        characterIds: [character.id],
      });
      await createTestConversationWithParticipants(user.id, {
        characterIds: [character.id],
      });

      const response = await request(app)
        .get(`/api/v1/characters?includeStats=true&fields=id,firstName,stats&public=false`)
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.success).toBe(true);
      const char = response.body.data.find((c: any) => c.id === character.id);

      expect(char).toBeDefined();
      expect(Object.keys(char)).toEqual(['id', 'firstName', 'stats']);
      expect(char.stats.conversationCount).toBe(2);
      expect(char.stats.favoriteCount).toBeDefined();
      expect(char.stats.isFavoritedByUser).toBeDefined();
      expect(char.stats.imageCount).toBeDefined();
    });

    it('should include stats object structure correctly', async () => {
      const { user, token } = await createAuthenticatedTestUser();
      const character = await createTestCharacter(user.id);

      const response = await request(app)
        .get(`/api/v1/characters?includeStats=true&fields=id,stats&public=false`)
        .set(getAuthHeader(token))
        .expect(200);

      const char = response.body.data.find((c: any) => c.id === character.id);

      expect(char.stats).toMatchObject({
        conversationCount: expect.any(Number),
        favoriteCount: expect.any(Number),
        isFavoritedByUser: expect.any(Boolean),
        imageCount: expect.any(Number),
      });
    });
  });

  describe('GET /api/v1/characters error cases', () => {
    it('should return 401 for favorites sortBy without auth', async () => {
      await request(app)
        .get('/api/v1/characters?sortBy=favorites')
        .expect(401);
    });

    it('should work for authenticated user requesting favorites', async () => {
      const { user, token } = await createAuthenticatedTestUser();
      await createTestCharacter(user.id);

      const response = await request(app)
        .get(`/api/v1/characters?sortBy=favorites&includeStats=true&public=false`)
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle invalid includeStats values gracefully', async () => {
      const { user, token } = await createAuthenticatedTestUser();
      await createTestCharacter(user.id);

      // Should not error, just treat as false
      const response = await request(app)
        .get(`/api/v1/characters?includeStats=invalid&public=false`)
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data[0].stats).toBeUndefined();
    });

    it('should accept includeStats=1 as true', async () => {
      const { user, token } = await createAuthenticatedTestUser();
      await createTestCharacter(user.id);

      const response = await request(app)
        .get(`/api/v1/characters?includeStats=1&public=false`)
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data[0].stats).toBeDefined();
    });
  });

  describe('Performance tests', () => {
    it('should handle includeStats with many characters efficiently', async () => {
      const { user, token } = await createAuthenticatedTestUser();

      // Create 20 characters
      for (let i = 0; i < 20; i++) {
        await createTestCharacter(user.id);
      }

      const startTime = Date.now();
      const response = await request(app)
        .get('/api/v1/characters?includeStats=true&public=false')
        .set(getAuthHeader(token))
        .expect(200);
      const duration = Date.now() - startTime;

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(20);
      // Should complete in reasonable time (< 10 seconds even with all overhead)
      expect(duration).toBeLessThan(10000);
    });
  });
});
