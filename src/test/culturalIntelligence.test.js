import { describe, it, expect, beforeEach, vi } from 'vitest';
import { analyzeCulturalContext, CULTURAL_DIMENSIONS, REGIONAL_STYLES } from '../utils/culturalIntelligence';
import * as culturalFeedback from '../utils/culturalFeedback';

vi.mock('../utils/culturalFeedback', () => ({
  getUserCulturalBiasAdjustments: vi.fn(() => ({})),
  submitCulturalFeedback: vi.fn(),
  shouldFlagRecommendation: vi.fn(() => false)
}));

describe('Cultural Intelligence System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('analyzeCulturalContext', () => {
    it('should detect culture from specific greetings', () => {
      const result = analyzeCulturalContext('Namaste, how are you?');
      expect(result.primaryCulture).toBe('india');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should detect culture from regional keywords', () => {
      const result = analyzeCulturalContext('We must maintain harmony and respect the hierarchy.');
      expect(result.primaryCulture).toBe('east-asian');
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it('should detect culture from explicit country mentions', () => {
      const result = analyzeCulturalContext('I am visiting Japan next week.');
      expect(result.primaryCulture).toBe('japan');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should fallback to general if no indicators are found', () => {
      const result = analyzeCulturalContext('Hello, what is the weather today?');
      expect(result.primaryCulture).toBe('general');
    });

    it('should favor current context if detection is weak', () => {
      const result = analyzeCulturalContext('Hello', 'nordic');
      expect(result.primaryCulture).toBe('nordic');
    });

    it('should override current context if detection is very strong', () => {
      const result = analyzeCulturalContext('Konichiwa, how are you?', 'nordic');
      expect(result.primaryCulture).toBe('japan');
    });

    it('should provide cultural dimensions for the detected culture', () => {
      const result = analyzeCulturalContext('Konichiwa');
      expect(result.culturalDimensions).toBeDefined();
      expect(result.culturalDimensions.powerDistance).toBe('high');
    });

    it('should generate appropriate recommendations', () => {
      const result = analyzeCulturalContext('Konichiwa');
      expect(result.recommendations.length).toBeGreaterThan(0);
      const categories = result.recommendations.map(r => r.category);
      expect(categories).toContain('face-saving');
    });

    it('should include a disclaimer and warning', () => {
      const result = analyzeCulturalContext('Konichiwa');
      expect(result.disclaimer).toBeDefined();
      expect(result.warning).toBeDefined();
    });
  });

  describe('Cultural Dimensions and Styles', () => {
    it('should have correct dimension mapping for major cultures', () => {
      expect(CULTURAL_DIMENSIONS.powerDistance.high).toContain('japan');
      expect(CULTURAL_DIMENSIONS.individualism.individualistic).toContain('usa');
    });

    it('should have keywords for regional styles', () => {
      expect(REGIONAL_STYLES['east-asian'].keywords).toContain('hierarchy');
      expect(REGIONAL_STYLES['germanic'].keywords).toContain('efficient');
    });
  });
});
