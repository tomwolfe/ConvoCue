/**
 * @fileoverview Analytics utilities for intent detection accuracy tracking
 */

/**
 * Intent analytics tracker
 */
class IntentAnalytics {
  constructor() {
    this.accuracyData = {
      totalDetections: 0,
      byIntent: {},
      confidenceDistribution: {}, // Track accuracy by confidence level
      falsePositives: [], // Track false positive detections
      falseNegatives: [], // Track missed detections
      userFeedback: [] // Track user feedback on intent accuracy
    };
    
    // Load any existing data from localStorage
    this.loadFromStorage();
  }

  /**
   * Records an intent detection event
   * @param {string} input - The input text that was analyzed
   * @param {string} detectedIntent - The intent that was detected
   * @param {number} confidence - The confidence score of the detection
   * @param {string} expectedIntent - The expected intent (if known)
   * @param {boolean} isCorrect - Whether the detection was correct
   */
  recordDetection(input, detectedIntent, confidence, expectedIntent = null, isCorrect = null) {
    this.accuracyData.totalDetections++;
    
    // Initialize intent data if not present
    if (!this.accuracyData.byIntent[detectedIntent]) {
      this.accuracyData.byIntent[detectedIntent] = {
        total: 0,
        correct: 0,
        incorrect: 0,
        avgConfidence: 0,
        confidenceSum: 0,
        samples: []
      };
    }
    
    const intentData = this.accuracyData.byIntent[detectedIntent];
    intentData.total++;
    intentData.confidenceSum += confidence;
    intentData.avgConfidence = intentData.confidenceSum / intentData.total;
    
    // Track correctness
    if (isCorrect !== null) {
      if (isCorrect) {
        intentData.correct++;
      } else {
        intentData.incorrect++;
      }
    }
    
    // Store sample for analysis
    intentData.samples.push({
      input,
      detectedIntent,
      confidence,
      expectedIntent,
      isCorrect,
      timestamp: Date.now()
    });
    
    // Keep only the last 1000 samples per intent to prevent memory bloat
    if (intentData.samples.length > 1000) {
      intentData.samples = intentData.samples.slice(-1000);
    }
    
    // Track false positives and negatives
    if (expectedIntent && detectedIntent !== expectedIntent) {
      if (detectedIntent && !expectedIntent) {
        // False positive: detected intent when none was expected
        this.accuracyData.falsePositives.push({
          input,
          detectedIntent,
          expectedIntent,
          confidence,
          timestamp: Date.now()
        });
      } else if (!detectedIntent && expectedIntent) {
        // False negative: missed expected intent
        this.accuracyData.falseNegatives.push({
          input,
          detectedIntent,
          expectedIntent,
          confidence,
          timestamp: Date.now()
        });
      }
    }
    
    // Track confidence distribution
    const confidenceBucket = Math.floor(confidence * 10) / 10; // Round to nearest 0.1
    if (!this.accuracyData.confidenceDistribution[confidenceBucket]) {
      this.accuracyData.confidenceDistribution[confidenceBucket] = {
        total: 0,
        correct: 0,
        incorrect: 0
      };
    }
    
    const bucket = this.accuracyData.confidenceDistribution[confidenceBucket];
    bucket.total++;
    if (isCorrect) {
      bucket.correct++;
    } else {
      bucket.incorrect++;
    }
    
    // Save to storage
    this.saveToStorage();
  }

  /**
   * Records user feedback on intent accuracy
   * @param {string} input - The input text that was analyzed
   * @param {string} detectedIntent - The intent that was detected
   * @param {string} userCorrection - The intent the user thinks is correct
   * @param {string} feedbackType - 'correction' or 'confirmation'
   */
  recordUserFeedback(input, detectedIntent, userCorrection, feedbackType = 'correction') {
    this.accuracyData.userFeedback.push({
      input,
      detectedIntent,
      userCorrection,
      feedbackType,
      timestamp: Date.now()
    });
    
    // Keep only the last 500 feedback entries
    if (this.accuracyData.userFeedback.length > 500) {
      this.accuracyData.userFeedback = this.accuracyData.userFeedback.slice(-500);
    }
    
    // Save to storage
    this.saveToStorage();
  }

  /**
   * Gets accuracy statistics for all intents
   * @returns {Object} Accuracy statistics
   */
  getAccuracyStats() {
    const stats = {};
    
    for (const [intent, data] of Object.entries(this.accuracyData.byIntent)) {
      stats[intent] = {
        total: data.total,
        correct: data.correct,
        incorrect: data.incorrect,
        accuracy: data.total > 0 ? data.correct / data.total : 0,
        avgConfidence: data.avgConfidence,
        samples: data.samples.length
      };
    }
    
    return {
      totalDetections: this.accuracyData.totalDetections,
      byIntent: stats,
      falsePositives: this.accuracyData.falsePositives.length,
      falseNegatives: this.accuracyData.falseNegatives.length,
      confidenceDistribution: this.accuracyData.confidenceDistribution,
      userFeedbackCount: this.accuracyData.userFeedback.length
    };
  }

