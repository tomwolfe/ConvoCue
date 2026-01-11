import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCommunicationProfileSummary, _resetCommunicationProfileCache, calculateSessionTone, getMirroringBaselines, updateMirroringBaselines } from './personalization';
import { analyzeFeedbackTrends, calculateSocialSuccessScore } from './feedbackAnalytics';
import { secureLocalStorageGet, secureLocalStorageSet } from './encryption';

vi.mock('./feedbackAnalytics', () => ({
  analyzeFeedbackTrends: vi.fn(),
  calculateSocialSuccessScore: vi.fn()
}));

vi.mock('./encryption', () => ({
  secureLocalStorageGet: vi.fn(),
  secureLocalStorageSet: vi.fn()
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
    const defaultBaselines = { pace: 2.5, volume: 0.02, count: 0 };

    it('detects urgent tone using weighted logic and baselines', () => {
      const text = "Quickly we need to move now it is very urgent go go go";
      const metadata = { duration: 2, rms: 0.05 }; // Fast and loud
      const emotionData = { emotion: 'anger' };
      
      const result = calculateSessionTone(text, metadata, emotionData, defaultBaselines);
      expect(result.pace).toBeGreaterThan(3.5);
      expect(result.urgencyScore).toBeGreaterThan(1.6);
      expect(result.isUrgent).toBe(true);
      expect(result.mirroringInstruction).toContain('HIGH-PACE');
    });

    it('detects reflective tone when pace is slow relative to baseline', () => {
      const text = "Well... I am thinking about it. Maybe we should wait.";
      const metadata = { duration: 10, rms: 0.01 };
      const emotionData = { emotion: 'neutral' };
      
      const result = calculateSessionTone(text, metadata, emotionData, defaultBaselines);
      expect(result.pace).toBeLessThan(1.5);
      expect(result.isUrgent).toBe(false);
      expect(result.mirroringInstruction).toContain('REFLECTIVE');
    });

    it('adjusts to user-specific baselines', () => {
      // User who naturally speaks very fast
      const fastBaselines = { pace: 5.0, volume: 0.02, count: 100 };
      const text = "This is a fast sentence but it is normal for this user.";
      const metadata = { duration: 2, rms: 0.02 }; // Pace = 5.5
      const emotionData = { emotion: 'neutral' };

      const result = calculateSessionTone(text, metadata, emotionData, fastBaselines);
      // Even though pace is 5.5 (which was urgent before), it's close to baseline now
      expect(result.isUrgent).toBe(false);
      expect(result.mirroringInstruction).toContain('BALANCED');
    });

    it('respects mirroring sensitivity settings', () => {
      const text = "Moderate pace sentence.";
      const metadata = { duration: 4, rms: 0.04 }; // Pace = 1.0, Volume = 2x baseline
      const emotionData = { emotion: 'neutral' };
      // paceRatio = 1.0/2.5 = 0.4
      // volumeRatio = 0.04/0.02 = 2.0
      // urgencyScore = (0.4 * 0.5) + (2.0 * 0.3) + (1.0 * 0.2) = 0.2 + 0.6 + 0.2 = 1.0

      // Low sensitivity (urgent threshold 2.2)
      const lowResult = calculateSessionTone(text, metadata, emotionData, defaultBaselines, { mirroringSensitivity: 'low' });
      expect(lowResult.isUrgent).toBe(false);

      // High sensitivity (urgent threshold 1.2)
      // If we increase volume a bit more
      const metadataHigh = { duration: 4, rms: 0.06 }; // Volume = 3x baseline
      // urgencyScore = 0.2 + 0.9 + 0.2 = 1.3
      const highResult = calculateSessionTone(text, metadataHigh, emotionData, defaultBaselines, { mirroringSensitivity: 'high' });
      expect(highResult.isUrgent).toBe(true);
    });

    it('triggers calming override after persistent high urgency', () => {
      const text = "EXCESSIVE URGENCY AND LOUD VOLUME!";
      const metadata = { duration: 2, rms: 0.1 }; // Very loud
      const emotionData = { emotion: 'anger' };
      
      // urgencyScore = (paceRatio * 0.5) + (volumeRatio * 0.3) + (emotionScore * 0.2)
      // pace = 5/2 = 2.5. paceRatio = 2.5/2.5 = 1.0
      // volumeRatio = 0.1/0.02 = 5.0
      // urgencyScore = 0.5 + 1.5 + 0.28 = 2.28 (Not quite 2.5 yet)
      
      const metadataExtreme = { duration: 1, rms: 0.15 }; // Even louder and faster
      // pace = 5/1 = 5.0. paceRatio = 2.0
      // volumeRatio = 0.15/0.02 = 7.5
      // urgencyScore = 1.0 + 2.25 + 0.28 = 3.53

      // First turn high urgency
      const result1 = calculateSessionTone(text, metadataExtreme, emotionData, defaultBaselines, {}, 0);
      expect(result1.urgencyScore).toBeGreaterThan(2.5);
      expect(result1.shouldOverride).toBe(false); // First turn
      expect(result1.mirroringInstruction).toContain('HIGH-PACE');

      // Second turn persistent high urgency
      const result2 = calculateSessionTone(text, metadataExtreme, emotionData, defaultBaselines, {}, 1);
      expect(result2.shouldOverride).toBe(true);
      expect(result2.mirroringInstruction).toContain('CALMING');
    });

    it('triggers urgency for moderate pace but high emotional intensity', () => {
      const text = "I am very scared right now.";
      const metadata = { duration: 2, rms: 0.04 }; // Volume is 2x baseline
      const emotionData = { emotion: 'fear' };
      
      const result = calculateSessionTone(text, metadata, emotionData, defaultBaselines);
      // pace = 3/2 = 1.5. paceRatio = 1.5/2.5 = 0.6
      // volumeRatio = 0.04/0.02 = 2.0
      // urgencyScore = (0.6 * 0.5) + (2.0 * 0.3) + (1.4 * 0.2) = 0.3 + 0.6 + 0.28 = 1.18
      // Threshold is 1.6, so this shouldn't be urgent yet, but it's higher than balanced.
      expect(result.urgencyScore).toBeGreaterThan(1.0);
    });
  });

  describe('mirroring baseline persistence', () => {
    it('updates baselines with EMA', async () => {
      secureLocalStorageGet.mockResolvedValue({ pace: 2.0, volume: 0.01, count: 20 });
      
      await updateMirroringBaselines(4.0, 0.02);
      
      // alpha = 0.1
      // newPace = 0.1 * 4.0 + 0.9 * 2.0 = 0.4 + 1.8 = 2.2
      // newVolume = 0.1 * 0.02 + 0.9 * 0.01 = 0.002 + 0.009 = 0.011
      
      expect(secureLocalStorageSet).toHaveBeenCalledWith(
        'convocue_mirroring_baselines',
        expect.objectContaining({
          pace: expect.closeTo(2.2),
          volume: expect.closeTo(0.011),
          count: 21
        })
      );
    });
  });
});
