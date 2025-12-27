/**
 * Duplicate Detector Tests
 */

import { DuplicateDetector, type ImageSignature } from '../duplicateDetector';

describe('DuplicateDetector', () => {
  let detector: DuplicateDetector;

  beforeEach(() => {
    detector = new DuplicateDetector();
  });

  describe('addSignature', () => {
    it('should add image signature', () => {
      const signature: ImageSignature = {
        id: 'img1',
        url: 'https://example.com/img1.jpg',
        tags: ['anime', 'girl'],
      };

      detector.addSignature(signature);
      expect(detector.getCount()).toBe(1);
    });

    it('should add multiple signatures', () => {
      const signatures: ImageSignature[] = [
        { id: 'img1', url: 'url1', tags: ['tag1'] },
        { id: 'img2', url: 'url2', tags: ['tag2'] },
      ];

      detector.addSignatures(signatures);
      expect(detector.getCount()).toBe(2);
    });
  });

  describe('checkDuplicate', () => {
    beforeEach(() => {
      detector.addSignature({
        id: 'existing1',
        url: 'https://example.com/existing.jpg',
        tags: ['anime', 'fantasy', 'girl', 'magic'],
        author: 'artist1',
        style: 'anime',
        species: 'human',
        gender: 'female',
      });
    });

    it('should detect exact URL duplicate', async () => {
      const result = await detector.checkDuplicate({
        url: 'https://example.com/existing.jpg',
        tags: [],
      });

      expect(result.isDuplicate).toBe(true);
      expect(result.similarity).toBeGreaterThanOrEqual(0.85);
      expect(result.matchId).toBe('existing1');
    });

    it('should detect high tag overlap', async () => {
      const result = await detector.checkDuplicate({
        url: 'https://example.com/different.jpg',
        tags: ['anime', 'fantasy', 'girl', 'magic', 'elf'], // 80% overlap
        style: 'anime',
        species: 'human',
        gender: 'female',
      });

      // With different URLs, similarity is lower but still significant due to tag/metadata overlap
      expect(result.similarity).toBeGreaterThanOrEqual(0.5);
      expect(result.similarity).toBeLessThan(0.85); // Below duplicate threshold
    });

    it('should not detect duplicate for different image', async () => {
      const result = await detector.checkDuplicate({
        url: 'https://example.com/completely-different.jpg',
        tags: ['realistic', 'landscape', 'nature'],
        style: 'realistic',
        species: 'none',
        gender: 'none',
      });

      expect(result.isDuplicate).toBe(false);
      expect(result.similarity).toBeLessThan(0.85);
    });

    it('should return similarity score', async () => {
      const result = await detector.checkDuplicate({
        url: 'https://example.com/similar.jpg',
        tags: ['anime', 'fantasy'],
        style: 'anime',
      });

      expect(result.similarity).toBeGreaterThanOrEqual(0);
      expect(result.similarity).toBeLessThanOrEqual(1);
      expect(result.reason).toBeDefined();
    });
  });

  describe('checkBatch', () => {
    beforeEach(() => {
      detector.addSignatures([
        { id: 'img1', url: 'url1', tags: ['tag1', 'tag2'] },
        { id: 'img2', url: 'url2', tags: ['tag3', 'tag4'] },
      ]);
    });

    it('should check batch for duplicates against existing', async () => {
      const batch = [
        { id: 'new1', url: 'url1', tags: ['tag1', 'tag2'] }, // Duplicate
        { id: 'new2', url: 'url3', tags: ['tag5'] }, // New
      ];

      const results = await detector.checkBatch(batch);

      expect(results.get('new1')?.isDuplicate).toBe(true);
      expect(results.get('new2')?.isDuplicate).toBe(false);
    });

    it('should detect internal duplicates within batch', async () => {
      const batch = [
        { id: 'new1', url: 'url-new1', tags: ['unique1'] },
        { id: 'new2', url: 'url-new1', tags: ['unique1'] }, // Same as new1
      ];

      const results = await detector.checkBatch(batch);

      expect(results.get('new2')?.isDuplicate).toBe(true);
      expect(results.get('new2')?.matchId).toBe('new1');
    });

    it('should add non-duplicates to database', async () => {
      const initialCount = detector.getCount();

      const batch = [
        { id: 'new1', url: 'url-unique1', tags: ['unique'] },
        { id: 'new2', url: 'url-unique2', tags: ['unique'] },
      ];

      await detector.checkBatch(batch);

      // Should have added non-duplicates
      expect(detector.getCount()).toBeGreaterThan(initialCount);
    });
  });

  describe('removeSignature', () => {
    it('should remove signature by ID', () => {
      detector.addSignature({ id: 'img1', url: 'url1', tags: [] });
      expect(detector.getCount()).toBe(1);

      const removed = detector.removeSignature('img1');
      expect(removed).toBe(true);
      expect(detector.getCount()).toBe(0);
    });

    it('should return false for non-existent ID', () => {
      const removed = detector.removeSignature('non-existent');
      expect(removed).toBe(false);
    });
  });

  describe('clearSignatures', () => {
    it('should clear all signatures', () => {
      detector.addSignatures([
        { id: 'img1', url: 'url1', tags: [] },
        { id: 'img2', url: 'url2', tags: [] },
      ]);

      detector.clearSignatures();
      expect(detector.getCount()).toBe(0);
    });
  });

  describe('similarity calculation', () => {
    it('should calculate higher similarity for matching metadata', async () => {
      detector.addSignature({
        id: 'ref',
        url: 'url-ref',
        tags: ['anime', 'girl'],
        author: 'artist1',
        style: 'anime',
        species: 'human',
        gender: 'female',
      });

      // High match
      const highMatch = await detector.checkDuplicate({
        url: 'url-diff',
        tags: ['anime', 'girl'],
        author: 'artist1',
        style: 'anime',
        species: 'human',
        gender: 'female',
      });

      // Low match
      const lowMatch = await detector.checkDuplicate({
        url: 'url-diff2',
        tags: ['realistic'],
        author: 'artist2',
        style: 'realistic',
        species: 'elf',
        gender: 'male',
      });

      expect(highMatch.similarity).toBeGreaterThan(lowMatch.similarity);
    });
  });
});
