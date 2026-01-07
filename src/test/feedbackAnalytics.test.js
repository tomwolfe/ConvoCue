import { describe, it, expect, beforeEach } from 'vitest';
import { analyzeFeedbackTrends, getPersonalizedRecommendations } from '../utils/feedbackAnalytics';

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
});
