import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCommunicationProfileSummary, _resetCommunicationProfileCache, calculateSessionTone } from './personalization';
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

  describe('getCommunicationProfileSummary', () => {
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

  describe('calculateSessionTone', () => {
    it('detects urgent tone for fast speech', () => {
      const text = "Quickly we need to move now it is very urgent go go go";
      const metadata = { duration: 2, rms: 0.02 };
      const emotionData = { emotion: 'neutral' };
      
      const result = calculateSessionTone(text, metadata, emotionData);
      expect(result.pace).toBeGreaterThan(3.5);
      expect(result.isUrgent).toBe(true);
      expect(result.mirroringInstruction).toContain('HIGH-PACE');
    });

    it('detects reflective tone for slow speech', () => {
      const text = "Well... I am thinking about it.";
      const metadata = { duration: 5, rms: 0.01 };
      const emotionData = { emotion: 'neutral' };
      
      const result = calculateSessionTone(text, metadata, emotionData);
      expect(result.pace).toBeLessThan(1.5);
      expect(result.isUrgent).toBe(false);
      expect(result.mirroringInstruction).toContain('REFLECTIVE/SLOW');
    });

    it('detects urgent tone for loud volume or intense emotion', () => {
      const text = "Stop.";
      const metadata = { duration: 1, rms: 0.1 }; // Loud
      const emotionData = { emotion: 'anger' };
      
      const result = calculateSessionTone(text, metadata, emotionData);
      expect(result.isUrgent).toBe(true);
      expect(result.mirroringInstruction).toContain('HIGH-PACE');
    });
  });
});
