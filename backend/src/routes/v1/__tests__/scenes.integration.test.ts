/**
 * Scenes API Integration Tests
 * Tests scenes endpoints with authentication, authorization, and validation
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
  createTestScene,
  createTestSceneArea,
  createTestAsset,
  createTestSceneAreaConnection,
  linkTestAssetToArea,
} from '../../../test-utils/factories';
import { getTestDb } from '../../../test-utils/database';
import { Visibility } from '../../../generated/prisma';

const app = createTestApp();

describe('Scenes API Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  // ========================================================================
  // SCENE CRUD ENDPOINTS
  // ========================================================================

  describe('POST /api/v1/scenes', () => {
    it('should create a scene with authentication', async () => {
      const { user, token } = await createAuthenticatedTestUser();

      const response = await request(app)
        .post('/api/v1/scenes')
        .set(getAuthHeader(token))
        .send({
          name: 'Test Scene',
          description: 'A test scene description',
          genre: 'Fantasy',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.name).toBe('Test Scene');
      expect(response.body.data.authorId).toBe(user.id);
    });

    it('should create scene with initial areas', async () => {
      const { token } = await createAuthenticatedTestUser();

      const response = await request(app)
        .post('/api/v1/scenes')
        .set(getAuthHeader(token))
        .send({
          name: 'Test Scene',
          description: 'A test scene',
          initialAreas: [
            { name: 'Area 1', description: 'First area', displayOrder: 0 },
            { name: 'Area 2', description: 'Second area', displayOrder: 1 },
          ],
        })
        .expect(201);

      expect(response.body.data.areas).toHaveLength(2);
      expect(response.body.data.areas[0].name).toBe('Area 1');
      expect(response.body.data.areas[1].name).toBe('Area 2');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .post('/api/v1/scenes')
        .send({
          name: 'Test Scene',
          description: 'A test scene',
        })
        .expect(401);
    });

    it('should return 400 for missing required fields', async () => {
      const { token } = await createAuthenticatedTestUser();

      const response = await request(app)
        .post('/api/v1/scenes')
        .set(getAuthHeader(token))
        .send({
          description: 'Missing name',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/v1/scenes', () => {
    it('should list user scenes when authenticated', async () => {
      const { user, token } = await createAuthenticatedTestUser();
      await createTestScene(user.id, { name: 'Scene 1' });
      await createTestScene(user.id, { name: 'Scene 2' });

      const response = await request(app)
        .get('/api/v1/scenes')
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should list public scenes when not authenticated', async () => {
      const user = await createAuthenticatedTestUser().then(u => u.user);
      await createTestScene(user.id, { visibility: Visibility.PUBLIC });
      await createTestScene(user.id, { visibility: Visibility.PRIVATE });

      const response = await request(app)
        .get('/api/v1/scenes')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data.every((s: any) => s.visibility === Visibility.PUBLIC)).toBe(true);
    });

    it('should filter by authorId', async () => {
      const { user: user1, token } = await createAuthenticatedTestUser();
      const user2 = await createAuthenticatedTestUser().then(u => u.user);
      await createTestScene(user1.id, { name: 'User1 Scene' });
      await createTestScene(user2.id, { name: 'User2 Scene' });

      const response = await request(app)
        .get(`/api/v1/scenes?authorId=${user1.id}`)
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('User1 Scene');
    });

    it('should filter by genre', async () => {
      const { user, token } = await createAuthenticatedTestUser();
      await createTestScene(user.id, { genre: 'Fantasy' });
      await createTestScene(user.id, { genre: 'Sci-Fi' });

      const response = await request(app)
        .get('/api/v1/scenes?genre=Fantasy')
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.data.every((s: any) => s.genre === 'Fantasy')).toBe(true);
    });

    it('should filter by mood', async () => {
      const { user, token } = await createAuthenticatedTestUser();
      await createTestScene(user.id, { mood: 'Dark' });
      await createTestScene(user.id, { mood: 'Light' });

      const response = await request(app)
        .get('/api/v1/scenes?mood=Dark')
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.data.every((s: any) => s.mood === 'Dark')).toBe(true);
    });

    it('should filter by era', async () => {
      const { user, token } = await createAuthenticatedTestUser();
      await createTestScene(user.id, { era: 'Medieval' });
      await createTestScene(user.id, { era: 'Future' });

      const response = await request(app)
        .get('/api/v1/scenes?era=Medieval')
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.data.every((s: any) => s.era === 'Medieval')).toBe(true);
    });

    it('should search by query', async () => {
      const { user, token } = await createAuthenticatedTestUser();
      await createTestScene(user.id, { name: 'Dragon Cave' });
      await createTestScene(user.id, { name: 'Forest Path' });

      const response = await request(app)
        .get('/api/v1/scenes?search=dragon')
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.data.some((s: any) => s.name.toLowerCase().includes('dragon'))).toBe(true);
    });

    it('should support pagination', async () => {
      const { user, token } = await createAuthenticatedTestUser();
      for (let i = 0; i < 5; i++) {
        await createTestScene(user.id);
      }

      const response = await request(app)
        .get('/api/v1/scenes?skip=0&limit=2')
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.data).toHaveLength(2);
    });
  });

  describe('GET /api/v1/scenes/favorites', () => {
    it('should return user favorite scenes', async () => {
      const { user, token } = await createAuthenticatedTestUser();
      const scene1 = await createTestScene(user.id);
      const scene2 = await createTestScene(user.id);

      const db = getTestDb();
      await db.sceneFavorite.create({
        data: { userId: user.id, sceneId: scene1.id },
      });
      await db.sceneFavorite.create({
        data: { userId: user.id, sceneId: scene2.id },
      });

      const response = await request(app)
        .get('/api/v1/scenes/favorites')
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/v1/scenes/favorites')
        .expect(401);
    });
  });

  describe('POST /api/v1/scenes/:id/favorite', () => {
    it('should add scene to favorites', async () => {
      const { user, token } = await createAuthenticatedTestUser();
      const scene = await createTestScene(user.id);

      const response = await request(app)
        .post(`/api/v1/scenes/${scene.id}/favorite`)
        .set(getAuthHeader(token))
        .send({ isFavorite: true })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isFavorite).toBe(true);
    });

    it('should remove scene from favorites', async () => {
      const { user, token } = await createAuthenticatedTestUser();
      const scene = await createTestScene(user.id);

      // Add to favorites first
      const db = getTestDb();
      await db.sceneFavorite.create({
        data: { userId: user.id, sceneId: scene.id },
      });

      const response = await request(app)
        .post(`/api/v1/scenes/${scene.id}/favorite`)
        .set(getAuthHeader(token))
        .send({ isFavorite: false })
        .expect(200);

      expect(response.body.data.isFavorite).toBe(false);
    });

    it('should return 400 for invalid isFavorite value', async () => {
      const { user, token } = await createAuthenticatedTestUser();
      const scene = await createTestScene(user.id);

      await request(app)
        .post(`/api/v1/scenes/${scene.id}/favorite`)
        .set(getAuthHeader(token))
        .send({ isFavorite: 'yes' })
        .expect(400);
    });
  });

  describe('GET /api/v1/scenes/:id/stats', () => {
    it('should return scene statistics', async () => {
      const { user, token } = await createAuthenticatedTestUser();
      const scene = await createTestScene(user.id);
      await createTestSceneArea(scene.id);
      await createTestSceneArea(scene.id);

      const response = await request(app)
        .get(`/api/v1/scenes/${scene.id}/stats`)
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(scene.id);
      expect(response.body.data.areaCount).toBe(2);
    });

    it('should include favorite status for authenticated user', async () => {
      const { user, token } = await createAuthenticatedTestUser();
      const scene = await createTestScene(user.id);

      const db = getTestDb();
      await db.sceneFavorite.create({
        data: { userId: user.id, sceneId: scene.id },
      });

      const response = await request(app)
        .get(`/api/v1/scenes/${scene.id}/stats`)
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.data.isFavoritedByUser).toBe(true);
    });
  });

  describe('GET /api/v1/scenes/:id', () => {
    it('should get scene by ID', async () => {
      const { user, token } = await createAuthenticatedTestUser();
      const scene = await createTestScene(user.id, { name: 'Test Scene' });

      const response = await request(app)
        .get(`/api/v1/scenes/${scene.id}`)
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(scene.id);
      expect(response.body.data.name).toBe('Test Scene');
    });

    it('should return 404 for non-existent scene', async () => {
      const { token } = await createAuthenticatedTestUser();

      await request(app)
        .get('/api/v1/scenes/non-existent-id')
        .set(getAuthHeader(token))
        .expect(404);
    });

    it('should return 403 for private scene owned by another user', async () => {
      const user1 = await createAuthenticatedTestUser().then(u => u.user);
      const { token: token2 } = await createAuthenticatedTestUser();
      const scene = await createTestScene(user1.id, { visibility: Visibility.PRIVATE });

      await request(app)
        .get(`/api/v1/scenes/${scene.id}`)
        .set(getAuthHeader(token2))
        .expect(403);
    });
  });

  describe('PUT /api/v1/scenes/:id', () => {
    it('should update scene owned by user', async () => {
      const { user, token } = await createAuthenticatedTestUser();
      const scene = await createTestScene(user.id, { name: 'Old Name' });

      const response = await request(app)
        .put(`/api/v1/scenes/${scene.id}`)
        .set(getAuthHeader(token))
        .send({ name: 'New Name' })
        .expect(200);

      expect(response.body.data.name).toBe('New Name');
    });

    it('should return 403 when updating another users scene', async () => {
      const user1 = await createAuthenticatedTestUser().then(u => u.user);
      const { token: token2 } = await createAuthenticatedTestUser();
      const scene = await createTestScene(user1.id);

      await request(app)
        .put(`/api/v1/scenes/${scene.id}`)
        .set(getAuthHeader(token2))
        .send({ name: 'Hacked' })
        .expect(403);
    });

    it('should return 401 without authentication', async () => {
      const user = await createAuthenticatedTestUser().then(u => u.user);
      const scene = await createTestScene(user.id);

      await request(app)
        .put(`/api/v1/scenes/${scene.id}`)
        .send({ name: 'No Auth' })
        .expect(401);
    });
  });

  describe('DELETE /api/v1/scenes/:id', () => {
    it('should delete scene owned by user', async () => {
      const { user, token } = await createAuthenticatedTestUser();
      const scene = await createTestScene(user.id);

      await request(app)
        .delete(`/api/v1/scenes/${scene.id}`)
        .set(getAuthHeader(token))
        .expect(200);

      const db = getTestDb();
      const count = await db.scene.count({ where: { id: scene.id } });
      expect(count).toBe(0);
    });

    it('should return 403 when deleting another users scene', async () => {
      const user1 = await createAuthenticatedTestUser().then(u => u.user);
      const { token: token2 } = await createAuthenticatedTestUser();
      const scene = await createTestScene(user1.id);

      await request(app)
        .delete(`/api/v1/scenes/${scene.id}`)
        .set(getAuthHeader(token2))
        .expect(403);
    });

    it('should return 401 without authentication', async () => {
      const user = await createAuthenticatedTestUser().then(u => u.user);
      const scene = await createTestScene(user.id);

      await request(app)
        .delete(`/api/v1/scenes/${scene.id}`)
        .expect(401);
    });
  });

  describe('GET /api/v1/scenes/:id/map', () => {
    it('should return full scene map data', async () => {
      const { user, token } = await createAuthenticatedTestUser();
      const scene = await createTestScene(user.id);
      const area1 = await createTestSceneArea(scene.id, { name: 'Area 1' });
      const area2 = await createTestSceneArea(scene.id, { name: 'Area 2' });
      const asset = await createTestAsset(user.id);
      await linkTestAssetToArea(area1.id, asset.id);
      await createTestSceneAreaConnection(area1.id, area2.id);

      const response = await request(app)
        .get(`/api/v1/scenes/${scene.id}/map`)
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.scene).toBeDefined();
      expect(response.body.data.areas).toHaveLength(2);
      expect(response.body.data.areas[0].assets).toBeDefined();
      expect(response.body.data.areas[0].connections).toBeDefined();
    });

    it('should return 403 for private scene owned by another user', async () => {
      const user1 = await createAuthenticatedTestUser().then(u => u.user);
      const { token: token2 } = await createAuthenticatedTestUser();
      const scene = await createTestScene(user1.id, { visibility: Visibility.PRIVATE });

      await request(app)
        .get(`/api/v1/scenes/${scene.id}/map`)
        .set(getAuthHeader(token2))
        .expect(403);
    });
  });

  // ========================================================================
  // AREA MANAGEMENT ENDPOINTS
  // ========================================================================

  describe('POST /api/v1/scenes/:id/areas', () => {
    it('should add area to users scene', async () => {
      const { user, token } = await createAuthenticatedTestUser();
      const scene = await createTestScene(user.id);

      const response = await request(app)
        .post(`/api/v1/scenes/${scene.id}/areas`)
        .set(getAuthHeader(token))
        .send({
          name: 'New Area',
          description: 'A new area',
          displayOrder: 0,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('New Area');
      expect(response.body.data.sceneId).toBe(scene.id);
    });

    it('should return 403 when adding area to another users scene', async () => {
      const user1 = await createAuthenticatedTestUser().then(u => u.user);
      const { token: token2 } = await createAuthenticatedTestUser();
      const scene = await createTestScene(user1.id);

      await request(app)
        .post(`/api/v1/scenes/${scene.id}/areas`)
        .set(getAuthHeader(token2))
        .send({
          name: 'Unauthorized Area',
          description: 'Should fail',
        })
        .expect(403);
    });

    it('should return 400 for missing required fields', async () => {
      const { user, token } = await createAuthenticatedTestUser();
      const scene = await createTestScene(user.id);

      await request(app)
        .post(`/api/v1/scenes/${scene.id}/areas`)
        .set(getAuthHeader(token))
        .send({ description: 'Missing name' })
        .expect(400);
    });
  });

  describe('GET /api/v1/scenes/areas/:areaId', () => {
    it('should get area details', async () => {
      const { user, token } = await createAuthenticatedTestUser();
      const scene = await createTestScene(user.id);
      const area = await createTestSceneArea(scene.id, { name: 'Test Area' });

      const response = await request(app)
        .get(`/api/v1/scenes/areas/${area.id}`)
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(area.id);
      expect(response.body.data.name).toBe('Test Area');
    });

    it('should return 404 for non-existent area', async () => {
      const { token } = await createAuthenticatedTestUser();

      await request(app)
        .get('/api/v1/scenes/areas/non-existent-id')
        .set(getAuthHeader(token))
        .expect(404);
    });

    it('should return 403 for area in private scene owned by another user', async () => {
      const user1 = await createAuthenticatedTestUser().then(u => u.user);
      const { token: token2 } = await createAuthenticatedTestUser();
      const scene = await createTestScene(user1.id, { visibility: Visibility.PRIVATE });
      const area = await createTestSceneArea(scene.id);

      await request(app)
        .get(`/api/v1/scenes/areas/${area.id}`)
        .set(getAuthHeader(token2))
        .expect(403);
    });
  });

  describe('PUT /api/v1/scenes/areas/:areaId', () => {
    it('should update area in users scene', async () => {
      const { user, token } = await createAuthenticatedTestUser();
      const scene = await createTestScene(user.id);
      const area = await createTestSceneArea(scene.id, { name: 'Old Name' });

      const response = await request(app)
        .put(`/api/v1/scenes/areas/${area.id}`)
        .set(getAuthHeader(token))
        .send({ name: 'New Name' })
        .expect(200);

      expect(response.body.data.name).toBe('New Name');
    });

    it('should return 403 when updating area in another users scene', async () => {
      const user1 = await createAuthenticatedTestUser().then(u => u.user);
      const { token: token2 } = await createAuthenticatedTestUser();
      const scene = await createTestScene(user1.id);
      const area = await createTestSceneArea(scene.id);

      await request(app)
        .put(`/api/v1/scenes/areas/${area.id}`)
        .set(getAuthHeader(token2))
        .send({ name: 'Hacked' })
        .expect(403);
    });
  });

  describe('DELETE /api/v1/scenes/areas/:areaId', () => {
    it('should remove area from users scene', async () => {
      const { user, token } = await createAuthenticatedTestUser();
      const scene = await createTestScene(user.id);
      const area = await createTestSceneArea(scene.id);

      await request(app)
        .delete(`/api/v1/scenes/areas/${area.id}`)
        .set(getAuthHeader(token))
        .expect(200);

      const db = getTestDb();
      const count = await db.sceneArea.count({ where: { id: area.id } });
      expect(count).toBe(0);
    });

    it('should return 403 when removing area from another users scene', async () => {
      const user1 = await createAuthenticatedTestUser().then(u => u.user);
      const { token: token2 } = await createAuthenticatedTestUser();
      const scene = await createTestScene(user1.id);
      const area = await createTestSceneArea(scene.id);

      await request(app)
        .delete(`/api/v1/scenes/areas/${area.id}`)
        .set(getAuthHeader(token2))
        .expect(403);
    });
  });

  describe('GET /api/v1/scenes/:id/areas', () => {
    it('should list all areas for a scene', async () => {
      const { user, token } = await createAuthenticatedTestUser();
      const scene = await createTestScene(user.id);
      await createTestSceneArea(scene.id, { name: 'Area 1', displayOrder: 0 });
      await createTestSceneArea(scene.id, { name: 'Area 2', displayOrder: 1 });

      const response = await request(app)
        .get(`/api/v1/scenes/${scene.id}/areas`)
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should return 403 for private scene owned by another user', async () => {
      const user1 = await createAuthenticatedTestUser().then(u => u.user);
      const { token: token2 } = await createAuthenticatedTestUser();
      const scene = await createTestScene(user1.id, { visibility: Visibility.PRIVATE });

      await request(app)
        .get(`/api/v1/scenes/${scene.id}/areas`)
        .set(getAuthHeader(token2))
        .expect(403);
    });
  });

  // ========================================================================
  // ASSET-AREA LINKING ENDPOINTS
  // ========================================================================

  describe('POST /api/v1/scenes/areas/:areaId/assets', () => {
    it('should place asset in area in users scene', async () => {
      const { user, token } = await createAuthenticatedTestUser();
      const scene = await createTestScene(user.id);
      const area = await createTestSceneArea(scene.id);
      const asset = await createTestAsset(user.id);

      const response = await request(app)
        .post(`/api/v1/scenes/areas/${area.id}/assets`)
        .set(getAuthHeader(token))
        .send({
          assetId: asset.id,
          position: 'on the table',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.assetId).toBe(asset.id);
      expect(response.body.data.position).toBe('on the table');
    });

    it('should return 403 when adding asset to area in another users scene', async () => {
      const user1 = await createAuthenticatedTestUser().then(u => u.user);
      const { token: token2 } = await createAuthenticatedTestUser();
      const scene = await createTestScene(user1.id);
      const area = await createTestSceneArea(scene.id);
      const asset = await createTestAsset(user1.id);

      await request(app)
        .post(`/api/v1/scenes/areas/${area.id}/assets`)
        .set(getAuthHeader(token2))
        .send({ assetId: asset.id })
        .expect(403);
    });

    it('should return 400 for missing assetId', async () => {
      const { user, token } = await createAuthenticatedTestUser();
      const scene = await createTestScene(user.id);
      const area = await createTestSceneArea(scene.id);

      await request(app)
        .post(`/api/v1/scenes/areas/${area.id}/assets`)
        .set(getAuthHeader(token))
        .send({ position: 'on table' })
        .expect(400);
    });
  });

  describe('GET /api/v1/scenes/areas/:areaId/assets', () => {
    it('should get area assets', async () => {
      const { user, token } = await createAuthenticatedTestUser();
      const scene = await createTestScene(user.id);
      const area = await createTestSceneArea(scene.id);
      const asset = await createTestAsset(user.id);
      await linkTestAssetToArea(area.id, asset.id);

      const response = await request(app)
        .get(`/api/v1/scenes/areas/${area.id}/assets`)
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].assetId).toBe(asset.id);
    });

    it('should return 403 for area in private scene owned by another user', async () => {
      const user1 = await createAuthenticatedTestUser().then(u => u.user);
      const { token: token2 } = await createAuthenticatedTestUser();
      const scene = await createTestScene(user1.id, { visibility: Visibility.PRIVATE });
      const area = await createTestSceneArea(scene.id);

      await request(app)
        .get(`/api/v1/scenes/areas/${area.id}/assets`)
        .set(getAuthHeader(token2))
        .expect(403);
    });
  });

  describe('PUT /api/v1/scenes/areas/:areaId/assets/:assetId', () => {
    it('should update area asset in users scene', async () => {
      const { user, token } = await createAuthenticatedTestUser();
      const scene = await createTestScene(user.id);
      const area = await createTestSceneArea(scene.id);
      const asset = await createTestAsset(user.id);
      await linkTestAssetToArea(area.id, asset.id, { isHidden: false });

      const response = await request(app)
        .put(`/api/v1/scenes/areas/${area.id}/assets/${asset.id}`)
        .set(getAuthHeader(token))
        .send({ isHidden: true })
        .expect(200);

      expect(response.body.data.isHidden).toBe(true);
    });

    it('should return 403 when updating asset in another users scene', async () => {
      const user1 = await createAuthenticatedTestUser().then(u => u.user);
      const { token: token2 } = await createAuthenticatedTestUser();
      const scene = await createTestScene(user1.id);
      const area = await createTestSceneArea(scene.id);
      const asset = await createTestAsset(user1.id);
      await linkTestAssetToArea(area.id, asset.id);

      await request(app)
        .put(`/api/v1/scenes/areas/${area.id}/assets/${asset.id}`)
        .set(getAuthHeader(token2))
        .send({ isHidden: true })
        .expect(403);
    });
  });

  describe('DELETE /api/v1/scenes/areas/:areaId/assets/:assetId', () => {
    it('should remove asset from area in users scene', async () => {
      const { user, token } = await createAuthenticatedTestUser();
      const scene = await createTestScene(user.id);
      const area = await createTestSceneArea(scene.id);
      const asset = await createTestAsset(user.id);
      await linkTestAssetToArea(area.id, asset.id);

      await request(app)
        .delete(`/api/v1/scenes/areas/${area.id}/assets/${asset.id}`)
        .set(getAuthHeader(token))
        .expect(200);

      const db = getTestDb();
      const count = await db.sceneAreaAsset.count({
        where: { areaId: area.id, assetId: asset.id },
      });
      expect(count).toBe(0);
    });

    it('should return 403 when removing asset from another users scene', async () => {
      const user1 = await createAuthenticatedTestUser().then(u => u.user);
      const { token: token2 } = await createAuthenticatedTestUser();
      const scene = await createTestScene(user1.id);
      const area = await createTestSceneArea(scene.id);
      const asset = await createTestAsset(user1.id);
      await linkTestAssetToArea(area.id, asset.id);

      await request(app)
        .delete(`/api/v1/scenes/areas/${area.id}/assets/${asset.id}`)
        .set(getAuthHeader(token2))
        .expect(403);
    });
  });

  // ========================================================================
  // AREA CONNECTIONS ENDPOINTS
  // ========================================================================

  describe('POST /api/v1/scenes/areas/:areaId/connections', () => {
    it('should connect areas in users scene', async () => {
      const { user, token } = await createAuthenticatedTestUser();
      const scene = await createTestScene(user.id);
      const area1 = await createTestSceneArea(scene.id);
      const area2 = await createTestSceneArea(scene.id);

      const response = await request(app)
        .post(`/api/v1/scenes/areas/${area1.id}/connections`)
        .set(getAuthHeader(token))
        .send({
          toAreaId: area2.id,
          direction: 'North',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.fromAreaId).toBe(area1.id);
      expect(response.body.data.toAreaId).toBe(area2.id);
    });

    it('should return 403 when connecting areas in another users scene', async () => {
      const user1 = await createAuthenticatedTestUser().then(u => u.user);
      const { token: token2 } = await createAuthenticatedTestUser();
      const scene = await createTestScene(user1.id);
      const area1 = await createTestSceneArea(scene.id);
      const area2 = await createTestSceneArea(scene.id);

      await request(app)
        .post(`/api/v1/scenes/areas/${area1.id}/connections`)
        .set(getAuthHeader(token2))
        .send({ toAreaId: area2.id })
        .expect(403);
    });

    it('should return 400 for missing toAreaId', async () => {
      const { user, token } = await createAuthenticatedTestUser();
      const scene = await createTestScene(user.id);
      const area = await createTestSceneArea(scene.id);

      await request(app)
        .post(`/api/v1/scenes/areas/${area.id}/connections`)
        .set(getAuthHeader(token))
        .send({ direction: 'North' })
        .expect(400);
    });
  });

  describe('GET /api/v1/scenes/areas/:areaId/connections', () => {
    it('should get area connections', async () => {
      const { user, token } = await createAuthenticatedTestUser();
      const scene = await createTestScene(user.id);
      const area1 = await createTestSceneArea(scene.id);
      const area2 = await createTestSceneArea(scene.id);
      await createTestSceneAreaConnection(area1.id, area2.id);

      const response = await request(app)
        .get(`/api/v1/scenes/areas/${area1.id}/connections`)
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.outgoing).toBeDefined();
      expect(response.body.data.incoming).toBeDefined();
    });

    it('should return 403 for area in private scene owned by another user', async () => {
      const user1 = await createAuthenticatedTestUser().then(u => u.user);
      const { token: token2 } = await createAuthenticatedTestUser();
      const scene = await createTestScene(user1.id, { visibility: Visibility.PRIVATE });
      const area = await createTestSceneArea(scene.id);

      await request(app)
        .get(`/api/v1/scenes/areas/${area.id}/connections`)
        .set(getAuthHeader(token2))
        .expect(403);
    });
  });

  describe('PUT /api/v1/scenes/areas/:areaId/connections/:targetAreaId', () => {
    it('should update connection in users scene', async () => {
      const { user, token } = await createAuthenticatedTestUser();
      const scene = await createTestScene(user.id);
      const area1 = await createTestSceneArea(scene.id);
      const area2 = await createTestSceneArea(scene.id);
      await createTestSceneAreaConnection(area1.id, area2.id, { isLocked: false });

      const response = await request(app)
        .put(`/api/v1/scenes/areas/${area1.id}/connections/${area2.id}`)
        .set(getAuthHeader(token))
        .send({ isLocked: true, lockHint: 'Need key' })
        .expect(200);

      expect(response.body.data.isLocked).toBe(true);
      expect(response.body.data.lockHint).toBe('Need key');
    });

    it('should return 403 when updating connection in another users scene', async () => {
      const user1 = await createAuthenticatedTestUser().then(u => u.user);
      const { token: token2 } = await createAuthenticatedTestUser();
      const scene = await createTestScene(user1.id);
      const area1 = await createTestSceneArea(scene.id);
      const area2 = await createTestSceneArea(scene.id);
      await createTestSceneAreaConnection(area1.id, area2.id);

      await request(app)
        .put(`/api/v1/scenes/areas/${area1.id}/connections/${area2.id}`)
        .set(getAuthHeader(token2))
        .send({ isLocked: true })
        .expect(403);
    });
  });

  describe('DELETE /api/v1/scenes/areas/:areaId/connections/:targetAreaId', () => {
    it('should disconnect areas in users scene', async () => {
      const { user, token } = await createAuthenticatedTestUser();
      const scene = await createTestScene(user.id);
      const area1 = await createTestSceneArea(scene.id);
      const area2 = await createTestSceneArea(scene.id);
      await createTestSceneAreaConnection(area1.id, area2.id);

      await request(app)
        .delete(`/api/v1/scenes/areas/${area1.id}/connections/${area2.id}`)
        .set(getAuthHeader(token))
        .expect(200);

      const db = getTestDb();
      const count = await db.sceneAreaConnection.count({
        where: { fromAreaId: area1.id, toAreaId: area2.id },
      });
      expect(count).toBe(0);
    });

    it('should return 403 when disconnecting areas in another users scene', async () => {
      const user1 = await createAuthenticatedTestUser().then(u => u.user);
      const { token: token2 } = await createAuthenticatedTestUser();
      const scene = await createTestScene(user1.id);
      const area1 = await createTestSceneArea(scene.id);
      const area2 = await createTestSceneArea(scene.id);
      await createTestSceneAreaConnection(area1.id, area2.id);

      await request(app)
        .delete(`/api/v1/scenes/areas/${area1.id}/connections/${area2.id}`)
        .set(getAuthHeader(token2))
        .expect(403);
    });
  });

  // ========================================================================
  // SCENE IMAGES ENDPOINTS
  // ========================================================================

  describe('GET /api/v1/scenes/:id/images', () => {
    it('should list scene images', async () => {
      const { user, token } = await createAuthenticatedTestUser();
      const scene = await createTestScene(user.id);

      const db = getTestDb();
      await db.sceneImage.create({
        data: {
          sceneId: scene.id,
          imageUrl: 'https://example.com/img.jpg',
          imageType: 'COVER',
        },
      });

      const response = await request(app)
        .get(`/api/v1/scenes/${scene.id}/images`)
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    it('should return 403 for private scene owned by another user', async () => {
      const user1 = await createAuthenticatedTestUser().then(u => u.user);
      const { token: token2 } = await createAuthenticatedTestUser();
      const scene = await createTestScene(user1.id, { visibility: Visibility.PRIVATE });

      await request(app)
        .get(`/api/v1/scenes/${scene.id}/images`)
        .set(getAuthHeader(token2))
        .expect(403);
    });
  });

  // ========================================================================
  // AREA IMAGES ENDPOINTS
  // ========================================================================

  describe('GET /api/v1/scenes/:id/areas/:areaId/images', () => {
    it('should list area images', async () => {
      const { user, token } = await createAuthenticatedTestUser();
      const scene = await createTestScene(user.id);
      const area = await createTestSceneArea(scene.id);

      const db = getTestDb();
      await db.sceneAreaImage.create({
        data: {
          areaId: area.id,
          imageUrl: 'https://example.com/img.jpg',
          imageType: 'ENVIRONMENT',
        },
      });

      const response = await request(app)
        .get(`/api/v1/scenes/${scene.id}/areas/${area.id}/images`)
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    it('should return 403 for area in private scene owned by another user', async () => {
      const user1 = await createAuthenticatedTestUser().then(u => u.user);
      const { token: token2 } = await createAuthenticatedTestUser();
      const scene = await createTestScene(user1.id, { visibility: Visibility.PRIVATE });
      const area = await createTestSceneArea(scene.id);

      await request(app)
        .get(`/api/v1/scenes/${scene.id}/areas/${area.id}/images`)
        .set(getAuthHeader(token2))
        .expect(403);
    });
  });

  // ========================================================================
  // EDGE CASES AND ERROR CONDITIONS
  // ========================================================================

  describe('Edge Cases', () => {
    it('should handle empty search results gracefully', async () => {
      const { token } = await createAuthenticatedTestUser();

      const response = await request(app)
        .get('/api/v1/scenes?search=nonexistent')
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.data).toHaveLength(0);
    });

    it('should handle invalid pagination values', async () => {
      const { token } = await createAuthenticatedTestUser();

      const response = await request(app)
        .get('/api/v1/scenes?limit=abc&skip=xyz')
        .set(getAuthHeader(token))
        .expect(200);

      // Should default to some values and not crash
      expect(response.body.success).toBe(true);
    });

    it('should handle large skip values', async () => {
      const { token } = await createAuthenticatedTestUser();

      const response = await request(app)
        .get('/api/v1/scenes?skip=999999')
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.data).toHaveLength(0);
    });

    it('should handle special characters in search', async () => {
      const { user, token } = await createAuthenticatedTestUser();
      await createTestScene(user.id, { name: "Dragon's Lair" });

      const response = await request(app)
        .get("/api/v1/scenes?search=Dragon's")
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.data).toHaveLength(1);
    });

    it('should handle case-insensitive search', async () => {
      const { user, token } = await createAuthenticatedTestUser();
      await createTestScene(user.id, { name: 'Dragon Cave' });

      const response = await request(app)
        .get('/api/v1/scenes?search=DRAGON')
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.data).toHaveLength(1);
    });
  });
});
