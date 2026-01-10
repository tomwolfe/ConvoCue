/**
 * Utility functions for intent-related operations
 */

import { ALL_INTENTS } from '../constants/intents';

/**
 * Merges existing user intents with new intents, preserving user preferences
 * for intents they had previously configured while adding new ones.
 * 
 * @param {Array<string>} existingIntents - The user's currently saved intents
 * @param {Array<string>} allIntents - All available intents (typically ALL_INTENTS)
 * @returns {Array<string>} Merged array of intents with duplicates removed
 */
export const mergeNewIntents = (existingIntents, allIntents = ALL_INTENTS) => {
  if (!existingIntents) {
    return allIntents;
  }

  // Find intents that are in ALL_INTENTS but NOT in existingIntents (newly added intents)
  const newIntents = allIntents.filter(intent => !existingIntents.includes(intent));

  // We only add new intents if they aren't already there.
  // We don't want to re-enable ones they manually disabled,
  // but since we just added NEW intent types to the codebase,
  // they wouldn't be in the saved list at all.
  return [...new Set([...existingIntents, ...newIntents])];
};