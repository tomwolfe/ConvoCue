/**
 * Unified Intent Recognition Engine
 *
 * This engine provides a single interface for intent recognition
 * that can work with both heuristic and ML-based implementations.
 * It supports runtime selection of methods and fallback capabilities.
 *
 * ⚠️ NOTE: The ML components currently use a PROTOTYPE implementation that simulates ML behavior.
 * This prototype MUST be replaced with actual learned models for production use.
 * The system's future depends on transitioning from heuristic to learned models.
 */

import {
  HeuristicContextDetector,
  HeuristicSentimentAnalyzer,
  HeuristicIntentClassifier,
  HeuristicCulturalContextDetector,
  HeuristicEmotionalIntensityAnalyzer,
  HeuristicConversationStageDetector
} from './heuristicIntentRecognition';

export class IntentRecognitionEngine {
  constructor(options = {}) {
    // Engine configuration
    this.options = {
      useML: options.useML || false,
      mlModelPath: options.mlModelPath,
      fallbackEnabled: options.fallbackEnabled !== false,
      confidenceThreshold: options.confidenceThreshold || 0.4,
      enableMultiIntent: options.enableMultiIntent !== false,
      enableSentimentAdjustment: options.enableSentimentAdjustment !== false,
      enableTemporalAdjustment: options.enableTemporalAdjustment !== false,
      ...options
    };

    // Initialize components based on configuration
    this.initializeComponents();
  }

  initializeComponents() {
    // Initialize heuristic components as fallback/default
    this.contextDetector = new HeuristicContextDetector();
    this.sentimentAnalyzer = new HeuristicSentimentAnalyzer();
    this.intentClassifier = new HeuristicIntentClassifier();
    this.culturalContextDetector = new HeuristicCulturalContextDetector();
    this.emotionalIntensityAnalyzer = new HeuristicEmotionalIntensityAnalyzer();
    this.conversationStageDetector = new HeuristicConversationStageDetector();

    // Initialize ML components if enabled
    if (this.options.useML) {
      this.initializeMLComponents();
    }
  }

  initializeMLComponents() {
    // Lazy initialization of ML components
    // These will be loaded only when needed
    this.mlContextDetector = null;
    this.mlSentimentAnalyzer = null;
    this.mlIntentClassifier = null;
    this.mlInitialized = false;
  }

  async initializeMLModels() {
    if (this.mlInitialized) return;

    try {
      // Dynamically import ML components if available
      const { MLContextDetector, MLSentimentAnalyzer, MLIntentClassifier } =
        await import('./mlIntentRecognition');

      this.mlContextDetector = new MLContextDetector(this.options.mlModelPath);
      this.mlSentimentAnalyzer = new MLSentimentAnalyzer(this.options.mlModelPath);
      this.mlIntentClassifier = new MLIntentClassifier(this.options.mlModelPath);

      this.mlInitialized = true;

      // Log a warning that this is still using a prototype
      console.warn('⚠️ ML models initialized with PROTOTYPE implementation. This is NOT a real ML model. Production systems require actual learned models.');
    } catch (error) {
      console.warn('ML models could not be initialized, falling back to heuristic methods:', error);
      // ML models not available, continue with heuristic methods
    }
  }

