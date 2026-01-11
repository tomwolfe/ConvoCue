/**
 * Cultural context database for cross-cultural communication
 * LEGACY WRAPPER - DEPRECATED
 * Use ./culturalIntelligence.js instead
 */

import {
  culturalContextDatabase,
  getCommunicationStyleForCulture as getStyle,
  analyzeCulturalContext
} from './culturalIntelligence';

console.warn("DEPRECATION WARNING: culturalContext.js is deprecated. Use culturalIntelligence.js directly.");

export { culturalContextDatabase };

/**
 * Get appropriate communication style
 */
export const getCommunicationStyleForCulture = getStyle;

/**
 * Get natural phrasing suggestion
 */
export const getNaturalPhrasing = (language, input) => {
  const phrases = culturalContextDatabase.naturalPhrasing?.[language.toLowerCase()];
  if (!phrases || !input) return null;
  const lowerInput = input.toLowerCase();
  return phrases.find(p => lowerInput.includes(p.literal.toLowerCase())) || null;
};

export const detectCulturalContext = analyzeCulturalContext;

// Re-export key functions from culturalIntelligence for backward compatibility
export { analyzeCulturalContext } from './culturalIntelligence';
export { getCommunicationStyleForCulture as getStyle } from './culturalIntelligence';
export { validateCulturalAppropriateness } from './culturalIntelligence';
export { generateCulturallyAppropriateResponses } from './culturalIntelligence';
export { detectMultilingualElements } from './culturalIntelligence';