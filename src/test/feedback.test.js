import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { submitFeedback, getFeedbackStats, getPreferredPersonaFromFeedback, getDislikedPhrases, clearFeedbackData } from '../utils/feedback';
import { decryptData } from '../utils/encryption';

// Mock the encryption functions for testing in Node.js environment
vi.mock('../utils/encryption', async () => {
  const mockEncryptData = async (data) => {
    // Simple mock encryption for testing - just JSON stringify and encode
    return Buffer.from(JSON.stringify(data)).toString('base64');
  };

  const mockDecryptData = async (encryptedData) => {
    // Simple mock decryption for testing - just decode and parse
    try {
      const decoded = Buffer.from(encryptedData, 'base64').toString('utf-8');
      return JSON.parse(decoded);
    } catch (e) {
      console.error('Mock decryption failed:', e);
      return null;
    }
  };

  return {
    isCryptoAvailable: vi.fn(() => false), // Mock to return false to force mock implementations
    encryptData: vi.fn(mockEncryptData),
    decryptData: vi.fn(mockDecryptData),
    secureLocalStorageSet: vi.fn(async (key, data) => {
      // Mock secure storage by storing directly in localStorage after "encryption"
      const encrypted = await mockEncryptData(data);
      localStorage.setItem(key, encrypted);
    }),
    secureLocalStorageGet: vi.fn(async (key, defaultValue = null) => {
      // Mock secure retrieval by getting from localStorage and "decrypting"
      const encryptedData = localStorage.getItem(key);
      if (!encryptedData) return defaultValue;
      try {
        return await mockDecryptData(encryptedData);
      } catch (e) {
        console.error('Mock secure get failed:', e);
        return defaultValue;
      }
    })
  };
});

