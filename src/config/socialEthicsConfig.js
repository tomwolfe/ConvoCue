/**
 * Social Ethics Configuration
 * Centralized patterns and alternatives for safety guardrails.
 */

export const HARMFUL_PATTERNS = [
  /\bmanipulate\b/i,
  /\bgaslight\b/i,
  /\bdeceive\b/i,
  /\btrick\b/i,
  /\blie to\b/i,
  /\bcoerce\b/i,
  /\bforce them\b/i,
  /\binsult\b/i
];

export const MANIPULATIVE_TACTICS = [
  "make them feel guilty",
  "use their weakness",
  "threaten to leave",
  "ignore their feelings"
];

// Positive alternatives for blocked suggestions
export const POSITIVE_ALTERNATIVES = {
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
 * Patterns that should be interpreted as dismissive when the other party is emotional.
 */
export const DISMISSIVE_PATTERNS = [
  { 
    pattern: /get over it/i, 
    replacement: "I understand you want them to move on. Before doing that, it might help to first acknowledge how deeply they're feeling this sadness." 
  },
  { 
    pattern: /calm down/i, 
    replacement: "Instead of telling them to calm down, try acknowledging their feelings first and giving them space to express themselves." 
  },
  { 
    pattern: /it's not a big deal/i, 
    replacement: "What seems like a small thing to you might feel significant to them. Try validating their feelings first." 
  }
];
