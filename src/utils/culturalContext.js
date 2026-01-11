/**
 * Cultural Context Wrapper (Legacy Support)
 * Delegates to the unified CulturalIntelligenceService.
 */

import { 
  culturalContextDatabase,
  getCommunicationStyleForCulture,
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
      communicationStyle: getCommunicationStyleForCulture(targetCulture),
      businessEtiquette: culturalContextDatabase.businessEtiquette?.[targetCulture],
      taboos: culturalContextDatabase.taboos?.[targetCulture],
      greetings: culturalContextDatabase.greetings?.[targetCulture]
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
 * Legacy support for prompt tips
 */
export const getCulturalPromptTips = (culture) => {
  return culturalContextDatabase.promptTips?.[culture] || [];
};
