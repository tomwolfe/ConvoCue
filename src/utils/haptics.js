import { parseSemanticTags } from './intentRecognition';

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

  const { tags } = parseSemanticTags(suggestion);
  const lowerSuggestion = suggestion.toLowerCase();
  let pattern = VIBRATION_PATTERNS.SUCCESS;

  // Prioritize patterns based on tags
  if (tags.some(t => t.key === 'conflict') || lowerSuggestion.includes('de-escalate')) {
    pattern = VIBRATION_PATTERNS.CONFLICT;
  } else if (tags.some(t => t.key === 'action') || lowerSuggestion.includes('follow up')) {
    pattern = VIBRATION_PATTERNS.ACTION;
  } else if (tags.some(t => t.key === 'strategic') || lowerSuggestion.includes('[negotiation]')) {
    pattern = VIBRATION_PATTERNS.TRANSITION;
  } else if (tags.some(t => t.key === 'social') || lowerSuggestion.includes('[natural phrasing]')) {
    pattern = VIBRATION_PATTERNS.SUGGESTION;
  } else if (tags.some(t => t.key === 'empathy') || lowerSuggestion.includes('understand') || lowerSuggestion.includes('feel')) {
    pattern = VIBRATION_PATTERNS.EMPATHY;
  } else if (lowerSuggestion.includes('smile') || lowerSuggestion.includes('great') || lowerSuggestion.includes('good')) {
    pattern = VIBRATION_PATTERNS.SUCCESS;
  }

  if (navigator.vibrate(pattern)) {
    lastVibrationTime = now;
  }
};
