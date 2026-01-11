/**
 * Data Collection Mechanisms for ML Training
 * 
 * This module implements comprehensive data collection to gather
 * training data for future ML models, including user feedback,
 * interaction patterns, and performance metrics.
 */

// Storage key for collected training data
const TRAINING_DATA_STORAGE_KEY = 'convo_cue_training_data';
const USER_FEEDBACK_STORAGE_KEY = 'convo_cue_user_feedback';

// Maximum number of records to store before sending to server
const MAX_LOCAL_RECORDS = 1000;

// Types of data to collect
const DATA_TYPES = {
  INTENT_DETECTION: 'intent_detection',
  CULTURAL_CONTEXT: 'cultural_context',
  SENTIMENT_ANALYSIS: 'sentiment_analysis',
  USER_FEEDBACK: 'user_feedback',
  PERFORMANCE_METRICS: 'performance_metrics',
  EDGE_CASES: 'edge_cases'
};

/**
 * Training data collector class
 */
export class TrainingDataCollector {
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
    this.autoSend = options.autoSend !== false;
    this.sendInterval = options.sendInterval || 300000; // 5 minutes
    this.apiEndpoint = options.apiEndpoint || '/api/training-data';
    this.userId = options.userId || this.generateAnonymousId();
    
    this.initStorage();
    this.startSendingInterval();
  }

  initStorage() {
    // Initialize storage for training data
    if (!localStorage.getItem(TRAINING_DATA_STORAGE_KEY)) {
      localStorage.setItem(TRAINING_DATA_STORAGE_KEY, JSON.stringify([]));
    }
    
    if (!localStorage.getItem(USER_FEEDBACK_STORAGE_KEY)) {
      localStorage.setItem(USER_FEEDBACK_STORAGE_KEY, JSON.stringify([]));
    }
  }

  generateAnonymousId() {
    // Generate a random anonymous ID for privacy
    return 'anon_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Collect intent detection training data
   * @param {string} input - Input text
   * @param {Object} result - Detection result
   * @param {Object} context - Context used for detection
   * @param {number} processingTime - Time taken for processing
   */
  collectIntentTrainingData(input, result, context, processingTime) {
    if (!this.enabled) return;

    const record = {
      type: DATA_TYPES.INTENT_DETECTION,
      userId: this.userId,
      timestamp: Date.now(),
      input,
      result,
      context,
      processingTime,
      version: '__APP_VERSION__', // Will be replaced by build process
      platform: navigator.userAgent || 'unknown'
    };

    this.storeRecord(record);
  }

  /**
   * Collect cultural context training data
   * @param {Array} conversationHistory - Conversation history
   * @param {Object} result - Cultural context detection result
   */
  collectCulturalContextTrainingData(conversationHistory, result) {
    if (!this.enabled) return;

    const record = {
      type: DATA_TYPES.CULTURAL_CONTEXT,
      userId: this.userId,
      timestamp: Date.now(),
      conversationHistory,
      result,
      version: '__APP_VERSION__',
      platform: navigator.userAgent || 'unknown'
    };

    this.storeRecord(record);
  }

  /**
   * Collect sentiment analysis training data
   * @param {Array} conversationHistory - Conversation history
   * @param {Object} result - Sentiment analysis result
   */
  collectSentimentTrainingData(conversationHistory, result) {
    if (!this.enabled) return;

    const record = {
      type: DATA_TYPES.SENTIMENT_ANALYSIS,
      userId: this.userId,
      timestamp: Date.now(),
      conversationHistory,
      result,
      version: '__APP_VERSION__',
      platform: navigator.userAgent || 'unknown'
    };

    this.storeRecord(record);
  }

  /**
   * Collect user feedback data
   * @param {string} input - Original input text
   * @param {Object} prediction - Model prediction
   * @param {string} feedback - User feedback ('correct', 'incorrect', 'partial')
   * @param {string} correction - Corrected label (if incorrect)
   * @param {string} feedbackText - Additional feedback text
   */
  collectUserFeedback(input, prediction, feedback, correction = null, feedbackText = '') {
    if (!this.enabled) return;

    const record = {
      type: DATA_TYPES.USER_FEEDBACK,
      userId: this.userId,
      timestamp: Date.now(),
      input,
      prediction,
      feedback,
      correction,
      feedbackText,
      version: '__APP_VERSION__',
      platform: navigator.userAgent || 'unknown'
    };

    // Store in separate feedback storage for easier access
    this.storeFeedbackRecord(record);
    
    // Also store in main training data for ML training
    this.storeRecord(record);
  }

  /**
   * Collect performance metrics
   * @param {string} component - Component name
   * @param {number} processingTime - Processing time in ms
   * @param {boolean} success - Whether operation succeeded
   * @param {string} error - Error message if failed
   */
  collectPerformanceMetrics(component, processingTime, success = true, error = null) {
    if (!this.enabled) return;

    const record = {
      type: DATA_TYPES.PERFORMANCE_METRICS,
      userId: this.userId,
      timestamp: Date.now(),
      component,
      processingTime,
      success,
      error,
      version: '__APP_VERSION__',
      platform: navigator.userAgent || 'unknown'
    };

    this.storeRecord(record);
  }

  /**
   * Collect edge case data
   * @param {string} input - Input text
   * @param {Object} result - Detection result
   * @param {string} reason - Why it's considered an edge case
   */
  collectEdgeCase(input, result, reason) {
    if (!this.enabled) return;

    const record = {
      type: DATA_TYPES.EDGE_CASES,
      userId: this.userId,
      timestamp: Date.now(),
      input,
      result,
      reason,
      version: '__APP_VERSION__',
      platform: navigator.userAgent || 'unknown'
    };

    this.storeRecord(record);
  }

  /**
   * Store a record in local storage
   * @param {Object} record - Record to store
   */
  storeRecord(record) {
    try {
      const existingData = JSON.parse(localStorage.getItem(TRAINING_DATA_STORAGE_KEY) || '[]');
      existingData.push(record);
      
      // Keep only the most recent records to prevent storage overflow
      const recentData = existingData.slice(-MAX_LOCAL_RECORDS);
      
      localStorage.setItem(TRAINING_DATA_STORAGE_KEY, JSON.stringify(recentData));
      
      // If auto-send is enabled and we've reached the threshold, send data
      if (this.autoSend && recentData.length % 50 === 0) {
        this.sendDataToServer();
      }
    } catch (error) {
      console.error('Failed to store training data:', error);
    }
  }

  /**
   * Store feedback record separately
   * @param {Object} record - Feedback record to store
   */
  storeFeedbackRecord(record) {
    try {
      const existingFeedback = JSON.parse(localStorage.getItem(USER_FEEDBACK_STORAGE_KEY) || '[]');
      existingFeedback.push(record);
      
      // Keep only the most recent feedback
      const recentFeedback = existingFeedback.slice(-MAX_LOCAL_RECORDS);
      
      localStorage.setItem(USER_FEEDBACK_STORAGE_KEY, JSON.stringify(recentFeedback));
    } catch (error) {
      console.error('Failed to store feedback data:', error);
    }
  }

  /**
   * Send collected data to server
   */
  async sendDataToServer() {
    if (!this.enabled) return;

    try {
      const trainingData = JSON.parse(localStorage.getItem(TRAINING_DATA_STORAGE_KEY) || '[]');
      const feedbackData = JSON.parse(localStorage.getItem(USER_FEEDBACK_STORAGE_KEY) || '[]');

      if (trainingData.length === 0 && feedbackData.length === 0) {
        return; // Nothing to send
      }

      // Combine and send data
      const dataToSend = {
        userId: this.userId,
        timestamp: Date.now(),
        trainingData,
        feedbackData
      };

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(dataToSend)
      });

      if (response.ok) {
        // Clear sent data from local storage
        localStorage.setItem(TRAINING_DATA_STORAGE_KEY, JSON.stringify([]));
        localStorage.setItem(USER_FEEDBACK_STORAGE_KEY, JSON.stringify([]));
      } else {
        console.error('Failed to send training data to server:', response.status);
      }
    } catch (error) {
      console.error('Error sending training data:', error);
      // Keep data locally for retry
    }
  }

  /**
   * Start periodic sending interval
   */
  startSendingInterval() {
    if (this.sendInterval > 0) {
      setInterval(() => {
        this.sendDataToServer();
      }, this.sendInterval);
    }
  }

  /**
   * Get collected training data
   * @returns {Array} Array of training records
   */
  getTrainingData() {
    try {
      return JSON.parse(localStorage.getItem(TRAINING_DATA_STORAGE_KEY) || '[]');
    } catch (error) {
      console.error('Failed to retrieve training data:', error);
      return [];
    }
  }

  /**
   * Get user feedback data
   * @returns {Array} Array of feedback records
   */
  getUserFeedback() {
    try {
      return JSON.parse(localStorage.getItem(USER_FEEDBACK_STORAGE_KEY) || '[]');
    } catch (error) {
      console.error('Failed to retrieve feedback data:', error);
      return [];
    }
  }

  /**
   * Clear all collected data
   */
  clearAllData() {
    localStorage.setItem(TRAINING_DATA_STORAGE_KEY, JSON.stringify([]));
    localStorage.setItem(USER_FEEDBACK_STORAGE_KEY, JSON.stringify([]));
  }

  /**
   * Enable/disable data collection
   * @param {boolean} enabled - Whether to enable collection
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }
}

/**
 * Global instance of the training data collector
 */
