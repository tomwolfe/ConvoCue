/**
 * @fileoverview Haptic feedback utilities for subtle communication cues
 */

/**
 * Vibration patterns for different types of cues
 */
export const VIBRATION_PATTERNS = {
  SUCCESS: [20],                   // Single short vibration (Positive reinforcement)
  ACTION: [20, 50, 20],            // Double short vibration (Action item detected)
  CONFLICT: [20, 50, 20, 50, 20],  // Triple short vibration (Conflict/Alert)
  SUGGESTION: [50],                // Single medium vibration (General cue/suggestion)
  TRANSITION: [10, 30, 10, 30],    // Rapid pulses (Topic change)
  EMPATHY: [100]                   // Long gentle vibration (Empathy/Support)
};

/**
 * Provides haptic feedback based on the content of a suggestion
 * @param {string} suggestion - The suggestion text to analyze
 */
export const provideHapticFeedback = (suggestion) => {
  if (!navigator.vibrate || !suggestion) return;

  const lowerSuggestion = suggestion.toLowerCase();

  // Determine pattern based on tags or keywords
  if (lowerSuggestion.includes('[conflict]') || lowerSuggestion.includes('de-escalate')) {
    navigator.vibrate(VIBRATION_PATTERNS.CONFLICT);
  } else if (lowerSuggestion.includes('[action item]') || lowerSuggestion.includes('follow up')) {
    navigator.vibrate(VIBRATION_PATTERNS.ACTION);
  } else if (lowerSuggestion.includes('[strategic]') || lowerSuggestion.includes('[negotiation]')) {
    navigator.vibrate(VIBRATION_PATTERNS.TRANSITION);
  } else if (lowerSuggestion.includes('[social tip]') || lowerSuggestion.includes('[natural phrasing]')) {
    navigator.vibrate(VIBRATION_PATTERNS.SUGGESTION);
  } else if (lowerSuggestion.includes('smile') || lowerSuggestion.includes('great') || lowerSuggestion.includes('good')) {
    navigator.vibrate(VIBRATION_PATTERNS.SUCCESS);
  } else if (lowerSuggestion.includes('understand') || lowerSuggestion.includes('feel')) {
    navigator.vibrate(VIBRATION_PATTERNS.EMPATHY);
  } else {
    // Default vibration for any new cue
    navigator.vibrate(VIBRATION_PATTERNS.SUCCESS);
  }
};
