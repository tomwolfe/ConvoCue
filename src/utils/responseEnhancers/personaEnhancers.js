/**
 * Specialized Persona Enhancers for response guidance
 */
import { getNaturalPhrasing } from '../culturalContext';
import { analyzeRelationshipCoaching } from '../relationshipCoaching';
import { analyzeAnxietyCoaching } from '../anxietyCoaching';

/**
 * Applies language learning specific enhancements
 */
export const applyLanguageLearningSupport = (response, input, culturalContext) => {
  // Logic to detect language from context (simplified for extraction)
  const detectLanguage = (culture) => {
    if (['spain', 'mexico', 'spanish'].some(c => culture.toLowerCase().includes(c))) return 'spanish';
    return 'english';
  };

  const language = detectLanguage(culturalContext || 'general');
  const natural = getNaturalPhrasing(language, input);
  
  if (natural) {
    const label = language === 'spanish' ? '[Natural Phrasing (ES)]' : '[Natural Phrasing]';
    return `${label} Instead of "${natural.literal}", try: "${natural.natural}". ${response}`;
  }
  return response;
};

/**
 * Applies enhanced relationship coaching to responses
 */
export const applyRelationshipCoaching = async (response, input, conversationHistory, emotionData, persona) => {
  const insights = await analyzeRelationshipCoaching(input, conversationHistory, emotionData);
  if (!insights) return response;

  let enhanced = response;
  if (insights.empathyLevel === 'high') enhanced = `I can really understand how that feels. ${enhanced}`;
  else if (insights.empathyLevel === 'medium') enhanced = `I hear what you're saying. ${enhanced}`;

  if (insights.emotionalValidationNeeded) enhanced = `Your feelings are completely valid. ${enhanced}`;
  
  if (persona === 'relationship') {
    enhanced += " This helps strengthen our connection.";
  }

  return enhanced + " Remember, I'm not a substitute for professional mental health services.";
};

/**
 * Applies anxiety-specific coaching to responses
 */
export const applyAnxietyCoaching = async (response, input, conversationHistory, emotionData, persona) => {
  const insights = await analyzeAnxietyCoaching(input, conversationHistory, emotionData);
  if (!insights) return response;

  let enhanced = response;
  if (insights.anxietyLevel === 'high') enhanced = `I can understand you're feeling anxious. ${enhanced}`;
  
  if (insights.reassuranceNeeded) enhanced = `Your feelings are completely valid and understandable. ${enhanced}`;

  if (insights.copingStrategies?.length > 0) {
    const strategy = insights.copingStrategies[0];
    if (strategy.type === 'breathing') enhanced = `Take a moment to breathe deeply. ${enhanced}`;
  }

  return enhanced + " Remember, I'm not a substitute for professional mental health services.";
};

/**
 * Applies professional-specific insights to responses
 */
export const applyProfessionalInsights = (response, input) => {
  let enhanced = response;
  const lowerInput = input.toLowerCase();

  const isNegotiation = ['price', 'cost', 'contract', 'deal'].some(k => lowerInput.includes(k));
  if (isNegotiation) enhanced = `[Negotiation] Be clear about your value. ${enhanced}`;

  const isAction = ['need to', 'should', 'will', 'let\'s'].some(k => lowerInput.includes(k));
  if (isAction) enhanced = `[Action Item] ${enhanced}`;

  return enhanced;
};
