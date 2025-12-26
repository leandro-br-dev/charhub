/**
 * Quality Scorer Tests
 */

import { QualityScorer } from '../qualityScorer';

describe('QualityScorer', () => {
  let scorer: QualityScorer;

  beforeEach(() => {
    scorer = new QualityScorer();
  });

  describe('scoreQuality', () => {
    it('should score high-quality complete analysis', () => {
      const analysis = {
        description: 'A detailed and comprehensive description of the character image with lots of information.',
        overallDescription: 'An anime-style character with distinctive features and detailed clothing, rendered in a fantasy setting with magical elements.',
        physicalCharacteristics: {
          hairColor: 'silver',
          eyeColor: 'blue',
          height: 'average',
          build: 'athletic',
          distinctiveFeatures: ['pointed ears', 'magical tattoo'],
          species: 'elf',
          gender: 'female',
        },
        visualStyle: {
          artStyle: 'anime',
          mood: 'mysterious',
          colorPalette: 'cool tones',
        },
        clothing: {
          outfit: 'fantasy robes',
          style: 'magical',
          accessories: ['staff', 'crystal pendant'],
        },
        suggestedTraits: {
          suggestedOccupation: 'mage',
          archetype: 'wizard',
        },
      };

      const result = scorer.scoreQuality(analysis);

      expect(result.score).toBeGreaterThan(3.5);
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.recommendation).toBe('approve');
      expect(result.factors).toMatchObject({
        composition: expect.any(Number),
        clarity: expect.any(Number),
        creativity: expect.any(Number),
        technical: expect.any(Number),
      });
      expect(result.reasoning).toBeInstanceOf(Array);
    });

    it('should score low-quality incomplete analysis', () => {
      const analysis = {
        description: 'Unable to analyze',
        overallDescription: 'Error',
      };

      const result = scorer.scoreQuality(analysis);

      expect(result.score).toBeLessThan(2.5);
      expect(result.recommendation).toBe('reject');
    });

    it('should score medium-quality analysis for review', () => {
      const analysis = {
        description: 'A character image',
        overallDescription: 'An anime character with some visible features.',
        physicalCharacteristics: {
          hairColor: 'brown',
        },
        visualStyle: {
          artStyle: 'anime',
        },
      };

      const result = scorer.scoreQuality(analysis);

      expect(result.score).toBeGreaterThan(2.0);
      expect(result.score).toBeLessThan(4.0);
      expect(['review', 'reject']).toContain(result.recommendation);
    });

    it('should boost score for distinctive features', () => {
      const withFeatures = {
        overallDescription: 'A character',
        physicalCharacteristics: {
          hairColor: 'blue',
          distinctiveFeatures: ['horns', 'tail', 'wings'],
        },
      };

      const withoutFeatures = {
        overallDescription: 'A character',
        physicalCharacteristics: {
          hairColor: 'blue',
        },
      };

      const scoreWith = scorer.scoreQuality(withFeatures);
      const scoreWithout = scorer.scoreQuality(withoutFeatures);

      expect(scoreWith.factors.creativity).toBeGreaterThan(scoreWithout.factors.creativity);
    });

    it('should boost score for interesting species', () => {
      const elf = {
        overallDescription: 'A character',
        physicalCharacteristics: {
          species: 'elf',
        },
      };

      const human = {
        overallDescription: 'A character',
        physicalCharacteristics: {
          species: 'human',
        },
      };

      const elfScore = scorer.scoreQuality(elf);
      const humanScore = scorer.scoreQuality(human);

      expect(elfScore.factors.creativity).toBeGreaterThan(humanScore.factors.creativity);
    });

    it('should calculate confidence based on data points', () => {
      const manyDataPoints = {
        description: 'Detailed description',
        overallDescription: 'Very detailed overall description',
        physicalCharacteristics: {
          hairColor: 'red',
          eyeColor: 'green',
          height: 'tall',
          build: 'athletic',
        },
        visualStyle: {
          artStyle: 'anime',
          mood: 'happy',
        },
        clothing: {
          outfit: 'dress',
          style: 'elegant',
        },
      };

      const fewDataPoints = {
        description: 'Basic',
      };

      const highConfidence = scorer.scoreQuality(manyDataPoints);
      const lowConfidence = scorer.scoreQuality(fewDataPoints);

      expect(highConfidence.confidence).toBeGreaterThan(lowConfidence.confidence);
    });

    it('should provide reasoning for score', () => {
      const analysis = {
        overallDescription: 'A detailed character description with lots of information about appearance and style.',
        physicalCharacteristics: {
          hairColor: 'black',
          eyeColor: 'red',
          species: 'demon',
        },
        visualStyle: {
          artStyle: 'anime',
          mood: 'dark',
          colorPalette: 'dark tones',
        },
        clothing: {
          outfit: 'armor',
          style: 'gothic',
        },
      };

      const result = scorer.scoreQuality(analysis);

      expect(result.reasoning.some((r: string) => r.toLowerCase().includes('quality') || r.toLowerCase().includes('detail'))).toBe(true);
      expect(result.reasoning.length).toBeGreaterThan(1);
    });
  });

  describe('getThresholds', () => {
    it('should return current thresholds', () => {
      const thresholds = scorer.getThresholds();

      expect(thresholds).toHaveProperty('approve');
      expect(thresholds).toHaveProperty('review');
      expect(thresholds.approve).toBe(4.0);
      expect(thresholds.review).toBe(2.5);
    });
  });

  describe('setThresholds', () => {
    it('should update thresholds', () => {
      scorer.setThresholds({ approve: 4.5, review: 3.0 });

      const thresholds = scorer.getThresholds();
      expect(thresholds.approve).toBe(4.5);
      expect(thresholds.review).toBe(3.0);
    });

    it('should affect recommendations', () => {
      const analysis = {
        overallDescription: 'A good character with decent detail.',
        physicalCharacteristics: {
          hairColor: 'blonde',
          eyeColor: 'blue',
        },
        visualStyle: {
          artStyle: 'anime',
        },
      };

      // With default thresholds
      const defaultResult = scorer.scoreQuality(analysis);

      // With higher approve threshold
      scorer.setThresholds({ approve: 5.0 });
      const strictResult = scorer.scoreQuality(analysis);

      // Same score, but different recommendation due to threshold
      expect(defaultResult.score).toBe(strictResult.score);
      if (defaultResult.recommendation === 'approve') {
        expect(strictResult.recommendation).not.toBe('approve');
      }
    });
  });

  describe('score boundaries', () => {
    it('should return score between 0 and 5', () => {
      const analyses = [
        { overallDescription: 'x'.repeat(200), physicalCharacteristics: { a: 1, b: 2, c: 3, d: 4, e: 5 } },
        { description: '' },
        { overallDescription: 'Error' },
      ];

      analyses.forEach(analysis => {
        const result = scorer.scoreQuality(analysis);
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(5);
      });
    });

    it('should return confidence between 0 and 1', () => {
      const result = scorer.scoreQuality({
        overallDescription: 'Test',
      });

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });
});
