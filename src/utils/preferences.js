/**
 * User preferences and personalization utilities
 */

import { secureLocalStorageGet, secureLocalStorageSet } from './encryption';
import { eventBus, EVENTS } from './eventBus';
import { AppConfig } from '../config';

const PREFERENCE_KEY = 'convocue_preferences';



/**

 * Helper to merge custom personas with default ones

 * @returns {Promise<Object>} Merged personas

 */

export const getMergedPersonas = async () => {

  const defaultPersonas = AppConfig.models.personas;

  try {

    const customPersonas = await secureLocalStorageGet('convocue_custom_personas', {});

    return { ...defaultPersonas, ...customPersonas };

  } catch (e) {

    console.error('Error loading custom personas:', e);

    return defaultPersonas;

  }

};





/**



 * Get user manual preferences from local storage



 * @returns {Promise<Object>} User preferences object



 */



export const getManualPreferences = async () => {



  try {



    return await secureLocalStorageGet(PREFERENCE_KEY, {});



  } catch (error) {



    console.error('Error reading user preferences:', error);



    return {};



  }



};







/**

 * Save user preferences to local storage

 * @param {Object} preferences - Preferences object to save

 */

export const saveUserPreferences = async (preferences) => {
  try {
    await secureLocalStorageSet(PREFERENCE_KEY, preferences);
    eventBus.emit(EVENTS.PREFERENCES_CHANGED, preferences);
  } catch (error) {
    console.error('Error saving user preferences:', error);
  }
};



/**

 * Get the preferred persona for the user

 * @returns {Promise<string>} Preferred persona ID

 */

export const getPreferredPersona = async () => {

  const preferences = await getManualPreferences();

  return preferences.preferredPersona || 'anxiety'; // Default to anxiety support

};



/**

 * Set the preferred persona for the user

 * @param {string} personaId - Persona ID to save

 */

export const setPreferredPersona = async (personaId) => {

  const preferences = await getManualPreferences();

  preferences.preferredPersona = personaId;

  await saveUserPreferences(preferences);

};



/**

 * Get persona feedback for improvement

 * @param {string} personaId - Persona ID

 * @param {string} feedback - User feedback

 */

export const savePersonaFeedback = async (personaId, feedback) => {

  const preferences = await getManualPreferences();

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

  await saveUserPreferences(preferences);

};



/**

 * Get persona feedback history

 * @param {string} personaId - Persona ID

 * @returns {Promise<Array>} Array of feedback objects

 */

export const getPersonaFeedback = async (personaId) => {

  const preferences = await getManualPreferences();

  return preferences.personaFeedback?.[personaId] || [];

};
