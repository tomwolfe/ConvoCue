/**
 * Language Learning Feedback System for ConvoCue
 * Collects user feedback to improve language learning algorithms
 */

// Initialize feedback storage
const FEEDBACK_STORAGE_KEY = 'convoCue_languageLearningFeedback';
const MAX_FEEDBACK_ENTRIES = 100;

/**
 * Stores user feedback about language learning suggestions
 * @param {string} originalText - Original user input
 * @param {Object} analysis - Language learning analysis provided
 * @param {boolean} isHelpful - Whether the feedback was helpful
 * @param {string} userComment - Additional user feedback
 * @param {string} nativeLanguage - User's native language
 */
export const storeLanguageLearningFeedback = (originalText, analysis, isHelpful, userComment = '', nativeLanguage = 'unknown') => {
  try {
    // Load existing feedback
    const existingFeedback = JSON.parse(localStorage.getItem(FEEDBACK_STORAGE_KEY) || '[]');

    // Create new feedback entry
    const feedbackEntry = {
      timestamp: Date.now(),
      originalText,
      analysis,
      isHelpful,
      userComment,
      nativeLanguage,
      userAgent: typeof navigator !== 'undefined' ? navigator.language : 'unknown'
    };

    // Add new entry
    existingFeedback.push(feedbackEntry);

    // Keep only the most recent entries
    if (existingFeedback.length > MAX_FEEDBACK_ENTRIES) {
      existingFeedback.splice(0, existingFeedback.length - MAX_FEEDBACK_ENTRIES);
    }

    // Save back to storage
    localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(existingFeedback));

    console.log('Language learning feedback stored successfully');
  } catch (error) {
    console.error('Failed to store language learning feedback:', error);
  }
};

/**
 * Retrieves collected feedback for analysis
 * @returns {Array} Array of feedback entries
 */
export const getLanguageLearningFeedback = () => {
  try {
    return JSON.parse(localStorage.getItem(FEEDBACK_STORAGE_KEY) || '[]');
  } catch (error) {
    console.error('Failed to retrieve language learning feedback:', error);
    return [];
  }
};

/**
 * Clears all stored feedback
 */
export const clearLanguageLearningFeedback = () => {
  try {
    localStorage.removeItem(FEEDBACK_STORAGE_KEY);
    console.log('Language learning feedback cleared');
  } catch (error) {
    console.error('Failed to clear language learning feedback:', error);
  }
};

/**
 * Analyzes feedback trends to identify improvement areas
 * @returns {Object} Analysis of feedback trends
 */
export const analyzeFeedbackTrends = () => {
  const feedback = getLanguageLearningFeedback();

  if (feedback.length === 0) {
    return {
      totalEntries: 0,
      helpfulPercentage: 0,
      commonIssues: [],
      improvementAreas: []
    };
  }

  // Calculate helpful percentage
  const helpfulCount = feedback.filter(entry => entry.isHelpful).length;
  const helpfulPercentage = Math.round((helpfulCount / feedback.length) * 100);

  // Identify common issues from user comments
  const commentTexts = feedback
    .filter(entry => entry.userComment && !entry.isHelpful)
    .map(entry => entry.userComment.toLowerCase());

  // Simple keyword analysis for common issues
  const issueKeywords = {
    'grammar': 0,
    'pronunciation': 0,
    'vocabulary': 0,
    'accuracy': 0,
    'relevance': 0,
    'too simple': 0,
    'too complex': 0,
    'wrong suggestion': 0
  };

  commentTexts.forEach(comment => {
    Object.keys(issueKeywords).forEach(keyword => {
      if (comment.includes(keyword)) {
        issueKeywords[keyword]++;
      }
    });
  });

  // Sort issues by frequency
  const sortedIssues = Object.entries(issueKeywords)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([keyword, count]) => ({ keyword, count }));

  // Identify improvement areas based on low helpful ratings
  const unhelpfulEntries = feedback.filter(entry => !entry.isHelpful);
  const nativeLanguageIssues = {};

  unhelpfulEntries.forEach(entry => {
    if (nativeLanguageIssues[entry.nativeLanguage]) {
      nativeLanguageIssues[entry.nativeLanguage]++;
    } else {
      nativeLanguageIssues[entry.nativeLanguage] = 1;
    }
  });

  // Sort by frequency
  const sortedNativeLanguageIssues = Object.entries(nativeLanguageIssues)
    .sort((a, b) => b[1] - a[1])
    .map(([lang, count]) => ({ language: lang, count }));

  return {
    totalEntries: feedback.length,
    helpfulPercentage,
    commonIssues: sortedIssues,
    improvementAreas: sortedNativeLanguageIssues,
    lastUpdated: Date.now()
  };
};

/**
 * Updates grammar patterns based on feedback (placeholder for future implementation)
 * In a production system, this would use the feedback to adjust patterns
 */
export const updateGrammarPatternsFromFeedback = () => {
  // This is a placeholder - in a real system, this would analyze feedback
  // and adjust grammar patterns accordingly using machine learning techniques
  console.log('Placeholder: Grammar patterns would be updated based on feedback analysis');

  // Future implementation would:
  // 1. Analyze feedback for common grammar error misclassifications
  // 2. Adjust pattern weights based on user feedback
  // 3. Potentially add new patterns based on common errors seen in feedback
};