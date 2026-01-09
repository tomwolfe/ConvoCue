/**
 * User Cultural Profile Management for ConvoCue
 * Enables personalized cultural preferences instead of relying solely on regional stereotypes
 */

// Default cultural preferences template
const DEFAULT_CULTURAL_PREFERENCES = {
  communicationStyle: 'neutral', // 'direct', 'indirect', 'neutral'
  formalityLevel: 'moderate',    // 'high', 'moderate', 'low'
  directnessPreference: 'balanced', // 'high', 'low', 'balanced'
  emotionalExpression: 'moderate', // 'high', 'moderate', 'low'
  conflictApproach: 'diplomatic',  // 'direct', 'diplomatic', 'avoidant'
  feedbackStyle: 'constructive',   // 'direct', 'constructive', 'encouraging'
  decisionMaking: 'collaborative'  // 'individual', 'collaborative', 'hierarchical'
};

// User's cultural profile
let userCulturalProfile = { ...DEFAULT_CULTURAL_PREFERENCES };
let isProfileCustomized = false;

/**
 * Initializes user cultural profile from storage or defaults
 */
export const initializeCulturalProfile = () => {
  try {
    const storedProfile = localStorage.getItem('convoCue_culturalProfile');
    if (storedProfile) {
      userCulturalProfile = { ...DEFAULT_CULTURAL_PREFERENCES, ...JSON.parse(storedProfile) };
      isProfileCustomized = true;
    }
  } catch (error) {
    console.warn('Could not load cultural profile from storage:', error);
  }
};

/**
 * Updates user's cultural preferences
 * @param {Object} preferences - Cultural preferences to update
 * @returns {Object} Updated profile
 */
export const updateUserCulturalPreferences = (preferences) => {
  userCulturalProfile = { ...userCulturalProfile, ...preferences };
  isProfileCustomized = true;

  try {
    localStorage.setItem('convoCue_culturalProfile', JSON.stringify(userCulturalProfile));
  } catch (error) {
    console.warn('Could not save cultural profile to storage:', error);
  }

  return userCulturalProfile;
};

/**
 * Gets the current user cultural profile
 * @returns {Object} User's cultural preferences
 */
export const getUserCulturalProfile = () => {
  return { ...userCulturalProfile };
};

/**
 * Checks if the profile has been customized by the user
 * @returns {boolean} True if profile is customized
 */
export const isCulturalProfileCustomized = () => {
  return isProfileCustomized;
};

/**
 * Resets cultural profile to defaults
 */
export const resetCulturalProfile = () => {
  userCulturalProfile = { ...DEFAULT_CULTURAL_PREFERENCES };
  isProfileCustomized = false;

  try {
    localStorage.removeItem('convoCue_culturalProfile');
  } catch (error) {
    console.warn('Could not remove cultural profile from storage:', error);
  }
};

/**
 * Merges detected cultural context with user preferences
 * @param {Object} detectedContext - Automatically detected cultural context
 * @returns {Object} Merged cultural context prioritizing user preferences
 */
export const mergeCulturalContext = (detectedContext) => {
  if (!detectedContext) {
    return getUserCulturalProfile();
  }

  // If user has customized their profile, prioritize their preferences
  if (isCulturalProfileCustomized()) {
    return {
      ...detectedContext,
      characteristics: {
        ...detectedContext.characteristics,
        // Override with user preferences where defined
        communication_style: userCulturalProfile.communicationStyle,
        formality_level: userCulturalProfile.formalityLevel,
        directness: userCulturalProfile.directnessPreference,
        emotional_expression: userCulturalProfile.emotionalExpression,
        conflict_avoidance: userCulturalProfile.conflictApproach === 'avoidant' ? 'high' :
                           userCulturalProfile.conflictApproach === 'direct' ? 'low' : 'moderate'
      },
      // Add user override indicator
      userOverrideApplied: true,
      // Reduce bias risk since user preferences are applied
      biasRiskLevel: 'low'
    };
  }

  // Otherwise, return the detected context but with disclaimers
  return {
    ...detectedContext,
    isGeneralGuidance: true, // Flag indicating this is general guidance, not personalized
    userOverrideApplied: false, // No user override applied
    disclaimer: "This is general cultural guidance. Individual preferences may vary.",
    // Allow users to easily reject this suggestion
    rejectionOptionAvailable: true
  };
};

/**
 * Allows users to temporarily override detected cultural context
 * @param {string} overrideType - Type of override ('communication_style', 'formality_level', etc.)
 * @param {any} overrideValue - Value to override with
 * @param {number} durationMinutes - How long the override should last (default: 30 minutes)
 * @returns {Object} Updated context with temporary override
 */
export const applyTemporaryCulturalOverride = (overrideType, overrideValue, durationMinutes = 30) => {
  const tempOverridesKey = 'convoCue_tempCulturalOverrides';

  try {
    let tempOverrides = JSON.parse(localStorage.getItem(tempOverridesKey) || '{}');

    // Add the temporary override with expiration
    tempOverrides[overrideType] = {
      value: overrideValue,
      expiresAt: Date.now() + (durationMinutes * 60 * 1000) // Convert minutes to milliseconds
    };

    localStorage.setItem(tempOverridesKey, JSON.stringify(tempOverrides));
  } catch (error) {
    console.warn('Could not save temporary cultural override to storage:', error);
  }
};