let globalTrainingDataCollector = null;

/**
 * Get or create the global training data collector instance
 * @param {Object} options - Collector options
 * @returns {TrainingDataCollector} The collector instance
 */
export const getTrainingDataCollector = (options = {}) => {
  if (!globalTrainingDataCollector) {
    globalTrainingDataCollector = new TrainingDataCollector(options);
  }
  return globalTrainingDataCollector;
};

/**
 * Convenience function to collect intent training data
 * @param {string} input - Input text
 * @param {Object} result - Detection result
 * @param {Object} context - Context used for detection
 * @param {number} processingTime - Time taken for processing
 */
export const collectIntentTrainingSample = (input, result, context, processingTime) => {
  const collector = getTrainingDataCollector();
  collector.collectIntentTrainingData(input, result, context, processingTime);
};

/**
 * Convenience function to collect user feedback
 * @param {string} input - Original input text
 * @param {Object} prediction - Model prediction
 * @param {string} feedback - User feedback ('correct', 'incorrect', 'partial')
 * @param {string} correction - Corrected label (if incorrect)
 * @param {string} feedbackText - Additional feedback text
 */
export const collectUserFeedbackSample = (input, prediction, feedback, correction = null, feedbackText = '') => {
  const collector = getTrainingDataCollector();
  collector.collectUserFeedback(input, prediction, feedback, correction, feedbackText);
};