  /**
   * Gets the most accurate intents
   * @param {number} limit - Number of intents to return (default: 5)
   * @returns {Array} Array of intent names sorted by accuracy
   */
  getMostAccurateIntents(limit = 5) {
    const intents = Object.entries(this.accuracyData.byIntent)
      .filter(([_, data]) => data.total >= 5) // Only include intents with at least 5 samples
      .map(([intent, data]) => ({
        intent,
        accuracy: data.total > 0 ? data.correct / data.total : 0,
        total: data.total,
        avgConfidence: data.avgConfidence
      }))
      .sort((a, b) => b.accuracy - a.accuracy);
    
    return intents.slice(0, limit);
  }

  /**
   * Gets the least accurate intents
   * @param {number} limit - Number of intents to return (default: 5)
   * @returns {Array} Array of intent names sorted by lowest accuracy
   */
  getLeastAccurateIntents(limit = 5) {
    const intents = Object.entries(this.accuracyData.byIntent)
      .filter(([_, data]) => data.total >= 5) // Only include intents with at least 5 samples
      .map(([intent, data]) => ({
        intent,
        accuracy: data.total > 0 ? data.correct / data.total : 0,
        total: data.total,
        avgConfidence: data.avgConfidence
      }))
      .sort((a, b) => a.accuracy - b.accuracy);
    
    return intents.slice(0, limit);
  }

  /**
   * Gets problematic samples for a specific intent
   * @param {string} intent - The intent to analyze
   * @param {number} limit - Number of samples to return (default: 10)
   * @returns {Array} Array of problematic samples
   */
  getProblematicSamples(intent, limit = 10) {
    if (!this.accuracyData.byIntent[intent]) {
      return [];
    }
    
    return this.accuracyData.byIntent[intent].samples
      .filter(sample => sample.isCorrect === false)
      .slice(0, limit);
  }

  /**
   * Gets user feedback for analysis
   * @param {number} limit - Number of feedback entries to return (default: 10)
   * @returns {Array} Array of user feedback entries
   */
  getUserFeedback(limit = 10) {
    return this.accuracyData.userFeedback.slice(-limit).reverse(); // Most recent first
  }

  /**
   * Resets all analytics data
   */
  resetAnalytics() {
    this.accuracyData = {
      totalDetections: 0,
      byIntent: {},
      confidenceDistribution: {},
      falsePositives: [],
      falseNegatives: [],
      userFeedback: []
    };
    
    // Clear storage
    localStorage.removeItem('intentAnalytics');
  }

  /**
   * Saves analytics data to localStorage
   */
  saveToStorage() {
    try {
      localStorage.setItem('intentAnalytics', JSON.stringify(this.accuracyData));
    } catch (error) {
      console.warn('Failed to save intent analytics to localStorage:', error);
    }
  }

  /**
   * Loads analytics data from localStorage
   */
  loadFromStorage() {
    try {
      const stored = localStorage.getItem('intentAnalytics');
      if (stored) {
        this.accuracyData = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load intent analytics from localStorage:', error);
    }
  }

  /**
   * Exports analytics data as JSON
   * @returns {string} JSON string of analytics data
   */
  exportAnalytics() {
    return JSON.stringify(this.accuracyData, null, 2);
  }

  /**
   * Imports analytics data from JSON
   * @param {string} jsonData - JSON string of analytics data
   */
  importAnalytics(jsonData) {
    try {
      this.accuracyData = JSON.parse(jsonData);
      this.saveToStorage();
    } catch (error) {
      console.error('Failed to import intent analytics:', error);
      throw error;
    }
  }
}

// Create a singleton instance
const intentAnalytics = new IntentAnalytics();

export default intentAnalytics;

/**
 * Utility function to wrap intent detection with analytics tracking
 * @param {Function} detectionFn - Intent detection function to wrap
 * @param {string} input - Input text to analyze
 * @param {string} expectedIntent - Expected intent (if known)
 * @returns {Object} Detection result with analytics tracking
 */
export const withAnalyticsTracking = async (detectionFn, input, expectedIntent = null) => {
  const result = await detectionFn(input);
  
  // For now, we'll assume correctness is unknown unless provided
  intentAnalytics.recordDetection(
    input, 
    result.intent, 
    result.confidence, 
    expectedIntent, 
    null // Correctness unknown initially
  );
  
  return result;
};

/**
 * Function to report intent detection correctness after verification
 * @param {string} input - Input text that was analyzed
 * @param {string} detectedIntent - The intent that was detected
 * @param {number} confidence - The confidence score
 * @param {boolean} isCorrect - Whether the detection was correct
 */
export const reportDetectionCorrectness = (input, detectedIntent, confidence, isCorrect) => {
  intentAnalytics.recordDetection(input, detectedIntent, confidence, null, isCorrect);
};