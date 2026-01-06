/**
 * Centralized preferences management for ConvoCue
 */

import { logError, validateInput } from './errorHandling';

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
    if (prefs) {
      const parsed = JSON.parse(prefs);
      // Validate the parsed preferences
      const validation = validateInput(parsed, 'object');
      return validation.isValid ? parsed : {};
    }
    return {};
  } catch (e) {
    logError(e, { context: 'getPreferences', key: PREFERENCES_KEY });
    return {};
  }
};

/**
 * Save preferences
 * @param {Object} prefs - Preferences to save
 */
export const savePreferences = (prefs) => {
  try {
    // Validate the preferences before saving
    const validation = validateInput(prefs, 'object');
    if (!validation.isValid) {
      logError('Invalid preferences object', {
        context: 'savePreferences',
        errors: validation.errors,
        prefs
      });
      return;
    }

    const currentPrefs = getPreferences();
    const newPrefs = { ...currentPrefs, ...prefs };
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(newPrefs));
  } catch (e) {
    logError(e, { context: 'savePreferences', key: PREFERENCES_KEY });
  }
};

/**
 * Get feedback history
 * @returns {Array} Feedback history
 */
export const getFeedbackHistory = () => {
  try {
    const history = localStorage.getItem(FEEDBACK_KEY);
    if (history) {
      const parsed = JSON.parse(history);
      // Validate the parsed history
      const validation = validateInput(parsed, 'array', { itemValidator: { type: 'object' } });
      return validation.isValid ? parsed : [];
    }
    return [];
  } catch (e) {
    logError(e, { context: 'getFeedbackHistory', key: FEEDBACK_KEY });
    return [];
  }
};

/**
 * Save feedback
 * @param {Object} feedback - Feedback entry to save
 */
export const saveFeedback = (feedback) => {
  try {
    // Validate the feedback before saving
    const validation = validateInput(feedback, 'object');
    if (!validation.isValid) {
      logError('Invalid feedback object', {
        context: 'saveFeedback',
        errors: validation.errors,
        feedback
      });
      return;
    }

    const history = getFeedbackHistory();
    history.push({
      ...feedback,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(history));
  } catch (e) {
    logError(e, { context: 'saveFeedback', key: FEEDBACK_KEY });
  }
};

/**
 * Get custom personas
 * @returns {Object} Custom personas
 */
export const getCustomPersonas = () => {
  try {
    const personas = localStorage.getItem(CUSTOM_PERSONAS_KEY);
    if (personas) {
      const parsed = JSON.parse(personas);
      // Validate the parsed personas
      const validation = validateInput(parsed, 'object');
      return validation.isValid ? parsed : {};
    }
    return {};
  } catch (e) {
    logError(e, { context: 'getCustomPersonas', key: CUSTOM_PERSONAS_KEY });
    return {};
  }
};

/**
 * Save a custom persona
 * @param {Object} persona - Persona to save
 */
export const saveCustomPersona = (persona) => {
  try {
    // Validate the persona before saving
    const validation = validateInput(persona, 'object', {
      requiredKeys: ['id', 'label', 'description', 'prompt']
    });
    if (!validation.isValid) {
      logError('Invalid persona object', {
        context: 'saveCustomPersona',
        errors: validation.errors,
        persona
      });
      return;
    }

    const personas = getCustomPersonas();
    personas[persona.id] = persona;
    localStorage.setItem(CUSTOM_PERSONAS_KEY, JSON.stringify(personas));
  } catch (e) {
    logError(e, { context: 'saveCustomPersona', key: CUSTOM_PERSONAS_KEY });
  }
};

/**
 * Delete a custom persona
 * @param {string} personaId - ID of persona to delete
 */
export const deleteCustomPersona = (personaId) => {
  try {
    // Validate the personaId before deleting
    const validation = validateInput(personaId, 'string', { minLength: 1 });
    if (!validation.isValid) {
      logError('Invalid persona ID', {
        context: 'deleteCustomPersona',
        errors: validation.errors,
        personaId
      });
      return;
    }

    const personas = getCustomPersonas();
    delete personas[personaId];
    localStorage.setItem(CUSTOM_PERSONAS_KEY, JSON.stringify(personas));
  } catch (e) {
    logError(e, { context: 'deleteCustomPersona', key: CUSTOM_PERSONAS_KEY, personaId });
  }
};

/**
 * Check if tutorial has been seen
 * @returns {boolean} True if tutorial seen
 */
export const hasSeenTutorial = () => {
  try {
    const value = localStorage.getItem(TUTORIAL_SEEN_KEY);
    return value === 'true';
  } catch (e) {
    logError(e, { context: 'hasSeenTutorial', key: TUTORIAL_SEEN_KEY });
    return false;
  }
};

/**
 * Set tutorial as seen
 */
export const setTutorialSeen = () => {
  try {
    localStorage.setItem(TUTORIAL_SEEN_KEY, 'true');
  } catch (e) {
    logError(e, { context: 'setTutorialSeen', key: TUTORIAL_SEEN_KEY });
  }
};

/**
 * Get selected cultural context
 * @returns {string} Selected cultural context
 */
export const getSelectedCulturalContext = () => {
  try {
    const value = localStorage.getItem(CULTURAL_CONTEXT_KEY);
    return value || 'general';
  } catch (e) {
    logError(e, { context: 'getSelectedCulturalContext', key: CULTURAL_CONTEXT_KEY });
    return 'general';
  }
};

/**
 * Set selected cultural context
 * @param {string} context - Cultural context to set
 */
export const setSelectedCulturalContext = (context) => {
  try {
    // Validate the context before setting
    const validation = validateInput(context, 'string', { minLength: 1, maxLength: 50 });
    if (!validation.isValid) {
      logError('Invalid cultural context', {
        context: 'setSelectedCulturalContext',
        errors: validation.errors,
        context
      });
      return;
    }

    localStorage.setItem(CULTURAL_CONTEXT_KEY, context);
  } catch (e) {
    logError(e, { context: 'setSelectedCulturalContext', key: CULTURAL_CONTEXT_KEY, context });
  }
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
    logError(e, { context: 'getUserPreferences' });
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
    logError(e, { context: 'getDislikedPhrases' });
    return [];
  }
};

// Aliases for backward compatibility with tests
export const saveUserPreferences = savePreferences;
export const getPreferredPersona = () => getPreferences().preferredPersona;
export const setPreferredPersona = (persona) => savePreferences({ preferredPersona: persona });