  /**
   * Main method to detect intent with full context awareness
   * @param {string} input - Input text to analyze
   * @param {Array} conversationHistory - Recent conversation history
   * @param {Object} options - Configuration options
   * @returns {Object} Enhanced intent detection result
   */
  async detectIntentWithFullContext(input, conversationHistory = [], options = {}) {
    const finalOptions = { ...this.options, ...options };
    const startTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

    // Determine which components to use based on configuration
    const contextDetector = finalOptions.useML && this.mlInitialized 
      ? this.mlContextDetector 
      : this.contextDetector;
    
    const intentClassifier = finalOptions.useML && this.mlInitialized 
      ? this.mlIntentClassifier 
      : this.intentClassifier;

    try {
      // Analyze conversation context
      const contextAnalysis = await contextDetector.detect(conversationHistory);

      // Perform intent classification with context
      const result = await intentClassifier.classify(input, {
        conversationHistory,
        contextAnalysis,
        ...finalOptions
      });

      const endTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      const processingTime = endTime - startTime;

      // Add timing information to result
      return {
        ...result,
        processingTime,
        engineUsed: finalOptions.useML && this.mlInitialized ? 'ml' : 'heuristic',
        contextAnalysis
      };
    } catch (error) {
      // If ML approach fails and fallback is enabled, use heuristic approach
      if (finalOptions.fallbackEnabled && finalOptions.useML) {
        console.warn('ML approach failed, falling back to heuristic:', error);
        
        const contextAnalysis = await this.contextDetector.detect(conversationHistory);
        const result = await this.intentClassifier.classify(input, {
          conversationHistory,
          contextAnalysis,
          ...finalOptions
        });

        const endTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        const processingTime = endTime - startTime;

        return {
          ...result,
          processingTime,
          engineUsed: 'heuristic_fallback',
          contextAnalysis,
          error: error.message
        };
      } else {
        throw error;
      }
    }
  }

  /**
   * Detect intent with conversation context from current conversation
   * @param {string} input - Input text to analyze
   * @param {number} contextTurns - Number of recent turns to consider for context
   * @param {boolean} useSummarization - Whether to use summarization for longer contexts
   * @returns {Object} Enhanced intent detection result
   */
  async detectIntentWithConversationContext(input, contextTurns = 5, useSummarization = false) {
    // This would need to access the conversation history
    // For now, we'll simulate by calling the main method with empty history
    // In a real implementation, this would get the actual conversation history
    
    // Import here to avoid circular dependencies
    const { getConversationHistory } = await import('../conversationManager');
    let history = getConversationHistory();
    
    if (useSummarization) {
      // Use the summarization function from enhancedIntentRecognition
      const { getSummarizedConversationHistory } = await import('./enhancedIntentRecognition');
      history = getSummarizedConversationHistory(history, contextTurns);
    } else {
      history = history.slice(-contextTurns);
    }
    
    return await this.detectIntentWithFullContext(input, history);
  }

  /**
   * Analyze conversation context
   * @param {Array} conversationHistory - Array of conversation turns
   * @returns {Object} Context analysis results
   */
  async analyzeConversationContext(conversationHistory) {
    const contextDetector = this.options.useML && this.mlInitialized 
      ? this.mlContextDetector 
      : this.contextDetector;
    
    return await contextDetector.detect(conversationHistory);
  }

  /**
   * Analyze sentiment trend in conversation
   * @param {Array} conversationHistory - Array of conversation turns
   * @returns {string} Overall sentiment trend
   */
  async analyzeSentimentTrend(conversationHistory) {
    const sentimentAnalyzer = this.options.useML && this.mlInitialized 
      ? this.mlSentimentAnalyzer 
      : this.sentimentAnalyzer;
    
    return await sentimentAnalyzer.analyze(conversationHistory);
  }

  /**
   * Switch between ML and heuristic approaches
   * @param {boolean} useML - Whether to use ML approach
   */
  async setUseML(useML) {
    this.options.useML = useML;
    
    if (useML && !this.mlInitialized) {
      await this.initializeMLModels();
    }
  }

  /**
   * Get current engine status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      useML: this.options.useML,
      mlInitialized: this.mlInitialized,
      fallbackEnabled: this.options.fallbackEnabled,
      components: {
        contextDetector: this.contextDetector.constructor.name,
        sentimentAnalyzer: this.sentimentAnalyzer.constructor.name,
        intentClassifier: this.intentClassifier.constructor.name
      }
    };
  }
}

// Export a singleton instance for easy access
let intentRecognitionEngine = null;

export const getIntentRecognitionEngine = (options = {}) => {
  if (!intentRecognitionEngine) {
    intentRecognitionEngine = new IntentRecognitionEngine(options);
  }
  return intentRecognitionEngine;
};