/**
 * Social Ethics & Safety Guardrails
 * Ensures suggestions align with helpful, empathetic, and non-manipulative communication.
 */

const HARMFUL_PATTERNS = [
  /\bmanipulate\b/i,
  /\bgaslight\b/i,
  /\bdeceive\b/i,
  /\btrick\b/i,
  /\blie to\b/i,
  /\bcoerce\b/i,
  /\bforce them\b/i,
  /\binsult\b/i
];

const MANIPULATIVE_TACTICS = [
  "make them feel guilty",
  "use their weakness",
  "threaten to leave",
  "ignore their feelings"
];

/**
 * Validates a suggested response against safety and ethics standards.
 * @param {string} suggestion - The AI-generated suggestion.
 * @returns {string} The validated (and possibly sanitized) suggestion.
 */
export const validateSocialSuggestion = (suggestion) => {
  if (!suggestion) return suggestion;

  // 1. Check for explicitly harmful patterns
  for (const pattern of HARMFUL_PATTERNS) {
    if (pattern.test(suggestion)) {
      console.warn(`[EthicsGuard] Blocked harmful suggestion: ${suggestion}`);
      return 'Suggestion removed for safety.';
    }
  }

  // 2. Check for manipulative tactics
  for (const tactic of MANIPULATIVE_TACTICS) {
    if (suggestion.toLowerCase().includes(tactic)) {
      console.warn(`[EthicsGuard] Blocked manipulative suggestion: ${suggestion}`);
      return 'Suggestion removed: potentially manipulative.';
    }
  }

  return suggestion;
};

/**
 * Analyzes the intent of a suggestion to ensure it promotes empathy.
 */
export const promoteEmpathy = (suggestion, detectedEmotion) => {
  // If the other person is sad or angry, ensure the suggestion isn't dismissive
  const dismissivePatterns = [/get over it/i, /calm down/i, /it's not a big deal/i];
  
  if (detectedEmotion === 'sadness' || detectedEmotion === 'anger') {
    const isDismissive = dismissivePatterns.some(p => p.test(suggestion));
    if (isDismissive) {
      return suggestion + " (Try to acknowledge their feelings first.)";
    }
  }
  
  return suggestion;
};