describe('Feedback Utilities', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    // Clean up after each test
    localStorage.clear();
  });

  describe('submitFeedback', () => {
    it('stores feedback in localStorage securely', async () => {
      await submitFeedback({
        suggestion: 'Great suggestion!',
        feedbackType: 'like',
        persona: 'anxiety',
        culturalContext: 'general',
        transcript: 'How are you?',
        originalInput: 'How are you?'
      });

      const encryptedData = localStorage.getItem('convocue_feedback');
      expect(encryptedData).not.toBeNull();

      const stored = await decryptData(encryptedData);
      expect(stored).toHaveLength(1);
      expect(stored[0]).toMatchObject({
        suggestion: 'Great suggestion!',
        feedbackType: 'like',
        persona: 'anxiety',
        culturalContext: 'general',
        transcript: 'How are you?',
        originalInput: 'How are you?'
      });
    });

    it('maintains only last 100 feedback entries', async () => {
      // Add 105 feedback entries
      for (let i = 0; i < 105; i++) {
        await submitFeedback({
          suggestion: `Suggestion ${i}`,
          feedbackType: 'like',
          persona: 'anxiety',
          culturalContext: 'general',
          transcript: `Transcript ${i}`,
          originalInput: `Transcript ${i}`
        });
      }

      const encryptedData = localStorage.getItem('convocue_feedback');
      const stored = await decryptData(encryptedData);
      expect(stored).toHaveLength(100);
      // Should contain the last 100 entries (from index 5 to 104)
      expect(stored[0].suggestion).toBe('Suggestion 5');
      expect(stored[99].suggestion).toBe('Suggestion 104');
    });
  });

  describe('getFeedbackStats', () => {
    it('returns empty stats when no feedback exists', async () => {
      const stats = await getFeedbackStats();
      
      expect(stats.totalFeedback).toBe(0);
      expect(stats.likes).toBe(0);
      expect(stats.dislikes).toBe(0);
      expect(stats.reports).toBe(0);
      expect(stats.byPersona).toEqual({});
      expect(stats.byCulturalContext).toEqual({});
    });

    it('calculates correct stats for mixed feedback', async () => {
      await submitFeedback({ suggestion: 'Good', feedbackType: 'like', persona: 'anxiety', culturalContext: 'general', transcript: 'Test', originalInput: 'Test' });
      await submitFeedback({ suggestion: 'Bad', feedbackType: 'dislike', persona: 'professional', culturalContext: 'general', transcript: 'Test', originalInput: 'Test' });
      await submitFeedback({ suggestion: 'Report', feedbackType: 'report', persona: 'anxiety', culturalContext: 'east_asian', transcript: 'Test', originalInput: 'Test' });
      await submitFeedback({ suggestion: 'Also good', feedbackType: 'like', persona: 'anxiety', culturalContext: 'general', transcript: 'Test', originalInput: 'Test' });

      const stats = await getFeedbackStats();

      expect(stats.totalFeedback).toBe(4);
      expect(stats.likes).toBe(2);
      expect(stats.dislikes).toBe(1);
      expect(stats.reports).toBe(1);
      expect(stats.byPersona).toEqual({ anxiety: 3, professional: 1 });
      expect(stats.byCulturalContext).toEqual({ general: 3, east_asian: 1 });
    });
  });

  describe('getPreferredPersonaFromFeedback', () => {
    it('returns null when no feedback exists', async () => {
      const preferred = await getPreferredPersonaFromFeedback();
      expect(preferred).toBeNull();
    });

    it('returns persona with most positive feedback', async () => {
      // Add some positive feedback for anxiety persona
      await submitFeedback({ suggestion: 'Good', feedbackType: 'like', persona: 'anxiety', culturalContext: 'general', transcript: 'Test', originalInput: 'Test' });
      await submitFeedback({ suggestion: 'Also good', feedbackType: 'like', persona: 'anxiety', culturalContext: 'general', transcript: 'Test', originalInput: 'Test' });
      await submitFeedback({ suggestion: 'Another good', feedbackType: 'like', persona: 'anxiety', culturalContext: 'general', transcript: 'Test', originalInput: 'Test' });

      // Add some negative feedback for professional persona
      await submitFeedback({ suggestion: 'Bad', feedbackType: 'dislike', persona: 'professional', culturalContext: 'general', transcript: 'Test', originalInput: 'Test' });
      await submitFeedback({ suggestion: 'Worse', feedbackType: 'dislike', persona: 'professional', culturalContext: 'general', transcript: 'Test', originalInput: 'Test' });

      const preferred = await getPreferredPersonaFromFeedback();
      expect(preferred).toBe('anxiety');
    });

    it('returns null when no persona has significant preference', async () => {
      // Add just one like (not enough to establish preference)
      await submitFeedback('Good', 'like', 'anxiety', 'general', 'Test', 'Test');
      
      const preferred = await getPreferredPersonaFromFeedback();
      expect(preferred).toBeNull();
    });
  });

  describe('getDislikedPhrases', () => {
    it('returns empty array when no negative feedback exists', async () => {
      const disliked = await getDislikedPhrases();
      expect(disliked).toEqual([]);
    });

    it('returns phrases from frequently disliked suggestions', async () => {
      // Add suggestions with the word "terrible" that receive dislike feedback
      await submitFeedback({ suggestion: 'This is terrible advice', feedbackType: 'dislike', persona: 'anxiety', culturalContext: 'general', transcript: 'Test', originalInput: 'Test' });
      await submitFeedback({ suggestion: 'That was terrible input', feedbackType: 'dislike', persona: 'anxiety', culturalContext: 'general', transcript: 'Test', originalInput: 'Test' });
      await submitFeedback({ suggestion: 'Something terrible happened', feedbackType: 'dislike', persona: 'anxiety', culturalContext: 'general', transcript: 'Test', originalInput: 'Test' });
      // Add one with "terrible" that gets liked (should not count)
      await submitFeedback({ suggestion: 'Not terrible at all', feedbackType: 'like', persona: 'anxiety', culturalContext: 'general', transcript: 'Test', originalInput: 'Test' });

      const disliked = await getDislikedPhrases();
      expect(disliked).toContain('terrible');
    });
  });

  describe('clearFeedbackData', () => {
    it('removes all feedback data from localStorage', async () => {
      await submitFeedback({ suggestion: 'Test', feedbackType: 'like', persona: 'anxiety', culturalContext: 'general', transcript: 'Test', originalInput: 'Test' });
      const encryptedData = localStorage.getItem('convocue_feedback');
      expect(encryptedData).not.toBeNull();

      await clearFeedbackData();
      // After clearing, the data should be an empty array when decrypted
      const clearedData = localStorage.getItem('convocue_feedback');
      if (clearedData) {
        const decrypted = await decryptData(clearedData);
        expect(decrypted).toEqual([]);
      } else {
        // If the key was removed entirely, that's also valid
        expect(clearedData).toBeNull();
      }
    });
  });
});
