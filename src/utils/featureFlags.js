/**
 * Feature Flags System
 * 
 * Centralized configuration for feature flags that can be toggled
 * without code changes for A/B testing and gradual rollouts.
 */

// Default feature flag values
const DEFAULT_FLAGS = {
  // Enable ML-based intent recognition engine
  enableMLIntentRecognition: false,
  
  // Enable advanced sentiment analysis
  enableAdvancedSentiment: false,
  
  // Enable cultural context detection
  enableCulturalContext: false,
  
  // Enable experimental features
  enableExperimentalFeatures: false
};

// Storage key for user preferences
const FEATURE_FLAGS_STORAGE_KEY = 'convo_cue_feature_flags';

/**
 * Get feature flag value
 * Checks user preferences first, then falls back to defaults
 * @param {string} flagName - Name of the feature flag
 * @returns {boolean} Flag value
 */
export const getFeatureFlag = (flagName) => {
  try {
    // Check if flag is set in user preferences
    const userFlags = JSON.parse(localStorage.getItem(FEATURE_FLAGS_STORAGE_KEY) || '{}');
    
    if (typeof userFlags[flagName] !== 'undefined') {
      return Boolean(userFlags[flagName]);
    }
    
    // Fall back to default value
    return DEFAULT_FLAGS[flagName] || false;
  } catch (error) {
    console.warn(`Error reading feature flag ${flagName}:`, error);
    return DEFAULT_FLAGS[flagName] || false;
  }
};

/**
 * Set feature flag value in user preferences
 * @param {string} flagName - Name of the feature flag
 * @param {boolean} value - Value to set
 */
export const setFeatureFlag = (flagName, value) => {
  try {
    const userFlags = JSON.parse(localStorage.getItem(FEATURE_FLAGS_STORAGE_KEY) || '{}');
    userFlags[flagName] = value;
    localStorage.setItem(FEATURE_FLAGS_STORAGE_KEY, JSON.stringify(userFlags));
  } catch (error) {
    console.error(`Error setting feature flag ${flagName}:`, error);
  }
};

/**
 * Reset all feature flags to default values
 */
export const resetFeatureFlags = () => {
  try {
    localStorage.removeItem(FEATURE_FLAGS_STORAGE_KEY);
  } catch (error) {
    console.error('Error resetting feature flags:', error);
  }
};

/**
 * Get all feature flags with their current values
 * @returns {Object} Object with flag names as keys and boolean values
 */
export const getAllFeatureFlags = () => {
  const userFlags = JSON.parse(localStorage.getItem(FEATURE_FLAGS_STORAGE_KEY) || '{}');
  const allFlags = { ...DEFAULT_FLAGS };
  
  // Override defaults with user preferences
  Object.keys(userFlags).forEach(flagName => {
    allFlags[flagName] = userFlags[flagName];
  });
  
  return allFlags;
};

// Export individual flag getters for convenience
export const isMLIntentRecognitionEnabled = () => getFeatureFlag('enableMLIntentRecognition');
export const isAdvancedSentimentEnabled = () => getFeatureFlag('enableAdvancedSentiment');
export const isCulturalContextEnabled = () => getFeatureFlag('enableCulturalContext');
export const areExperimentalFeaturesEnabled = () => getFeatureFlag('enableExperimentalFeatures');