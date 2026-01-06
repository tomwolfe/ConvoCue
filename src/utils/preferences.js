/**
 * Centralized preferences management for ConvoCue
 */

const PREFERENCES_KEY = 'convocue_preferences';
const FEEDBACK_KEY = 'convocue_feedback';
const CUSTOM_PERSONAS_KEY = 'convocue_custom_personas';
const TUTORIAL_SEEN_KEY = 'convocue_tutorial_seen';
const CULTURAL_CONTEXT_KEY = 'selectedCulturalContext';

/**
 * Get all preferences
 * @returns {Object} Preferences object
 */
export const getPreferences = () => {
  try {
    const prefs = localStorage.getItem(PREFERENCES_KEY);
    return prefs ? JSON.parse(prefs) : {};
  } catch (e) {
    console.error('Error reading preferences:', e);
    return {};
  }
};

/**
 * Save preferences
 * @param {Object} prefs - Preferences to save
 */
export const savePreferences = (prefs) => {
  try {
    const currentPrefs = getPreferences();
    const newPrefs = { ...currentPrefs, ...prefs };
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(newPrefs));
  } catch (e) {
    console.error('Error saving preferences:', e);
  }
};

/**
 * Get feedback history
 * @returns {Array} Feedback history
 */
export const getFeedbackHistory = () => {
  try {
    const history = localStorage.getItem(FEEDBACK_KEY);
    return history ? JSON.parse(history) : [];
  } catch (e) {
    console.error('Error reading feedback history:', e);
    return [];
  }
};

/**
 * Save feedback
 * @param {Object} feedback - Feedback entry to save
 */
export const saveFeedback = (feedback) => {
  try {
    const history = getFeedbackHistory();
    history.push({
      ...feedback,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(history));
  } catch (e) {
    console.error('Error saving feedback:', e);
  }
};

/**
 * Get custom personas
 * @returns {Object} Custom personas
 */
export const getCustomPersonas = () => {
  try {
    const personas = localStorage.getItem(CUSTOM_PERSONAS_KEY);
    return personas ? JSON.parse(personas) : {};
  } catch (e) {
    console.error('Error reading custom personas:', e);
    return {};
  }
};

/**
 * Save a custom persona
 * @param {Object} persona - Persona to save
 */
export const saveCustomPersona = (persona) => {
  try {
    const personas = getCustomPersonas();
    personas[persona.id] = persona;
    localStorage.setItem(CUSTOM_PERSONAS_KEY, JSON.stringify(personas));
  } catch (e) {
    console.error('Error saving custom persona:', e);
  }
};

/**
 * Delete a custom persona
 * @param {string} personaId - ID of persona to delete
 */
export const deleteCustomPersona = (personaId) => {
  try {
    const personas = getCustomPersonas();
    delete personas[personaId];
    localStorage.setItem(CUSTOM_PERSONAS_KEY, JSON.stringify(personas));
  } catch (e) {
    console.error('Error deleting custom persona:', e);
  }
};

/**
 * Check if tutorial has been seen
 * @returns {boolean} True if tutorial seen
 */
export const hasSeenTutorial = () => {
  return localStorage.getItem(TUTORIAL_SEEN_KEY) === 'true';
};

/**
 * Set tutorial as seen
 */
export const setTutorialSeen = () => {
  localStorage.setItem(TUTORIAL_SEEN_KEY, 'true');
};

/**
 * Get selected cultural context
 * @returns {string} Selected cultural context
 */
export const getSelectedCulturalContext = () => {
  return localStorage.getItem(CULTURAL_CONTEXT_KEY) || 'general';
};

/**
 * Set selected cultural context
 * @param {string} context - Cultural context to set
 */
export const setSelectedCulturalContext = (context) => {
  localStorage.setItem(CULTURAL_CONTEXT_KEY, context);
};

/**
 * Gets user's preferred response patterns based on feedback history
 * @returns {object} Preferred response characteristics
 */
export const getUserPreferences = () => {
  try {
    const feedbackHistory = getFeedbackHistory();
    
    if (feedbackHistory.length === 0) {
      return {
        preferredLength: 'medium', // 'short', 'medium', 'long'
        preferredTone: 'balanced', // 'formal', 'casual', 'balanced'
        preferredStyle: 'adaptive' // 'directive', 'supportive', 'adaptive'
      };
    }

    // Analyze feedback to determine user preferences
    const likedSuggestions = feedbackHistory.filter(f => f.feedbackType === 'like');
    
    // Determine preferred length based on liked suggestions
    let preferredLength = 'medium';
    if (likedSuggestions.length > 0) {
      const avgLength = likedSuggestions.reduce((sum, f) => sum + f.suggestion.length, 0) / likedSuggestions.length;
      if (avgLength < 30) preferredLength = 'short';
      else if (avgLength > 60) preferredLength = 'long';
    }

    // Determine preferred tone based on persona usage
    const personaCounts = {};
    likedSuggestions.forEach(f => {
      personaCounts[f.persona] = (personaCounts[f.persona] || 0) + 1;
    });
    
    let preferredTone = 'balanced';
    if (personaCounts.professional > (personaCounts.anxiety || 0) + (personaCounts.relationship || 0)) {
      preferredTone = 'formal';
    } else if ((personaCounts.anxiety || 0) + (personaCounts.relationship || 0) > personaCounts.professional) {
      preferredTone = 'casual';
    }

    return {
      preferredLength,
      preferredTone,
      preferredStyle: 'adaptive'
    };
  } catch (e) {
    console.error('Failed to determine user preferences:', e);
    return {
      preferredLength: 'medium',
      preferredTone: 'balanced',
      preferredStyle: 'adaptive'
    };
  }
};

/**
 * Gets commonly disliked phrases to avoid in suggestions
 * @returns {Array} Array of phrases that received negative feedback
 */
export const getDislikedPhrases = () => {
  try {
    const feedbackHistory = getFeedbackHistory();

    // Get all suggestions that received dislike feedback
    const dislikedSuggestions = feedbackHistory
      .filter(f => f.feedbackType === 'dislike')
      .map(f => f.suggestion.toLowerCase());

    // Extract common phrases or patterns from disliked suggestions
    const phraseCounts = {};

    dislikedSuggestions.forEach(suggestion => {
      const words = suggestion.split(/\s+/);
      words.forEach(word => {
        if (word.length > 3) { // Ignore short words
          phraseCounts[word] = (phraseCounts[word] || 0) + 1;
        }
      });
    });

    // Return phrases that appear frequently in disliked suggestions
    return Object.entries(phraseCounts)
      .filter(([phrase, count]) => count >= 2) // At least 2 dislikes
      .map(([phrase]) => phrase);
  } catch (e) {
    console.error('Failed to get disliked phrases:', e);
    return [];
  }
};

// Aliases for backward compatibility with tests
export const saveUserPreferences = savePreferences;
export const getPreferredPersona = () => getPreferences().preferredPersona;
export const setPreferredPersona = (persona) => savePreferences({ preferredPersona: persona });
