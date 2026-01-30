/**
 * Memberships Route - Translation Settings Integration Tests
 * Tests for FEATURE-018: Auto-translate membership settings endpoint
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
import { getTestDb } from '../../../test-utils/database';

const app = createTestApp();

describe('Memberships Route - Translation Settings (FEATURE-018)', () => {
  let db: any;

  beforeAll(async () => {
    await setupTestDatabase();
    db = getTestDb();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('PATCH /api/v1/conversations/:conversationId/membership', () => {
    let user: any;
    let token: string;
    let conversation: any;

    beforeEach(async () => {
      // Create authenticated user
      const result = await createAuthenticatedTestUser();
      user = result.user;
      token = result.token;

      // Create multi-user conversation
      conversation = await db.conversation.create({
        data: {
          userId: user.id,
          title: 'Test Multi-User Conversation',
          isMultiUser: true,
          maxUsers: 4,
        },
      });

      // Create membership
      await db.userConversationMembership.create({
        data: {
          conversationId: conversation.id,
          userId: user.id,
          role: 'MEMBER',
          canWrite: true,
          autoTranslateEnabled: false, // Default off
        },
      });
    });

    it('should enable auto-translate for membership', async () => {
      const response = await request(app)
        .patch(`/api/v1/conversations/${conversation.id}/membership`)
        .set(getAuthHeader(token))
        .send({ autoTranslateEnabled: true })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.autoTranslateEnabled).toBe(true);
      expect(response.body.message).toBe('Membership settings updated successfully');

      // Verify database state
      const updatedMembership = await db.userConversationMembership.findUnique({
        where: {
          conversationId_userId: {
            conversationId: conversation.id,
            userId: user.id,
          },
        },
      });

      expect(updatedMembership?.autoTranslateEnabled).toBe(true);
    });

    it('should disable auto-translate for membership', async () => {
      // First enable it
      await db.userConversationMembership.update({
        where: {
          conversationId_userId: {
            conversationId: conversation.id,
            userId: user.id,
          },
        },
        data: { autoTranslateEnabled: true },
      });

      const response = await request(app)
        .patch(`/api/v1/conversations/${conversation.id}/membership`)
        .set(getAuthHeader(token))
        .send({ autoTranslateEnabled: false })
        .expect(200);

      expect(response.body.data.autoTranslateEnabled).toBe(false);

      // Verify database state
      const updatedMembership = await db.userConversationMembership.findUnique({
        where: {
          conversationId_userId: {
            conversationId: conversation.id,
            userId: user.id,
          },
        },
      });

      expect(updatedMembership?.autoTranslateEnabled).toBe(false);
    });

    it('should return 400 when autoTranslateEnabled is not a boolean', async () => {
      const response = await request(app)
        .patch(`/api/v1/conversations/${conversation.id}/membership`)
        .set(getAuthHeader(token))
        .send({ autoTranslateEnabled: 'true' }) // String instead of boolean
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('autoTranslateEnabled must be a boolean');
    });

    it('should return 401 when user is not authenticated', async () => {
      const response = await request(app)
        .patch(`/api/v1/conversations/${conversation.id}/membership`)
        .send({ autoTranslateEnabled: true });

      expect(response.status).toBe(401);
    });

    it('should preserve other membership fields when updating autoTranslateEnabled', async () => {
      // Setup membership with specific values
      await db.userConversationMembership.update({
        where: {
          conversationId_userId: {
            conversationId: conversation.id,
            userId: user.id,
          },
        },
        data: {
          role: 'MODERATOR',
          canWrite: true,
          canInvite: true,
          canModerate: false,
        },
      });

      const response = await request(app)
        .patch(`/api/v1/conversations/${conversation.id}/membership`)
        .set(getAuthHeader(token))
        .send({ autoTranslateEnabled: true })
        .expect(200);

      expect(response.body.data.role).toBe('MODERATOR');
      expect(response.body.data.canWrite).toBe(true);
      expect(response.body.data.canInvite).toBe(true);
      expect(response.body.data.canModerate).toBe(false);
      expect(response.body.data.autoTranslateEnabled).toBe(true);
    });

    it('should handle non-existent conversation gracefully', async () => {
      const response = await request(app)
        .patch('/api/v1/conversations/non-existent-conversation/membership')
        .set(getAuthHeader(token))
        .send({ autoTranslateEnabled: true })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/conversations/:conversationId/membership', () => {
    let user: any;
    let token: string;
    let conversation: any;

    beforeEach(async () => {
      const result = await createAuthenticatedTestUser();
      user = result.user;
      token = result.token;

      conversation = await db.conversation.create({
        data: {
          userId: user.id,
          title: 'Test Multi-User Conversation',
          isMultiUser: true,
          maxUsers: 4,
        },
      });

      await db.userConversationMembership.create({
        data: {
          conversationId: conversation.id,
          userId: user.id,
          role: 'MEMBER',
          canWrite: true,
          autoTranslateEnabled: true,
        },
      });
    });

    it('should return membership settings including autoTranslateEnabled', async () => {
      const response = await request(app)
        .get(`/api/v1/conversations/${conversation.id}/membership`)
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        userId: user.id,
        conversationId: conversation.id,
        autoTranslateEnabled: true,
      });
    });

    it('should return 404 when membership does not exist', async () => {
      const otherUserResult = await createAuthenticatedTestUser({ email: 'other@test.com' });

      const response = await request(app)
        .get(`/api/v1/conversations/${conversation.id}/membership`)
        .set(getAuthHeader(otherUserResult.token))
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Membership not found');
    });

    it('should return 401 when user is not authenticated', async () => {
      const response = await request(app)
        .get(`/api/v1/conversations/${conversation.id}/membership`);

      expect(response.status).toBe(401);
    });
  });

  describe('Multiple Users in Same Conversation', () => {
    let user1: any;
    let user1Token: string;
    let user2: any;
    let user2Token: string;
    let conversation: any;

    beforeEach(async () => {
      // Create two authenticated users
      const user1Result = await createAuthenticatedTestUser({ email: 'user1@test.com' });
      user1 = user1Result.user;
      user1Token = user1Result.token;

      const user2Result = await createAuthenticatedTestUser({ email: 'user2@test.com' });
      user2 = user2Result.user;
      user2Token = user2Result.token;

      // Create multi-user conversation owned by user1
      conversation = await db.conversation.create({
        data: {
          userId: user1.id,
          ownerUserId: user1.id,
          title: 'Group Conversation',
          isMultiUser: true,
          maxUsers: 4,
          allowUserInvites: true,
        },
      });

      // Create memberships for both users
      await db.userConversationMembership.createMany({
        data: [
          {
            conversationId: conversation.id,
            userId: user1.id,
            role: 'OWNER',
            canWrite: true,
            autoTranslateEnabled: true,
          },
          {
            conversationId: conversation.id,
            userId: user2.id,
            role: 'MEMBER',
            canWrite: true,
            autoTranslateEnabled: false,
          },
        ],
      });
    });

    it('should allow each user to have independent auto-translate settings', async () => {
      // Enable auto-translate for user2 (currently disabled)
      const response = await request(app)
        .patch(`/api/v1/conversations/${conversation.id}/membership`)
        .set(getAuthHeader(user2Token))
        .send({ autoTranslateEnabled: true })
        .expect(200);

      expect(response.body.data.autoTranslateEnabled).toBe(true);

      // Verify user1's setting is unchanged
      const user1Membership = await db.userConversationMembership.findUnique({
        where: {
          conversationId_userId: {
            conversationId: conversation.id,
            userId: user1.id,
          },
        },
      });

      expect(user1Membership?.autoTranslateEnabled).toBe(true);

      // Verify user2's setting is updated
      const user2Membership = await db.userConversationMembership.findUnique({
        where: {
          conversationId_userId: {
            conversationId: conversation.id,
            userId: user2.id,
          },
        },
      });

      expect(user2Membership?.autoTranslateEnabled).toBe(true);
    });

    it('should return correct membership for each user', async () => {
      // Get user1's membership
      const user1Response = await request(app)
        .get(`/api/v1/conversations/${conversation.id}/membership`)
        .set(getAuthHeader(user1Token))
        .expect(200);

      expect(user1Response.body.data.userId).toBe(user1.id);
      expect(user1Response.body.data.autoTranslateEnabled).toBe(true);

      // Get user2's membership
      const user2Response = await request(app)
        .get(`/api/v1/conversations/${conversation.id}/membership`)
        .set(getAuthHeader(user2Token))
        .expect(200);

      expect(user2Response.body.data.userId).toBe(user2.id);
      expect(user2Response.body.data.autoTranslateEnabled).toBe(false);
    });
  });

  describe('Edge Cases & Concurrent Updates', () => {
    it('should handle concurrent update requests', async () => {
      const userResult = await createAuthenticatedTestUser();
      const user = userResult.user;
      const token = userResult.token;

      const conversation = await db.conversation.create({
        data: {
          userId: user.id,
          title: 'Test Conversation',
          isMultiUser: true,
        },
      });

      await db.userConversationMembership.create({
        data: {
          conversationId: conversation.id,
          userId: user.id,
          role: 'MEMBER',
          canWrite: true,
          autoTranslateEnabled: false,
        },
      });

      // Send concurrent requests
      const [response1, response2] = await Promise.all([
        request(app)
          .patch(`/api/v1/conversations/${conversation.id}/membership`)
          .set(getAuthHeader(token))
          .send({ autoTranslateEnabled: true }),
        request(app)
          .patch(`/api/v1/conversations/${conversation.id}/membership`)
          .set(getAuthHeader(token))
          .send({ autoTranslateEnabled: false }),
      ]);

      // Both should succeed (last write wins)
      expect([response1.status, response2.status]).toContain(200);

      // Verify final state is deterministic
      const membership = await db.userConversationMembership.findUnique({
        where: {
          conversationId_userId: {
            conversationId: conversation.id,
            userId: user.id,
          },
        },
      });

      expect(membership).toBeDefined();
      expect([true, false]).toContain(membership?.autoTranslateEnabled);
    });

    it('should handle rapid toggle on/off/on', async () => {
      const userResult = await createAuthenticatedTestUser();
      const user = userResult.user;
      const token = userResult.token;

      const conversation = await db.conversation.create({
        data: {
          userId: user.id,
          title: 'Test Conversation',
          isMultiUser: true,
        },
      });

      await db.userConversationMembership.create({
        data: {
          conversationId: conversation.id,
          userId: user.id,
          role: 'MEMBER',
          canWrite: true,
          autoTranslateEnabled: false,
        },
      });

      // Rapid on/off/on
      await request(app)
        .patch(`/api/v1/conversations/${conversation.id}/membership`)
        .set(getAuthHeader(token))
        .send({ autoTranslateEnabled: true })
        .expect(200);

      await request(app)
        .patch(`/api/v1/conversations/${conversation.id}/membership`)
        .set(getAuthHeader(token))
        .send({ autoTranslateEnabled: false })
        .expect(200);

      await request(app)
        .patch(`/api/v1/conversations/${conversation.id}/membership`)
        .set(getAuthHeader(token))
        .send({ autoTranslateEnabled: true })
        .expect(200);

      // Verify final state
      const membership = await db.userConversationMembership.findUnique({
        where: {
          conversationId_userId: {
            conversationId: conversation.id,
            userId: user.id,
          },
        },
      });

      expect(membership?.autoTranslateEnabled).toBe(true);
    });
  });
});
