/**
 * Interface definitions for pluggable intent recognition components
 * 
 * These interfaces define the contract for different implementations
 * of context detection, sentiment analysis, and intent classification.
 */

/**
 * Interface for context detection components
 */
export class ContextDetector {
  /**
   * Detect context from conversation history
   * @param {Array} conversationHistory - Array of conversation turns
   * @returns {Promise<Object>} Context analysis results
   */
  async detect(conversationHistory) {
    throw new Error('Method detect must be implemented');
  }
}

/**
 * Interface for sentiment analysis components
 */
export class SentimentAnalyzer {
  /**
   * Analyze sentiment in conversation history
   * @param {Array} conversationHistory - Array of conversation turns
   * @returns {Promise<Object>} Sentiment analysis results
   */
  async analyze(conversationHistory) {
    throw new Error('Method analyze must be implemented');
  }
}

/**
 * Interface for intent classification components
 */
export class IntentClassifier {
  /**
   * Classify intent from input text and context
   * @param {string} input - Input text to analyze
   * @param {Object} context - Context information (optional)
   * @returns {Promise<Object>} Intent classification results
   */
  async classify(input, context = null) {
    throw new Error('Method classify must be implemented');
  }
}

/**
 * Interface for cultural context detection
 */
export class CulturalContextDetector {
  /**
   * Infer cultural context from conversation history
   * @param {Array} conversationHistory - Array of conversation turns
   * @returns {Promise<Object>} Cultural context analysis results
   */
  async infer(conversationHistory) {
    throw new Error('Method infer must be implemented');
  }
}

/**
 * Interface for emotional intensity analysis
 */
export class EmotionalIntensityAnalyzer {
  /**
   * Analyze emotional intensity in conversation history
   * @param {Array} conversationHistory - Array of conversation turns
   * @returns {Promise<string>} Emotional intensity level ('low', 'moderate', 'high')
   */
  async analyze(conversationHistory) {
    throw new Error('Method analyze must be implemented');
  }
}

/**
 * Interface for conversation stage detection
 */
export class ConversationStageDetector {
  /**
   * Detect the current stage of conversation
   * @param {Array} conversationHistory - Array of conversation turns
   * @returns {Promise<string>} Conversation stage ('opening', 'middle', 'closing')
   */
  async detect(conversationHistory) {
    throw new Error('Method detect must be implemented');
  }
}