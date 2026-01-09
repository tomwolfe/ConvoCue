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
      }
    };
  }

  // Otherwise, return the detected context but with disclaimers
  return {
    ...detectedContext,
    isGeneralGuidance: true, // Flag indicating this is general guidance, not personalized
    disclaimer: "This is general cultural guidance. Individual preferences may vary."
  };
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