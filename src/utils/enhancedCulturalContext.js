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
export const analyzeCulturalAppropriateness = () => ({ isAppropriate: true, score: 1.0 });
export const getCulturalCommunicationTips = (culture) => {
  const style = getCommunicationStyleForCulture(culture);
  return [`In ${culture} culture, communication tends to be ${style.directness} and ${style.formality}.`];
};
