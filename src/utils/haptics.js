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
  CONFLICT: [150],                 // Single long urgent vibration (Conflict/Alert)
  SUGGESTION: [50],                // Single medium vibration (General cue/suggestion)
  QUESTION: [20, 100],             // Short then medium (Inquisitive pattern)
  TRANSITION: [10, 30, 10, 30],    // Rapid pulses (Topic change)
  EMPATHY: [100]                   // Long gentle vibration (Empathy/Support)
};

/**
 * Provides visual feedback as an alternative to haptic feedback
 * Creates a temporary visual indicator on the screen
 * @param {string} intentType - The type of intent for styling purposes
 */
export const provideVisualFeedback = (intentType) => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  // Create a temporary visual indicator element
  const indicator = document.createElement('div');
  indicator.style.position = 'fixed';
  indicator.style.top = '20px';
  indicator.style.right = '20px';
  indicator.style.padding = '8px 12px';
  indicator.style.borderRadius = '4px';
  indicator.style.fontSize = '14px';
  indicator.style.fontWeight = 'bold';
  indicator.style.zIndex = '10000';
  indicator.style.opacity = '0';
  indicator.style.transition = 'opacity 0.3s ease-in-out';

  // Set color based on intent type
  switch (intentType) {
    case 'CONFLICT':
      indicator.style.background = '#fee2e2';
      indicator.style.color = '#b91c1c';
      indicator.textContent = '⚠️ Conflict Detected';
      break;
    case 'ACTION':
      indicator.style.background = '#fef3c7';
      indicator.style.color = '#d97706';
      indicator.textContent = '⚡ Action Item';
      break;
    case 'QUESTION':
      indicator.style.background = '#ede9fe';
      indicator.style.color = '#7c3aed';
      indicator.textContent = '❓ Question';
      break;
    case 'EMPATHY':
      indicator.style.background = '#fce7f3';
      indicator.style.color = '#db2777';
      indicator.textContent = '💖 Empathy';
      break;
    case 'SUCCESS':
      indicator.style.background = '#d1fae5';
      indicator.style.color = '#059669';
      indicator.textContent = '✅ Success';
      break;
    default:
      indicator.style.background = '#e0e7ff';
      indicator.style.color = '#4f46e5';
      indicator.textContent = '🔔 Notification';
  }

  document.body.appendChild(indicator);

  // Trigger fade-in
  setTimeout(() => {
    indicator.style.opacity = '1';
  }, 10);

  // Remove after delay
  setTimeout(() => {
    indicator.style.opacity = '0';
    setTimeout(() => {
      if (indicator.parentNode) {
        document.body.removeChild(indicator);
      }
    }, 300);
  }, 2000);
};

/**
 * Provides haptic feedback based on the content of a suggestion
 * Falls back to visual feedback if haptics are unavailable
 * @param {string} suggestion - The suggestion text to analyze
 */
export const provideHapticFeedback = (suggestion) => {
  if (!suggestion) return;

  const now = Date.now();
  if (now - lastVibrationTime < COOLDOWN_MS) return;

  const { tags } = parseSemanticTags(suggestion);
  const lowerSuggestion = suggestion.toLowerCase();
  let pattern = VIBRATION_PATTERNS.SUGGESTION;

  // Determine intent type for visual feedback
  let intentType = 'SUGGESTION';
  if (tags.some(t => t.key === 'conflict') || lowerSuggestion.includes('de-escalate') || lowerSuggestion.includes('[conflict]')) {
    pattern = VIBRATION_PATTERNS.CONFLICT;
    intentType = 'CONFLICT';
  } else if (tags.some(t => t.key === 'action') || lowerSuggestion.includes('follow up') || lowerSuggestion.includes('[action item]') || lowerSuggestion.includes('[suggestion]')) {
    pattern = VIBRATION_PATTERNS.ACTION;
    intentType = 'ACTION';
  } else if (tags.some(t => t.key === 'question') || lowerSuggestion.includes('[question]')) {
    pattern = VIBRATION_PATTERNS.QUESTION;
    intentType = 'QUESTION';
  } else if (tags.some(t => t.key === 'strategic') || lowerSuggestion.includes('[strategic]') || lowerSuggestion.includes('[negotiation]')) {
    pattern = VIBRATION_PATTERNS.TRANSITION;
    intentType = 'STRATEGIC';
  } else if (tags.some(t => t.key === 'social') || lowerSuggestion.includes('[social tip]') || lowerSuggestion.includes('[natural phrasing]')) {
    pattern = VIBRATION_PATTERNS.SUGGESTION;
    intentType = 'SOCIAL';
  } else if (tags.some(t => t.key === 'empathy') || lowerSuggestion.includes('[empathy]') || lowerSuggestion.includes('understand') || lowerSuggestion.includes('feel')) {
    pattern = VIBRATION_PATTERNS.EMPATHY;
    intentType = 'EMPATHY';
  } else if (lowerSuggestion.includes('smile') || lowerSuggestion.includes('great') || lowerSuggestion.includes('good')) {
    pattern = VIBRATION_PATTERNS.SUCCESS;
    intentType = 'SUCCESS';
  }

  // Try haptic feedback first
  if (navigator.vibrate) {
    if (navigator.vibrate(pattern)) {
      lastVibrationTime = now;
      return; // Successfully provided haptic feedback
    }
  }

  // Fall back to visual feedback if haptics are unavailable or failed
  provideVisualFeedback(intentType);
  lastVibrationTime = now;
};
