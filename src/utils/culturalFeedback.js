/**
 * Cultural Guidance Feedback System
 * Provides mechanisms for users to provide feedback on cultural recommendations
 */

/**
 * Submit feedback for a cultural recommendation
 * @param {string} recommendationId - Unique identifier for the recommendation
 * @param {string} recommendationText - The text of the recommendation
 * @param {string} userFeedback - 'positive' (👍) or 'negative' (👎)
 * @param {string} culturalContext - The cultural context where the recommendation was made
 * @param {string} userContext - Additional context about the user's situation
 * @param {string} category - The category of the recommendation (e.g., 'directness', 'formality')
 */
export const submitCulturalFeedback = (recommendationId, recommendationText, userFeedback, culturalContext, userContext = '', category = 'general') => {
  // Create a feedback entry
  const feedbackEntry = {
    id: recommendationId || generateFeedbackId(),
    recommendation: recommendationText,
    category,
    feedback: userFeedback,
    culturalContext,
    userContext,
    timestamp: Date.now(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
  };

  // Store feedback in localStorage for now (in a real system, this would go to a server)
  const feedbackKey = 'convoCue_culturalGuidanceFeedback';
  let existingFeedback = [];
  
  try {
    const stored = localStorage.getItem(feedbackKey);
    existingFeedback = stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn('Could not load existing cultural feedback:', error);
  }

  // Add new feedback
  existingFeedback.push(feedbackEntry);

  // Keep only the last 1000 feedback entries to prevent storage bloat
  if (existingFeedback.length > 1000) {
    existingFeedback = existingFeedback.slice(-1000);
  }

  try {
    localStorage.setItem(feedbackKey, JSON.stringify(existingFeedback));
  } catch (error) {
    console.error('Could not save cultural feedback:', error);
  }

  // Log the feedback for monitoring
  console.log(`Cultural guidance feedback received: ${userFeedback} for "${recommendationText}" in ${culturalContext} context`);
  
  return feedbackEntry.id;
};

/**
 * Get aggregated feedback for a specific recommendation
 * @param {string} recommendationText - The recommendation text to get feedback for
 * @returns {Object} Aggregated feedback statistics
 */
export const getRecommendationFeedback = (recommendationText) => {
  const feedbackKey = 'convoCue_culturalGuidanceFeedback';
  let allFeedback = [];
  
  try {
    const stored = localStorage.getItem(feedbackKey);
    allFeedback = stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn('Could not load cultural feedback for aggregation:', error);
    return { positive: 0, negative: 0, total: 0 };
  }

  const filteredFeedback = allFeedback.filter(entry => 
    entry.recommendation === recommendationText
  );

  const positiveCount = filteredFeedback.filter(entry => entry.feedback === 'positive').length;
  const negativeCount = filteredFeedback.filter(entry => entry.feedback === 'negative').length;

  return {
    positive: positiveCount,
    negative: negativeCount,
    total: filteredFeedback.length
  };
};

/**
 * Get problematic recommendations (those with high negative feedback)
 * @param {number} threshold - Minimum ratio of negative feedback to consider problematic (default 0.6)
 * @returns {Array} Array of problematic recommendations
 */
export const getProblematicRecommendations = (threshold = 0.6) => {
  const feedbackKey = 'convoCue_culturalGuidanceFeedback';
  let allFeedback = [];
  
  try {
    const stored = localStorage.getItem(feedbackKey);
    allFeedback = stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn('Could not load cultural feedback for analysis:', error);
    return [];
  }

  // Group feedback by recommendation
  const feedbackByRecommendation = {};
  allFeedback.forEach(entry => {
    if (!feedbackByRecommendation[entry.recommendation]) {
      feedbackByRecommendation[entry.recommendation] = {
        positive: 0,
        negative: 0,
        total: 0,
        contexts: new Set()
      };
    }
    
    feedbackByRecommendation[entry.recommendation][entry.feedback === 'positive' ? 'positive' : 'negative']++;
    feedbackByRecommendation[entry.recommendation].total++;
    feedbackByRecommendation[entry.recommendation].contexts.add(entry.culturalContext);
  });

  // Find recommendations with high negative feedback ratio
  const problematic = [];
  Object.entries(feedbackByRecommendation).forEach(([recommendation, stats]) => {
    const negativeRatio = stats.negative / stats.total;
    if (negativeRatio >= threshold && stats.total >= 3) { // At least 3 feedbacks to be considered
      problematic.push({
        recommendation,
        negativeRatio,
        positive: stats.positive,
        negative: stats.negative,
        total: stats.total,
        contexts: Array.from(stats.contexts)
      });
    }
  });

  return problematic;
};

/**
 * Generate a unique feedback ID
 * @returns {string} Unique identifier for feedback
 */
const generateFeedbackId = () => {
  return `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Check if a recommendation should be flagged based on feedback
 * @param {string} recommendationText - The recommendation to check
 * @returns {boolean} True if the recommendation should be flagged
 */
export const shouldFlagRecommendation = (recommendationText) => {
  const feedbackStats = getRecommendationFeedback(recommendationText);
  if (feedbackStats.total < 3) {
    // Not enough feedback to make a determination
    return false;
  }

  const negativeRatio = feedbackStats.negative / feedbackStats.total;
  return negativeRatio >= 0.6; // Flag if 60% or more feedback is negative
};

/**
 * Get user-specific bias adjustments based on their feedback history
 * This allows the system to adapt to the user's specific communication style preferences
 * @returns {Object} Map of categories to weight adjustments (e.g., { directness: -0.2 })
 */
export const getUserCulturalBiasAdjustments = () => {
  const feedbackKey = 'convoCue_culturalGuidanceFeedback';
  let allFeedback = [];
  
  try {
    const stored = localStorage.getItem(feedbackKey);
    allFeedback = stored ? JSON.parse(stored) : [];
  } catch (_error) {
    return {};
  }

  const categoryStats = {};
  allFeedback.forEach(entry => {
    const cat = entry.category || 'general';
    if (!categoryStats[cat]) {
      categoryStats[cat] = { positive: 0, negative: 0 };
    }
    categoryStats[cat][entry.feedback === 'positive' ? 'positive' : 'negative']++;
  });

  const adjustments = {};
  Object.entries(categoryStats).forEach(([cat, stats]) => {
    const total = stats.positive + stats.negative;
    if (total >= 3) {
      const ratio = stats.positive / total;
      // If user consistently dislikes a category (ratio < 0.4), provide a negative adjustment
      if (ratio < 0.4) {
        adjustments[cat] = -0.3; // Reduce weight of this category
      } else if (ratio > 0.8) {
        adjustments[cat] = 0.2; // Slightly increase weight of this category
      }
    }
  });

  return adjustments;
};

/**
 * Get feedback summary for monitoring and improvement
 * @returns {Object} Summary of feedback data
 */
export const getCulturalFeedbackSummary = () => {
  const feedbackKey = 'convoCue_culturalGuidanceFeedback';
  let allFeedback = [];
  
  try {
    const stored = localStorage.getItem(feedbackKey);
    allFeedback = stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn('Could not load cultural feedback for summary:', error);
    return { totalFeedback: 0, positive: 0, negative: 0, flaggedRecommendations: 0 };
  }

  const positiveCount = allFeedback.filter(entry => entry.feedback === 'positive').length;
  const negativeCount = allFeedback.filter(entry => entry.feedback === 'negative').length;
  const flaggedRecommendations = getProblematicRecommendations().length;

  return {
    totalFeedback: allFeedback.length,
    positive: positiveCount,
    negative: negativeCount,
    flaggedRecommendations: flaggedRecommendations,
    feedbackRatio: allFeedback.length > 0 ? positiveCount / allFeedback.length : 0
  };
};