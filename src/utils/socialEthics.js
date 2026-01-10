/**
 * Social Ethics & Safety Guardrails
 * Ensures suggestions align with helpful, empathetic, and non-manipulative communication.
 */

import { 
  HARMFUL_PATTERNS, 
  MANIPULATIVE_TACTICS, 
  POSITIVE_ALTERNATIVES, 
  DISMISSIVE_PATTERNS 
} from '../config/socialEthicsConfig';

// Pre-compiled combined regex for better performance
const COMBINED_HARMFUL_REGEX = new RegExp(
  HARMFUL_PATTERNS.map(p => `(${p.source})`).join('|'), 
  'i'
);

const COMBINED_MANIPULATIVE_REGEX = new RegExp(
  MANIPULATIVE_TACTICS.map(t => `(${t})`).join('|'), 
  'i'
);

/**
 * Validates a suggested response against safety and ethics standards.
 * @param {string} suggestion - The AI-generated suggestion.
 * @param {string} context - Optional context to determine if discussion is about manipulation vs. recommending it
 * @returns {string} The validated (and possibly sanitized) suggestion with educational feedback.
 */
export const validateSocialSuggestion = (suggestion, context = '') => {
  if (!suggestion) return suggestion;

  // Check if this is a discussion about manipulation rather than a recommendation
  const isDiscussionContext = /avoid|discuss|talk about|how not to|don'?t do|problem with|negative effect of/.test(context.toLowerCase());

  // 1. Check for explicitly harmful patterns (Optimized single pass)
  const harmfulMatch = suggestion.match(COMBINED_HARMFUL_REGEX);
  if (harmfulMatch && !isDiscussionContext) {
    // Find which specific word matched for targeted feedback
    const matchedWord = harmfulMatch[0].toLowerCase();
    const alternative = POSITIVE_ALTERNATIVES[matchedWord] || 'Consider a more respectful approach.';

    console.warn(`[EthicsGuard] Blocked harmful suggestion. 
Match: "${matchedWord}"
Full Suggestion: "${suggestion}"
Context: "${context}"
If this is a false positive, please report it in Settings > Feedback.`);
    return `I can't suggest that because it could be harmful. Instead, try: ${alternative}`;
  }

  // 2. Check for manipulative tactics (Optimized single pass)
  const manipulativeMatch = suggestion.match(COMBINED_MANIPULATIVE_REGEX);
  if (manipulativeMatch && !isDiscussionContext) {
    const matchedTactic = manipulativeMatch[0].toLowerCase();
    const alternative = POSITIVE_ALTERNATIVES[matchedTactic] || 'Consider a more respectful approach.';

    console.warn(`[EthicsGuard] Blocked manipulative suggestion.
Match: "${matchedTactic}"
Full Suggestion: "${suggestion}"
Context: "${context}"
If this is a false positive, please report it in Settings > Feedback.`);
    return `I can't suggest that because it could be harmful. Instead, try: ${alternative}`;
  }

  return suggestion;
};

/**
 * Analyzes the intent of a suggestion to ensure it promotes empathy.
 */
export const promoteEmpathy = (suggestion, detectedEmotion) => {
  if (!suggestion || (detectedEmotion !== 'sadness' && detectedEmotion !== 'anger')) {
    return suggestion;
  }

  for (const { pattern, replacement } of DISMISSIVE_PATTERNS) {
    if (pattern.test(suggestion)) {
      return replacement;
    }
  }

  return suggestion;
};