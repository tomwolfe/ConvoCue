/**
 * Enhanced Cultural Context Detection Wrapper
 * Refactored to delegate to culturalIntelligence.js to eliminate duplication.
 */

import { 
  analyzeCulturalContext, 
  detectMultilingualElements as detectMultilingual,
  getCommunicationStyleForCulture
} from './culturalIntelligence';

/**
 * Detects cultural context from input text
 */
export const detectEnhancedCulturalContext = (text, currentContext = 'general') => {
  return analyzeCulturalContext(text, currentContext);
};

/**
 * Detects multilingual elements in text
 */
export const detectMultilingualElements = (text) => {
  return detectMultilingual(text);
};

/**
 * Generates culturally appropriate response suggestions
 */
export const generateCulturallyAppropriateResponses = (inputText, targetCulture) => {
  const style = getCommunicationStyleForCulture(targetCulture);
  const responses = ['Note: These are general cultural guidelines. Individual preferences may differ.'];

  if (style.formality === 'high') responses.push('Address with appropriate titles and formal language');
  if (style.directness === 'indirect') responses.push('Use indirect language and soften statements');
  
  return responses;
};

// Re-export other necessary symbols if any
export { getCommunicationStyleForCulture };

/**
 * Analyzes text for cultural appropriateness
 */
export const analyzeCulturalAppropriateness = (text, targetCulture) => {
  const style = getCommunicationStyleForCulture(targetCulture);
  const issues = [];
  const suggestions = ['Note: This analysis is based on general cultural patterns. Individual preferences may differ significantly.'];

  const lowerText = text.toLowerCase();
  if (style.directness === 'indirect' && (lowerText.includes('should') || lowerText.includes('must'))) {
    issues.push('Direct imperative language detected');
    suggestions.push('Consider softer language like "perhaps" or "you might consider" (general guidance)');
  }

  if (style.formality === 'high' && (lowerText.includes('hey') || lowerText.includes('dude'))) {
    issues.push('Informal language detected');
    suggestions.push('Consider more formal address terms (general guidance)');
  }

  return {
    isAppropriate: issues.length === 0,
    issues,
    suggestions,
    score: issues.length === 0 ? 1.0 : 0.5,
    disclaimer: "This analysis is based on general cultural patterns. Individual preferences may vary significantly."
  };
};

export const getCulturalCommunicationTips = (culture) => {
  const style = getCommunicationStyleForCulture(culture);
  return [
    `In ${culture} culture, communication tends to be ${style.directness} and ${style.formality}.`,
    "Always verify with individual preferences."
  ];
};
