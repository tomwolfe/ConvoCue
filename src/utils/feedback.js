/**
 * @fileoverview User feedback utilities for collecting and managing user preferences
 */
import { secureLocalStorageGet, secureLocalStorageSet } from './encryption';

/**
 * Submit feedback for a suggestion
 *
 * @param {string} suggestion - The suggestion that was provided
 * @param {string} feedbackType - The type of feedback ('like', 'dislike', 'report')
 * @param {string} persona - The persona used for the suggestion
 * @param {string} culturalContext - The cultural context used
 * @param {string} transcript - The original transcript
 * @param {string} originalInput - The original user input that led to the suggestion
 */
export const submitFeedback = async (suggestion, feedbackType, persona, culturalContext, transcript, originalInput = '') => {
  // Create feedback object
  const feedback = {
    suggestion,
    feedbackType,
    persona,
    culturalContext,
    transcript,
    originalInput,
    timestamp: Date.now(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    isMobile: typeof navigator !== 'undefined' ? /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) : false
  };

  // Store feedback in localStorage with encryption
  try {
    const feedbackHistory = await secureLocalStorageGet('convocue_feedback', []);
    feedbackHistory.push(feedback);

    // Keep only the last 100 feedback entries to prevent storage bloat
    const trimmedHistory = feedbackHistory.slice(-100);
    await secureLocalStorageSet('convocue_feedback', trimmedHistory);

    // Dispatch event to notify listeners (e.g., useMLWorker hook) that feedback was submitted
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('convocue_feedback_submitted'));
    }
  } catch (e) {
    console.error('Failed to save feedback to localStorage:', e);
  }

  // In a real implementation, you might also send this to an analytics endpoint
  // But respecting privacy by keeping everything client-side for now
};

/**
 * Get feedback statistics for analysis
 * @returns {Promise<object>} Feedback statistics
 */
export const getFeedbackStats = async () => {
  try {
    const feedbackHistory = await secureLocalStorageGet('convocue_feedback', []);

    if (feedbackHistory.length === 0) {
      return {
        totalFeedback: 0,
        likes: 0,
        dislikes: 0,
        reports: 0,
        byPersona: {},
        byCulturalContext: {}
      };
    }

    const stats = {
      totalFeedback: feedbackHistory.length,
      likes: feedbackHistory.filter(f => f.feedbackType === 'like').length,
      dislikes: feedbackHistory.filter(f => f.feedbackType === 'dislike').length,
      reports: feedbackHistory.filter(f => f.feedbackType === 'report').length,
      byPersona: {},
      byCulturalContext: {}
    };

    // Count by persona
    feedbackHistory.forEach(feedback => {
      stats.byPersona[feedback.persona] = (stats.byPersona[feedback.persona] || 0) + 1;
      stats.byCulturalContext[feedback.culturalContext] = (stats.byCulturalContext[feedback.culturalContext] || 0) + 1;
    });

    return stats;
  } catch (e) {
    console.error('Failed to retrieve feedback stats:', e);
    return {
      totalFeedback: 0,
      likes: 0,
      dislikes: 0,
      reports: 0,
      byPersona: {},
      byCulturalContext: {}
    };
  }
};

/**
 * Get user's preferred persona based on feedback history
 * @returns {Promise<string|null>} Preferred persona or null if no preference detected
 */
export const getPreferredPersonaFromFeedback = async () => {
  try {
    const feedbackHistory = await secureLocalStorageGet('convocue_feedback', []);

    if (feedbackHistory.length === 0) {
      return null;
    }

    // Count positive feedback by persona
    const personaScores = {};
    feedbackHistory.forEach(feedback => {
      if (feedback.feedbackType === 'like') {
        personaScores[feedback.persona] = (personaScores[feedback.persona] || 0) + 1;
      } else if (feedback.feedbackType === 'dislike') {
        personaScores[feedback.persona] = (personaScores[feedback.persona] || 0) - 1;
      }
    });

    // Find persona with highest score
    let preferredPersona = null;
    let highestScore = -Infinity;

    for (const [persona, score] of Object.entries(personaScores)) {
      if (score > highestScore) {
        highestScore = score;
        preferredPersona = persona;
      }
    }

    // Only return a preference if the score is significantly positive
    return highestScore > 2 ? preferredPersona : null;
  } catch (e) {
    console.error('Failed to determine preferred persona:', e);
    return null;
  }
};

/**
 * Get commonly disliked phrases to avoid in suggestions
 * @returns {Promise<Array>} Array of phrases that received negative feedback
 */
export const getDislikedPhrases = async () => {
  try {
    const feedbackHistory = await secureLocalStorageGet('convocue_feedback', []);

    // Get all suggestions that received dislike feedback
    const dislikedSuggestions = feedbackHistory
      .filter(f => f.feedbackType === 'dislike')
      .map(f => f.suggestion);

    // Extract common phrases or patterns from disliked suggestions
    // This is a simple implementation - in a real system you'd want more sophisticated analysis
    const phraseCounts = {};
    const stopWords = new Set(['that', 'this', 'there', 'their', 'with', 'from', 'your', 'about', 'would', 'could', 'should', 'which']);

    dislikedSuggestions.forEach(suggestion => {
      const words = suggestion.toLowerCase().split(/\s+/);
      words.forEach(word => {
        const cleanWord = word.replace(/[^\w]/g, '');
        if (cleanWord.length > 3 && !stopWords.has(cleanWord)) {
          phraseCounts[cleanWord] = (phraseCounts[cleanWord] || 0) + 1;
        }
      });
    });

    // Return phrases that appear frequently in disliked suggestions
    return Object.entries(phraseCounts)
      .filter(([phrase, count]) => count >= 2) // At least 2 dislikes
      .map(([phrase]) => phrase);
  } catch (e) {
    console.error('Failed to get disliked phrases:', e);
    return [];
  }
};

/**
 * Clear all feedback data
 */
export const clearFeedbackData = () => {
  try {
    localStorage.removeItem('convocue_feedback'); // Remove the old unencrypted data
    localStorage.removeItem('convocue_storage_key'); // Also clear the encryption key
  } catch (e) {
    console.error('Failed to clear feedback data:', e);
  }
};

/**
 * Resets personalization data to prevent overfitting
 */
export const resetPersonalizationData = async () => {
  try {
    // Clear feedback data which drives personalization
    await secureLocalStorageSet('convocue_feedback', []); // Reset with empty array instead of removing

    // Also clear any cached preferences and settings
    localStorage.removeItem('convocue_preferences_cache');
    localStorage.removeItem('convocue_preferences');
    localStorage.removeItem('convocue_settings');

    console.log('Personalization data reset successfully');
  } catch (e) {
    console.error('Failed to reset personalization data:', e);
  }
};
