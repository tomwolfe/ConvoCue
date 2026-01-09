/**
 * Configuration for conservative defaults in ConvoCue
 * Implements privacy-first approach that minimizes cultural assumptions
 */

// Default configuration that minimizes cultural assumptions
export const ConservativeDefaults = {
  // Cultural context detection settings
  culturalContext: {
    // Minimum confidence required to apply cultural guidance (raised from default)
    minConfidenceThreshold: 0.5,
    
    // Whether to enable cultural suggestions by default (set to false for conservative approach)
    enableCulturalSuggestionsByDefault: false,
    
    // Whether to show cultural disclaimer proactively
    showCulturalDisclaimer: true,
    
    // Frequency of cultural disclaimer reminders (in days)
    disclaimerReminderFrequency: 7
  },
  
  // Language learning settings
  languageLearning: {
    // Whether to enable native language-specific feedback by default
    enableNativeLanguageFeedbackByDefault: true,
    
    // Whether to link language learning with cultural context by default
    linkLanguageAndCultureByDefault: false
  },
  
  // Bias monitoring settings
  biasMonitoring: {
    // Whether to enable bias monitoring by default
    enableBiasMonitoringByDefault: true,
    
    // Threshold for showing bias alerts to users
    biasAlertThreshold: 0.3  // Show alerts when bias risk is moderate or higher
  }
};

/**
 * Checks if cultural features should be enabled based on user preferences and defaults
 * @returns {boolean} Whether cultural features should be enabled
 */
export const areCulturalFeaturesEnabled = () => {
  // Check if user has explicitly enabled cultural features
  if (typeof window !== 'undefined' && window.localStorage) {
    const userSetting = localStorage.getItem('convoCue_culturalFeaturesEnabled');
    if (userSetting !== null) {
      return JSON.parse(userSetting);
    }
  }
  
  // Otherwise, use conservative default
  return ConservativeDefaults.culturalContext.enableCulturalSuggestionsByDefault;
};

/**
 * Sets whether cultural features should be enabled
 * @param {boolean} enabled - Whether to enable cultural features
 */
export const setCulturalFeaturesEnabled = (enabled) => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem('convoCue_culturalFeaturesEnabled', JSON.stringify(enabled));
    } catch (error) {
      console.warn('Could not save cultural features setting to storage:', error);
    }
  }
};

/**
 * Checks if cultural disclaimer should be shown
 * @returns {boolean} Whether to show cultural disclaimer
 */
export const shouldShowCulturalDisclaimer = () => {
  // Check if user has acknowledged disclaimer recently
  const lastShown = localStorage.getItem('convoCue_culturalDisclaimerLastShown');
  const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days in milliseconds
  
  // Show disclaimer if not shown in the last week
  return !lastShown || parseInt(lastShown) < oneWeekAgo;
};

/**
 * Records that cultural disclaimer was shown
 */
export const recordCulturalDisclaimerShown = () => {
  localStorage.setItem('convoCue_culturalDisclaimerLastShown', Date.now().toString());
};

/**
 * Gets the minimum confidence threshold for applying cultural guidance
 * @returns {number} Minimum confidence threshold
 */
export const getCulturalConfidenceThreshold = () => {
  // Check if user has set a custom threshold
  if (typeof window !== 'undefined' && window.localStorage) {
    const userThreshold = localStorage.getItem('convoCue_culturalConfidenceThreshold');
    if (userThreshold !== null) {
      return parseFloat(userThreshold);
    }
  }
  
  // Otherwise, use default
  return ConservativeDefaults.culturalContext.minConfidenceThreshold;
};

/**
 * Sets the minimum confidence threshold for applying cultural guidance
 * @param {number} threshold - Confidence threshold between 0 and 1
 */
export const setCulturalConfidenceThreshold = (threshold) => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      // Ensure threshold is between 0 and 1
      const clampedThreshold = Math.max(0, Math.min(1, threshold));
      localStorage.setItem('convoCue_culturalConfidenceThreshold', clampedThreshold.toString());
    } catch (error) {
      console.warn('Could not save cultural confidence threshold to storage:', error);
    }
  }
};