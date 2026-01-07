import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  analyzeFeedbackTrends, 
  getPersonalizedRecommendations, 
  calculateSocialSuccessScore,
  getSocialSuccessWeights,
  saveSocialSuccessWeights
} from '../utils/feedbackAnalytics';

// Mock encryption utils
vi.mock('../utils/encryption', () => ({
  secureLocalStorageGet: vi.fn(),
  secureLocalStorageSet: vi.fn()
}));

describe('Feedback Analytics', () => {
  const mockFeedbackHistory = [
    {
      suggestion: 'Test suggestion 1',
      feedbackType: 'like',
      persona: 'anxiety',
      culturalContext: 'general',
      timestamp: Date.now() - 10000
    },
    {
      suggestion: 'Test suggestion 2',
      feedbackType: 'like',
      persona: 'anxiety',
      culturalContext: 'general',
      timestamp: Date.now() - 5000
    },
    {
      suggestion: 'This is a very long response that might be disliked because it is way too wordy and potentially overwhelming for someone with social anxiety who just needs a quick tip.',
      feedbackType: 'dislike',
      persona: 'professional',
      culturalContext: 'general',
      timestamp: Date.now() - 1000
    }
  ];

  it('calculates overall satisfaction correctly', async () => {
    const analysis = await analyzeFeedbackTrends(mockFeedbackHistory);
    expect(analysis.overallSatisfaction).toBe(2/3);
    expect(analysis.feedbackVolume).toBe(3);
  });

  it('identifies improvement areas', async () => {
    const analysis = await analyzeFeedbackTrends(mockFeedbackHistory);
    expect(analysis.improvementAreas).toHaveLength(1);
    expect(analysis.improvementAreas[0].issue).toBe('longResponses');
  });

  it('calculates persona preferences', async () => {
    const analysis = await analyzeFeedbackTrends(mockFeedbackHistory);
    expect(analysis.preferredPersonas.anxiety.satisfaction).toBe(1);
    expect(analysis.preferredPersonas.professional.satisfaction).toBe(0);
  });

  it('provides personalized recommendations', async () => {
    const analysis = await analyzeFeedbackTrends(mockFeedbackHistory);
    const recommendations = getPersonalizedRecommendations(analysis);
    
    expect(recommendations.some(r => r.type === 'persona' && r.recommendedPersona === 'anxiety')).toBe(true);
  });

  it('handles empty history', async () => {
    const analysis = await analyzeFeedbackTrends([]);
    expect(analysis.overallSatisfaction).toBe(0);
    expect(analysis.feedbackVolume).toBe(0);
    expect(analysis.improvementAreas).toHaveLength(0);
  });

  describe('Social Success Score', () => {
    it('calculates a basic score correctly', async () => {
      const { secureLocalStorageGet } = await import('../utils/encryption');
      secureLocalStorageGet.mockResolvedValue([]); // Mock historical scores

      const result = await calculateSocialSuccessScore(mockFeedbackHistory, []);
      
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.breakdown).toBeDefined();
      expect(result.level).toBeDefined();
    });

    it('handles weight customization', async () => {
      const customWeights = {
        satisfaction: 80,
        sentiment: 10,
        engagement: 10
      };

      const success = await saveSocialSuccessWeights(customWeights);
      expect(success).toBe(true);

      const { secureLocalStorageGet } = await import('../utils/encryption');
      secureLocalStorageGet.mockResolvedValueOnce(customWeights); // Mock weights fetch
      secureLocalStorageGet.mockResolvedValueOnce([]); // Mock historical scores fetch

      const result = await calculateSocialSuccessScore(mockFeedbackHistory, []);
      expect(result.weights.satisfaction).toBe(80);
    });

    it('rejects invalid weights', async () => {
      const invalidWeights = {
        satisfaction: 50,
        sentiment: 50,
        engagement: 10 // Total 110
      };

      const success = await saveSocialSuccessWeights(invalidWeights);
      expect(success).toBe(false);
    });
  });
});
