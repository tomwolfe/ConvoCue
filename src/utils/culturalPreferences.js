/**
 * Cultural Intelligence Preferences
 * Manages user preferences for cultural intelligence features
 */

/**
 * Get user preference for advanced cultural guidance
 * @returns {boolean} Whether advanced cultural guidance is enabled
 */
export const isAdvancedCulturalGuidanceEnabled = () => {
  if (typeof window === 'undefined') {
    // In worker context, return default
    return true;
  }
  
  try {
    const stored = localStorage.getItem('convoCue_advancedCulturalGuidance');
    if (stored !== null) {
      return JSON.parse(stored);
    }
    // Default to enabled
    return true;
  } catch (error) {
    console.warn('Could not load advanced cultural guidance preference:', error);
    return true; // Default to enabled
  }
};

/**
 * Set user preference for advanced cultural guidance
 * @param {boolean} enabled - Whether to enable advanced cultural guidance
 */
export const setAdvancedCulturalGuidanceEnabled = (enabled) => {
  if (typeof window === 'undefined') {
    // Can't save in worker context
    return;
  }
  
  try {
    localStorage.setItem('convoCue_advancedCulturalGuidance', JSON.stringify(!!enabled));
  } catch (error) {
    console.error('Could not save advanced cultural guidance preference:', error);
  }
};

/**
 * Toggle user preference for advanced cultural guidance
 * @returns {boolean} New state of the preference
 */
export const toggleAdvancedCulturalGuidance = () => {
  const newState = !isAdvancedCulturalGuidanceEnabled();
  setAdvancedCulturalGuidanceEnabled(newState);
  return newState;
};