/**
 * Enhanced logging function that also collects training data
 * @param {Object} input - Input text and context
 * @param {Object} result - Detection result
 * @param {number} processingTime - Time taken for processing
 */
export const logIntentDetectionMetricsEnhanced = (input, result, processingTime) => {
  // Call the original logging function
  const originalMetric = {
    timestamp: Date.now(),
    inputLength: typeof input === 'string' ? input.length : JSON.stringify(input).length,
    processingTime,
    primaryIntent: result.primaryIntent?.intent || null,
    primaryConfidence: result.primaryIntent?.confidence || 0,
    numIntents: result.allIntents?.length || 0,
    contextUsed: !!result.contextAnalysis,
    sentimentTrend: result.contextAnalysis?.sentimentTrend,
    culturalContext: result.contextAnalysis?.culturalContext,
    conversationStage: result.contextAnalysis?.conversationStage,
    engineUsed: result.engineUsed || 'unknown'
  };

  // Store original metrics
  try {
    const existingMetrics = JSON.parse(localStorage.getItem('intentDetectionMetrics') || '[]');
    existingMetrics.push(originalMetric);
    // Keep only the last 1000 entries to prevent storage overflow
    const recentMetrics = existingMetrics.slice(-1000);
    localStorage.setItem('intentDetectionMetrics', JSON.stringify(recentMetrics));
  } catch (e) {
    console.warn('Could not store intent detection metrics:', e);
  }

  // Also collect for ML training
  const collector = getTrainingDataCollector();
  collector.collectIntentTrainingData(input, result, result.contextAnalysis, processingTime);

  return originalMetric;
};

// Export all relevant functions
export {
  DATA_TYPES,
  TRAINING_DATA_STORAGE_KEY,
  USER_FEEDBACK_STORAGE_KEY
};