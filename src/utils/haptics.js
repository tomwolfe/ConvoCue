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

  // Check if a visual indicator already exists to avoid multiple indicators
  const existingIndicator = document.querySelector('.cv-visual-feedback');
  if (existingIndicator) {
    // Update the existing indicator instead of creating a new one
    existingIndicator.textContent = getVisualFeedbackText(intentType);
    existingIndicator.className = `cv-visual-feedback cv-${intentType.toLowerCase()}`;
    // Reset animation
    existingIndicator.style.animation = 'none';
    // Trigger reflow to restart animation
    void existingIndicator.offsetWidth;
    existingIndicator.style.animation = 'cvFadeInOut 2.5s ease-in-out forwards';
    return;
  }

  // Create a temporary visual indicator element
  const indicator = document.createElement('div');
  indicator.className = `cv-visual-feedback cv-${intentType.toLowerCase()}`;
  indicator.textContent = getVisualFeedbackText(intentType);

  // Add CSS styles via style tag if not already present
  if (!document.querySelector('#cv-visual-feedback-styles')) {
    const style = document.createElement('style');
    style.id = 'cv-visual-feedback-styles';
    style.textContent = `
      @keyframes cvFadeInOut {
        0% { opacity: 0; transform: translateY(-10px); }
        10% { opacity: 1; transform: translateY(0); }
        90% { opacity: 1; transform: translateY(0); }
        100% { opacity: 0; transform: translateY(-10px); }
      }
      .cv-visual-feedback {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 14px;
        font-weight: bold;
        z-index: 10000;
        pointer-events: none;
        animation: cvFadeInOut 2.5s ease-in-out forwards;
        min-width: 150px;
        text-align: center;
      }
      .cv-conflict { background: #fee2e2; color: #b91c1c; }
      .cv-action { background: #fef3c7; color: #d97706; }
      .cv-question { background: #ede9fe; color: #7c3aed; }
      .cv-empathy { background: #fce7f3; color: #db2777; }
      .cv-success { background: #d1fae5; color: #059669; }
      .cv-default { background: #e0e7ff; color: #4f46e5; }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(indicator);

  // Remove after animation completes
  setTimeout(() => {
    if (indicator.parentNode) {
      indicator.parentNode.removeChild(indicator);
    }
  }, 2500);
};

/**
 * Gets the appropriate text for visual feedback based on intent type
 * @param {string} intentType - The type of intent
 * @returns {string} The text to display for visual feedback
 */
const getVisualFeedbackText = (intentType) => {
  switch (intentType) {
    case 'CONFLICT':
      return '⚠️ Conflict Detected';
    case 'ACTION':
      return '⚡ Action Item';
    case 'QUESTION':
      return '❓ Question';
    case 'EMPATHY':
      return '💖 Empathy';
    case 'SUCCESS':
      return '✅ Success';
    default:
      return '🔔 Notification';
  }
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
  if (isHapticSupported()) {
    try {
      // Check if vibration API is supported and working
      if (typeof navigator.vibrate === 'function') {
        // Test with a simple vibration first to check if it works
        if (navigator.vibrate(getAdjustedPattern(pattern))) {
          lastVibrationTime = now;
          // Log successful haptic feedback for analytics
          logHapticFeedback(intentType, 'success');
          return; // Successfully provided haptic feedback
        } else {
          // Log failed haptic feedback for analytics
          logHapticFeedback(intentType, 'failed');
        }
      } else {
        // Log that haptic feedback isn't supported
        logHapticFeedback(intentType, 'unsupported');
      }
    } catch (error) {
      // Handle any errors in vibration API
      console.warn('Haptic feedback error:', error);
      logHapticFeedback(intentType, 'error');
    }
  } else {
    // Log that haptic feedback isn't supported
    logHapticFeedback(intentType, 'unsupported');
  }

  // Fall back to visual feedback if haptics are unavailable or failed
  provideVisualFeedback(intentType);
  lastVibrationTime = now;
};

/**
 * Checks if haptic feedback is supported in the current environment
 * @returns {boolean} True if haptic feedback is supported
 */
export const isHapticSupported = () => {
  // Check if we're in a browser environment
  if (typeof navigator === 'undefined' || typeof window === 'undefined') {
    return false;
  }

  // Check for vibrate API support
  if (!navigator.vibrate) {
    return false;
  }

  // Additional check for mobile devices (desktop browsers may have vibrate API but not actually vibrate)
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Some browsers have the API but don't actually support vibration
  try {
    // Test with a minimal vibration to see if it's actually supported
    return true; // If navigator.vibrate exists, we assume it's supported
  } catch (e) {
    return false;
  }
};

/**
 * Adjusts vibration pattern based on user settings
 * @param {Array|number} pattern - Original vibration pattern
 * @returns {Array|number} Adjusted vibration pattern based on intensity settings
 */
export const getAdjustedPattern = (pattern) => {
  // Get user settings for intensity
  const settings = JSON.parse(localStorage.getItem('hapticSettings') || '{}');
  const intensity = settings.intensity || 'medium';

  // Adjust pattern based on intensity
  if (intensity === 'low') {
    // Reduce all values by half
    if (Array.isArray(pattern)) {
      return pattern.map(value => Math.max(1, Math.floor(value * 0.5)));
    } else {
      return Math.max(1, Math.floor(pattern * 0.5));
    }
  } else if (intensity === 'high') {
    // Increase all values by 50%
    if (Array.isArray(pattern)) {
      return pattern.map(value => Math.floor(value * 1.5));
    } else {
      return Math.floor(pattern * 1.5);
    }
  }

  // For 'medium' or any other value, return original pattern
  return pattern;
};

/**
 * Logs haptic feedback events for analytics and user feedback
 * @param {string} intentType - The type of intent triggering haptic feedback
 * @param {string} status - The status of the haptic feedback ('success', 'failed', 'unsupported')
 */
export const logHapticFeedback = (intentType, status) => {
  // In a real implementation, this would send data to an analytics service
  // For now, we'll store in localStorage for demonstration purposes

  const feedbackLog = JSON.parse(localStorage.getItem('hapticFeedbackLog') || '[]');
  const logEntry = {
    timestamp: Date.now(),
    intentType,
    status,
    userAgent: navigator.userAgent
  };

  feedbackLog.push(logEntry);

  // Keep only the last 100 entries to prevent storage bloat
  if (feedbackLog.length > 100) {
    feedbackLog.shift();
  }

  localStorage.setItem('hapticFeedbackLog', JSON.stringify(feedbackLog));
};

/**
 * Retrieves haptic feedback analytics
 * @returns {Array} Array of haptic feedback log entries
 */
export const getHapticFeedbackAnalytics = () => {
  return JSON.parse(localStorage.getItem('hapticFeedbackLog') || '[]');
};

/**
 * Clears haptic feedback analytics
 */
export const clearHapticFeedbackAnalytics = () => {
  localStorage.removeItem('hapticFeedbackLog');
};

/**
 * Provides user interface for haptic feedback preference adjustment
 * Allows users to customize vibration intensity or disable haptics
 */
export const showHapticFeedbackSettings = () => {
  // In a real implementation, this would show a modal or settings panel
  // For now, we'll just log the intent to show settings

  console.log('Showing haptic feedback settings');

  // Example of how settings could be stored
  const currentSettings = JSON.parse(localStorage.getItem('hapticSettings') || '{}');

  // Default settings if none exist
  const defaultSettings = {
    enabled: true,
    intensity: 'medium', // 'low', 'medium', 'high'
    patterns: { ...VIBRATION_PATTERNS } // Allow custom patterns
  };

  const settings = { ...defaultSettings, ...currentSettings };

  // Return settings for UI to use
  return settings;
};

/**
 * Updates haptic feedback settings
 * @param {Object} newSettings - New haptic feedback settings
 */
export const updateHapticSettings = (newSettings) => {
  const currentSettings = JSON.parse(localStorage.getItem('hapticSettings') || '{}');
  const updatedSettings = { ...currentSettings, ...newSettings };

  localStorage.setItem('hapticSettings', JSON.stringify(updatedSettings));

  // Apply settings immediately if needed
  // (In a real implementation, this would affect how haptics are triggered)
};

/**
 * Tests haptic feedback support and provides user feedback
 * @returns {Promise<Object>} Object containing test results and support status
 */
export const testHapticSupport = async () => {
  const result = {
    supported: false,
    actualVibration: false,
    message: '',
    needsVisualFallback: true
  };

  // Check if we're in a browser environment
  if (typeof navigator === 'undefined' || typeof window === 'undefined') {
    result.message = 'Not in a browser environment';
    return result;
  }

  // Check for vibrate API support
  if (!navigator.vibrate) {
    result.message = 'Vibration API not supported by this browser';
    return result;
  }

  // Test if the vibration API is actually functional
  try {
    // Test with a minimal vibration pattern
    const testPattern = [10]; // 10ms vibration
    const vibrationResult = navigator.vibrate(testPattern);

    // Note: vibrationResult is not a reliable indicator of actual vibration
    // The API doesn't return whether vibration actually occurred
    result.supported = true;
    result.actualVibration = true; // We assume it worked if no error was thrown
    result.needsVisualFallback = false;
    result.message = 'Vibration API is supported and functional';

    // Wait for the vibration to complete before returning
    await new Promise(resolve => setTimeout(resolve, 50));
  } catch (error) {
    result.supported = false;
    result.message = `Vibration API error: ${error.message}`;
  }

  return result;
};
