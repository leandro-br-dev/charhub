/**
 * Scene Service Unit Tests
 * Tests for scene and area management system (FEATURE-022)
 */
import {
  createScene,
  getSceneById,
  listScenes,
  searchScenes,
  updateScene,
  deleteScene,
  addArea,
  updateArea,
  removeArea,
  getAreaDetail,
  getSceneAreas,
  linkAssetToArea,
  unlinkAssetFromArea,
  getAreaAssets,
  updateAreaAsset,
  connectAreas,
  disconnectAreas,
  getAreaConnections,
  updateConnection,
  buildSceneContext,
  buildAreaContext,
  isSceneOwner,
  getSceneCountByUser,
  getPublicScenes,
  toggleFavoriteScene,
  getFavoriteScenes,
  getSceneStats,
  addSceneImage,
  updateSceneImage,
  deleteSceneImage,
  getSceneImages,
  addAreaImage,
  updateAreaImage,
  deleteAreaImage,
  getAreaImages,
} from '../sceneService';
import { setupTestDatabase, cleanDatabase, teardownTestDatabase } from '../../test-utils/database';
import {
  createTestUser,
  createTestAsset,
  createTestScene,
  createTestSceneArea,
  createTestSceneAreaConnection,
  linkTestAssetToArea,
} from '../../test-utils/factories';
import { getTestDb } from '../../test-utils/database';
import { AgeRating, ContentTag, Visibility, VisualStyle } from '../../generated/prisma';