/**
 * Checks for and applies any temporary cultural overrides
 * @param {Object} context - Current cultural context
 * @returns {Object} Context with temporary overrides applied
 */
export const applyTemporaryOverrides = (context) => {
  const tempOverridesKey = 'convoCue_tempCulturalOverrides';

  try {
    const tempOverrides = JSON.parse(localStorage.getItem(tempOverridesKey) || '{}');
    const now = Date.now();

    // Clean up expired overrides and apply active ones
    let hasChanges = false;
    const cleanedOverrides = {};

    for (const [overrideType, overrideData] of Object.entries(tempOverrides)) {
      if (now < overrideData.expiresAt) {
        // Override is still valid
        cleanedOverrides[overrideType] = overrideData;

        // Apply the override to the context
        if (context.characteristics) {
          context.characteristics[overrideType] = overrideData.value;
          hasChanges = true;
        }
      }
    }

    // Save cleaned overrides back to storage
    localStorage.setItem(tempOverridesKey, JSON.stringify(cleanedOverrides));

    if (hasChanges) {
      return {
        ...context,
        hasTemporaryOverrides: true,
        temporaryOverridesApplied: Object.keys(cleanedOverrides)
      };
    }
  } catch (error) {
    console.warn('Could not apply temporary cultural overrides from storage:', error);
  }

  return {
    ...context,
    hasTemporaryOverrides: false
  };
};

/**
 * Allows users to completely opt out of cultural suggestions
 * @param {boolean} optedOut - Whether to opt out of cultural suggestions
 */
export const setCulturalOptOut = (optedOut) => {
  try {
    localStorage.setItem('convoCue_culturalOptOut', JSON.stringify(optedOut));
  } catch (error) {
    console.warn('Could not save cultural opt-out preference to storage:', error);
  }
};

/**
 * Checks if user has opted out of cultural suggestions
 * @returns {boolean} Whether user has opted out
 */
export const isCulturalOptOut = () => {
  try {
    const optOutStr = localStorage.getItem('convoCue_culturalOptOut');
    return JSON.parse(optOutStr || 'false');
  } catch (error) {
    console.warn('Could not load cultural opt-out preference from storage:', error);
    return false;
  }
};

/**
 * Provides cultural feedback mechanism for users to correct suggestions
 * @param {string} suggestion - The cultural suggestion provided
 * @param {boolean} isAccurate - Whether the suggestion was accurate
 * @param {string} feedback - Additional feedback from user
 */
export const provideCulturalFeedback = (suggestion, isAccurate, feedback = '') => {
  // Log feedback for potential future learning
  console.log(`Cultural feedback: Suggestion "${suggestion}" - Accurate: ${isAccurate}`, feedback);

  // Use bias monitoring system to track feedback
  if (typeof window !== 'undefined' && window.localStorage) {
    // Asynchronous import to avoid blocking the main thread
    import('./biasMonitoring.js')
      .then(module => {
        if (module && module.logCulturalFeedback) {
          module.logCulturalFeedback(suggestion, isAccurate, feedback);
        }
      })
      .catch(() => {
        // Fallback to direct logging if import fails
        try {
          const monitoringKey = 'convoCue_biasMonitoring';
          const monitoringData = JSON.parse(window.localStorage.getItem(monitoringKey) || '{}');

          monitoringData.userFeedbackCount = (monitoringData.userFeedbackCount || 0) + 1;

          // Log the feedback for review
          monitoringData.biasIncidents = monitoringData.biasIncidents || [];
          monitoringData.biasIncidents.push({
            timestamp: Date.now(),
            type: 'user_feedback',
            suggestion,
            isAccurate,
            feedbackText: feedback,
            source: 'user_direct_feedback'
          });

          // Limit incidents to last 1000 entries
          if (monitoringData.biasIncidents.length > 1000) {
            monitoringData.biasIncidents = monitoringData.biasIncidents.slice(-1000);
          }

          monitoringData.lastUpdated = Date.now();

          window.localStorage.setItem(monitoringKey, JSON.stringify(monitoringData));
        } catch (innerError) {
          console.warn('Could not log cultural feedback to bias monitoring:', innerError);
        }
      });
  }

  // In a future version, this could be used to improve the cultural models
  // For now, we'll store it for potential analysis
  try {
    const feedbackLog = JSON.parse(localStorage.getItem('convoCue_culturalFeedback') || '[]');
    feedbackLog.push({
      timestamp: Date.now(),
      suggestion,
      isAccurate,
      feedback,
      userProfile: getUserCulturalProfile()
    });

    // Keep only the last 100 feedback entries
    if (feedbackLog.length > 100) {
      feedbackLog.shift();
    }

    localStorage.setItem('convoCue_culturalFeedback', JSON.stringify(feedbackLog));
  } catch (error) {
    console.warn('Could not save cultural feedback to storage:', error);
  }
};

// Initialize the profile when module loads
initializeCulturalProfile();