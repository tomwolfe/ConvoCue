/**
 * Configuration for conversation turn management
 * Contains all configurable parameters for speaker detection and turn-taking
 */

export const CONVERSATION_CONFIG = {
  // Base thresholds
  baseTurnThreshold: 1500,        // Base threshold: 1.5 seconds of silence to consider turn end
  minAdaptiveThreshold: 500,      // Minimum adaptive threshold (ms)
  maxAdaptiveThreshold: 3000,     // Maximum adaptive threshold (ms)
  
  // Speaker change detection
  speakerChangeThreshold: 0.3,    // Threshold for considering it a new speaker
  speakerConfidenceHigh: 0.6,     // High confidence for speaker change
  speakerConfidenceModerate: 0.3, // Moderate confidence for speaker change
  speakerConfidenceUpdate: 0.2,   // Minimum confidence to update speaker profile
  speakerSimilarityThreshold: 0.1, // Threshold for similarity comparison
  
  // Turn yield confidence thresholds
  highYieldConfidence: 0.7,       // High confidence for turn yielding
  moderateYieldConfidence: 0.5,   // Moderate confidence for turn yielding
  
  // Time-based thresholds
  silenceThresholdForIntent: 500, // Minimum silence when intent suggests turn yield (ms)
  quickResponseThreshold: 600,    // Threshold when expecting quick response after yield (ms)
  
  // Turn-yield weighting parameters (used to influence speaker detection when turn yielding is detected)
  turnYieldWeightingFactor: 0.2,   // Weighting factor for turn yield (increases likelihood of detecting other speaker after turn yield)
  
  // Decay rate for turn yield confidence
  yieldConfidenceDecay: 0.1,      // Amount to decay yield confidence per frame
  
  // Rejection window (to address race condition)
  rejectionWindowMs: 300,         // Time window to cancel turn change if same speaker continues
  
  // Intent-specific parameters
  intentConfidenceThreshold: 0.3, // Minimum confidence for intent detection
  
  // Profile update parameters
  profileUpdateAlpha: 0.1,        // Learning rate for speaker profile updates
  minProfileUpdates: 5            // Minimum number of updates before profile is considered reliable
};

/**
 * Function to create a custom configuration by overriding default values
 * @param {Object} overrides - Configuration values to override
 * @returns {Object} Merged configuration
 */
export const createConversationConfig = (overrides = {}) => {
  return { ...CONVERSATION_CONFIG, ...overrides };
};

/**
 * Environment-specific configurations
 */
export const ENV_CONFIGS = {
  development: {
    ...CONVERSATION_CONFIG,
    // More sensitive settings for development/testing
    speakerConfidenceHigh: 0.5,
    speakerConfidenceUpdate: 0.15,
    rejectionWindowMs: 200
  },
  production: {
    ...CONVERSATION_CONFIG,
    // More conservative settings for production
    speakerConfidenceHigh: 0.65,
    speakerConfidenceUpdate: 0.25,
    rejectionWindowMs: 350
  },
  testing: {
    ...CONVERSATION_CONFIG,
    // Settings optimized for automated testing
    baseTurnThreshold: 1000,
    speakerConfidenceHigh: 0.4,
    rejectionWindowMs: 100
  }
};

/**
 * Get configuration based on environment
 * @param {string} env - Environment name ('development', 'production', 'testing', or custom)
 * @returns {Object} Configuration object
 */
export const getConfigByEnv = (env = process.env.NODE_ENV || 'development') => {
  return ENV_CONFIGS[env] || { ...CONVERSATION_CONFIG, ...ENV_CONFIGS.development };
};