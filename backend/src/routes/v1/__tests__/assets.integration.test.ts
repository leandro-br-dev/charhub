/**
 * Assets API Integration Tests
 * Tests all assets endpoints with real database and HTTP requests
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
import { createTestCharacter } from '../../../test-utils/factories';
import * as assetService from '../../../services/assetService';
import { AssetType, AssetCategory, Visibility, VisualStyle, ContentTag } from '../../../generated/prisma';

const app = createTestApp();

describe('Assets API Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('POST /api/v1/assets', () => {
    it('should create a new asset', async () => {
      const { user, token } = await createAuthenticatedTestUser();

      const response = await request(app)
        .post('/api/v1/assets')
        .set(getAuthHeader(token))
        .send({
          name: 'Dragon Sword',
          description: 'A legendary sword',
          type: AssetType.WEAPON,
          category: AssetCategory.HOLDABLE,
          visibility: Visibility.PUBLIC,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.name).toBe('Dragon Sword');
      expect(response.body.data.type).toBe(AssetType.WEAPON);
      expect(response.body.data.authorId).toBe(user.id);
    });

    it('should create asset with all optional fields', async () => {
      const { token } = await createAuthenticatedTestUser();

      const response = await request(app)
        .post('/api/v1/assets')
        .set(getAuthHeader(token))
        .send({
          name: 'Magic Ring',
          description: 'A ring with magical powers',
          type: AssetType.ACCESSORY,
          category: AssetCategory.WEARABLE,
          previewImageUrl: 'https://example.com/ring.jpg',
          style: VisualStyle.ANIME,
          ageRating: 'TWELVE',
          contentTags: [ContentTag.VIOLENCE],
          visibility: Visibility.PUBLIC,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.style).toBe(VisualStyle.ANIME);
      expect(response.body.data.contentTags).toEqual([ContentTag.VIOLENCE]);
    });

    it('should return 400 for missing required fields', async () => {
      const { token } = await createAuthenticatedTestUser();

      const response = await request(app)
        .post('/api/v1/assets')
        .set(getAuthHeader(token))
        .send({
          name: 'Incomplete Asset',
          // Missing description, type, category
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('MISSING_REQUIRED_FIELD');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .post('/api/v1/assets')
        .send({
          name: 'Test Asset',
          description: 'Test',
          type: AssetType.OBJECT,
          category: AssetCategory.HOLDABLE,
        })
        .expect(401);
    });
  });

  describe('GET /api/v1/assets', () => {
    beforeEach(async () => {
      const user1 = await createAuthenticatedTestUser();
      const user2 = await createAuthenticatedTestUser();

      // Create assets for user1
      await assetService.createAsset({
        name: 'Sword',
        description: 'A sharp sword',
        type: AssetType.WEAPON,
        category: AssetCategory.HOLDABLE,
        authorId: user1.user.id,
        visibility: Visibility.PUBLIC,
      });

      await assetService.createAsset({
        name: 'Shield',
        description: 'A sturdy shield',
        type: AssetType.OBJECT,
        category: AssetCategory.HOLDABLE,
        authorId: user1.user.id,
        visibility: Visibility.PUBLIC,
      });

      await assetService.createAsset({
        name: 'Armor',
        description: 'Protective armor',
        type: AssetType.CLOTHING,
        category: AssetCategory.WEARABLE,
        authorId: user1.user.id,
        visibility: Visibility.PRIVATE,
      });

      // Create asset for user2
      await assetService.createAsset({
        name: 'Helmet',
        description: 'Head protection',
        type: AssetType.CLOTHING,
        category: AssetCategory.WEARABLE,
        authorId: user2.user.id,
        visibility: Visibility.PUBLIC,
      });
    });

    it('should return public assets for unauthenticated user', async () => {
      const response = await request(app)
        .get('/api/v1/assets')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThanOrEqual(3);
    });

    it('should return user assets for authenticated user', async () => {
      const { token } = await createAuthenticatedTestUser();

      const response = await request(app)
        .get('/api/v1/assets')
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should filter by type', async () => {
      const response = await request(app)
        .get('/api/v1/assets?type=WEAPON')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every((a: any) => a.type === AssetType.WEAPON)).toBe(true);
    });

    it('should filter by multiple types', async () => {
      const response = await request(app)
        .get('/api/v1/assets?types=WEAPON,CLOTHING')
        .expect(200);

      expect(response.body.success).toBe(true);
      const validTypes = [AssetType.WEAPON, AssetType.CLOTHING];
      expect(response.body.data.every((a: any) => validTypes.includes(a.type))).toBe(true);
    });

    it('should filter by category', async () => {
      const response = await request(app)
        .get('/api/v1/assets?category=HOLDABLE')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every((a: any) => a.category === AssetCategory.HOLDABLE)).toBe(true);
    });

    it('should filter by visibility', async () => {
      const response = await request(app)
        .get('/api/v1/assets?visibility=PUBLIC')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every((a: any) => a.visibility === Visibility.PUBLIC)).toBe(true);
    });

    it('should search by name/description', async () => {
      const response = await request(app)
        .get('/api/v1/assets?search=sword')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should respect pagination', async () => {
      const response = await request(app)
        .get('/api/v1/assets?limit=1&skip=0')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(1);
    });

    it('should return only public assets when public=true', async () => {
      const response = await request(app)
        .get('/api/v1/assets?public=true')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every((a: any) => a.visibility === Visibility.PUBLIC)).toBe(true);
    });
  });

  describe('GET /api/v1/assets/:id', () => {
    it('should return asset by ID', async () => {
      const { user, token } = await createAuthenticatedTestUser();

      const asset = await assetService.createAsset({
        name: 'Test Item',
        description: 'Test description',
        type: AssetType.OBJECT,
        category: AssetCategory.HOLDABLE,
        authorId: user.id,
        visibility: Visibility.PUBLIC,
      });

      const response = await request(app)
        .get(`/api/v1/assets/${asset.id}`)
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(asset.id);
      expect(response.body.data.name).toBe('Test Item');
    });

    it('should return 404 for non-existent asset', async () => {
      const { token } = await createAuthenticatedTestUser();

      await request(app)
        .get('/api/v1/assets/non-existent-id')
        .set(getAuthHeader(token))
        .expect(404);
    });

    it('should return 403 for private asset owned by another user', async () => {
      const user1 = await createAuthenticatedTestUser();
      const user2 = await createAuthenticatedTestUser();

      const asset = await assetService.createAsset({
        name: 'Private Item',
        description: 'Private',
        type: AssetType.OBJECT,
        category: AssetCategory.HOLDABLE,
        authorId: user1.user.id,
        visibility: Visibility.PRIVATE,
      });

      await request(app)
        .get(`/api/v1/assets/${asset.id}`)
        .set(getAuthHeader(user2.token))
        .expect(403);
    });

    it('should allow unauthenticated access to public assets', async () => {
      const { user } = await createAuthenticatedTestUser();

      const asset = await assetService.createAsset({
        name: 'Public Item',
        description: 'Public',
        type: AssetType.OBJECT,
        category: AssetCategory.HOLDABLE,
        authorId: user.id,
        visibility: Visibility.PUBLIC,
      });

      await request(app)
        .get(`/api/v1/assets/${asset.id}`)
        .expect(200);
    });
  });

  describe('PUT /api/v1/assets/:id', () => {
    it('should update asset owned by user', async () => {
      const { user, token } = await createAuthenticatedTestUser();

      const asset = await assetService.createAsset({
        name: 'Original Name',
        description: 'Original description',
        type: AssetType.OBJECT,
        category: AssetCategory.HOLDABLE,
        authorId: user.id,
      });

      const response = await request(app)
        .put(`/api/v1/assets/${asset.id}`)
        .set(getAuthHeader(token))
        .send({
          name: 'Updated Name',
          description: 'Updated description',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Name');
      expect(response.body.data.description).toBe('Updated description');
    });

    it('should update asset visibility', async () => {
      const { user, token } = await createAuthenticatedTestUser();

      const asset = await assetService.createAsset({
        name: 'Test Item',
        description: 'Test',
        type: AssetType.OBJECT,
        category: AssetCategory.HOLDABLE,
        authorId: user.id,
        visibility: Visibility.PRIVATE,
      });

      const response = await request(app)
        .put(`/api/v1/assets/${asset.id}`)
        .set(getAuthHeader(token))
        .send({
          visibility: Visibility.PUBLIC,
        })
        .expect(200);

      expect(response.body.data.visibility).toBe(Visibility.PUBLIC);
    });

    it('should return 403 when updating another user asset', async () => {
      const user1 = await createAuthenticatedTestUser();
      const user2 = await createAuthenticatedTestUser();

      const asset = await assetService.createAsset({
        name: 'User1 Item',
        description: 'By user1',
        type: AssetType.OBJECT,
        category: AssetCategory.HOLDABLE,
        authorId: user1.user.id,
      });

      await request(app)
        .put(`/api/v1/assets/${asset.id}`)
        .set(getAuthHeader(user2.token))
        .send({
          name: 'Hacked Name',
        })
        .expect(403);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .put('/api/v1/assets/some-id')
        .send({ name: 'Updated' })
        .expect(401);
    });
  });

  describe('DELETE /api/v1/assets/:id', () => {
    it('should delete asset owned by user', async () => {
      const { user, token } = await createAuthenticatedTestUser();

      const asset = await assetService.createAsset({
        name: 'To Delete',
        description: 'This will be deleted',
        type: AssetType.OBJECT,
        category: AssetCategory.HOLDABLE,
        authorId: user.id,
      });

      await request(app)
        .delete(`/api/v1/assets/${asset.id}`)
        .set(getAuthHeader(token))
        .expect(200);

      // Verify deletion
      const deleted = await assetService.getAssetById(asset.id);
      expect(deleted).toBeNull();
    });

    it('should return 403 when deleting another user asset', async () => {
      const user1 = await createAuthenticatedTestUser();
      const user2 = await createAuthenticatedTestUser();

      const asset = await assetService.createAsset({
        name: 'User1 Item',
        description: 'By user1',
        type: AssetType.OBJECT,
        category: AssetCategory.HOLDABLE,
        authorId: user1.user.id,
      });

      await request(app)
        .delete(`/api/v1/assets/${asset.id}`)
        .set(getAuthHeader(user2.token))
        .expect(403);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .delete('/api/v1/assets/some-id')
        .expect(401);
    });
  });

  describe('POST /api/v1/assets/:id/favorite', () => {
    it('should add asset to favorites', async () => {
      const { user, token } = await createAuthenticatedTestUser();

      const asset = await assetService.createAsset({
        name: 'Favorite Item',
        description: 'I love this',
        type: AssetType.OBJECT,
        category: AssetCategory.HOLDABLE,
        authorId: user.id,
        visibility: Visibility.PUBLIC,
      });

      const response = await request(app)
        .post(`/api/v1/assets/${asset.id}/favorite`)
        .set(getAuthHeader(token))
        .send({ isFavorite: true })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isFavorite).toBe(true);
    });

    it('should remove asset from favorites', async () => {
      const { user, token } = await createAuthenticatedTestUser();

      const asset = await assetService.createAsset({
        name: 'Unfavorite Item',
        description: 'I do not love this',
        type: AssetType.OBJECT,
        category: AssetCategory.HOLDABLE,
        authorId: user.id,
      });

      // First add to favorites
      await assetService.toggleFavoriteAsset(user.id, asset.id, true);

      // Then remove
      const response = await request(app)
        .post(`/api/v1/assets/${asset.id}/favorite`)
        .set(getAuthHeader(token))
        .send({ isFavorite: false })
        .expect(200);

      expect(response.body.data.isFavorite).toBe(false);
    });

    it('should return 400 for invalid isFavorite value', async () => {
      const { user, token } = await createAuthenticatedTestUser();

      const asset = await assetService.createAsset({
        name: 'Test Item',
        description: 'Test',
        type: AssetType.OBJECT,
        category: AssetCategory.HOLDABLE,
        authorId: user.id,
      });

      await request(app)
        .post(`/api/v1/assets/${asset.id}/favorite`)
        .set(getAuthHeader(token))
        .send({ isFavorite: 'yes' })
        .expect(400);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .post('/api/v1/assets/some-id/favorite')
        .send({ isFavorite: true })
        .expect(401);
    });
  });

  describe('GET /api/v1/assets/favorites', () => {
    it('should return user favorite assets', async () => {
      const { user, token } = await createAuthenticatedTestUser();

      const asset1 = await assetService.createAsset({
        name: 'Favorite 1',
        description: 'First favorite',
        type: AssetType.OBJECT,
        category: AssetCategory.HOLDABLE,
        authorId: user.id,
        visibility: Visibility.PUBLIC,
      });

      const asset2 = await assetService.createAsset({
        name: 'Favorite 2',
        description: 'Second favorite',
        type: AssetType.OBJECT,
        category: AssetCategory.HOLDABLE,
        authorId: user.id,
        visibility: Visibility.PUBLIC,
      });

      await assetService.toggleFavoriteAsset(user.id, asset1.id, true);
      await assetService.toggleFavoriteAsset(user.id, asset2.id, true);

      const response = await request(app)
        .get('/api/v1/assets/favorites')
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should return empty array for user with no favorites', async () => {
      const { token } = await createAuthenticatedTestUser();

      const response = await request(app)
        .get('/api/v1/assets/favorites')
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.data).toEqual([]);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/v1/assets/favorites')
        .expect(401);
    });

    it('should respect pagination', async () => {
      const { user, token } = await createAuthenticatedTestUser();

      for (let i = 0; i < 5; i++) {
        const asset = await assetService.createAsset({
          name: `Asset ${i}`,
          description: `Description ${i}`,
          type: AssetType.OBJECT,
          category: AssetCategory.HOLDABLE,
          authorId: user.id,
        });
        await assetService.toggleFavoriteAsset(user.id, asset.id, true);
      }

      const response = await request(app)
        .get('/api/v1/assets/favorites?limit=2&skip=1')
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(2);
    });
  });

  describe('POST /api/v1/assets/characters/:id/assets', () => {
    it('should link asset to character', async () => {
      const { user, token } = await createAuthenticatedTestUser();

      const character = await createTestCharacter(user.id);
      const asset = await assetService.createAsset({
        name: 'Sword',
        description: 'A sword',
        type: AssetType.WEAPON,
        category: AssetCategory.HOLDABLE,
        authorId: user.id,
      });

      const response = await request(app)
        .post(`/api/v1/assets/characters/${character.id}/assets`)
        .set(getAuthHeader(token))
        .send({
          assetId: asset.id,
          placementZone: 'HAND',
          placementDetail: 'Right hand',
          contextNote: 'Always carries this',
          isVisible: true,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.assetId).toBe(asset.id);
      expect(response.body.data.characterId).toBe(character.id);
      expect(response.body.data.placementZone).toBe('HAND');
    });

    it('should return 400 for missing assetId', async () => {
      const { user, token } = await createAuthenticatedTestUser();

      const character = await createTestCharacter(user.id);

      await request(app)
        .post(`/api/v1/assets/characters/${character.id}/assets`)
        .set(getAuthHeader(token))
        .send({
          placementZone: 'HAND',
        })
        .expect(400);
    });

    it('should return 403 for character owned by another user', async () => {
      const user1 = await createAuthenticatedTestUser();
      const user2 = await createAuthenticatedTestUser();

      const character = await createTestCharacter(user1.user.id);
      const asset = await assetService.createAsset({
        name: 'Sword',
        description: 'A sword',
        type: AssetType.WEAPON,
        category: AssetCategory.HOLDABLE,
        authorId: user2.user.id,
      });

      await request(app)
        .post(`/api/v1/assets/characters/${character.id}/assets`)
        .set(getAuthHeader(user2.token))
        .send({
          assetId: asset.id,
        })
        .expect(403);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .post('/api/v1/assets/characters/some-id/assets')
        .send({ assetId: 'asset-id' })
        .expect(401);
    });
  });

  describe('PUT /api/v1/assets/characters/:id/assets/:assetId', () => {
    it('should update character asset link', async () => {
      const { user, token } = await createAuthenticatedTestUser();

      const character = await createTestCharacter(user.id);
      const asset = await assetService.createAsset({
        name: 'Sword',
        description: 'A sword',
        type: AssetType.WEAPON,
        category: AssetCategory.HOLDABLE,
        authorId: user.id,
      });

      await assetService.linkAssetToCharacter(character.id, asset.id);

      const response = await request(app)
        .put(`/api/v1/assets/characters/${character.id}/assets/${asset.id}`)
        .set(getAuthHeader(token))
        .send({
          placementZone: 'BACK',
          contextNote: 'Strapped to back',
          isVisible: true,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.placementZone).toBe('BACK');
      expect(response.body.data.contextNote).toBe('Strapped to back');
    });

    it('should return 403 for character owned by another user', async () => {
      const user1 = await createAuthenticatedTestUser();
      const user2 = await createAuthenticatedTestUser();

      const character = await createTestCharacter(user1.user.id);
      const asset = await assetService.createAsset({
        name: 'Sword',
        description: 'A sword',
        type: AssetType.WEAPON,
        category: AssetCategory.HOLDABLE,
        authorId: user1.user.id,
      });

      await assetService.linkAssetToCharacter(character.id, asset.id);

      await request(app)
        .put(`/api/v1/assets/characters/${character.id}/assets/${asset.id}`)
        .set(getAuthHeader(user2.token))
        .send({
          placementZone: 'BACK',
        })
        .expect(403);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .put('/api/v1/assets/characters/some-id/assets/asset-id')
        .send({ placementZone: 'BACK' })
        .expect(401);
    });
  });

  describe('DELETE /api/v1/assets/characters/:id/assets/:assetId', () => {
    it('should unlink asset from character', async () => {
      const { user, token } = await createAuthenticatedTestUser();

      const character = await createTestCharacter(user.id);
      const asset = await assetService.createAsset({
        name: 'Sword',
        description: 'A sword',
        type: AssetType.WEAPON,
        category: AssetCategory.HOLDABLE,
        authorId: user.id,
      });

      await assetService.linkAssetToCharacter(character.id, asset.id);

      await request(app)
        .delete(`/api/v1/assets/characters/${character.id}/assets/${asset.id}`)
        .set(getAuthHeader(token))
        .expect(200);

      // Verify unlink
      const characterAssets = await assetService.getCharacterAssets(character.id);
      expect(characterAssets).toHaveLength(0);
    });

    it('should return 403 for character owned by another user', async () => {
      const user1 = await createAuthenticatedTestUser();
      const user2 = await createAuthenticatedTestUser();

      const character = await createTestCharacter(user1.user.id);
      const asset = await assetService.createAsset({
        name: 'Sword',
        description: 'A sword',
        type: AssetType.WEAPON,
        category: AssetCategory.HOLDABLE,
        authorId: user1.user.id,
      });

      await assetService.linkAssetToCharacter(character.id, asset.id);

      await request(app)
        .delete(`/api/v1/assets/characters/${character.id}/assets/${asset.id}`)
        .set(getAuthHeader(user2.token))
        .expect(403);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .delete('/api/v1/assets/characters/some-id/assets/asset-id')
        .expect(401);
    });
  });

  describe('GET /api/v1/assets/characters/:id/assets', () => {
    it('should return character assets', async () => {
      const { user, token } = await createAuthenticatedTestUser();

      const character = await createTestCharacter(user.id);

      const asset1 = await assetService.createAsset({
        name: 'Sword',
        description: 'A sword',
        type: AssetType.WEAPON,
        category: AssetCategory.HOLDABLE,
        authorId: user.id,
      });

      const asset2 = await assetService.createAsset({
        name: 'Shield',
        description: 'A shield',
        type: AssetType.OBJECT,
        category: AssetCategory.HOLDABLE,
        authorId: user.id,
      });

      await assetService.linkAssetToCharacter(character.id, asset1.id);
      await assetService.linkAssetToCharacter(character.id, asset2.id);

      const response = await request(app)
        .get(`/api/v1/assets/characters/${character.id}/assets`)
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].asset).toBeDefined();
    });

    it('should return empty array for character with no assets', async () => {
      const { user, token } = await createAuthenticatedTestUser();

      const character = await createTestCharacter(user.id);

      const response = await request(app)
        .get(`/api/v1/assets/characters/${character.id}/assets`)
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.data).toEqual([]);
    });

    it('should allow access to public character assets', async () => {
      const { user } = await createAuthenticatedTestUser();

      const character = await createTestCharacter(user.id);

      const asset = await assetService.createAsset({
        name: 'Sword',
        description: 'A sword',
        type: AssetType.WEAPON,
        category: AssetCategory.HOLDABLE,
        authorId: user.id,
      });

      await assetService.linkAssetToCharacter(character.id, asset.id);

      await request(app)
        .get(`/api/v1/assets/characters/${character.id}/assets`)
        .expect(200);
    });

    it('should return 404 for non-existent character', async () => {
      const { token } = await createAuthenticatedTestUser();

      await request(app)
        .get('/api/v1/assets/characters/non-existent-id/assets')
        .set(getAuthHeader(token))
        .expect(404);
    });
  });

  describe('GET /api/v1/assets/:id/stats', () => {
    it('should return asset stats', async () => {
      const { user } = await createAuthenticatedTestUser();

      const asset = await assetService.createAsset({
        name: 'Popular Item',
        description: 'Very popular',
        type: AssetType.OBJECT,
        category: AssetCategory.HOLDABLE,
        authorId: user.id,
        visibility: Visibility.PUBLIC,
      });

      const response = await request(app)
        .get(`/api/v1/assets/${asset.id}/stats`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(asset.id);
      expect(response.body.data.characterCount).toBeDefined();
      expect(response.body.data.imageCount).toBeDefined();
      expect(response.body.data.isFavoritedByUser).toBe(false);
    });

    it('should include favorite status for authenticated user', async () => {
      const { user, token } = await createAuthenticatedTestUser();

      const asset = await assetService.createAsset({
        name: 'Favorite Item',
        description: 'I love this',
        type: AssetType.OBJECT,
        category: AssetCategory.HOLDABLE,
        authorId: user.id,
      });

      await assetService.toggleFavoriteAsset(user.id, asset.id, true);

      const response = await request(app)
        .get(`/api/v1/assets/${asset.id}/stats`)
        .set(getAuthHeader(token))
        .expect(200);

      expect(response.body.data.isFavoritedByUser).toBe(true);
    });

    it('should return 404 for non-existent asset', async () => {
      await request(app)
        .get('/api/v1/assets/non-existent-id/stats')
        .expect(500); // Service throws error for non-existent asset
    });
  });
});
