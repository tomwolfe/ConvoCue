import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCommunicationProfileSummary, _resetCommunicationProfileCache } from './personalization';
import { analyzeFeedbackTrends, calculateSocialSuccessScore } from './feedbackAnalytics';
import { secureLocalStorageGet } from './encryption';

vi.mock('./feedbackAnalytics', () => ({
  analyzeFeedbackTrends: vi.fn(),
  calculateSocialSuccessScore: vi.fn()
}));

vi.mock('./encryption', () => ({
  secureLocalStorageGet: vi.fn()
}));

describe('personalization utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    _resetCommunicationProfileCache();
  });

  it('generates a correct summary and uses caching', async () => {
    analyzeFeedbackTrends.mockResolvedValue({
      improvementAreas: [{ issue: 'longResponses' }],
      recentImprovementAreas: [],
      trendingPreferences: { 'tone': { trend: 'increasing' } },
      preferredPersonas: { 'concise': { satisfaction: 0.9 } }
    });
    calculateSocialSuccessScore.mockResolvedValue({
      level: 'Gold',
      score: 85,
      breakdown: { sentiment: 30, satisfaction: 40 }
    });
    secureLocalStorageGet.mockResolvedValue({ preferredLength: 'short' });

    // First call - should call mocks
    const summary1 = await getCommunicationProfileSummary();
    expect(summary1).toContain('Level: Gold');
    expect(summary1).toContain('longResponses');
    expect(analyzeFeedbackTrends).toHaveBeenCalledTimes(1);

    // Second call - should use cache
    const summary2 = await getCommunicationProfileSummary();
    expect(summary2).toBe(summary1);
    expect(analyzeFeedbackTrends).toHaveBeenCalledTimes(1);

    // Advance time past TTL (2 mins)
    vi.advanceTimersByTime(121000);

    // Third call - should refresh cache
    await getCommunicationProfileSummary();
    expect(analyzeFeedbackTrends).toHaveBeenCalledTimes(2);
  });

  it('handles errors gracefully', async () => {
    analyzeFeedbackTrends.mockRejectedValue(new Error('Test error'));
    const summary = await getCommunicationProfileSummary();
    expect(summary).toBe("");
  });
});
