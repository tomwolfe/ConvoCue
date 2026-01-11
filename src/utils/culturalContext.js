/**
 * Cultural context database for cross-cultural communication
 * Legacy Wrapper and Utility Service
 */

import { 
  culturalContextDatabase,
  getCommunicationStyleForCulture as getStyle,
  analyzeCulturalContext
} from './culturalIntelligence';

export { culturalContextDatabase };

/**
 * Get natural phrasing suggestion
 */
export const getNaturalPhrasing = (language, input) => {
  const phrases = culturalContextDatabase.naturalPhrasing?.[language.toLowerCase()];
  if (!phrases || !input) return null;
  const lowerInput = input.toLowerCase();
  return phrases.find(p => lowerInput.includes(p.literal.toLowerCase())) || null;
};

/**
 * Get cultural context for a situation
 */
export const getCulturalContext = (situation, targetCulture = null) => {
  const relevantPhrases = culturalContextDatabase.culturalPhrases?.[situation] || [];

  if (targetCulture) {
    return {
      situation,
      targetCulture,
      phrases: relevantPhrases,
      communicationStyle: getStyle(targetCulture),
      businessEtiquette: culturalContextDatabase.businessEtiquette?.[targetCulture],
      taboos: getTaboosForCulture(targetCulture),
      greetings: getGreetingForCulture(targetCulture)
    };
  }

  return {
    situation,
    phrases: relevantPhrases,
    generalTips: (culturalContextDatabase.communicationStyles?.['high-context']?.tips || []).concat(
      culturalContextDatabase.communicationStyles?.['low-context']?.tips || []
    )
  };
};

export const detectCulturalContext = analyzeCulturalContext;

/**
 * Get appropriate communication style
 */
export const getCommunicationStyleForCulture = getStyle;

/**
 * Get taboos for a specific culture
 */
export const getTaboosForCulture = (culture) => {
  if (!culture) return [];
  const taboos = culturalContextDatabase.taboos?.filter(taboo =>
    taboo.culture.toLowerCase().includes(culture.toLowerCase()) ||
    culture.toLowerCase().includes(taboo.culture.toLowerCase())
  );
  return taboos && taboos.length > 0 ? taboos[0].taboos : [];
};

/**
 * Get appropriate greeting
 */
export const getGreetingForCulture = (culture) => {
  if (!culture) return 'Hello';
  for (const [_region, cultures] of Object.entries(culturalContextDatabase.greetings || {})) {
    if (cultures[culture]) return cultures[culture][0];
  }
  return 'Hello';
};

/**
 * Get prompt-ready tips for a specific culture
 */
export const getCulturalPromptTips = (culture) => {
  if (!culture || culture === 'general') return '';

  const style = getStyle(culture);
  const etiquette = culturalContextDatabase.businessEtiquette?.[culture] || culturalContextDatabase.businessEtiquette?.['Western'];
  const greeting = getGreetingForCulture(culture);

  const tips = style.tips ? style.tips.slice(0, 3) : [];

  let promptTips = `Cultural Context (${culture}): `;
  promptTips += `Communication Style: ${style.description || style.directness}. `;
  if (tips.length > 0) promptTips += `Key Tips: ${tips.join(', ')}. `;
  promptTips += `Native Greeting: ${greeting}. `;

  if (etiquette && etiquette.practices) {
    promptTips += `Business Etiquette: ${etiquette.practices.slice(0, 2).join(', ')}. `;
  }

  return promptTips;
};

/**
 * Get social nuance tips
 */
export const getSocialNuanceTips = (text) => {
  if (!text) return '';
  const lowerText = text.toLowerCase();
  let tips = '';

  const categories = ['empathy', 'socialAnxiety', 'conflict'];
  categories.forEach(cat => {
    culturalContextDatabase.socialNuance?.[cat]?.forEach(item => {
      if (lowerText.includes(item.trigger)) {
        tips += `${cat.charAt(0).toUpperCase() + cat.slice(1)} Tip: ${item.suggestion} `;
      }
    });
  });

  return tips.trim();
};

/**
 * Get high-stakes tips
 */
export const getHighStakesTips = (category) => {
  const highStakes = culturalContextDatabase.highStakes?.[category];
  if (!highStakes) return '';
  return `High-Stakes ${category.charAt(0).toUpperCase() + category.slice(1)}: ${highStakes.slice(0, 3).join(' ')}`;
};

/**
 * Get language learning prompt tips
 */
export const getLanguageLearningPromptTips = (language) => {
  // Simple fallback for language learning tips
  return `Language Learning (${language}): Focus on natural phrasing and common usage patterns. `;
};

/**
 * Get professional meeting prompt tips
 */
export const getProfessionalPromptTips = (context) => {
  return `Meeting Context (${context}): Maintain professional etiquette and clear communication. `;
};

/**
 * Legacy support aliases
 */
export const generateCulturalResponseSuggestions = (inputText, culturalContext) => {
  // Re-imported from culturalIntelligence if needed, or just return original
  return [inputText];
};

export const analyzeTextCulturalAppropriateness = (text, targetCulture) => {
  return { isValid: true, issues: [] };
};

export const detectMultilingualElementsInText = (text) => {
  return [];
};