describe('SceneService', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('createScene', () => {
    it('should create a scene with required fields', async () => {
      const user = await createTestUser();

      const scene = await createScene({
        name: 'Test Scene',
        description: 'A test scene description',
        authorId: user.id,
      });

      expect(scene).toBeDefined();
      expect(scene.id).toBeDefined();
      expect(scene.name).toBe('Test Scene');
      expect(scene.description).toBe('A test scene description');
      expect(scene.authorId).toBe(user.id);
      expect(scene.visibility).toBe('PRIVATE'); // default
    });

    it('should create a scene with initial areas', async () => {
      const user = await createTestUser();

      const scene = await createScene({
        name: 'Test Scene',
        description: 'A test scene description',
        authorId: user.id,
        initialAreas: [
          {
            name: 'Main Hall',
            description: 'The main hall of the scene',
            displayOrder: 0,
          },
          {
            name: 'Side Room',
            description: 'A side room',
            displayOrder: 1,
          },
        ],
      });

      expect(scene.areas).toHaveLength(2);
      expect(scene.areas[0].name).toBe('Main Hall');
      expect(scene.areas[1].name).toBe('Side Room');
    });

    it('should create a scene with all optional fields', async () => {
      const user = await createTestUser();

      const scene = await createScene({
        name: 'Complete Scene',
        description: 'Full description',
        shortDescription: 'Short desc',
        genre: 'Fantasy',
        era: 'Medieval',
        mood: 'Dark',
        style: VisualStyle.REALISTIC,
        imagePrompt: 'A dark fantasy scene',
        mapPrompt: 'Map of the area',
        coverImageUrl: 'https://example.com/cover.jpg',
        mapImageUrl: 'https://example.com/map.jpg',
        ageRating: AgeRating.EIGHTEEN,
        contentTags: [ContentTag.VIOLENCE],
        visibility: Visibility.PRIVATE,
        authorId: user.id,
        originalLanguageCode: 'en',
      });

      expect(scene.shortDescription).toBe('Short desc');
      expect(scene.genre).toBe('Fantasy');
      expect(scene.era).toBe('Medieval');
      expect(scene.mood).toBe('Dark');
      expect(scene.style).toBe(VisualStyle.REALISTIC);
      expect(scene.ageRating).toBe(AgeRating.EIGHTEEN);
      expect(scene.contentTags).toEqual([ContentTag.VIOLENCE]);
      expect(scene.visibility).toBe(Visibility.PRIVATE);
    });
  });

  describe('getSceneById', () => {
    it('should return scene with all relations', async () => {
      const user = await createTestUser();
      const scene = await createTestScene(user.id);
      await createTestSceneArea(scene.id, { name: 'Area 1', displayOrder: 0 });
      await createTestSceneArea(scene.id, { name: 'Area 2', displayOrder: 1 });

      const result = await getSceneById(scene.id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(scene.id);
      expect(result?.areas).toHaveLength(2);
      expect(result?.areas[0].name).toBe('Area 1');
      expect(result?.areas[1].name).toBe('Area 2');
      expect(result?.author).toBeDefined();
      expect(result?.author.id).toBe(user.id);
    });

    it('should return null for non-existent scene', async () => {
      const result = await getSceneById('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('listScenes', () => {
    it('should list scenes ordered by newest first', async () => {
      const user = await createTestUser();
      const scene1 = await createTestScene(user.id);
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      const scene2 = await createTestScene(user.id);

      const scenes = await listScenes({ authorId: user.id });

      expect(scenes).toHaveLength(2);
      expect(scenes[0].id).toBe(scene2.id); // Newest first
      expect(scenes[1].id).toBe(scene1.id);
    });

    it('should filter by authorId', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();

      await createTestScene(user1.id);
      await createTestScene(user1.id);
      await createTestScene(user2.id);

      const user1Scenes = await listScenes({ authorId: user1.id });
      const user2Scenes = await listScenes({ authorId: user2.id });

      expect(user1Scenes).toHaveLength(2);
      expect(user2Scenes).toHaveLength(1);
    });

    it('should filter by genre', async () => {
      const user = await createTestUser();
      await createTestScene(user.id, { genre: 'Fantasy' });
      await createTestScene(user.id, { genre: 'Sci-Fi' });
      await createTestScene(user.id, { genre: 'Fantasy' });

      const fantasyScenes = await listScenes({ authorId: user.id, genre: 'Fantasy' });

      expect(fantasyScenes).toHaveLength(2);
      expect(fantasyScenes.every(s => s.genre === 'Fantasy')).toBe(true);
    });

    it('should filter by mood', async () => {
      const user = await createTestUser();
      await createTestScene(user.id, { mood: 'Dark' });
      await createTestScene(user.id, { mood: 'Light' });
      await createTestScene(user.id, { mood: 'Dark' });

      const darkScenes = await listScenes({ authorId: user.id, mood: 'Dark' });

      expect(darkScenes).toHaveLength(2);
      expect(darkScenes.every(s => s.mood === 'Dark')).toBe(true);
    });

    it('should filter by era', async () => {
      const user = await createTestUser();
      await createTestScene(user.id, { era: 'Medieval' });
      await createTestScene(user.id, { era: 'Future' });
      await createTestScene(user.id, { era: 'Medieval' });

      const medievalScenes = await listScenes({ authorId: user.id, era: 'Medieval' });

      expect(medievalScenes).toHaveLength(2);
      expect(medievalScenes.every(s => s.era === 'Medieval')).toBe(true);
    });

    it('should filter by visibility', async () => {
      const user = await createTestUser();
      await createTestScene(user.id, { visibility: Visibility.PUBLIC });
      await createTestScene(user.id, { visibility: Visibility.PRIVATE });
      await createTestScene(user.id, { visibility: Visibility.PUBLIC });

      const publicScenes = await listScenes({
        authorId: user.id,
        visibility: Visibility.PUBLIC,
      });

      expect(publicScenes).toHaveLength(2);
      expect(publicScenes.every(s => s.visibility === Visibility.PUBLIC)).toBe(true);
    });

    it('should search by name and description', async () => {
      const user = await createTestUser();
      await createTestScene(user.id, { name: 'Dragon Cave', description: 'A dark cave' });
      await createTestScene(user.id, { name: 'Forest Path', description: 'A peaceful path' });
      await createTestScene(user.id, { name: 'Dragon Lair', description: 'The dragons home' });

      const results = await listScenes({ authorId: user.id, search: 'dragon' });

      expect(results).toHaveLength(2);
      expect(results.some(s => s.name === 'Dragon Cave')).toBe(true);
      expect(results.some(s => s.name === 'Dragon Lair')).toBe(true);
    });

    it('should support pagination with skip and limit', async () => {
      const user = await createTestUser();
      for (let i = 0; i < 5; i++) {
        await createTestScene(user.id);
      }

      const page1 = await listScenes({ authorId: user.id, skip: 0, limit: 2 });
      const page2 = await listScenes({ authorId: user.id, skip: 2, limit: 2 });

      expect(page1).toHaveLength(2);
      expect(page2).toHaveLength(2);
      expect(page1[0].id).not.toBe(page2[0].id);
    });

    it('should return empty array when no scenes match', async () => {
      await createTestUser();
      const otherUser = await createTestUser();

      const scenes = await listScenes({ authorId: otherUser.id });

      expect(scenes).toHaveLength(0);
    });
  });

  describe('searchScenes', () => {
    it('should search scenes by query', async () => {
      const user = await createTestUser();
      await createTestScene(user.id, { name: 'Magical Forest', genre: 'Fantasy' });
      await createTestScene(user.id, { name: 'Dark Dungeon', genre: 'Fantasy' });
      await createTestScene(user.id, { name: 'Space Station', genre: 'Sci-Fi' });

      const results = await searchScenes('forest', { authorId: user.id });

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Magical Forest');
    });

    it('should combine search with filters', async () => {
      const user = await createTestUser();
      await createTestScene(user.id, {
        name: 'Dark Castle',
        genre: 'Fantasy',
        mood: 'Dark',
      });
      await createTestScene(user.id, {
        name: 'Dark Forest',
        genre: 'Fantasy',
        mood: 'Dark',
      });
      await createTestScene(user.id, {
        name: 'Dark Space',
        genre: 'Sci-Fi',
        mood: 'Dark',
      });

      const results = await searchScenes('dark', {
        authorId: user.id,
        genre: 'Fantasy',
      });

      expect(results).toHaveLength(2);
      expect(results.every(s => s.genre === 'Fantasy')).toBe(true);
    });

    it('should return empty array when no results', async () => {
      const user = await createTestUser();
      await createTestScene(user.id, { name: 'Test Scene' });

      const results = await searchScenes('nonexistent', { authorId: user.id });

      expect(results).toHaveLength(0);
    });
  });

  describe('updateScene', () => {
    it('should update scene fields', async () => {
      const user = await createTestUser();
      const scene = await createTestScene(user.id);

      const updated = await updateScene(scene.id, {
        name: 'Updated Scene',
        genre: 'Horror',
      });

      expect(updated.name).toBe('Updated Scene');
      expect(updated.genre).toBe('Horror');
      expect(updated.description).toBe(scene.description); // unchanged
    });

    it('should update contentTags', async () => {
      const user = await createTestUser();
      const scene = await createTestScene(user.id, { contentTags: [ContentTag.VIOLENCE] });

      const updated = await updateScene(scene.id, {
        contentTags: [ContentTag.VIOLENCE, ContentTag.LANGUAGE],
      });

      expect(updated.contentTags).toEqual([ContentTag.VIOLENCE, ContentTag.LANGUAGE]);
    });
  });

  describe('deleteScene', () => {
    it('should delete scene and all areas', async () => {
      const user = await createTestUser();
      const scene = await createTestScene(user.id);
      await createTestSceneArea(scene.id);
      await createTestSceneArea(scene.id);

      await deleteScene(scene.id);

      const db = getTestDb();
      const sceneCount = await db.scene.count({ where: { id: scene.id } });
      const areaCount = await db.sceneArea.count({ where: { sceneId: scene.id } });

      expect(sceneCount).toBe(0);
      expect(areaCount).toBe(0);
    });

    it('should throw error when deleting non-existent scene', async () => {
      await expect(
        deleteScene('non-existent-id')
      ).rejects.toThrow();
    });
  });

  describe('addArea', () => {
    it('should add area to scene', async () => {
      const user = await createTestUser();
      const scene = await createTestScene(user.id);

      const area = await addArea(scene.id, {
        name: 'New Area',
        description: 'A new area',
        displayOrder: 0,
      });

      expect(area).toBeDefined();
      expect(area.name).toBe('New Area');
      expect(area.sceneId).toBe(scene.id);
    });

    it('should add area with metadata', async () => {
      const user = await createTestUser();
      const scene = await createTestScene(user.id);

      const metadata = { lighting: 'dim', temperature: 'cold' };

      const area = await addArea(scene.id, {
        name: 'New Area',
        description: 'A new area',
        metadata,
      });

      expect(area.metadata).toEqual(metadata);
    });
  });

  describe('updateArea', () => {
    it('should update area fields', async () => {
      const user = await createTestUser();
      const scene = await createTestScene(user.id);
      const area = await createTestSceneArea(scene.id, { name: 'Old Name' });

      const updated = await updateArea(area.id, {
        name: 'New Name',
        isAccessible: false,
      });

      expect(updated.name).toBe('New Name');
      expect(updated.isAccessible).toBe(false);
      expect(updated.description).toBe(area.description); // unchanged
    });
  });

  describe('removeArea', () => {
    it('should remove area from scene', async () => {
      const user = await createTestUser();
      const scene = await createTestScene(user.id);
      const area = await createTestSceneArea(scene.id);

      await removeArea(area.id);

      const db = getTestDb();
      const areaCount = await db.sceneArea.count({ where: { id: area.id } });
      expect(areaCount).toBe(0);
    });

    it('should throw error when removing non-existent area', async () => {
      await expect(
        removeArea('non-existent-id')
      ).rejects.toThrow();
    });
  });

  describe('getAreaDetail', () => {
    it('should return area with all relations', async () => {
      const user = await createTestUser();
      const scene = await createTestScene(user.id);
      const area1 = await createTestSceneArea(scene.id);
      await createTestSceneArea(scene.id);

      const result = await getAreaDetail(area1.id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(area1.id);
      expect(result?.scene).toBeDefined();
      expect(result?.scene.id).toBe(scene.id);
    });

    it('should return null for non-existent area', async () => {
      const result = await getAreaDetail('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('getSceneAreas', () => {
    it('should return all areas for a scene ordered by displayOrder', async () => {
      const user = await createTestUser();
      const scene = await createTestScene(user.id);
      const area1 = await createTestSceneArea(scene.id, { name: 'Area 1', displayOrder: 1 });
      const area2 = await createTestSceneArea(scene.id, { name: 'Area 0', displayOrder: 0 });
      const area3 = await createTestSceneArea(scene.id, { name: 'Area 2', displayOrder: 2 });

      const areas = await getSceneAreas(scene.id);

      expect(areas).toHaveLength(3);
      expect(areas[0].id).toBe(area2.id); // displayOrder 0
      expect(areas[1].id).toBe(area1.id); // displayOrder 1
      expect(areas[2].id).toBe(area3.id); // displayOrder 2
    });

    it('should return empty array for scene with no areas', async () => {
      const user = await createTestUser();
      const scene = await createTestScene(user.id);

      const areas = await getSceneAreas(scene.id);

      expect(areas).toHaveLength(0);
    });
  });

  describe('linkAssetToArea', () => {
    it('should link asset to area', async () => {
      const user = await createTestUser();
      const scene = await createTestScene(user.id);
      const area = await createTestSceneArea(scene.id);
      const asset = await createTestAsset(user.id);

      const link = await linkAssetToArea(area.id, asset.id, {
        position: 'on the table',
      });

      expect(link).toBeDefined();
      expect(link.areaId).toBe(area.id);
      expect(link.assetId).toBe(asset.id);
      expect(link.position).toBe('on the table');
      expect(link.isHidden).toBe(false); // default
      expect(link.isInteractable).toBe(true); // default
    });

    it('should link asset with custom properties', async () => {
      const user = await createTestUser();
      const scene = await createTestScene(user.id);
      const area = await createTestSceneArea(scene.id);
      const asset = await createTestAsset(user.id);

      const link = await linkAssetToArea(area.id, asset.id, {
        position: 'hidden under floorboard',
        isHidden: true,
        isInteractable: false,
        discoveryHint: 'Search the floor carefully',
      });

      expect(link.isHidden).toBe(true);
      expect(link.isInteractable).toBe(false);
      expect(link.discoveryHint).toBe('Search the floor carefully');
    });
  });

  describe('unlinkAssetFromArea', () => {
    it('should unlink asset from area', async () => {
      const user = await createTestUser();
      const scene = await createTestScene(user.id);
      const area = await createTestSceneArea(scene.id);
      const asset = await createTestAsset(user.id);
      await linkTestAssetToArea(area.id, asset.id);

      await unlinkAssetFromArea(area.id, asset.id);

      const db = getTestDb();
      const linkCount = await db.sceneAreaAsset.count({
        where: { areaId: area.id, assetId: asset.id },
      });
      expect(linkCount).toBe(0);
    });

    it('should throw error when unlinking non-existent link', async () => {
      await expect(
        unlinkAssetFromArea('area-id', 'asset-id')
      ).rejects.toThrow();
    });
  });

  describe('getAreaAssets', () => {
    it('should return all assets in an area', async () => {
      const user = await createTestUser();
      const scene = await createTestScene(user.id);
      const area = await createTestSceneArea(scene.id);
      const asset1 = await createTestAsset(user.id);
      const asset2 = await createTestAsset(user.id);
      await linkTestAssetToArea(area.id, asset1.id, { displayOrder: 0 });
      await linkTestAssetToArea(area.id, asset2.id, { displayOrder: 1 });

      const assets = await getAreaAssets(area.id);

      expect(assets).toHaveLength(2);
      expect(assets[0].assetId).toBe(asset1.id);
      expect(assets[1].assetId).toBe(asset2.id);
    });

    it('should return empty array for area with no assets', async () => {
      const user = await createTestUser();
      const scene = await createTestScene(user.id);
      const area = await createTestSceneArea(scene.id);

      const assets = await getAreaAssets(area.id);

      expect(assets).toHaveLength(0);
    });
  });

  describe('updateAreaAsset', () => {
    it('should update area asset properties', async () => {
      const user = await createTestUser();
      const scene = await createTestScene(user.id);
      const area = await createTestSceneArea(scene.id);
      const asset = await createTestAsset(user.id);
      await linkTestAssetToArea(area.id, asset.id, { isHidden: false });

      const updated = await updateAreaAsset(area.id, asset.id, {
        isHidden: true,
        position: 'moved location',
      });

      expect(updated.isHidden).toBe(true);
      expect(updated.position).toBe('moved location');
    });
  });

  describe('connectAreas', () => {
    it('should create connection between areas', async () => {
      const user = await createTestUser();
      const scene = await createTestScene(user.id);
      const area1 = await createTestSceneArea(scene.id);
      const area2 = await createTestSceneArea(scene.id);

      const connection = await connectAreas(area1.id, area2.id, {
        direction: 'North',
        description: 'A path leading north',
      });

      expect(connection).toBeDefined();
      expect(connection.fromAreaId).toBe(area1.id);
      expect(connection.toAreaId).toBe(area2.id);
      expect(connection.direction).toBe('North');
      expect(connection.description).toBe('A path leading north');
      expect(connection.isLocked).toBe(false); // default
    });

    it('should create locked connection', async () => {
      const user = await createTestUser();
      const scene = await createTestScene(user.id);
      const area1 = await createTestSceneArea(scene.id);
      const area2 = await createTestSceneArea(scene.id);

      const connection = await connectAreas(area1.id, area2.id, {
        isLocked: true,
        lockHint: 'Find the key',
      });

      expect(connection.isLocked).toBe(true);
      expect(connection.lockHint).toBe('Find the key');
    });
  });

  describe('disconnectAreas', () => {
    it('should remove connection between areas', async () => {
      const user = await createTestUser();
      const scene = await createTestScene(user.id);
      const area1 = await createTestSceneArea(scene.id);
      const area2 = await createTestSceneArea(scene.id);
      await createTestSceneAreaConnection(area1.id, area2.id);

      await disconnectAreas(area1.id, area2.id);

      const db = getTestDb();
      const connectionCount = await db.sceneAreaConnection.count({
        where: { fromAreaId: area1.id, toAreaId: area2.id },
      });
      expect(connectionCount).toBe(0);
    });

    it('should throw error when disconnecting non-existent connection', async () => {
      await expect(
        disconnectAreas('area1-id', 'area2-id')
      ).rejects.toThrow();
    });
  });

  describe('getAreaConnections', () => {
    it('should return both outgoing and incoming connections', async () => {
      const user = await createTestUser();
      const scene = await createTestScene(user.id);
      const area1 = await createTestSceneArea(scene.id);
      const area2 = await createTestSceneArea(scene.id);
      const area3 = await createTestSceneArea(scene.id);

      await createTestSceneAreaConnection(area1.id, area2.id); // area1 -> area2
      await createTestSceneAreaConnection(area3.id, area1.id); // area3 -> area1

      const connections = await getAreaConnections(area1.id);

      expect(connections.outgoing).toHaveLength(1);
      expect(connections.outgoing[0].toAreaId).toBe(area2.id);
      expect(connections.incoming).toHaveLength(1);
      expect(connections.incoming[0].fromAreaId).toBe(area3.id);
    });

    it('should return empty connections for area with no connections', async () => {
      const user = await createTestUser();
      const scene = await createTestScene(user.id);
      const area = await createTestSceneArea(scene.id);

      const connections = await getAreaConnections(area.id);

      expect(connections.outgoing).toHaveLength(0);
      expect(connections.incoming).toHaveLength(0);
    });
  });

  describe('updateConnection', () => {
    it('should update connection properties', async () => {
      const user = await createTestUser();
      const scene = await createTestScene(user.id);
      const area1 = await createTestSceneArea(scene.id);
      const area2 = await createTestSceneArea(scene.id);
      await createTestSceneAreaConnection(area1.id, area2.id, { isLocked: false });

      const updated = await updateConnection(area1.id, area2.id, {
        isLocked: true,
        lockHint: 'Need red key',
      });

      expect(updated.isLocked).toBe(true);
      expect(updated.lockHint).toBe('Need red key');
    });
  });

  describe('buildSceneContext', () => {
    it('should build context for scene', async () => {
      const user = await createTestUser();
      const scene = await createTestScene(user.id, {
        name: 'Dark Castle',
        description: 'A mysterious castle',
        genre: 'Fantasy',
        era: 'Medieval',
        mood: 'Dark',
      });
      await createTestSceneArea(scene.id, {
        name: 'Throne Room',
        description: 'The main throne room',
      });
      await createTestSceneArea(scene.id, {
        name: 'Dungeon',
        description: 'A dark dungeon below',
      });

      const context = await buildSceneContext(scene.id);

      expect(context).toContain('# Dark Castle');
      expect(context).toContain('A mysterious castle');
      expect(context).toContain('Genre: Fantasy');
      expect(context).toContain('Era: Medieval');
      expect(context).toContain('Mood: Dark');
      expect(context).toContain('## Areas:');
      expect(context).toContain('### Throne Room');
      expect(context).toContain('### Dungeon');
    });

    it('should include assets in context', async () => {
      const user = await createTestUser();
      const scene = await createTestScene(user.id);
      const area = await createTestSceneArea(scene.id, { name: 'Room' });
      const asset = await createTestAsset(user.id, { name: 'Magic Sword' });
      await linkTestAssetToArea(area.id, asset.id, {
        position: 'on the pedestal',
      });

      const context = await buildSceneContext(scene.id);

      expect(context).toContain('Magic Sword');
      expect(context).toContain('on the pedestal');
    });

    it('should include connections in context', async () => {
      const user = await createTestUser();
      const scene = await createTestScene(user.id);
      const area1 = await createTestSceneArea(scene.id, { name: 'Room 1' });
      const area2 = await createTestSceneArea(scene.id, { name: 'Room 2' });
      await createTestSceneAreaConnection(area1.id, area2.id, {
        direction: 'North',
      });

      const context = await buildSceneContext(scene.id);

      expect(context).toContain('**Exits:**');
      expect(context).toContain('Room 2');
      expect(context).toContain('(North)');
    });

    it('should return empty string for non-existent scene', async () => {
      const context = await buildSceneContext('non-existent-id');
      expect(context).toBe('');
    });
  });

  describe('buildAreaContext', () => {
    it('should build context for area', async () => {
      const user = await createTestUser();
      const scene = await createTestScene(user.id, {
        name: 'Dark Castle',
        shortDescription: 'A scary place',
      });
      const area = await createTestSceneArea(scene.id, {
        name: 'Throne Room',
        description: 'The grand throne room',
      });

      const context = await buildAreaContext(area.id);

      expect(context).toContain('# Throne Room');
      expect(context).toContain('The grand throne room');
      expect(context).toContain('**Location:** Dark Castle');
      expect(context).toContain('(A scary place)');
    });

    it('should include assets separated by visibility', async () => {
      const user = await createTestUser();
      const scene = await createTestScene(user.id);
      const area = await createTestSceneArea(scene.id);
      const asset1 = await createTestAsset(user.id, { name: 'Visible Item' });
      const asset2 = await createTestAsset(user.id, { name: 'Hidden Item' });
      await linkTestAssetToArea(area.id, asset1.id, { isHidden: false });
      await linkTestAssetToArea(area.id, asset2.id, {
        isHidden: true,
        discoveryHint: 'Search behind the painting',
      });

      const context = await buildAreaContext(area.id);

      expect(context).toContain('## Items:');
      expect(context).toContain('Visible Item');
      expect(context).toContain('## Hidden Items:');
      expect(context).toContain('Hidden Item');
      expect(context).toContain('[Hint: Search behind the painting]');
    });

    it('should include exits and entrances', async () => {
      const user = await createTestUser();
      const scene = await createTestScene(user.id);
      const area1 = await createTestSceneArea(scene.id, { name: 'Room 1' });
      const area2 = await createTestSceneArea(scene.id, { name: 'Room 2' });
      await createTestSceneAreaConnection(area1.id, area2.id, {
        direction: 'North',
      });

      const context = await buildAreaContext(area1.id);

      expect(context).toContain('## Exits:');
      expect(context).toContain('Room 2');
    });

    it('should return empty string for non-existent area', async () => {
      const context = await buildAreaContext('non-existent-id');
      expect(context).toBe('');
    });
  });

  describe('isSceneOwner', () => {
    it('should return true for scene owner', async () => {
      const user = await createTestUser();
      const scene = await createTestScene(user.id);

      const isOwner = await isSceneOwner(scene.id, user.id);

      expect(isOwner).toBe(true);
    });

    it('should return false for non-owner', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const scene = await createTestScene(user1.id);

      const isOwner = await isSceneOwner(scene.id, user2.id);

      expect(isOwner).toBe(false);
    });

    it('should return false for non-existent scene', async () => {
      const user = await createTestUser();

      const isOwner = await isSceneOwner('non-existent-id', user.id);

      expect(isOwner).toBe(false);
    });
  });

  describe('getSceneCountByUser', () => {
    it('should return count of user scenes', async () => {
      const user = await createTestUser();
      await createTestScene(user.id);
      await createTestScene(user.id);
      await createTestScene(user.id);

      const count = await getSceneCountByUser(user.id);

      expect(count).toBe(3);
    });

    it('should return 0 for user with no scenes', async () => {
      const user = await createTestUser();

      const count = await getSceneCountByUser(user.id);

      expect(count).toBe(0);
    });
  });

  describe('getPublicScenes', () => {
    it('should return only public scenes', async () => {
      const user = await createTestUser();
      await createTestScene(user.id, { visibility: Visibility.PUBLIC });
      await createTestScene(user.id, { visibility: Visibility.PRIVATE });
      await createTestScene(user.id, { visibility: Visibility.PUBLIC });

      const scenes = await getPublicScenes();

      expect(scenes).toHaveLength(2);
      expect(scenes.every(s => s.visibility === Visibility.PUBLIC)).toBe(true);
    });

    it('should filter public scenes by genre', async () => {
      const user = await createTestUser();
      await createTestScene(user.id, {
        visibility: Visibility.PUBLIC,
        genre: 'Fantasy',
      });
      await createTestScene(user.id, {
        visibility: Visibility.PUBLIC,
        genre: 'Sci-Fi',
      });

      const scenes = await getPublicScenes({ genre: 'Fantasy' });

      expect(scenes).toHaveLength(1);
      expect(scenes[0].genre).toBe('Fantasy');
    });

    it('should search public scenes', async () => {
      const user = await createTestUser();
      await createTestScene(user.id, {
        visibility: Visibility.PUBLIC,
        name: 'Dragon Cave',
      });
      await createTestScene(user.id, {
        visibility: Visibility.PUBLIC,
        name: 'Forest Path',
      });

      const scenes = await getPublicScenes({ search: 'dragon' });

      expect(scenes).toHaveLength(1);
      expect(scenes[0].name).toBe('Dragon Cave');
    });
  });

  describe('toggleFavoriteScene', () => {
    it('should add scene to favorites', async () => {
      const user = await createTestUser();
      const scene = await createTestScene(user.id);

      const result = await toggleFavoriteScene(user.id, scene.id, true);

      expect(result.success).toBe(true);
      expect(result.isFavorite).toBe(true);

      const db = getTestDb();
      const favorite = await db.sceneFavorite.findUnique({
        where: {
          userId_sceneId: { userId: user.id, sceneId: scene.id },
        },
      });
      expect(favorite).toBeDefined();
    });

    it('should remove scene from favorites', async () => {
      const user = await createTestUser();
      const scene = await createTestScene(user.id);

      // Add to favorites first
      await toggleFavoriteScene(user.id, scene.id, true);

      // Remove from favorites
      const result = await toggleFavoriteScene(user.id, scene.id, false);

      expect(result.success).toBe(true);
      expect(result.isFavorite).toBe(false);

      const db = getTestDb();
      const favorite = await db.sceneFavorite.findUnique({
        where: {
          userId_sceneId: { userId: user.id, sceneId: scene.id },
        },
      });
      expect(favorite).toBeNull();
    });

    it('should throw error for non-existent scene', async () => {
      const user = await createTestUser();

      await expect(
        toggleFavoriteScene(user.id, 'non-existent-id', true)
      ).rejects.toThrow('Scene not found');
    });
  });

  describe('getFavoriteScenes', () => {
    it('should return user favorite scenes', async () => {
      const user = await createTestUser();
      const scene1 = await createTestScene(user.id);
      const scene2 = await createTestScene(user.id);

      await toggleFavoriteScene(user.id, scene1.id, true);
      await toggleFavoriteScene(user.id, scene2.id, true);

      const favorites = await getFavoriteScenes(user.id);

      expect(favorites).toHaveLength(2);
      expect(favorites.map(s => s.id)).toEqual(expect.arrayContaining([scene1.id, scene2.id]));
    });

    it('should return empty array for user with no favorites', async () => {
      const user = await createTestUser();

      const favorites = await getFavoriteScenes(user.id);

      expect(favorites).toHaveLength(0);
    });

    it('should support pagination', async () => {
      const user = await createTestUser();
      const scenes = [];
      for (let i = 0; i < 5; i++) {
        const scene = await createTestScene(user.id);
        scenes.push(scene);
        await toggleFavoriteScene(user.id, scene.id, true);
      }

      const page1 = await getFavoriteScenes(user.id, { skip: 0, limit: 2 });
      const page2 = await getFavoriteScenes(user.id, { skip: 2, limit: 2 });

      expect(page1).toHaveLength(2);
      expect(page2).toHaveLength(2);
    });
  });

  describe('getSceneStats', () => {
    it('should return scene stats', async () => {
      const user = await createTestUser();
      const scene = await createTestScene(user.id);
      await createTestSceneArea(scene.id);
      await createTestSceneArea(scene.id);

      const db = getTestDb();
      await db.sceneImage.create({
        data: { sceneId: scene.id, imageUrl: 'https://example.com/img.jpg', imageType: 'COVER' },
      });

      const stats = await getSceneStats(scene.id, user.id);

      expect(stats.id).toBe(scene.id);
      expect(stats.areaCount).toBe(2);
      expect(stats.imageCount).toBe(1);
      expect(stats.isFavoritedByUser).toBe(false);
    });

    it('should include favorite status when user favorited', async () => {
      const user = await createTestUser();
      const scene = await createTestScene(user.id);
      await toggleFavoriteScene(user.id, scene.id, true);

      const stats = await getSceneStats(scene.id, user.id);

      expect(stats.isFavoritedByUser).toBe(true);
    });

    it('should throw error for non-existent scene', async () => {
      const user = await createTestUser();

      await expect(
        getSceneStats('non-existent-id', user.id)
      ).rejects.toThrow('Scene not found');
    });
  });

  describe('Scene Images', () => {
    describe('addSceneImage', () => {
      it('should add image to scene', async () => {
        const user = await createTestUser();
        const scene = await createTestScene(user.id);

        const image = await addSceneImage(scene.id, {
          imageUrl: 'https://example.com/image.jpg',
          imageType: 'COVER',
          caption: 'Test caption',
        });

        expect(image).toBeDefined();
        expect(image.sceneId).toBe(scene.id);
        expect(image.imageUrl).toBe('https://example.com/image.jpg');
        expect(image.imageType).toBe('COVER');
        expect(image.caption).toBe('Test caption');
      });
    });

    describe('updateSceneImage', () => {
      it('should update scene image', async () => {
        const user = await createTestUser();
        const scene = await createTestScene(user.id);
        const image = await addSceneImage(scene.id, {
          imageUrl: 'https://example.com/image.jpg',
          imageType: 'COVER',
        });

        const updated = await updateSceneImage(image.id, {
          imageType: 'MAP',
          caption: 'New caption',
        });

        expect(updated.imageType).toBe('MAP');
        expect(updated.caption).toBe('New caption');
      });
    });

    describe('deleteSceneImage', () => {
      it('should delete scene image', async () => {
        const user = await createTestUser();
        const scene = await createTestScene(user.id);
        const image = await addSceneImage(scene.id, {
          imageUrl: 'https://example.com/image.jpg',
          imageType: 'COVER',
        });

        await deleteSceneImage(image.id);

        const db = getTestDb();
        const count = await db.sceneImage.count({ where: { id: image.id } });
        expect(count).toBe(0);
      });
    });

    describe('getSceneImages', () => {
      it('should return all scene images', async () => {
        const user = await createTestUser();
        const scene = await createTestScene(user.id);
        await addSceneImage(scene.id, {
          imageUrl: 'https://example.com/img1.jpg',
          imageType: 'COVER',
        });
        await addSceneImage(scene.id, {
          imageUrl: 'https://example.com/img2.jpg',
          imageType: 'MAP',
        });

        const images = await getSceneImages(scene.id);

        expect(images).toHaveLength(2);
      });
    });
  });

  describe('Area Images', () => {
    describe('addAreaImage', () => {
      it('should add image to area', async () => {
        const user = await createTestUser();
        const scene = await createTestScene(user.id);
        const area = await createTestSceneArea(scene.id);

        const image = await addAreaImage(area.id, {
          imageUrl: 'https://example.com/image.jpg',
          imageType: 'ENVIRONMENT',
          caption: 'Test caption',
        });

        expect(image).toBeDefined();
        expect(image.areaId).toBe(area.id);
        expect(image.imageUrl).toBe('https://example.com/image.jpg');
        expect(image.imageType).toBe('ENVIRONMENT');
      });
    });

    describe('updateAreaImage', () => {
      it('should update area image', async () => {
        const user = await createTestUser();
        const scene = await createTestScene(user.id);
        const area = await createTestSceneArea(scene.id);
        const image = await addAreaImage(area.id, {
          imageUrl: 'https://example.com/image.jpg',
          imageType: 'ENVIRONMENT',
        });

        const updated = await updateAreaImage(image.id, {
          imageType: 'MAP',
          caption: 'New caption',
        });

        expect(updated.imageType).toBe('MAP');
        expect(updated.caption).toBe('New caption');
      });
    });

    describe('deleteAreaImage', () => {
      it('should delete area image', async () => {
        const user = await createTestUser();
        const scene = await createTestScene(user.id);
        const area = await createTestSceneArea(scene.id);
        const image = await addAreaImage(area.id, {
          imageUrl: 'https://example.com/image.jpg',
          imageType: 'ENVIRONMENT',
        });

        await deleteAreaImage(image.id);

        const db = getTestDb();
        const count = await db.sceneAreaImage.count({ where: { id: image.id } });
        expect(count).toBe(0);
      });
    });

    describe('getAreaImages', () => {
      it('should return all area images', async () => {
        const user = await createTestUser();
        const scene = await createTestScene(user.id);
        const area = await createTestSceneArea(scene.id);
        await addAreaImage(area.id, {
          imageUrl: 'https://example.com/img1.jpg',
          imageType: 'ENVIRONMENT',
        });
        await addAreaImage(area.id, {
          imageUrl: 'https://example.com/img2.jpg',
          imageType: 'MAP',
        });

        const images = await getAreaImages(area.id);

        expect(images).toHaveLength(2);
      });
    });
  });

  describe('Edge Cases & Boundary Conditions', () => {
    it('should handle empty area list in scene context', async () => {
      const user = await createTestUser();
      const scene = await createTestScene(user.id);

      const context = await buildSceneContext(scene.id);

      expect(context).toContain(scene.name);
      expect(context).not.toContain('## Areas:');
    });

    it('should handle area with no connections in area context', async () => {
      const user = await createTestUser();
      const scene = await createTestScene(user.id);
      const area = await createTestSceneArea(scene.id);

      const context = await buildAreaContext(area.id);

      expect(context).toContain(area.name);
      expect(context).not.toContain('## Exits:');
    });

    it('should handle area with no assets', async () => {
      const user = await createTestUser();
      const scene = await createTestScene(user.id);
      const area = await createTestSceneArea(scene.id);

      const context = await buildAreaContext(area.id);

      expect(context).toContain(area.name);
      expect(context).not.toContain('## Items:');
    });

    it('should handle special characters in search', async () => {
      const user = await createTestUser();
      await createTestScene(user.id, { name: "Dragon's Lair" });

      const scenes = await listScenes({ authorId: user.id, search: "Dragon's" });

      expect(scenes).toHaveLength(1);
    });

    it('should handle case-insensitive search', async () => {
      const user = await createTestUser();
      await createTestScene(user.id, { name: 'Dragon Cave' });

      const scenes = await listScenes({ authorId: user.id, search: 'DRAGON' });

      expect(scenes).toHaveLength(1);
    });
  });
});
