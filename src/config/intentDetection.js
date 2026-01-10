/**
 * Configuration for Intent Detection System
 * Allows customization of real-time intent detection parameters
 */

export const IntentDetectionConfig = {
  // Default values for intent detection parameters
  defaults: {
    // Confidence threshold for displaying live intent badges (0.1 to 0.9)
    confidenceThreshold: 0.3,
    
    // Debounce window in milliseconds to prevent rapid intent switching (200ms to 2000ms)
    debounceWindowMs: 800,
    
    // Sticky intent duration in milliseconds (how long to keep showing the same intent) (1000ms to 5000ms)
    stickyDurationMs: 2000,
    
    // Maximum tokens to process for similarity matching (performance optimization)
    maxTokensForSimilarity: 10,
    
    // Minimum similarity threshold for fuzzy matching
    similarityThreshold: 0.85
  },
  
  // Validation ranges for parameters
  validation: {
    confidenceThreshold: { min: 0.1, max: 0.9 },
    debounceWindowMs: { min: 200, max: 2000 },
    stickyDurationMs: { min: 1000, max: 5000 },
    maxTokensForSimilarity: { min: 1, max: 50 },
    similarityThreshold: { min: 0.5, max: 0.95 }
  },
  
  /**
   * Validates a configuration value against its range
   */
  validateValue: (key, value) => {
    const range = IntentDetectionConfig.validation[key];
    if (!range) {
      throw new Error(`Unknown configuration key: ${key}`);
    }
    
    if (typeof value !== 'number' || value < range.min || value > range.max) {
      throw new Error(`${key} must be between ${range.min} and ${range.max}, got ${value}`);
    }
    
    return true;
  },
  
  /**
   * Gets the current intent detection settings from storage or returns defaults
   */
  getCurrentSettings: async () => {
    try {
      const stored = localStorage.getItem('intentDetectionSettings');
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...IntentDetectionConfig.defaults,
          ...parsed
        };
      }
    } catch (error) {
      console.warn('Failed to load intent detection settings:', error);
    }
    
    return IntentDetectionConfig.defaults;
  },
  
  /**
   * Saves intent detection settings to storage
   */
  saveSettings: async (settings) => {
    try {
      // Validate all settings before saving
      Object.keys(settings).forEach(key => {
        if (Object.prototype.hasOwnProperty.call(IntentDetectionConfig.defaults, key)) {
          IntentDetectionConfig.validateValue(key, settings[key]);
        }
      });
      
      localStorage.setItem('intentDetectionSettings', JSON.stringify(settings));
      return true;
    } catch (error) {
      console.error('Failed to save intent detection settings:', error);
      return false;
    }
  },
  
  /**
   * Resets settings to defaults
   */
  resetToDefaults: async () => {
    try {
      localStorage.removeItem('intentDetectionSettings');
      return true;
    } catch (error) {
      console.error('Failed to reset intent detection settings:', error);
      return false;
    }
  }
};