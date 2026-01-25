/**
 * User Persona and Instructions Integration Tests
 * Tests for user persona, configOverride JSON format, and avatar override
 */
import request from 'supertest';
import { createTestApp } from '../../../test-utils/app';
import {
  setupTestDatabase,
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

// Mock translationService to prevent real API calls during tests
jest.mock('../../../services/translation/translationService', () => ({
  translationService: {
    translate: jest.fn().mockImplementation(() => Promise.resolve({
      translatedText: 'Translated text',
      provider: 'test',
      model: 'test',
      translationTimeMs: 0,
      cached: true,
      source: 'redis',
    })),
    invalidateTranslations: jest.fn().mockImplementation(() => Promise.resolve()),
  },
}));

const app = createTestApp();

// Increase timeout for all tests in this suite (DB operations can be slow)
jest.setTimeout(120000);

// TODO: Fix Prisma WASM memory access errors in CI (issue #149)
// Skip tests in CI environment until Prisma WASM issue is resolved
const describeCI = process.env.CI === 'true' ? describe.skip : describe;

describeCI('User Persona and Instructions Integration Tests', () => {
  let sharedUser: any;
  let sharedToken: string;

  beforeAll(async () => {
    await setupTestDatabase();
    // Create a shared user once for all tests
    const authUser = await createAuthenticatedTestUser();
    sharedUser = authUser.user;
    sharedToken = authUser.token;
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('PATCH /api/v1/conversations/:id/participants/:participantId - User Config', () => {
    it('should save user config as JSON with instructions', async () => {
      // Using shared user
      const user = sharedUser;
      const token = sharedToken;

      const character = await createTestCharacter(user.id);
      const { conversation, userParticipantId } = await createTestConversationWithParticipants(
        user.id,
        { characterIds: [character.id], includeUser: true }
      );

      const userConfig = {
        instructions: 'I am playing as a medieval knight',
      };

      await request(app)
        .patch(`/api/v1/conversations/${conversation.id}/participants/${userParticipantId!}`)
        .set(getAuthHeader(token))
        .send({ configOverride: JSON.stringify(userConfig) })
        .expect(200);

      // Verify it was saved
      const response = await request(app)
        .get(`/api/v1/conversations/${conversation.id}`)
        .set(getAuthHeader(token))
        .expect(200);

      const userParticipant = response.body.data.participants.find(
        (p: any) => p.userId === user.id
      );

      expect(userParticipant.configOverride).toBeDefined();
      const parsed = JSON.parse(userParticipant.configOverride);
      expect(parsed.instructions).toBe('I am playing as a medieval knight');
    });

    it('should save user config with all override fields', async () => {
      // Using shared user
      const user = sharedUser;
      const token = sharedToken;

      const character = await createTestCharacter(user.id);
      const { conversation, userParticipantId } = await createTestConversationWithParticipants(
        user.id,
        { characterIds: [character.id], includeUser: true }
      );

      const userConfig = {
        instructions: 'I am a mysterious traveler',
        nameOverride: 'Stranger',
        ageOverride: 35,
        genderOverride: 'male',
        avatarOverride: 'https://example.com/avatar.jpg',
        descriptionOverride: 'Wears a dark cloak',
      };

      await request(app)
        .patch(`/api/v1/conversations/${conversation.id}/participants/${userParticipantId!}`)
        .set(getAuthHeader(token))
        .send({ configOverride: JSON.stringify(userConfig) })
        .expect(200);

      // Verify all fields were saved
      const response = await request(app)
        .get(`/api/v1/conversations/${conversation.id}`)
        .set(getAuthHeader(token))
        .expect(200);

      const userParticipant = response.body.data.participants.find(
        (p: any) => p.userId === user.id
      );

      const parsed = JSON.parse(userParticipant.configOverride);
      expect(parsed).toMatchObject(userConfig);
    });

    it('should set representingCharacterId for user persona', async () => {
      // Using shared user
      const user = sharedUser;
      const token = sharedToken;

      const character = await createTestCharacter(user.id);
      const personaChar = await createTestCharacter(user.id, {
        firstName: 'PersonaCharacter',
      });

      const { conversation, userParticipantId } = await createTestConversationWithParticipants(
        user.id,
        { characterIds: [character.id], includeUser: true }
      );

      // Set persona
      await request(app)
        .patch(`/api/v1/conversations/${conversation.id}/participants/${userParticipantId!}`)
        .set(getAuthHeader(token))
        .send({ representingCharacterId: personaChar.id })
        .expect(200);

      // Verify
      const response = await request(app)
        .get(`/api/v1/conversations/${conversation.id}`)
        .set(getAuthHeader(token))
        .expect(200);

      const userParticipant = response.body.data.participants.find(
        (p: any) => p.userId === user.id
      );

      expect(userParticipant.representingCharacterId).toBe(personaChar.id);
      expect(userParticipant.representingCharacter).toBeDefined();
      expect(userParticipant.representingCharacter.firstName).toBe('PersonaCharacter');
    });

    it('should clear user config when set to null', async () => {
      // Using shared user
      const user = sharedUser;
      const token = sharedToken;

      const character = await createTestCharacter(user.id);
      const { conversation, userParticipantId } = await createTestConversationWithParticipants(
        user.id,
        { characterIds: [character.id], includeUser: true }
      );

      // Set config first
      await request(app)
        .patch(`/api/v1/conversations/${conversation.id}/participants/${userParticipantId!}`)
        .set(getAuthHeader(token))
        .send({
          configOverride: JSON.stringify({ instructions: 'Test instructions' }),
        })
        .expect(200);

      // Clear it
      await request(app)
        .patch(`/api/v1/conversations/${conversation.id}/participants/${userParticipantId!}`)
        .set(getAuthHeader(token))
        .send({ configOverride: null })
        .expect(200);

      // Verify cleared
      const response = await request(app)
        .get(`/api/v1/conversations/${conversation.id}`)
        .set(getAuthHeader(token))
        .expect(200);

      const userParticipant = response.body.data.participants.find(
        (p: any) => p.userId === user.id
      );

      expect(userParticipant.configOverride).toBeNull();
    });

    it('should handle empty JSON object', async () => {
      // Using shared user
      const user = sharedUser;
      const token = sharedToken;

      const character = await createTestCharacter(user.id);
      const { conversation, userParticipantId } = await createTestConversationWithParticipants(
        user.id,
        { characterIds: [character.id], includeUser: true }
      );

      await request(app)
        .patch(`/api/v1/conversations/${conversation.id}/participants/${userParticipantId!}`)
        .set(getAuthHeader(token))
        .send({ configOverride: JSON.stringify({}) })
        .expect(200);

      const response = await request(app)
        .get(`/api/v1/conversations/${conversation.id}`)
        .set(getAuthHeader(token))
        .expect(200);

      const userParticipant = response.body.data.participants.find(
        (p: any) => p.userId === user.id
      );

      expect(userParticipant.configOverride).toBe('{}');
      const parsed = JSON.parse(userParticipant.configOverride);
      expect(parsed).toEqual({});
    });

    it('should handle invalid JSON gracefully (treat as plain string)', async () => {
      // Using shared user
      const user = sharedUser;
      const token = sharedToken;

      const character = await createTestCharacter(user.id);
      const { conversation, userParticipantId } = await createTestConversationWithParticipants(
        user.id,
        { characterIds: [character.id], includeUser: true }
      );

      // Send plain string (not JSON)
      const plainInstructions = 'These are just plain instructions, not JSON';

      await request(app)
        .patch(`/api/v1/conversations/${conversation.id}/participants/${userParticipantId!}`)
        .set(getAuthHeader(token))
        .send({ configOverride: plainInstructions })
        .expect(200);

      const response = await request(app)
        .get(`/api/v1/conversations/${conversation.id}`)
        .set(getAuthHeader(token))
        .expect(200);

      const userParticipant = response.body.data.participants.find(
        (p: any) => p.userId === user.id
      );

      expect(userParticipant.configOverride).toBe(plainInstructions);
    });
  });

  describe('GET /api/v1/characters/personas - Available Personas', () => {
    it('should return users own characters for persona selection', async () => {
      // Use fresh user for this test to avoid conflicts with shared user data
      const { user, token } = await createAuthenticatedTestUser();

      // Create some PRIVATE characters with unique names
      const char1 = await createTestCharacter(user.id, {
        firstName: `MyChar1_${Date.now()}`,
        visibility: 'PRIVATE',
      });
      const char2 = await createTestCharacter(user.id, {
        firstName: `MyChar2_${Date.now()}`,
        visibility: 'PRIVATE',
      });

      // Use a large limit to get all characters (database is shared across tests)
      const response = await request(app)
        .get('/api/v1/characters/personas?limit=1000')
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);

      // Should contain our characters (filter by this user's characters)
      const userCharacterIds = response.body.data
        .filter((c: any) => c.userId === user.id)
        .map((c: any) => c.id);

      expect(userCharacterIds).toContain(char1.id);
      expect(userCharacterIds).toContain(char2.id);
    });

    it('should return public characters from other users', async () => {
      // Create first user who will create a public character
      const { user: owner1 } = await createAuthenticatedTestUser();
      await createTestCharacter(owner1.id, {
        firstName: `PublicChar_${Date.now()}`,
        visibility: 'PUBLIC',
      });

      // Create second user who will create private characters and fetch personas
      const { user: owner2, token: owner2Token } = await createAuthenticatedTestUser();
      await createTestCharacter(owner2.id, {
        firstName: `PrivateChar_${Date.now()}`,
        visibility: 'PRIVATE',
      });
      await createTestCharacter(owner2.id, {
        firstName: `User2PrivateChar_${Date.now()}`,
        visibility: 'PRIVATE',
      });

      // owner2 fetches personas
      // Use a large limit to get all characters (database is shared across tests)
      const response = await request(app)
        .get('/api/v1/characters/personas?limit=1000')
        .set(getAuthHeader(owner2Token))
        .expect(200);

      // owner2 should see:
      // 1. At least the 2 private characters they created
      // 2. At least 1 public character (from owner1)
      const owner2Characters = response.body.data.filter((c: any) => c.userId === owner2.id);
      const publicCharacters = response.body.data.filter((c: any) => c.visibility === 'PUBLIC');

      expect(owner2Characters.length).toBeGreaterThanOrEqual(2);
      expect(publicCharacters.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter private characters from other users', async () => {
      const { user: otherUser } = await createAuthenticatedTestUser();
      const { token } = await createAuthenticatedTestUser();

      // Other user creates private character
      await createTestCharacter(otherUser.id, {
        firstName: 'SecretChar',
        visibility: 'PRIVATE',
      });

      // Use a large limit to get all characters (database is shared across tests)
      const response = await request(app)
        .get('/api/v1/characters/personas?limit=1000')
        .set(getAuthHeader(token))
        .expect(200);

      const characterNames = response.body.data.map((c: any) => c.firstName);
      expect(characterNames).not.toContain('SecretChar');
    });

    it('should support search by character name', async () => {
      // Using shared user
      const user = sharedUser;
      const token = sharedToken;

      await createTestCharacter(user.id, { firstName: 'DragonKnight' });
      await createTestCharacter(user.id, { firstName: 'WizardMage' });
      await createTestCharacter(user.id, { firstName: 'ElfArcher' });

      const response = await request(app)
        .get('/api/v1/characters/personas?search=Dragon')
        .set(getAuthHeader(token))
        .expect(200);

      const characterNames = response.body.data.map((c: any) => c.firstName);
      expect(characterNames).toContain('DragonKnight');
      expect(characterNames).not.toContain('WizardMage');
      expect(characterNames).not.toContain('ElfArcher');
    });

    it('should paginate results', async () => {
      // Using shared user
      const user = sharedUser;
      const token = sharedToken;

      // Create multiple characters
      for (let i = 0; i < 25; i++) {
        await createTestCharacter(user.id, { firstName: `Char${i}` });
      }

      // First page
      const page1 = await request(app)
        .get('/api/v1/characters/personas?page=1&limit=10')
        .set(getAuthHeader(token))
        .expect(200);

      expect(page1.body.data.length).toBe(10);

      // Second page
      const page2 = await request(app)
        .get('/api/v1/characters/personas?page=2&limit=10')
        .set(getAuthHeader(token))
        .expect(200);

      expect(page2.body.data.length).toBe(10);

      // Ensure different results
      const page1Ids = page1.body.data.map((c: any) => c.id);
      const page2Ids = page2.body.data.map((c: any) => c.id);
      const overlap = page1Ids.filter((id: string) => page2Ids.includes(id));
      expect(overlap.length).toBe(0);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/v1/characters/personas')
        .expect(401);
    });
  });

  describe('Avatar Override Behavior', () => {
    it('should fall back to user avatar when avatarOverride is null', async () => {
      const { user, token } = await createAuthenticatedTestUser({
        avatarUrl: 'https://example.com/user-avatar.jpg',
      });

      const character = await createTestCharacter(user.id);
      const { conversation, userParticipantId } = await createTestConversationWithParticipants(
        user.id,
        { characterIds: [character.id], includeUser: true }
      );

      // Set config without avatarOverride
      const userConfig = {
        instructions: 'Test instructions',
        nameOverride: 'TestName',
        // No avatarOverride
      };

      await request(app)
        .patch(`/api/v1/conversations/${conversation.id}/participants/${userParticipantId!}`)
        .set(getAuthHeader(token))
        .send({ configOverride: JSON.stringify(userConfig) })
        .expect(200);

      // Frontend will use user.avatarUrl as fallback
      const response = await request(app)
        .get(`/api/v1/conversations/${conversation.id}`)
        .set(getAuthHeader(token))
        .expect(200);

      const userParticipant = response.body.data.participants.find(
        (p: any) => p.userId === user.id
      );

      expect(userParticipant.user.avatarUrl).toBe('https://example.com/user-avatar.jpg');
    });

    it('should save avatarOverride when provided', async () => {
      // Using shared user
      const user = sharedUser;
      const token = sharedToken;

      const character = await createTestCharacter(user.id);
      const { conversation, userParticipantId } = await createTestConversationWithParticipants(
        user.id,
        { characterIds: [character.id], includeUser: true }
      );

      const userConfig = {
        avatarOverride: 'https://example.com/custom-avatar.jpg',
      };

      await request(app)
        .patch(`/api/v1/conversations/${conversation.id}/participants/${userParticipantId!}`)
        .set(getAuthHeader(token))
        .send({ configOverride: JSON.stringify(userConfig) })
        .expect(200);

      const response = await request(app)
        .get(`/api/v1/conversations/${conversation.id}`)
        .set(getAuthHeader(token))
        .expect(200);

      const userParticipant = response.body.data.participants.find(
        (p: any) => p.userId === user.id
      );

      const parsed = JSON.parse(userParticipant.configOverride);
      expect(parsed.avatarOverride).toBe('https://example.com/custom-avatar.jpg');
    });

    it('should handle empty string avatarOverride', async () => {
      const { user, token } = await createAuthenticatedTestUser({
        avatarUrl: 'https://example.com/original.jpg',
      });

      const character = await createTestCharacter(user.id);
      const { conversation, userParticipantId } = await createTestConversationWithParticipants(
        user.id,
        { characterIds: [character.id], includeUser: true }
      );

      // Set empty avatarOverride (frontend should treat as "no override")
      const userConfig = {
        avatarOverride: '',
      };

      await request(app)
        .patch(`/api/v1/conversations/${conversation.id}/participants/${userParticipantId!}`)
        .set(getAuthHeader(token))
        .send({ configOverride: JSON.stringify(userConfig) })
        .expect(200);

      const response = await request(app)
        .get(`/api/v1/conversations/${conversation.id}`)
        .set(getAuthHeader(token))
        .expect(200);

      const userParticipant = response.body.data.participants.find(
        (p: any) => p.userId === user.id
      );

      const parsed = JSON.parse(userParticipant.configOverride);
      expect(parsed.avatarOverride).toBe('');
      // Frontend will check for empty string and fall back to user.avatarUrl
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent updates (last write wins)', async () => {
      // Using shared user
      const user = sharedUser;
      const token = sharedToken;

      const character = await createTestCharacter(user.id);
      const { conversation, userParticipantId } = await createTestConversationWithParticipants(
        user.id,
        { characterIds: [character.id], includeUser: true }
      );

      // First update
      await request(app)
        .patch(`/api/v1/conversations/${conversation.id}/participants/${userParticipantId!}`)
        .set(getAuthHeader(token))
        .send({
          configOverride: JSON.stringify({ instructions: 'First instructions' }),
        })
        .expect(200);

      // Second update (overwrites first)
      await request(app)
        .patch(`/api/v1/conversations/${conversation.id}/participants/${userParticipantId!}`)
        .set(getAuthHeader(token))
        .send({
          configOverride: JSON.stringify({ instructions: 'Second instructions' }),
        })
        .expect(200);

      // Verify second update persisted
      const response = await request(app)
        .get(`/api/v1/conversations/${conversation.id}`)
        .set(getAuthHeader(token))
        .expect(200);

      const userParticipant = response.body.data.participants.find(
        (p: any) => p.userId === user.id
      );

      const parsed = JSON.parse(userParticipant.configOverride);
      expect(parsed.instructions).toBe('Second instructions');
    });

    it('should handle very long user instructions (up to 1000 characters)', async () => {
      // Using shared user
      const user = sharedUser;
      const token = sharedToken;

      const character = await createTestCharacter(user.id);
      const { conversation, userParticipantId } = await createTestConversationWithParticipants(
        user.id,
        { characterIds: [character.id], includeUser: true }
      );

      const longInstructions = 'A'.repeat(1000);

      await request(app)
        .patch(`/api/v1/conversations/${conversation.id}/participants/${userParticipantId!}`)
        .set(getAuthHeader(token))
        .send({
          configOverride: JSON.stringify({ instructions: longInstructions }),
        })
        .expect(200);

      const response = await request(app)
        .get(`/api/v1/conversations/${conversation.id}`)
        .set(getAuthHeader(token))
        .expect(200);

      const userParticipant = response.body.data.participants.find(
        (p: any) => p.userId === user.id
      );

      const parsed = JSON.parse(userParticipant.configOverride);
      expect(parsed.instructions.length).toBe(1000);
    });

    it('should handle special characters in instructions', async () => {
      // Using shared user
      const user = sharedUser;
      const token = sharedToken;

      const character = await createTestCharacter(user.id);
      const { conversation, userParticipantId } = await createTestConversationWithParticipants(
        user.id,
        { characterIds: [character.id], includeUser: true }
      );

      const specialInstructions = 'I love "quotes" and \'apostrophes\' & <symbols>';

      await request(app)
        .patch(`/api/v1/conversations/${conversation.id}/participants/${userParticipantId!}`)
        .set(getAuthHeader(token))
        .send({
          configOverride: JSON.stringify({ instructions: specialInstructions }),
        })
        .expect(200);

      const response = await request(app)
        .get(`/api/v1/conversations/${conversation.id}`)
        .set(getAuthHeader(token))
        .expect(200);

      const userParticipant = response.body.data.participants.find(
        (p: any) => p.userId === user.id
      );

      const parsed = JSON.parse(userParticipant.configOverride);
      expect(parsed.instructions).toBe(specialInstructions);
    });

    it('should handle malformed JSON in configOverride', async () => {
      // Using shared user
      const user = sharedUser;
      const token = sharedToken;

      const character = await createTestCharacter(user.id);
      const { conversation, userParticipantId } = await createTestConversationWithParticipants(
        user.id,
        { characterIds: [character.id], includeUser: true }
      );

      // Send malformed JSON
      const malformedJson = '{"instructions": "missing closing bracket';

      // API should accept it (validation is on frontend)
      await request(app)
        .patch(`/api/v1/conversations/${conversation.id}/participants/${userParticipantId!}`)
        .set(getAuthHeader(token))
        .send({ configOverride: malformedJson })
        .expect(200);

      const response = await request(app)
        .get(`/api/v1/conversations/${conversation.id}`)
        .set(getAuthHeader(token))
        .expect(200);

      const userParticipant = response.body.data.participants.find(
        (p: any) => p.userId === user.id
      );

      // Backend stores as-is; parser will handle gracefully
      expect(userParticipant.configOverride).toBe(malformedJson);
    });
  });

  describe('representingCharacter Loading', () => {
    it('should load representingCharacter data when user has persona', async () => {
      // Using shared user
      const user = sharedUser;
      const token = sharedToken;

      const character = await createTestCharacter(user.id);
      const personaChar = await createTestCharacter(user.id, {
        firstName: 'Persona',
        gender: 'MALE',
        personality: 'Brave and noble',
      });

      const { conversation, userParticipantId } = await createTestConversationWithParticipants(
        user.id,
        { characterIds: [character.id], includeUser: true }
      );

      // Set persona
      await request(app)
        .patch(`/api/v1/conversations/${conversation.id}/participants/${userParticipantId!}`)
        .set(getAuthHeader(token))
        .send({ representingCharacterId: personaChar.id })
        .expect(200);

      // Fetch conversation
      const response = await request(app)
        .get(`/api/v1/conversations/${conversation.id}`)
        .set(getAuthHeader(token))
        .expect(200);

      const userParticipant = response.body.data.participants.find(
        (p: any) => p.userId === user.id
      );

      expect(userParticipant.representingCharacter).toBeDefined();
      expect(userParticipant.representingCharacter.firstName).toBe('Persona');
      expect(userParticipant.representingCharacter.gender).toBe('MALE');
      expect(userParticipant.representingCharacter.personality).toBe('Brave and noble');
      expect(userParticipant.representingCharacter.style).toBeDefined();
    });

    it('should return null representingCharacter when not set', async () => {
      // Using shared user
      const user = sharedUser;
      const token = sharedToken;

      const character = await createTestCharacter(user.id);
      const { conversation } = await createTestConversationWithParticipants(user.id, {
        characterIds: [character.id],
        includeUser: true,
      });

      const response = await request(app)
        .get(`/api/v1/conversations/${conversation.id}`)
        .set(getAuthHeader(token))
        .expect(200);

      const userParticipant = response.body.data.participants.find(
        (p: any) => p.userId === user.id
      );

      expect(userParticipant.representingCharacter).toBeNull();
      expect(userParticipant.representingCharacterId).toBeNull();
    });

    it('should clear representingCharacterId when set to null', async () => {
      // Using shared user
      const user = sharedUser;
      const token = sharedToken;

      const character = await createTestCharacter(user.id);
      const personaChar = await createTestCharacter(user.id);
      const { conversation, userParticipantId } = await createTestConversationWithParticipants(
        user.id,
        { characterIds: [character.id], includeUser: true }
      );

      // Set persona first
      await request(app)
        .patch(`/api/v1/conversations/${conversation.id}/participants/${userParticipantId!}`)
        .set(getAuthHeader(token))
        .send({ representingCharacterId: personaChar.id })
        .expect(200);

      // Clear persona
      await request(app)
        .patch(`/api/v1/conversations/${conversation.id}/participants/${userParticipantId!}`)
        .set(getAuthHeader(token))
        .send({ representingCharacterId: null })
        .expect(200);

      // Verify cleared
      const response = await request(app)
        .get(`/api/v1/conversations/${conversation.id}`)
        .set(getAuthHeader(token))
        .expect(200);

      const userParticipant = response.body.data.participants.find(
        (p: any) => p.userId === user.id
      );

      expect(userParticipant.representingCharacterId).toBeNull();
      expect(userParticipant.representingCharacter).toBeNull();
    });
  });
});
