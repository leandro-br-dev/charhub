/**
 * Asset Service Unit Tests
 * Tests for asset management, character linking, favorites, and search
 */
import {
  createAsset,
  getAssetById,
  listAssets,
  searchAssets,
  updateAsset,
  deleteAsset,
  linkAssetToCharacter,
  unlinkAssetFromCharacter,
  getCharacterAssets,
  buildCharacterAssetContext,
  toggleFavoriteAsset,
  isAssetOwner,
  getFavoriteAssets,
  getAssetStats,
  getAssetCountByUser,
} from '../assetService';
import { setupTestDatabase, cleanDatabase, teardownTestDatabase } from '../../test-utils/database';
import {
  createTestUser,
  createTestCharacter,
} from '../../test-utils/factories';
import { getTestDb } from '../../test-utils/database';
import { AssetType, AssetCategory, Visibility, VisualStyle, ContentTag } from '../../generated/prisma';

describe('AssetService', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('createAsset', () => {
    it('should create a new asset with all fields', async () => {
      const user = await createTestUser();

      const asset = await createAsset({
        name: 'Dragon Sword',
        description: 'A legendary sword wielded by dragons',
        type: AssetType.WEAPON,
        category: AssetCategory.HOLDABLE,
        previewImageUrl: 'https://example.com/sword.jpg',
        style: VisualStyle.ANIME,
        ageRating: 'TWELVE',
        contentTags: [ContentTag.VIOLENCE],
        visibility: Visibility.PUBLIC,
        authorId: user.id,
        originalLanguageCode: 'en',
      });

      expect(asset).toBeDefined();
      expect(asset.id).toBeDefined();
      expect(asset.name).toBe('Dragon Sword');
      expect(asset.type).toBe(AssetType.WEAPON);
      expect(asset.category).toBe(AssetCategory.HOLDABLE);
      expect(asset.authorId).toBe(user.id);
      expect(asset.visibility).toBe(Visibility.PUBLIC);
      expect(asset.contentTags).toEqual([ContentTag.VIOLENCE]);
    });

    it('should create asset with minimal required fields', async () => {
      const user = await createTestUser();

      const asset = await createAsset({
        name: 'Simple Shirt',
        description: 'A basic shirt',
        type: AssetType.CLOTHING,
        category: AssetCategory.WEARABLE,
        authorId: user.id,
      });

      expect(asset).toBeDefined();
      expect(asset.name).toBe('Simple Shirt');
      expect(asset.visibility).toBe(Visibility.PRIVATE); // default
      expect(asset.ageRating).toBe('L'); // default
    });

    it('should create asset with tags', async () => {
      const user = await createTestUser();
      const db = getTestDb();
      const timestamp = Date.now();

      // Create tags
      const tag1 = await db.tag.create({
        data: {
          name: `fantasy-${timestamp}`,
          type: 'ASSET',
          ageRating: 'L',
        },
      });
      const tag2 = await db.tag.create({
        data: {
          name: `medieval-${timestamp}`,
          type: 'ASSET',
          ageRating: 'L',
        },
      });

      const asset = await createAsset({
        name: 'Knight Armor',
        description: 'Shining armor',
        type: AssetType.CLOTHING,
        category: AssetCategory.WEARABLE,
        authorId: user.id,
        tagIds: [tag1.id, tag2.id],
      });

      expect(asset.tags).toHaveLength(2);
      expect(asset.tags[0].tag.name).toBe(`fantasy-${timestamp}`);
      expect(asset.tags[1].tag.name).toBe(`medieval-${timestamp}`);
    });

    it('should create asset with null style when not provided', async () => {
      const user = await createTestUser();

      const asset = await createAsset({
        name: 'Plain Ring',
        description: 'A simple ring',
        type: AssetType.ACCESSORY,
        category: AssetCategory.WEARABLE,
        authorId: user.id,
      });

      expect(asset.style).toBeNull();
    });
  });

  describe('getAssetById', () => {
    it('should return asset with computed fields', async () => {
      const user = await createTestUser();
      const db = getTestDb();

      const createdAsset = await createAsset({
        name: 'Test Asset',
        description: 'Test description',
        type: AssetType.OBJECT,
        category: AssetCategory.HOLDABLE,
        previewImageUrl: 'https://example.com/preview.jpg',
        authorId: user.id,
      });

      // Add an image
      await db.assetImage.create({
        data: {
          assetId: createdAsset.id,
          imageUrl: 'https://example.com/image.webp',
          imageType: 'preview',
          width: 512,
          height: 512,
        },
      });

      const asset = await getAssetById(createdAsset.id);

      expect(asset).not.toBeNull();
      expect(asset?.id).toBe(createdAsset.id);
      expect(asset?.previewUrl).toBe('https://example.com/preview.jpg');
      expect(asset?.thumbnailUrl).toBe('https://example.com/image.webp');
      expect(asset?.format).toBe('WEBP');
    });

    it('should return null for non-existent asset', async () => {
      const asset = await getAssetById('non-existent-id');
      expect(asset).toBeNull();
    });

    it('should include author and images relations', async () => {
      const user = await createTestUser();

      const createdAsset = await createAsset({
        name: 'Test Asset',
        description: 'Test description',
        type: AssetType.CLOTHING,
        category: AssetCategory.WEARABLE,
        authorId: user.id,
      });

      const asset = await getAssetById(createdAsset.id);

      expect(asset?.author).toBeDefined();
      expect(asset?.author.id).toBe(user.id);
      expect(asset?.images).toBeDefined();
      expect(Array.isArray(asset?.images)).toBe(true);
    });
  });

  describe('listAssets', () => {
    let user1: any;
    let user2: any;

    beforeEach(async () => {
      // Create test assets
      user1 = await createTestUser({ email: `user1-${Date.now()}@test.com` });
      user2 = await createTestUser({ email: `user2-${Date.now()}@test.com` });

      await createAsset({
        name: 'Sword',
        description: 'A sharp sword',
        type: AssetType.WEAPON,
        category: AssetCategory.HOLDABLE,
        authorId: user1.id,
        visibility: Visibility.PUBLIC,
      });

      await createAsset({
        name: 'Shield',
        description: 'A sturdy shield',
        type: AssetType.OBJECT,
        category: AssetCategory.HOLDABLE,
        authorId: user1.id,
        visibility: Visibility.PUBLIC,
      });

      await createAsset({
        name: 'Armor',
        description: 'Protective armor',
        type: AssetType.CLOTHING,
        category: AssetCategory.WEARABLE,
        authorId: user2.id,
        visibility: Visibility.PRIVATE,
      });

      await createAsset({
        name: 'Helmet',
        description: 'Head protection',
        type: AssetType.CLOTHING,
        category: AssetCategory.WEARABLE,
        authorId: user1.id,
        visibility: Visibility.PUBLIC,
      });
    });

    it('should list all assets with default pagination', async () => {
      const assets = await listAssets({});

      expect(assets).toHaveLength(4);
      expect(assets[0].name).toBeDefined();
    });

    it('should filter by authorId', async () => {
      const assets = await listAssets({ authorId: user1.id });

      expect(assets.length).toBeGreaterThanOrEqual(2);
      expect(assets.every(a => a.authorId === user1.id)).toBe(true);
    });

    it('should filter by type', async () => {
      const assets = await listAssets({ type: AssetType.CLOTHING });

      expect(assets.length).toBeGreaterThanOrEqual(2);
      expect(assets.every(a => a.type === AssetType.CLOTHING)).toBe(true);
    });

    it('should filter by category', async () => {
      const assets = await listAssets({ category: AssetCategory.WEARABLE });

      expect(assets.length).toBeGreaterThanOrEqual(2);
      expect(assets.every(a => a.category === AssetCategory.WEARABLE)).toBe(true);
    });

    it('should filter by visibility', async () => {
      const assets = await listAssets({ visibility: Visibility.PUBLIC });

      expect(assets.length).toBeGreaterThanOrEqual(3);
      expect(assets.every(a => a.visibility === Visibility.PUBLIC)).toBe(true);
    });

    it('should filter by style', async () => {
      const user = await createTestUser();
      await createAsset({
        name: 'Anime Sword',
        description: 'Anime style sword',
        type: AssetType.WEAPON,
        category: AssetCategory.HOLDABLE,
        authorId: user.id,
        style: VisualStyle.ANIME,
      });

      const assets = await listAssets({ style: VisualStyle.ANIME });

      expect(assets.some(a => a.style === VisualStyle.ANIME)).toBe(true);
    });

    it('should search by name and description', async () => {
      const assets = await listAssets({ search: 'sword' });

      expect(assets.length).toBeGreaterThanOrEqual(1);
      expect(assets.some(a => a.name.toLowerCase().includes('sword') || a.description.toLowerCase().includes('sword'))).toBe(true);
    });

    it('should support multiple type filters', async () => {
      const assets = await listAssets({ type: [AssetType.CLOTHING, AssetType.WEAPON] });

      expect(assets.length).toBeGreaterThanOrEqual(3);
      expect(assets.every(a => a.type === AssetType.CLOTHING || a.type === AssetType.WEAPON)).toBe(true);
    });

    it('should support multiple category filters', async () => {
      const assets = await listAssets({ category: [AssetCategory.WEARABLE, AssetCategory.HOLDABLE] });

      expect(assets.length).toBeGreaterThanOrEqual(4);
    });

    it('should respect skip and limit', async () => {
      const assets = await listAssets({ skip: 1, limit: 2 });

      expect(assets).toHaveLength(2);
    });

    it('should return empty array when no matches', async () => {
      const assets = await listAssets({ search: 'nonexistent' });
      expect(assets).toHaveLength(0);
    });
  });

  describe('searchAssets', () => {
    beforeEach(async () => {
      const user = await createTestUser();

      await createAsset({
        name: 'Fire Sword',
        description: 'A sword made of fire',
        type: AssetType.WEAPON,
        category: AssetCategory.HOLDABLE,
        authorId: user.id,
        visibility: Visibility.PUBLIC,
      });

      await createAsset({
        name: 'Ice Shield',
        description: 'A shield made of ice',
        type: AssetType.OBJECT,
        category: AssetCategory.HOLDABLE,
        authorId: user.id,
        visibility: Visibility.PUBLIC,
      });

      await createAsset({
        name: 'Fire Armor',
        description: 'Armor resistant to fire',
        type: AssetType.CLOTHING,
        category: AssetCategory.WEARABLE,
        authorId: user.id,
        visibility: Visibility.PUBLIC,
      });
    });

    it('should search by name', async () => {
      const assets = await searchAssets('Fire');

      expect(assets.length).toBeGreaterThanOrEqual(2);
      expect(assets.some(a => a.name.includes('Fire'))).toBe(true);
    });

    it('should search by description', async () => {
      const assets = await searchAssets('made of');

      expect(assets.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter by type while searching', async () => {
      const assets = await searchAssets('Fire', { type: AssetType.WEAPON });

      expect(assets.length).toBeGreaterThanOrEqual(1);
      expect(assets.every(a => a.type === AssetType.WEAPON)).toBe(true);
    });

    it('should filter by category while searching', async () => {
      const assets = await searchAssets('Fire', { category: AssetCategory.WEARABLE });

      expect(assets.length).toBeGreaterThanOrEqual(1);
      expect(assets.every(a => a.category === AssetCategory.WEARABLE)).toBe(true);
    });

    it('should filter by authorId while searching', async () => {
      const user = await createTestUser({ email: 'other@test.com' });
      const assets = await searchAssets('Fire', { authorId: user.id });

      expect(assets.length).toBe(0);
    });

    it('should respect pagination', async () => {
      const assets = await searchAssets('Fire', { skip: 0, limit: 1 });

      expect(assets.length).toBeLessThanOrEqual(1);
    });

    it('should handle empty search query', async () => {
      const assets = await searchAssets('');

      expect(assets.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle whitespace-only search query', async () => {
      const assets = await searchAssets('   ');

      expect(assets.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('updateAsset', () => {
    it('should update asset fields', async () => {
      const user = await createTestUser();

      const asset = await createAsset({
        name: 'Old Name',
        description: 'Old description',
        type: AssetType.CLOTHING,
        category: AssetCategory.WEARABLE,
        authorId: user.id,
      });

      const updated = await updateAsset(asset.id, {
        name: 'New Name',
        description: 'New description',
      });

      expect(updated.name).toBe('New Name');
      expect(updated.description).toBe('New description');
      expect(updated.type).toBe(AssetType.CLOTHING); // unchanged
    });

    it('should update asset type and category', async () => {
      const user = await createTestUser();

      const asset = await createAsset({
        name: 'Test Item',
        description: 'Test',
        type: AssetType.CLOTHING,
        category: AssetCategory.WEARABLE,
        authorId: user.id,
      });

      const updated = await updateAsset(asset.id, {
        type: AssetType.WEAPON,
        category: AssetCategory.HOLDABLE,
      });

      expect(updated.type).toBe(AssetType.WEAPON);
      expect(updated.category).toBe(AssetCategory.HOLDABLE);
    });

    it('should update content tags', async () => {
      const user = await createTestUser();

      const asset = await createAsset({
        name: 'Test Item',
        description: 'Test',
        type: AssetType.CLOTHING,
        category: AssetCategory.WEARABLE,
        contentTags: [ContentTag.VIOLENCE],
        authorId: user.id,
      });

      const updated = await updateAsset(asset.id, {
        contentTags: [ContentTag.VIOLENCE, ContentTag.LANGUAGE],
      });

      expect(updated.contentTags).toEqual([ContentTag.VIOLENCE, ContentTag.LANGUAGE]);
    });

    it('should update style', async () => {
      const user = await createTestUser();

      const asset = await createAsset({
        name: 'Test Item',
        description: 'Test',
        type: AssetType.CLOTHING,
        category: AssetCategory.WEARABLE,
        authorId: user.id,
      });

      const updated = await updateAsset(asset.id, {
        style: VisualStyle.REALISTIC,
      });

      expect(updated.style).toBe(VisualStyle.REALISTIC);
    });

    it('should update visibility', async () => {
      const user = await createTestUser();

      const asset = await createAsset({
        name: 'Test Item',
        description: 'Test',
        type: AssetType.CLOTHING,
        category: AssetCategory.WEARABLE,
        authorId: user.id,
        visibility: Visibility.PRIVATE,
      });

      const updated = await updateAsset(asset.id, {
        visibility: Visibility.PUBLIC,
      });

      expect(updated.visibility).toBe(Visibility.PUBLIC);
    });

    it('should replace tags', async () => {
      const user = await createTestUser();
      const db = getTestDb();
      const timestamp = Date.now();

      const tag1 = await db.tag.create({
        data: { name: `tag1-${timestamp}`, type: 'ASSET', ageRating: 'L' },
      });
      const tag2 = await db.tag.create({
        data: { name: `tag2-${timestamp}`, type: 'ASSET', ageRating: 'L' },
      });
      const tag3 = await db.tag.create({
        data: { name: `tag3-${timestamp}`, type: 'ASSET', ageRating: 'L' },
      });

      const asset = await createAsset({
        name: 'Test Item',
        description: 'Test',
        type: AssetType.CLOTHING,
        category: AssetCategory.WEARABLE,
        authorId: user.id,
        tagIds: [tag1.id, tag2.id],
      });

      const updated = await updateAsset(asset.id, {
        tagIds: [tag2.id, tag3.id],
      });

      expect(updated.tags).toHaveLength(2);
      const tagIds = updated.tags.map(t => t.tagId);
      expect(tagIds).toContain(tag2.id);
      expect(tagIds).toContain(tag3.id);
      expect(tagIds).not.toContain(tag1.id);
    });
  });

  describe('deleteAsset', () => {
    it('should delete asset', async () => {
      const user = await createTestUser();

      const asset = await createAsset({
        name: 'To Delete',
        description: 'This will be deleted',
        type: AssetType.CLOTHING,
        category: AssetCategory.WEARABLE,
        authorId: user.id,
      });

      await deleteAsset(asset.id);

      const deleted = await getAssetById(asset.id);
      expect(deleted).toBeNull();
    });

    it('should throw error for non-existent asset', async () => {
      await expect(
        deleteAsset('non-existent-id')
      ).rejects.toThrow();
    });
  });

  describe('linkAssetToCharacter', () => {
    it('should link asset to character with placement info', async () => {
      const user = await createTestUser();
      const character = await createTestCharacter(user.id);

      const asset = await createAsset({
        name: 'Ring',
        description: 'A magic ring',
        type: AssetType.ACCESSORY,
        category: AssetCategory.WEARABLE,
        authorId: user.id,
      });

      const link = await linkAssetToCharacter(character.id, asset.id, {
        placementZone: 'HAND',
        placementDetail: 'Left hand, ring finger',
        contextNote: 'Always worn',
        isVisible: true,
        isPrimary: true,
        displayOrder: 1,
      });

      expect(link).toBeDefined();
      expect(link.characterId).toBe(character.id);
      expect(link.assetId).toBe(asset.id);
      expect(link.placementZone).toBe('HAND');
      expect(link.placementDetail).toBe('Left hand, ring finger');
      expect(link.contextNote).toBe('Always worn');
      expect(link.isVisible).toBe(true);
      expect(link.isPrimary).toBe(true);
      expect(link.displayOrder).toBe(1);
    });

    it('should link asset to character with defaults', async () => {
      const user = await createTestUser();
      const character = await createTestCharacter(user.id);

      const asset = await createAsset({
        name: 'Sword',
        description: 'A sword',
        type: AssetType.WEAPON,
        category: AssetCategory.HOLDABLE,
        authorId: user.id,
      });

      const link = await linkAssetToCharacter(character.id, asset.id);

      expect(link.isVisible).toBe(true); // default
      expect(link.isPrimary).toBe(false); // default
      expect(link.displayOrder).toBe(0); // default
    });

    it('should include asset and character in response', async () => {
      const user = await createTestUser();
      const character = await createTestCharacter(user.id);

      const asset = await createAsset({
        name: 'Test Item',
        description: 'Test',
        type: AssetType.CLOTHING,
        category: AssetCategory.WEARABLE,
        authorId: user.id,
      });

      const link = await linkAssetToCharacter(character.id, asset.id);

      expect(link.asset).toBeDefined();
      expect(link.asset.id).toBe(asset.id);
      expect(link.character).toBeDefined();
      expect(link.character.id).toBe(character.id);
    });
  });

  describe('unlinkAssetFromCharacter', () => {
    it('should unlink asset from character', async () => {
      const user = await createTestUser();
      const character = await createTestCharacter(user.id);

      const asset = await createAsset({
        name: 'Test Item',
        description: 'Test',
        type: AssetType.CLOTHING,
        category: AssetCategory.WEARABLE,
        authorId: user.id,
      });

      await linkAssetToCharacter(character.id, asset.id);
      await unlinkAssetFromCharacter(character.id, asset.id);

      const characterAssets = await getCharacterAssets(character.id);
      expect(characterAssets).toHaveLength(0);
    });

    it('should throw error for non-existent link', async () => {
      await expect(
        unlinkAssetFromCharacter('non-existent-char', 'non-existent-asset')
      ).rejects.toThrow();
    });
  });

  describe('getCharacterAssets', () => {
    it('should return all assets for a character', async () => {
      const user = await createTestUser();
      const character = await createTestCharacter(user.id);

      const asset1 = await createAsset({
        name: 'Sword',
        description: 'A sword',
        type: AssetType.WEAPON,
        category: AssetCategory.HOLDABLE,
        authorId: user.id,
      });

      const asset2 = await createAsset({
        name: 'Shield',
        description: 'A shield',
        type: AssetType.OBJECT,
        category: AssetCategory.HOLDABLE,
        authorId: user.id,
      });

      await linkAssetToCharacter(character.id, asset1.id);
      await linkAssetToCharacter(character.id, asset2.id);

      const characterAssets = await getCharacterAssets(character.id);

      expect(characterAssets).toHaveLength(2);
      expect(characterAssets[0].asset).toBeDefined();
      expect(characterAssets[1].asset).toBeDefined();
    });

    it('should return empty array for character with no assets', async () => {
      const user = await createTestUser();
      const character = await createTestCharacter(user.id);

      const characterAssets = await getCharacterAssets(character.id);

      expect(characterAssets).toHaveLength(0);
    });

    it('should order by displayOrder then createdAt', async () => {
      const user = await createTestUser();
      const character = await createTestCharacter(user.id);

      const asset1 = await createAsset({
        name: 'Asset 1',
        description: 'First',
        type: AssetType.CLOTHING,
        category: AssetCategory.WEARABLE,
        authorId: user.id,
      });

      const asset2 = await createAsset({
        name: 'Asset 2',
        description: 'Second',
        type: AssetType.CLOTHING,
        category: AssetCategory.WEARABLE,
        authorId: user.id,
      });

      const asset3 = await createAsset({
        name: 'Asset 3',
        description: 'Third',
        type: AssetType.CLOTHING,
        category: AssetCategory.WEARABLE,
        authorId: user.id,
      });

      // Link in specific order
      await linkAssetToCharacter(character.id, asset1.id, { displayOrder: 2 });
      await linkAssetToCharacter(character.id, asset2.id, { displayOrder: 1 });
      await linkAssetToCharacter(character.id, asset3.id, { displayOrder: 0 });

      const characterAssets = await getCharacterAssets(character.id);

      expect(characterAssets[0].asset.name).toBe('Asset 3');
      expect(characterAssets[1].asset.name).toBe('Asset 2');
      expect(characterAssets[2].asset.name).toBe('Asset 1');
    });
  });

  describe('buildCharacterAssetContext', () => {
    it('should build context for wearable assets', async () => {
      const user = await createTestUser();
      const character = await createTestCharacter(user.id);

      const shirt = await createAsset({
        name: 'Silk Shirt',
        description: 'Elegant white shirt',
        type: AssetType.CLOTHING,
        category: AssetCategory.WEARABLE,
        authorId: user.id,
      });

      await linkAssetToCharacter(character.id, shirt.id, {
        placementDetail: 'Torso',
      });

      const context = await buildCharacterAssetContext(character.id);

      expect(context).toContain('## Worn Items:');
      expect(context).toContain('Silk Shirt');
      expect(context).toContain('(on Torso)');
      expect(context).toContain('Elegant white shirt');
    });

    it('should build context for holdable assets', async () => {
      const user = await createTestUser();
      const character = await createTestCharacter(user.id);

      const sword = await createAsset({
        name: 'Knight Sword',
        description: 'Sharp steel blade',
        type: AssetType.WEAPON,
        category: AssetCategory.HOLDABLE,
        authorId: user.id,
      });

      await linkAssetToCharacter(character.id, sword.id, {
        placementDetail: 'Right hand',
      });

      const context = await buildCharacterAssetContext(character.id);

      expect(context).toContain('## Held Items:');
      expect(context).toContain('Knight Sword');
      expect(context).toContain('(in Right hand)');
      expect(context).toContain('Sharp steel blade');
    });

    it('should build context for environmental assets', async () => {
      const user = await createTestUser();
      const character = await createTestCharacter(user.id);

      const chair = await createAsset({
        name: 'Throne',
        description: 'Golden throne',
        type: AssetType.FURNITURE,
        category: AssetCategory.ENVIRONMENTAL,
        authorId: user.id,
      });

      await linkAssetToCharacter(character.id, chair.id, {
        contextNote: 'Character always sits on this throne',
      });

      const context = await buildCharacterAssetContext(character.id);

      expect(context).toContain('## Environmental Items:');
      expect(context).toContain('Throne');
      expect(context).toContain('Golden throne');
      expect(context).toContain('[Character always sits on this throne]');
    });

    it('should include hidden indicator for invisible assets', async () => {
      const user = await createTestUser();
      const character = await createTestCharacter(user.id);

      const scar = await createAsset({
        name: 'Hidden Scar',
        description: 'A secret scar',
        type: AssetType.SCAR,
        category: AssetCategory.WEARABLE,
        authorId: user.id,
      });

      await linkAssetToCharacter(character.id, scar.id, {
        isVisible: false,
      });

      const context = await buildCharacterAssetContext(character.id);

      expect(context).toContain('(hidden/secret)');
    });

    it('should return empty string for character with no assets', async () => {
      const user = await createTestUser();
      const character = await createTestCharacter(user.id);

      const context = await buildCharacterAssetContext(character.id);

      expect(context).toBe('');
    });

    it('should combine all asset categories', async () => {
      const user = await createTestUser();
      const character = await createTestCharacter(user.id);

      const shirt = await createAsset({
        name: 'Shirt',
        description: 'Clothing',
        type: AssetType.CLOTHING,
        category: AssetCategory.WEARABLE,
        authorId: user.id,
      });

      const sword = await createAsset({
        name: 'Sword',
        description: 'Weapon',
        type: AssetType.WEAPON,
        category: AssetCategory.HOLDABLE,
        authorId: user.id,
      });

      const throne = await createAsset({
        name: 'Throne',
        description: 'Furniture',
        type: AssetType.FURNITURE,
        category: AssetCategory.ENVIRONMENTAL,
        authorId: user.id,
      });

      await linkAssetToCharacter(character.id, shirt.id);
      await linkAssetToCharacter(character.id, sword.id);
      await linkAssetToCharacter(character.id, throne.id);

      const context = await buildCharacterAssetContext(character.id);

      expect(context).toContain('## Worn Items:');
      expect(context).toContain('## Held Items:');
      expect(context).toContain('## Environmental Items:');
    });
  });

  describe('toggleFavoriteAsset', () => {
    it('should add asset to favorites', async () => {
      const user = await createTestUser();

      const asset = await createAsset({
        name: 'Test Item',
        description: 'Test',
        type: AssetType.CLOTHING,
        category: AssetCategory.WEARABLE,
        authorId: user.id,
      });

      const result = await toggleFavoriteAsset(user.id, asset.id, true);

      expect(result.success).toBe(true);
      expect(result.isFavorite).toBe(true);
    });

    it('should remove asset from favorites', async () => {
      const user = await createTestUser();

      const asset = await createAsset({
        name: 'Test Item',
        description: 'Test',
        type: AssetType.CLOTHING,
        category: AssetCategory.WEARABLE,
        authorId: user.id,
      });

      await toggleFavoriteAsset(user.id, asset.id, true);
      const result = await toggleFavoriteAsset(user.id, asset.id, false);

      expect(result.success).toBe(true);
      expect(result.isFavorite).toBe(false);
    });

    it('should be idempotent when adding favorite', async () => {
      const user = await createTestUser();

      const asset = await createAsset({
        name: 'Test Item',
        description: 'Test',
        type: AssetType.CLOTHING,
        category: AssetCategory.WEARABLE,
        authorId: user.id,
      });

      await toggleFavoriteAsset(user.id, asset.id, true);
      const result = await toggleFavoriteAsset(user.id, asset.id, true);

      expect(result.success).toBe(true);
      expect(result.isFavorite).toBe(true);
    });

    it('should throw error for non-existent asset', async () => {
      const user = await createTestUser();

      await expect(
        toggleFavoriteAsset(user.id, 'non-existent-id', true)
      ).rejects.toThrow('Asset not found');
    });
  });

  describe('getFavoriteAssets', () => {
    it('should return user favorite assets', async () => {
      const user = await createTestUser();

      const asset1 = await createAsset({
        name: 'Favorite 1',
        description: 'First favorite',
        type: AssetType.CLOTHING,
        category: AssetCategory.WEARABLE,
        authorId: user.id,
      });

      const asset2 = await createAsset({
        name: 'Favorite 2',
        description: 'Second favorite',
        type: AssetType.CLOTHING,
        category: AssetCategory.WEARABLE,
        authorId: user.id,
      });

      await toggleFavoriteAsset(user.id, asset1.id, true);
      await toggleFavoriteAsset(user.id, asset2.id, true);

      const favorites = await getFavoriteAssets(user.id);

      expect(favorites).toHaveLength(2);
      expect(favorites.some(f => f.id === asset1.id)).toBe(true);
      expect(favorites.some(f => f.id === asset2.id)).toBe(true);
    });

    it('should return empty array for user with no favorites', async () => {
      const user = await createTestUser();

      const favorites = await getFavoriteAssets(user.id);

      expect(favorites).toHaveLength(0);
    });

    it('should respect pagination', async () => {
      const user = await createTestUser();

      for (let i = 0; i < 5; i++) {
        const asset = await createAsset({
          name: `Asset ${i}`,
          description: `Description ${i}`,
          type: AssetType.CLOTHING,
          category: AssetCategory.WEARABLE,
          authorId: user.id,
        });
        await toggleFavoriteAsset(user.id, asset.id, true);
      }

      const page1 = await getFavoriteAssets(user.id, { skip: 0, limit: 2 });
      const page2 = await getFavoriteAssets(user.id, { skip: 2, limit: 2 });

      expect(page1).toHaveLength(2);
      expect(page2).toHaveLength(2);
    });

    it('should return favorites in reverse chronological order', async () => {
      const user = await createTestUser();

      const asset1 = await createAsset({
        name: 'First',
        description: 'First',
        type: AssetType.CLOTHING,
        category: AssetCategory.WEARABLE,
        authorId: user.id,
      });

      const asset2 = await createAsset({
        name: 'Second',
        description: 'Second',
        type: AssetType.CLOTHING,
        category: AssetCategory.WEARABLE,
        authorId: user.id,
      });

      await toggleFavoriteAsset(user.id, asset1.id, true);
      // Add delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      await toggleFavoriteAsset(user.id, asset2.id, true);

      const favorites = await getFavoriteAssets(user.id);

      expect(favorites[0].id).toBe(asset2.id);
      expect(favorites[1].id).toBe(asset1.id);
    });
  });

  describe('getAssetStats', () => {
    it('should return asset stats without user', async () => {
      const user = await createTestUser();

      const asset = await createAsset({
        name: 'Test Item',
        description: 'Test',
        type: AssetType.CLOTHING,
        category: AssetCategory.WEARABLE,
        authorId: user.id,
      });

      const stats = await getAssetStats(asset.id);

      expect(stats.id).toBe(asset.id);
      expect(stats.isFavoritedByUser).toBe(false);
      expect(stats.characterCount).toBe(0);
      expect(stats.imageCount).toBe(0);
    });

    it('should include favorite status for user', async () => {
      const user = await createTestUser();

      const asset = await createAsset({
        name: 'Test Item',
        description: 'Test',
        type: AssetType.CLOTHING,
        category: AssetCategory.WEARABLE,
        authorId: user.id,
      });

      await toggleFavoriteAsset(user.id, asset.id, true);

      const stats = await getAssetStats(asset.id, user.id);

      expect(stats.isFavoritedByUser).toBe(true);
    });

    it('should count character usage', async () => {
      const user = await createTestUser();
      const character1 = await createTestCharacter(user.id);
      const character2 = await createTestCharacter(user.id);

      const asset = await createAsset({
        name: 'Test Item',
        description: 'Test',
        type: AssetType.CLOTHING,
        category: AssetCategory.WEARABLE,
        authorId: user.id,
      });

      await linkAssetToCharacter(character1.id, asset.id);
      await linkAssetToCharacter(character2.id, asset.id);

      const stats = await getAssetStats(asset.id);

      expect(stats.characterCount).toBe(2);
    });

    it('should count images', async () => {
      const user = await createTestUser();
      const db = getTestDb();

      const asset = await createAsset({
        name: 'Test Item',
        description: 'Test',
        type: AssetType.CLOTHING,
        category: AssetCategory.WEARABLE,
        authorId: user.id,
      });

      await db.assetImage.create({
        data: {
          assetId: asset.id,
          imageUrl: 'https://example.com/image1.jpg',
          imageType: 'preview',
          width: 512,
          height: 512,
        },
      });

      await db.assetImage.create({
        data: {
          assetId: asset.id,
          imageUrl: 'https://example.com/image2.jpg',
          imageType: 'reference',
          width: 512,
          height: 512,
        },
      });

      const stats = await getAssetStats(asset.id);

      expect(stats.imageCount).toBe(2);
    });

    it('should throw error for non-existent asset', async () => {
      await expect(
        getAssetStats('non-existent-id')
      ).rejects.toThrow('Asset not found');
    });
  });

  describe('isAssetOwner', () => {
    it('should return true for owner', async () => {
      const user = await createTestUser();

      const asset = await createAsset({
        name: 'Test Item',
        description: 'Test',
        type: AssetType.CLOTHING,
        category: AssetCategory.WEARABLE,
        authorId: user.id,
      });

      const isOwner = await isAssetOwner(asset.id, user.id);

      expect(isOwner).toBe(true);
    });

    it('should return false for non-owner', async () => {
      const user1 = await createTestUser({ email: 'user1@test.com' });
      const user2 = await createTestUser({ email: 'user2@test.com' });

      const asset = await createAsset({
        name: 'Test Item',
        description: 'Test',
        type: AssetType.CLOTHING,
        category: AssetCategory.WEARABLE,
        authorId: user1.id,
      });

      const isOwner = await isAssetOwner(asset.id, user2.id);

      expect(isOwner).toBe(false);
    });

    it('should return false for non-existent asset', async () => {
      const user = await createTestUser();

      const isOwner = await isAssetOwner('non-existent-id', user.id);

      expect(isOwner).toBe(false);
    });
  });

  describe('getAssetCountByUser', () => {
    it('should return count of user assets', async () => {
      const user = await createTestUser();

      await createAsset({
        name: 'Asset 1',
        description: 'First',
        type: AssetType.CLOTHING,
        category: AssetCategory.WEARABLE,
        authorId: user.id,
      });

      await createAsset({
        name: 'Asset 2',
        description: 'Second',
        type: AssetType.CLOTHING,
        category: AssetCategory.WEARABLE,
        authorId: user.id,
      });

      await createAsset({
        name: 'Asset 3',
        description: 'Third',
        type: AssetType.CLOTHING,
        category: AssetCategory.WEARABLE,
        authorId: user.id,
      });

      const count = await getAssetCountByUser(user.id);

      expect(count).toBe(3);
    });

    it('should return 0 for user with no assets', async () => {
      const user = await createTestUser();

      const count = await getAssetCountByUser(user.id);

      expect(count).toBe(0);
    });

    it('should only count assets for specific user', async () => {
      const user1 = await createTestUser({ email: 'user1@test.com' });
      const user2 = await createTestUser({ email: 'user2@test.com' });

      await createAsset({
        name: 'User1 Asset',
        description: 'By user1',
        type: AssetType.CLOTHING,
        category: AssetCategory.WEARABLE,
        authorId: user1.id,
      });

      await createAsset({
        name: 'User2 Asset',
        description: 'By user2',
        type: AssetType.CLOTHING,
        category: AssetCategory.WEARABLE,
        authorId: user2.id,
      });

      const count1 = await getAssetCountByUser(user1.id);
      const count2 = await getAssetCountByUser(user2.id);

      expect(count1).toBe(1);
      expect(count2).toBe(1);
    });
  });

  describe('Edge Cases & Boundary Conditions', () => {
    it('should handle special characters in search', async () => {
      const user = await createTestUser();

      await createAsset({
        name: 'Dragon\'s Sword',
        description: 'A sword with fire & flames',
        type: AssetType.WEAPON,
        category: AssetCategory.HOLDABLE,
        authorId: user.id,
        visibility: Visibility.PUBLIC,
      });

      const assets = await listAssets({ search: 'fire & flames' });

      expect(assets.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle case-insensitive search', async () => {
      const user = await createTestUser();

      await createAsset({
        name: 'DRAGON SWORD',
        description: 'Legendary weapon',
        type: AssetType.WEAPON,
        category: AssetCategory.HOLDABLE,
        authorId: user.id,
        visibility: Visibility.PUBLIC,
      });

      const assets = await listAssets({ search: 'dragon sword' });

      expect(assets.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle unicode characters in asset names', async () => {
      const user = await createTestUser();

      const asset = await createAsset({
        name: '日本刀 - Katana',
        description: 'Japanese sword',
        type: AssetType.WEAPON,
        category: AssetCategory.HOLDABLE,
        authorId: user.id,
      });

      expect(asset.name).toBe('日本刀 - Katana');
    });

    it('should handle very long descriptions', async () => {
      const user = await createTestUser();
      const longDescription = 'A'.repeat(5000);

      const asset = await createAsset({
        name: 'Test Item',
        description: longDescription,
        type: AssetType.CLOTHING,
        category: AssetCategory.WEARABLE,
        authorId: user.id,
      });

      expect(asset.description).toBe(longDescription);
    });

    it('should handle all asset types', async () => {
      const user = await createTestUser();

      const types = [
        AssetType.CLOTHING,
        AssetType.ACCESSORY,
        AssetType.SCAR,
        AssetType.HAIRSTYLE,
        AssetType.OBJECT,
        AssetType.WEAPON,
        AssetType.VEHICLE,
        AssetType.FURNITURE,
        AssetType.PROP,
      ];

      for (const type of types) {
        await createAsset({
          name: `Test ${type}`,
          description: `A ${type}`,
          type,
          category: AssetCategory.WEARABLE,
          authorId: user.id,
        });
      }

      const count = await getAssetCountByUser(user.id);
      expect(count).toBe(types.length);
    });

    it('should handle all asset categories', async () => {
      const user = await createTestUser();

      const categories = [
        AssetCategory.WEARABLE,
        AssetCategory.HOLDABLE,
        AssetCategory.ENVIRONMENTAL,
      ];

      for (const category of categories) {
        await createAsset({
          name: `Test ${category}`,
          description: `A ${category}`,
          type: AssetType.OBJECT,
          category,
          authorId: user.id,
        });
      }

      const count = await getAssetCountByUser(user.id);
      expect(count).toBe(categories.length);
    });
  });
});
