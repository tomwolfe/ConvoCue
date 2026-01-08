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

  // Micro-pause threshold for distinguishing true yield from mid-sentence correction
  microPauseThresholdMs: 100,     // Threshold for detecting micro-pauses that indicate mid-sentence correction

  // Intent-specific parameters
  intentConfidenceThreshold: 0.3, // Minimum confidence for intent detection

  // Profile update parameters
  profileUpdateAlpha: 0.1,        // Learning rate for speaker profile updates
  minProfileUpdates: 5,           // Minimum number of updates before profile is considered reliable
  dynamicAlphaMultiplier: 1.5,    // Multiplier for alpha after minProfileUpdates is met

  // Memory management parameters
  maxConversationTurns: 20        // Maximum number of turns to keep in memory
};

/**
 * Validates configuration parameters to ensure they are within acceptable bounds
 * @param {Object} config - Configuration object to validate
 * @throws {Error} If any configuration parameter is invalid
 */
export const validateConfig = (config) => {
  const errors = [];

  // Validate numeric thresholds are positive
  if (typeof config.baseTurnThreshold !== 'number' || config.baseTurnThreshold <= 0) {
    errors.push('baseTurnThreshold must be a positive number');
  }

  if (typeof config.minAdaptiveThreshold !== 'number' || config.minAdaptiveThreshold < 0) {
    errors.push('minAdaptiveThreshold must be a non-negative number');
  }

  if (typeof config.maxAdaptiveThreshold !== 'number' || config.maxAdaptiveThreshold <= 0) {
    errors.push('maxAdaptiveThreshold must be a positive number');
  }

  if (config.minAdaptiveThreshold > config.maxAdaptiveThreshold) {
    errors.push('minAdaptiveThreshold cannot be greater than maxAdaptiveThreshold');
  }

  // Validate confidence thresholds are between 0 and 1
  const confidenceParams = [
    'speakerConfidenceHigh',
    'speakerConfidenceModerate',
    'speakerConfidenceUpdate',
    'highYieldConfidence',
    'moderateYieldConfidence',
    'intentConfidenceThreshold',
    'turnYieldWeightingFactor',
    'yieldConfidenceDecay',
    'speakerChangeThreshold',
    'speakerSimilarityThreshold'
  ];

  for (const param of confidenceParams) {
    if (typeof config[param] !== 'number' || config[param] < 0 || config[param] > 1) {
      errors.push(`${param} must be a number between 0 and 1`);
    }
  }

  // Validate time-based thresholds are positive
  const timeParams = [
    'silenceThresholdForIntent',
    'quickResponseThreshold',
    'rejectionWindowMs'
  ];

  for (const param of timeParams) {
    if (typeof config[param] !== 'number' || config[param] < 0) {
      errors.push(`${param} must be a non-negative number`);
    }
  }

  // Validate profile update parameters
  if (typeof config.profileUpdateAlpha !== 'number' || config.profileUpdateAlpha <= 0 || config.profileUpdateAlpha > 0.5) {
    errors.push('profileUpdateAlpha must be a number between 0 and 0.5');
  }

  if (typeof config.minProfileUpdates !== 'number' || config.minProfileUpdates < 1) {
    errors.push('minProfileUpdates must be a positive integer');
  }

  // Validate micro-pause threshold
  if (typeof config.microPauseThresholdMs !== 'number' || config.microPauseThresholdMs < 0) {
    errors.push('microPauseThresholdMs must be a non-negative number');
  }

  // Validate dynamic alpha multiplier
  if (typeof config.dynamicAlphaMultiplier !== 'number' || config.dynamicAlphaMultiplier <= 0) {
    errors.push('dynamicAlphaMultiplier must be a positive number');
  }

  // Validate memory management parameters
  if (typeof config.maxConversationTurns !== 'number' || config.maxConversationTurns < 1) {
    errors.push('maxConversationTurns must be a positive integer');
  }

  if (errors.length > 0) {
    throw new Error(`Invalid configuration parameters:\n${errors.join('\n')}`);
  }
};

/**
 * Function to create a custom configuration by overriding default values
 * @param {Object} overrides - Configuration values to override
 * @returns {Object} Merged configuration
 */
export const createConversationConfig = (overrides = {}) => {
  const config = { ...CONVERSATION_CONFIG, ...overrides };
  validateConfig(config);
  return config;
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
    rejectionWindowMs: 200,
    profileUpdateAlpha: 0.1  // Balanced learning in development
  },
  production: {
    ...CONVERSATION_CONFIG,
    // More conservative settings for production
    speakerConfidenceHigh: 0.65,
    speakerConfidenceUpdate: 0.25,
    rejectionWindowMs: 350,
    profileUpdateAlpha: 0.05  // Slower learning in production for stability
  },
  testing: {
    ...CONVERSATION_CONFIG,
    // Settings optimized for automated testing
    baseTurnThreshold: 1000,
    speakerConfidenceHigh: 0.4,
    rejectionWindowMs: 100,
    profileUpdateAlpha: 0.2    // Fast learning for testing
  }
};

// Validate all environment configs at startup
validateConfig(ENV_CONFIGS.development);
validateConfig(ENV_CONFIGS.production);
validateConfig(ENV_CONFIGS.testing);

/**
 * Get configuration based on environment
 * @param {string} env - Environment name ('development', 'production', 'testing', or custom)
 * @returns {Object} Configuration object
 */
export const getConfigByEnv = (env = (typeof process !== 'undefined' && process.env ? process.env.NODE_ENV : 'development')) => {
  const config = ENV_CONFIGS[env] || CONVERSATION_CONFIG;
  validateConfig(config);
  return config;
};