/**
 * @fileoverview Haptic feedback utilities for subtle communication cues
 */

let lastVibrationTime = 0;
const COOLDOWN_MS = 1500;

/**
 * Resets the last vibration time (used for testing)
 */
export const _resetHapticCooldown = () => {
  lastVibrationTime = 0;
};

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

  const now = Date.now();
  if (now - lastVibrationTime < COOLDOWN_MS) return;

  const lowerSuggestion = suggestion.toLowerCase();
  let pattern = VIBRATION_PATTERNS.SUCCESS;

  // Determine pattern based on tags or keywords
  if (lowerSuggestion.includes('[conflict]') || lowerSuggestion.includes('de-escalate')) {
    pattern = VIBRATION_PATTERNS.CONFLICT;
  } else if (lowerSuggestion.includes('[action item]') || lowerSuggestion.includes('follow up')) {
    pattern = VIBRATION_PATTERNS.ACTION;
  } else if (lowerSuggestion.includes('[strategic]') || lowerSuggestion.includes('[negotiation]')) {
    pattern = VIBRATION_PATTERNS.TRANSITION;
  } else if (lowerSuggestion.includes('[social tip]') || lowerSuggestion.includes('[natural phrasing]')) {
    pattern = VIBRATION_PATTERNS.SUGGESTION;
  } else if (lowerSuggestion.includes('smile') || lowerSuggestion.includes('great') || lowerSuggestion.includes('good')) {
    pattern = VIBRATION_PATTERNS.SUCCESS;
  } else if (lowerSuggestion.includes('understand') || lowerSuggestion.includes('feel')) {
    pattern = VIBRATION_PATTERNS.EMPATHY;
  }

  if (navigator.vibrate(pattern)) {
    lastVibrationTime = now;
  }
};
