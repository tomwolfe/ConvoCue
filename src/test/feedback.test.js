import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { submitFeedback, getFeedbackStats, getPreferredPersonaFromFeedback, getDislikedPhrases, clearFeedbackData } from '../utils/feedback';

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
    it('stores feedback in localStorage', () => {
      submitFeedback('Great suggestion!', 'like', 'anxiety', 'general', 'How are you?');
      
      const stored = JSON.parse(localStorage.getItem('convocue_feedback'));
      expect(stored).toHaveLength(1);
      expect(stored[0]).toMatchObject({
        suggestion: 'Great suggestion!',
        feedbackType: 'like',
        persona: 'anxiety',
        culturalContext: 'general',
        transcript: 'How are you?'
      });
    });

    it('maintains only last 100 feedback entries', () => {
      // Add 105 feedback entries
      for (let i = 0; i < 105; i++) {
        submitFeedback(`Suggestion ${i}`, 'like', 'anxiety', 'general', `Transcript ${i}`);
      }
      
      const stored = JSON.parse(localStorage.getItem('convocue_feedback'));
      expect(stored).toHaveLength(100);
      // Should contain the last 100 entries (from index 5 to 104)
      expect(stored[0].suggestion).toBe('Suggestion 5');
      expect(stored[99].suggestion).toBe('Suggestion 104');
    });
  });

  describe('getFeedbackStats', () => {
    it('returns empty stats when no feedback exists', () => {
      const stats = getFeedbackStats();
      
      expect(stats.totalFeedback).toBe(0);
      expect(stats.likes).toBe(0);
      expect(stats.dislikes).toBe(0);
      expect(stats.reports).toBe(0);
      expect(stats.byPersona).toEqual({});
      expect(stats.byCulturalContext).toEqual({});
    });

    it('calculates correct stats for mixed feedback', () => {
      submitFeedback('Good', 'like', 'anxiety', 'general', 'Test');
      submitFeedback('Bad', 'dislike', 'professional', 'general', 'Test');
      submitFeedback('Report', 'report', 'anxiety', 'east_asian', 'Test');
      submitFeedback('Also good', 'like', 'anxiety', 'general', 'Test');
      
      const stats = getFeedbackStats();
      
      expect(stats.totalFeedback).toBe(4);
      expect(stats.likes).toBe(2);
      expect(stats.dislikes).toBe(1);
      expect(stats.reports).toBe(1);
      expect(stats.byPersona).toEqual({ anxiety: 3, professional: 1 });
      expect(stats.byCulturalContext).toEqual({ general: 3, east_asian: 1 });
    });
  });

  describe('getPreferredPersonaFromFeedback', () => {
    it('returns null when no feedback exists', () => {
      const preferred = getPreferredPersonaFromFeedback();
      expect(preferred).toBeNull();
    });

    it('returns persona with most positive feedback', () => {
      // Add some positive feedback for anxiety persona
      submitFeedback('Good', 'like', 'anxiety', 'general', 'Test');
      submitFeedback('Also good', 'like', 'anxiety', 'general', 'Test');
      submitFeedback('Another good', 'like', 'anxiety', 'general', 'Test');
      
      // Add some negative feedback for professional persona
      submitFeedback('Bad', 'dislike', 'professional', 'general', 'Test');
      submitFeedback('Worse', 'dislike', 'professional', 'general', 'Test');
      
      const preferred = getPreferredPersonaFromFeedback();
      expect(preferred).toBe('anxiety');
    });

    it('returns null when no persona has significant preference', () => {
      // Add just one like (not enough to establish preference)
      submitFeedback('Good', 'like', 'anxiety', 'general', 'Test');
      
      const preferred = getPreferredPersonaFromFeedback();
      expect(preferred).toBeNull();
    });
  });

  describe('getDislikedPhrases', () => {
    it('returns empty array when no negative feedback exists', () => {
      const disliked = getDislikedPhrases();
      expect(disliked).toEqual([]);
    });

    it('returns phrases from frequently disliked suggestions', () => {
      // Add suggestions with the word "terrible" that receive dislike feedback
      submitFeedback('This is terrible advice', 'dislike', 'anxiety', 'general', 'Test');
      submitFeedback('That was terrible input', 'dislike', 'anxiety', 'general', 'Test');
      submitFeedback('Something terrible happened', 'dislike', 'anxiety', 'general', 'Test');
      // Add one with "terrible" that gets liked (should not count)
      submitFeedback('Not terrible at all', 'like', 'anxiety', 'general', 'Test');
      
      const disliked = getDislikedPhrases();
      expect(disliked).toContain('terrible');
    });
  });

  describe('clearFeedbackData', () => {
    it('removes all feedback data from localStorage', () => {
      submitFeedback('Test', 'like', 'anxiety', 'general', 'Test');
      expect(localStorage.getItem('convocue_feedback')).not.toBeNull();
      
      clearFeedbackData();
      expect(localStorage.getItem('convocue_feedback')).toBeNull();
    });
  });
});