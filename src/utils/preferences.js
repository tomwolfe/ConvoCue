/**
 * User preferences and personalization utilities
 */

const PREFERENCE_KEY = 'convocue_preferences';

/**
 * Get user preferences from local storage
 * @returns {Object} User preferences object
 */
export const getUserPreferences = () => {
  try {
    const preferences = localStorage.getItem(PREFERENCE_KEY);
    return preferences ? JSON.parse(preferences) : {};
  } catch (error) {
    console.error('Error reading user preferences:', error);
    return {};
  }
};

/**
 * Save user preferences to local storage
 * @param {Object} preferences - Preferences object to save
 */
export const saveUserPreferences = (preferences) => {
  try {
    localStorage.setItem(PREFERENCE_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.error('Error saving user preferences:', error);
  }
};

/**
 * Get the preferred persona for the user
 * @returns {string} Preferred persona ID
 */
export const getPreferredPersona = () => {
  const preferences = getUserPreferences();
  return preferences.preferredPersona || 'anxiety'; // Default to anxiety support
};

/**
 * Set the preferred persona for the user
 * @param {string} personaId - Persona ID to save
 */
export const setPreferredPersona = (personaId) => {
  const preferences = getUserPreferences();
  preferences.preferredPersona = personaId;
  saveUserPreferences(preferences);
};

/**
 * Get persona feedback for improvement
 * @param {string} personaId - Persona ID
 * @param {string} feedback - User feedback
 */
export const savePersonaFeedback = (personaId, feedback) => {
  const preferences = getUserPreferences();
  if (!preferences.personaFeedback) {
    preferences.personaFeedback = {};
  }
  if (!preferences.personaFeedback[personaId]) {
    preferences.personaFeedback[personaId] = [];
  }
  preferences.personaFeedback[personaId].push({
    feedback,
    timestamp: Date.now()
  });
  saveUserPreferences(preferences);
};

/**
 * Get persona feedback history
 * @param {string} personaId - Persona ID
 * @returns {Array} Array of feedback objects
 */
export const getPersonaFeedback = (personaId) => {
  const preferences = getUserPreferences();
  return preferences.personaFeedback?.[personaId] || [];
};