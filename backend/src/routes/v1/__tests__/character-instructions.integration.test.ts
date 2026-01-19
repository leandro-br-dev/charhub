/**
 * Character-Specific Instructions Integration Tests
 * Tests for character instructions, participant data loading, and configOverride
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

const app = createTestApp();

// Increase timeout for all tests in this suite (DB operations can be slow)
jest.setTimeout(60000);

describe('Character-Specific Instructions Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('GET /api/v1/conversations/:id', () => {
    it('should include style field in actingCharacter data', async () => {
      const { user, token } = await createAuthenticatedTestUser();

      // Create character with style
      const character = await createTestCharacter(user.id, {
        firstName: 'StyledCharacter',
        style: 'REALISTIC',
        gender: 'FEMALE',
      });

      // Create conversation with character
      const { conversation } = await createTestConversationWithParticipants(user.id, {
        characterIds: [character.id],
        includeUser: true,
      });

      // Fetch conversation
      const response = await request(app)
        .get(`/api/v1/conversations/${conversation.id}`)
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();

      // Find character participant
      const characterParticipant = response.body.data.participants.find(
        (p: any) => p.actingCharacterId === character.id
      );

      expect(characterParticipant).toBeDefined();
      expect(characterParticipant.actingCharacter).toBeDefined();
      expect(characterParticipant.actingCharacter.style).toBe('REALISTIC');
    });

    it('should include all character fields (style, gender, personality, history)', async () => {
      const { user, token } = await createAuthenticatedTestUser();

      // Create character with all fields
      const character = await createTestCharacter(user.id, {
        firstName: 'CompleteCharacter',
        style: 'CARTOON',
        gender: 'MALE',
        personality: 'Adventurous and curious',
        physicalCharacteristics: 'Tall with dark hair',
        history: 'Once lived in a distant land',
      });

      // Create conversation
      const { conversation } = await createTestConversationWithParticipants(user.id, {
        characterIds: [character.id],
      });

      // Fetch conversation
      const response = await request(app)
        .get(`/api/v1/conversations/${conversation.id}`)
        .set(getAuthHeader(token))
        .expect(200);

      const characterParticipant = response.body.data.participants.find(
        (p: any) => p.actingCharacterId === character.id
      );

      expect(characterParticipant.actingCharacter.style).toBe('CARTOON');
      expect(characterParticipant.actingCharacter.gender).toBe('MALE');
      expect(characterParticipant.actingCharacter.personality).toBe('Adventurous and curious');
      expect(characterParticipant.actingCharacter.physicalCharacteristics).toBe('Tall with dark hair');
      expect(characterParticipant.actingCharacter.history).toBe('Once lived in a distant land');
    });

    it('should handle null style gracefully', async () => {
      const { user, token } = await createAuthenticatedTestUser();

      // Create character without style
      const character = await createTestCharacter(user.id, {
        style: null,
      });

      const { conversation } = await createTestConversationWithParticipants(user.id, {
        characterIds: [character.id],
      });

      const response = await request(app)
        .get(`/api/v1/conversations/${conversation.id}`)
        .set(getAuthHeader(token))
        .expect(200);

      const characterParticipant = response.body.data.participants.find(
        (p: any) => p.actingCharacterId === character.id
      );

      expect(characterParticipant.actingCharacter.style).toBeNull();
    });
  });

  describe('PATCH /api/v1/conversations/:id/participants/:participantId', () => {
    it('should update character configOverride with plain text instructions', async () => {
      const { user, token } = await createAuthenticatedTestUser();

      const character = await createTestCharacter(user.id);
      const { conversation, characterParticipants } = await createTestConversationWithParticipants(
        user.id,
        { characterIds: [character.id] }
      );
      const participantId = characterParticipants[0].id;

      const instructions = 'Be more playful and teasing in this conversation';

      const response = await request(app)
        .patch(`/api/v1/conversations/${conversation.id}/participants/${participantId}`)
        .set(getAuthHeader(token))
        .send({ configOverride: instructions })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify the update persisted
      const getResponse = await request(app)
        .get(`/api/v1/conversations/${conversation.id}`)
        .set(getAuthHeader(token))
        .expect(200);

      const updatedParticipant = getResponse.body.data.participants.find(
        (p: any) => p.id === participantId
      );

      expect(updatedParticipant.configOverride).toBe(instructions);
    });

    it('should clear configOverride when set to null', async () => {
      const { user, token } = await createAuthenticatedTestUser();

      const character = await createTestCharacter(user.id);
      const { conversation, characterParticipants } = await createTestConversationWithParticipants(
        user.id,
        { characterIds: [character.id] }
      );
      const participantId = characterParticipants[0].id;

      // Set instructions first
      await request(app)
        .patch(`/api/v1/conversations/${conversation.id}/participants/${participantId}`)
        .set(getAuthHeader(token))
        .send({ configOverride: 'Some instructions' })
        .expect(200);

      // Clear instructions
      await request(app)
        .patch(`/api/v1/conversations/${conversation.id}/participants/${participantId}`)
        .set(getAuthHeader(token))
        .send({ configOverride: null })
        .expect(200);

      // Verify cleared
      const getResponse = await request(app)
        .get(`/api/v1/conversations/${conversation.id}`)
        .set(getAuthHeader(token))
        .expect(200);

      const updatedParticipant = getResponse.body.data.participants.find(
        (p: any) => p.id === participantId
      );

      expect(updatedParticipant.configOverride).toBeNull();
    });

    it('should reject updates from non-owners', async () => {
      const { user: owner } = await createAuthenticatedTestUser();
      const { token: otherToken } = await createAuthenticatedTestUser();

      const character = await createTestCharacter(owner.id);
      const { conversation, characterParticipants } = await createTestConversationWithParticipants(
        owner.id,
        { characterIds: [character.id] }
      );
      const participantId = characterParticipants[0].id;

      // Try to update as different user
      const response = await request(app)
        .patch(`/api/v1/conversations/${conversation.id}/participants/${participantId}`)
        .set(getAuthHeader(otherToken))
        .send({ configOverride: 'Malicious instructions' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should handle very long instructions (up to 2000 characters)', async () => {
      const { user, token } = await createAuthenticatedTestUser();

      const character = await createTestCharacter(user.id);
      const { conversation, characterParticipants } = await createTestConversationWithParticipants(
        user.id,
        { characterIds: [character.id] }
      );
      const participantId = characterParticipants[0].id;

      const longInstructions = 'A'.repeat(2000);

      await request(app)
        .patch(`/api/v1/conversations/${conversation.id}/participants/${participantId}`)
        .set(getAuthHeader(token))
        .send({ configOverride: longInstructions })
        .expect(200);

      // Verify it was saved
      const getResponse = await request(app)
        .get(`/api/v1/conversations/${conversation.id}`)
        .set(getAuthHeader(token))
        .expect(200);

      const updatedParticipant = getResponse.body.data.participants.find(
        (p: any) => p.id === participantId
      );

      expect(updatedParticipant.configOverride).toBe(longInstructions);
      expect(updatedParticipant.configOverride.length).toBe(2000);
    });
  });

  describe('Character Instruction Data Propagation', () => {
    it('should include character avatar in participant data', async () => {
      const { user, token } = await createAuthenticatedTestUser();

      const character = await createTestCharacter(user.id);
      const { conversation } = await createTestConversationWithParticipants(user.id, {
        characterIds: [character.id],
      });

      const response = await request(app)
        .get(`/api/v1/conversations/${conversation.id}`)
        .set(getAuthHeader(token))
        .expect(200);

      const characterParticipant = response.body.data.participants.find(
        (p: any) => p.actingCharacterId === character.id
      );

      expect(characterParticipant.actingCharacter.images).toBeDefined();
      expect(characterParticipant.actingCharacter.images.length).toBeGreaterThan(0);
      expect(characterParticipant.actingCharacter.images[0].url).toContain('https://');
    });

    it('should load representingCharacter for persona-based participants', async () => {
      const { user, token } = await createAuthenticatedTestUser();

      // Create two characters: one for acting, one for representing
      const actingChar = await createTestCharacter(user.id, {
        firstName: 'Assistant',
      });
      const representingChar = await createTestCharacter(user.id, {
        firstName: 'PersonaChar',
      });

      // Create conversation with acting character
      const { conversation, characterParticipants } = await createTestConversationWithParticipants(
        user.id,
        { characterIds: [actingChar.id] }
      );

      // Update to set representingCharacter (persona)
      await request(app)
        .patch(`/api/v1/conversations/${conversation.id}/participants/${characterParticipants[0].id}`)
        .set(getAuthHeader(token))
        .send({ representingCharacterId: representingChar.id })
        .expect(200);

      // Fetch conversation
      const response = await request(app)
        .get(`/api/v1/conversations/${conversation.id}`)
        .set(getAuthHeader(token))
        .expect(200);

      const participant = response.body.data.participants.find(
        (p: any) => p.id === characterParticipants[0].id
      );

      expect(participant.representingCharacter).toBeDefined();
      expect(participant.representingCharacter.firstName).toBe('PersonaChar');
      expect(participant.representingCharacter.style).toBeDefined();
    });
  });
});
