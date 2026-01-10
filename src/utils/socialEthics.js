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

// Positive alternatives for blocked suggestions
const POSITIVE_ALTERNATIVES = {
  'manipulate': 'Try expressing your needs directly and respectfully instead.',
  'gaslight': 'Focus on validating their feelings and finding common ground.',
  'deceive': 'Be honest about your thoughts and feelings.',
  'trick': 'Consider having an open and honest conversation.',
  'lie to': 'Share your perspective truthfully and respectfully.',
  'coerce': 'Encourage them to make their own decision based on mutual respect.',
  'force them': 'Give them space to come to their own conclusion.',
  'insult': 'Express disagreement respectfully without attacking their character.',
  'make them feel guilty': 'Try understanding their perspective first.',
  'use their weakness': 'Address the situation with empathy and strength.',
  'threaten to leave': 'Communicate your concerns without ultimatums.',
  'ignore their feelings': 'Acknowledge their emotions before suggesting solutions.'
};

/**
 * Validates a suggested response against safety and ethics standards.
 * @param {string} suggestion - The AI-generated suggestion.
 * @param {string} context - Optional context to determine if discussion is about manipulation vs. recommending it
 * @returns {string} The validated (and possibly sanitized) suggestion with educational feedback.
 */
export const validateSocialSuggestion = (suggestion, context = '') => {
  if (!suggestion) return suggestion;

  const lowerSuggestion = suggestion.toLowerCase();

  // Check if this is a discussion about manipulation rather than a recommendation
  const isDiscussionContext = /avoid|discuss|talk about|how not to|don'?t do|problem with|negative effect of/.test(context.toLowerCase());

  // 1. Check for explicitly harmful patterns
  for (const pattern of HARMFUL_PATTERNS) {
    if (pattern.test(suggestion)) {
      // If this is a discussion context, allow it
      if (isDiscussionContext) {
        return suggestion;
      }

      // Find which harmful word was matched to provide specific feedback
      const matchedWord = Array.from(HARMFUL_PATTERNS.keys())
        .map((_, i) => suggestion.match(HARMFUL_PATTERNS[i]))
        .find(match => match);

      if (matchedWord) {
        const word = matchedWord[0].toLowerCase();
        const alternative = POSITIVE_ALTERNATIVES[word] || 'Consider a more respectful approach.';

        console.warn(`[EthicsGuard] Blocked harmful suggestion: ${suggestion}`);
        return `I can't suggest that because it could be harmful. Instead, try: ${alternative}`;
      }
    }
  }

  // 2. Check for manipulative tactics
  for (const tactic of MANIPULATIVE_TACTICS) {
    if (lowerSuggestion.includes(tactic)) {
      // If this is a discussion context, allow it
      if (isDiscussionContext) {
        return suggestion;
      }

      const alternative = POSITIVE_ALTERNATIVES[tactic] || 'Consider a more respectful approach.';

      console.warn(`[EthicsGuard] Blocked manipulative suggestion: ${suggestion}`);
      return `I can't suggest that because it could be harmful. Instead, try: ${alternative}`;
    }
  }

  return suggestion;
};

/**
 * Analyzes the intent of a suggestion to ensure it promotes empathy.
 */
export const promoteEmpathy = (suggestion, detectedEmotion) => {
  // If the other person is sad or angry, ensure the suggestion isn't dismissive
  const dismissivePatterns = [
    { pattern: /get over it/i, replacement: "I understand you want them to move on. Before doing that, it might help to first acknowledge how deeply they're feeling this sadness." },
    { pattern: /calm down/i, replacement: "Instead of telling them to calm down, try acknowledging their feelings first and giving them space to express themselves." },
    { pattern: /it's not a big deal/i, replacement: "What seems like a small thing to you might feel significant to them. Try validating their feelings first." }
  ];

  if (detectedEmotion === 'sadness' || detectedEmotion === 'anger') {
    for (const { pattern, replacement } of dismissivePatterns) {
      if (pattern.test(suggestion)) {
        return replacement;
      }
    }
  }

  return suggestion;
};
