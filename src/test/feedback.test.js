import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { submitFeedback, getFeedbackStats, getPreferredPersonaFromFeedback, getDislikedPhrases, clearFeedbackData } from '../utils/feedback';
import { decryptData, encryptData } from '../utils/encryption';

// Mock the encryption functions for testing in Node.js environment
vi.mock('../utils/encryption', async () => {
  const actual = await vi.importActual('../utils/encryption');
  return {
    ...actual,
    encryptData: vi.fn(async (data) => {
      // Simple mock encryption for testing - just JSON stringify and encode
      return Buffer.from(JSON.stringify(data)).toString('base64');
    }),
    decryptData: vi.fn(async (encryptedData) => {
      // Simple mock decryption for testing - just decode and parse
      try {
        const decoded = Buffer.from(encryptedData, 'base64').toString('utf-8');
        return JSON.parse(decoded);
      } catch (e) {
        console.error('Mock decryption failed:', e);
        return null;
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
      await submitFeedback('Great suggestion!', 'like', 'anxiety', 'general', 'How are you?', 'How are you?');
      
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
        await submitFeedback(`Suggestion ${i}`, 'like', 'anxiety', 'general', `Transcript ${i}`, `Transcript ${i}`);
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
      await submitFeedback('Good', 'like', 'anxiety', 'general', 'Test', 'Test');
      await submitFeedback('Bad', 'dislike', 'professional', 'general', 'Test', 'Test');
      await submitFeedback('Report', 'report', 'anxiety', 'east_asian', 'Test', 'Test');
      await submitFeedback('Also good', 'like', 'anxiety', 'general', 'Test', 'Test');
      
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
      await submitFeedback('Good', 'like', 'anxiety', 'general', 'Test', 'Test');
      await submitFeedback('Also good', 'like', 'anxiety', 'general', 'Test', 'Test');
      await submitFeedback('Another good', 'like', 'anxiety', 'general', 'Test', 'Test');

      // Add some negative feedback for professional persona
      await submitFeedback('Bad', 'dislike', 'professional', 'general', 'Test', 'Test');
      await submitFeedback('Worse', 'dislike', 'professional', 'general', 'Test', 'Test');
      
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
      await submitFeedback('This is terrible advice', 'dislike', 'anxiety', 'general', 'Test', 'Test');
      await submitFeedback('That was terrible input', 'dislike', 'anxiety', 'general', 'Test', 'Test');
      await submitFeedback('Something terrible happened', 'dislike', 'anxiety', 'general', 'Test', 'Test');
      // Add one with "terrible" that gets liked (should not count)
      await submitFeedback('Not terrible at all', 'like', 'anxiety', 'general', 'Test', 'Test');
      
      const disliked = await getDislikedPhrases();
      expect(disliked).toContain('terrible');
    });
  });

  describe('clearFeedbackData', () => {
    it('removes all feedback data from localStorage', async () => {
      await submitFeedback('Test', 'like', 'anxiety', 'general', 'Test', 'Test');
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
