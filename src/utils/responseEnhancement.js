import { analyzeEmotion } from './emotion';
import { getDislikedPhrases } from './feedback';
import { secureLocalStorageGet } from './encryption';
import {
  getNaturalPhrasing,
  culturalContextDatabase,
  getCommunicationStyleForCulture
} from './culturalContext';
import { generateIntentBasedCue, detectIntentWithContext } from './intentRecognition';
import { analyzeRelationshipCoaching, generateRelationshipCoachingPrompt } from './relationshipCoaching';
import { analyzeAnxietyCoaching, generateAnxietyCoachingPrompt } from './anxietyCoaching';
import { validateSocialSuggestion, promoteEmpathy } from './socialEthics';

/**
 * Gets user's preferred response patterns based on feedback history
 *
 * @returns {Promise<object>} Preferred response characteristics
 */
export const getInferredPreferences = async () => {
  try {
    const feedbackHistory = await secureLocalStorageGet('convocue_feedback', []);

    if (feedbackHistory.length === 0) {
      return {
        preferredLength: 'medium', // 'short', 'medium', 'long'
        preferredTone: 'balanced', // 'formal', 'casual', 'balanced'
        preferredStyle: 'adaptive', // 'directive', 'supportive', 'adaptive'
        responsePatterns: [], // Commonly liked patterns
        avoidPatterns: [] // Commonly disliked patterns
      };
    }

    // Analyze feedback to determine user preferences
    const likedSuggestions = feedbackHistory.filter(f => f.feedbackType === 'like');
    const dislikedSuggestions = feedbackHistory.filter(f => f.feedbackType === 'dislike');

    // Determine preferred length based on liked suggestions
    let preferredLength = 'medium';
    if (likedSuggestions.length > 0) {
      const avgLength = likedSuggestions.reduce((sum, f) => sum + f.suggestion.length, 0) / likedSuggestions.length;
      if (avgLength < 30) preferredLength = 'short';
      else if (avgLength > 60) preferredLength = 'long';
    }

    // Determine preferred tone based on persona usage
    const personaCounts = {};
    likedSuggestions.forEach(f => {
      personaCounts[f.persona] = (personaCounts[f.persona] || 0) + 1;
    });

    let preferredTone = 'balanced';
    if (personaCounts.professional > (personaCounts.anxiety || 0) + (personaCounts.relationship || 0)) {
      preferredTone = 'formal';
    } else if ((personaCounts.anxiety || 0) + (personaCounts.relationship || 0) > personaCounts.professional) {
      preferredTone = 'casual';
    }

    // Analyze response patterns from liked suggestions
    const responsePatterns = analyzeResponsePatterns(likedSuggestions);
    const avoidPatterns = analyzeResponsePatterns(dislikedSuggestions, true);

    return {
      preferredLength,
      preferredTone,
      preferredStyle: 'adaptive',
      responsePatterns,
      avoidPatterns
    };
  } catch (e) {
    console.error('Failed to determine user preferences:', e);
    return {
      preferredLength: 'medium',
      preferredTone: 'balanced',
      preferredStyle: 'adaptive',
      responsePatterns: [],
      avoidPatterns: []
    };
  }
};

/**
 * Analyzes patterns in suggestions to identify what users like/dislike
 * @param {Array} suggestions - Array of feedback suggestions
 * @param {boolean} forDisliked - Whether analyzing disliked suggestions
 * @returns {Array} Array of common patterns
 */
const analyzeResponsePatterns = (suggestions, forDisliked = false) => {
  if (suggestions.length === 0) return [];

  // Extract common patterns like phrases, structures, etc.
  const patterns = [];
  const phraseCounts = {};
  const structureCounts = {};

  suggestions.forEach(suggestion => {
    const text = suggestion.suggestion.toLowerCase();

    // Look for common phrases
    const phrases = extractCommonPhrases(text);
    phrases.forEach(phrase => {
      phraseCounts[phrase] = (phraseCounts[phrase] || 0) + 1;
    });

    // Look for structural patterns
    const structure = analyzeStructure(text);
    if (structure) {
      structureCounts[structure] = (structureCounts[structure] || 0) + 1;
    }
  });

  // Convert to array and sort by frequency
  Object.entries(phraseCounts).forEach(([phrase, count]) => {
    if (count >= (forDisliked ? 1 : 2)) { // Lower threshold for disliked patterns
      patterns.push({
        type: 'phrase',
        value: phrase,
        count,
        weight: forDisliked ? -count : count
      });
    }
  });

  Object.entries(structureCounts).forEach(([structure, count]) => {
    if (count >= (forDisliked ? 1 : 2)) {
      patterns.push({
        type: 'structure',
        value: structure,
        count,
        weight: forDisliked ? -count : count
      });
    }
  });

  return patterns.slice(0, 10); // Return top 10 patterns
};

/**
 * Extracts common conversational phrases from text
 * @param {string} text - Input text
 * @returns {Array} Array of common phrases
 */
const extractCommonPhrases = (text) => {
  const commonPhrases = [
    'how are you', 'what do you think', 'i understand', 'that sounds',
    'what about', 'could you', 'would you', 'maybe we', 'in my opinion',
    'i see', 'you know', 'actually', 'definitely', 'absolutely', 'perhaps',
    'on the other hand', 'i agree', 'that makes sense', 'tell me more',
    'what if', 'how about', 'i feel', 'it seems', 'personally', 'to be honest'
  ];

  return commonPhrases.filter(phrase => text.includes(phrase));
};

/**
 * Analyzes the structural pattern of a response
 * @param {string} text - Input text
 * @returns {string|null} Structural pattern
 */
const analyzeStructure = (text) => {
  const sentences = text.split(/(?<=[.!?])\s+/);

  if (sentences.length === 1) {
    if (text.endsWith('?')) return 'single_question';
    if (text.endsWith('.') || text.endsWith('!')) return 'single_statement';
  } else if (sentences.length === 2) {
    return 'two_part';
  } else if (sentences.length > 2) {
    return 'multi_part';
  }

  // Check for question patterns
  if (text.toLowerCase().startsWith('what') ||
      text.toLowerCase().startsWith('how') ||
      text.toLowerCase().startsWith('why')) {
    return 'question_start';
  }

  return null;
};

/**
 * Adjusts a response based on user preferences and feedback patterns
 *
 * @param {string} response - Original response to adjust
 * @param {string} persona - Current persona being used
 * @param {object} emotionData - Emotional analysis data
 * @returns {Promise<string>} Adjusted response
 */
export const adjustResponseForUser = async (response, persona, emotionData) => {
  const preferences = await getInferredPreferences();
  
  // Adjust length based on user preference
  let adjustedResponse = response;
  
  if (preferences.preferredLength === 'short' && response.length > 50) {
    // Truncate to first sentence if too long
    const sentences = response.split(/(?<=[.!?])\s+/);
    if (sentences.length > 1) {
      adjustedResponse = sentences[0];
    } else if (response.length > 60) {
      // If it's one long sentence, truncate to ~60 chars
      adjustedResponse = response.substring(0, 60).trim() + '...';
    }
  } else if (preferences.preferredLength === 'long' && response.length < 40) {
    // Expand short responses with follow-up if user prefers longer responses
    if (persona === 'anxiety') {
      adjustedResponse += " I'm here to listen and help if you'd like to share more.";
    } else if (persona === 'relationship') {
      adjustedResponse += " What are your thoughts on this? I'm interested to hear more.";
    }
  }
  
  // Adjust tone based on user preference
  if (preferences.preferredTone === 'formal' && persona !== 'professional') {
    // Make more formal if user prefers it
    adjustedResponse = adjustedResponse
      .replace(/\b(i|we|you|they)\b/g, (match) => match.charAt(0).toUpperCase() + match.slice(1))
      .replace(/\bim\b/gi, 'I am')
      .replace(/\bcant\b/gi, 'cannot')
      .replace(/\bwont\b/gi, 'will not');
  } else if (preferences.preferredTone === 'casual' && persona === 'professional') {
    // Make more casual if user prefers it
    adjustedResponse = adjustedResponse
      .replace(/\bI am\b/gi, 'I\'m')
      .replace(/\bcannot\b/gi, 'can\'t')
      .replace(/\bwill not\b/gi, 'won\'t');
  }
  
  // Add emotional awareness if emotion detected
  if (emotionData && emotionData.emotion !== 'neutral' && emotionData.confidence > 0.4) {
    const emotionalAcknowledge = getEmotionalAcknowledgment(emotionData.emotion);
    if (!adjustedResponse.toLowerCase().includes(emotionalAcknowledge.toLowerCase())) {
      adjustedResponse = `${emotionalAcknowledge} ${adjustedResponse}`;
    }
  }
  
  return adjustedResponse;
};

/**
 * Gets appropriate emotional acknowledgment based on detected emotion
 * @param {string} emotion - Detected emotion
 * @returns {string} Appropriate acknowledgment
 */
const getEmotionalAcknowledgment = (emotion) => {
  const acknowledgments = {
    joy: "That sounds positive!",
    sadness: "I understand this might be difficult.",
    anger: "I can sense some frustration.",
    fear: "I understand your concern.",
    surprise: "That's interesting!",
    disgust: "I understand your reaction."
  };
  
  return acknowledgments[emotion] || "I hear what you're saying.";
};

/**
 * Checks if a response contains disliked phrases
 * @param {string} response - Response to check
 * @returns {Promise<boolean>} True if response contains disliked phrases
 */
export const hasDislikedPhrases = async (response) => {
  const dislikedPhrases = await getDislikedPhrases();
  const lowerResponse = response.toLowerCase();

  return dislikedPhrases.some(phrase => lowerResponse.includes(phrase));
};

/**
 * Enhances a response based on user preferences, emotional context, and feedback patterns
 *
 * @param {string} response - Original response to enhance
 * @param {string} persona - Current persona being used
 * @param {object} emotionData - Optional emotional analysis data
 * @param {string} input - Optional original user transcript for deeper context
 * @param {Array} conversationHistory - Optional conversation history for context
 * @returns {Promise<string>} Enhanced response
 */
export const enhanceResponse = async (response, persona, emotionData = null, input = '', conversationHistory = [], options = {}) => {
  if (!response) return response;

  const preferences = await getInferredPreferences();
  const isSubtleMode = options.isSubtleMode || preferences.isSubtleMode;
  let enhancedResponse = response;
  const transformations = [];

  // 1. Specialized Persona Logic (Apply BEFORE general adjustments)
  if (!isSubtleMode) {
    if (persona === 'languagelearning') {
      const targetLanguage = detectLanguageFromContext(options.culturalContext || 'general');
      const prev = enhancedResponse;
      enhancedResponse = applyLanguageLearningSupport(enhancedResponse, input, targetLanguage);
      if (prev !== enhancedResponse) transformations.push('language_learning');
    } else if (persona === 'relationship') {
      // Apply enhanced relationship coaching for relationship persona
      const relationshipInsights = await analyzeRelationshipCoaching(input, conversationHistory, emotionData);
      const prev = enhancedResponse;
      enhancedResponse = await applyRelationshipCoaching(enhancedResponse, input, relationshipInsights, persona);
      if (prev !== enhancedResponse) transformations.push('relationship_coaching');
    } else if (persona === 'anxiety') {
      // Apply anxiety-specific coaching for anxiety persona
      const anxietyInsights = await analyzeAnxietyCoaching(input, conversationHistory, emotionData);
      const prev = enhancedResponse;
      enhancedResponse = await applyAnxietyCoaching(enhancedResponse, input, anxietyInsights, persona);
      if (prev !== enhancedResponse) transformations.push('anxiety_coaching');
    } else if (persona === 'professional' || persona === 'meeting') {
      const prev = enhancedResponse;
      enhancedResponse = applyProfessionalInsights(enhancedResponse, input);
      if (prev !== enhancedResponse) transformations.push('professional_insights');
    }

    // Apply cultural refinement if a specific culture is detected or set
    const targetCulture = options.culturalContext || 'general';
    if (targetCulture !== 'general') {
      const prev = enhancedResponse;
      enhancedResponse = applyCulturalRefinement(enhancedResponse, targetCulture);
      if (prev !== enhancedResponse) transformations.push('cultural_refinement');
    }
  }

  // 2. Adjust length based on user preference or subtle mode
  if (isSubtleMode) {
    // In subtle mode, we want extremely brief cues from a curated list
    enhancedResponse = generateQuickCue(enhancedResponse, input, conversationHistory);
    transformations.push('subtle_mode_cue');
  } else if (preferences.preferredLength === 'short' && enhancedResponse.length > 50) {
    // Truncate to first sentence if too long
    const sentences = enhancedResponse.split(/(?<=[.!?])\s+/);
    if (sentences.length > 1) {
      enhancedResponse = sentences[0];
    } else if (enhancedResponse.length > 60) {
      // If it's one long sentence, truncate to ~60 chars
      enhancedResponse = enhancedResponse.substring(0, 60).trim() + '...';
    }
    transformations.push('length_shortening');
  } else if (preferences.preferredLength === 'long' && enhancedResponse.length < 40) {
    // Expand short responses with follow-up if user prefers longer responses
    const prev = enhancedResponse;
    if (persona === 'anxiety') {
      enhancedResponse += " I'm here to listen and help if you'd like to share more.";
    } else if (persona === 'relationship') {
      enhancedResponse += " What are your thoughts on this? I'm interested to hear more.";
    }
    if (prev !== enhancedResponse) transformations.push('length_expansion');
  }

  // 3. Adjust tone based on user preference (bypass if subtle)
  if (!isSubtleMode) {
    const prev = enhancedResponse;
    enhancedResponse = applyToneAdjustment(enhancedResponse, preferences.preferredTone, persona);
    if (prev !== enhancedResponse) transformations.push('tone_adjustment');
  }

  // 4. Add emotional awareness if emotion detected (bypass if subtle)
  if (!isSubtleMode && emotionData && emotionData.emotion !== 'neutral' && emotionData.confidence > 0.4) {
    const emotionalAcknowledge = getEmotionalAcknowledgment(emotionData.emotion);
    if (!enhancedResponse.toLowerCase().includes(emotionalAcknowledge.toLowerCase())) {
      enhancedResponse = `${emotionalAcknowledge} ${enhancedResponse}`;
      transformations.push('emotional_awareness');
    }
  }

  // 4.5 Apply Ethics-based Empathy Promotion
  if (!isSubtleMode && emotionData) {
    const prev = enhancedResponse;
    enhancedResponse = promoteEmpathy(enhancedResponse, emotionData.emotion);
    if (prev !== enhancedResponse) transformations.push('empathy_promotion');
  }

  // 5. Apply conversation context awareness (bypass if subtle)
  if (!isSubtleMode && conversationHistory && conversationHistory.length > 0) {
    const prev = enhancedResponse;
    enhancedResponse = applyConversationContext(enhancedResponse, conversationHistory, persona);
    if (prev !== enhancedResponse) transformations.push('context_awareness');
  }

  // 6. Apply learned preferences from feedback (bypass if subtle)
  if (!isSubtleMode) {
    const prev = enhancedResponse;
    enhancedResponse = applyLearnedPreferences(enhancedResponse, preferences);
    if (prev !== enhancedResponse) transformations.push('learned_preferences');
  }

  // Logging for auditability
  if (transformations.length > 0) {
    console.debug(`[ResponseEnhancement] Transformations: ${transformations.join(', ')}`);
    console.debug(`[ResponseEnhancement] Original: "${response}"`);
    console.debug(`[ResponseEnhancement] Enhanced: "${enhancedResponse}"`);
  }

  // Safety Valve - Optimized for context-heavy personas
  if (!isSubtleMode) {
    const lengthRatio = enhancedResponse.length / Math.max(1, response.length);
    
    // Allow more expansion for supportive personas which add essential context/disclaimers
    const maxRatio = (persona === 'anxiety' || persona === 'relationship') ? 5.0 : 3.0;
    const minRatio = 0.2;
    
    // Use a minimum length threshold to avoid penalizing very short responses (like "Yes")
    // that naturally need more context/disclaimers to be safe and helpful.
    const maxAllowedLength = Math.max(150, response.length * maxRatio);

    if (enhancedResponse.length > maxAllowedLength || lengthRatio < minRatio) {
      console.warn(`Safety valve triggered: Enhancement was too aggressive (Length: ${enhancedResponse.length}, Max: ${maxAllowedLength}, Ratio: ${lengthRatio.toFixed(2)}).`);
      
      // Attempt partial enhancement for over-length responses
      if (enhancedResponse.length > maxAllowedLength) {
        const sentences = enhancedResponse.split(/(?<=[.!?])\s+/);
        let trimmed = "";
        for (const sentence of sentences) {
          if (trimmed.length + sentence.length + 1 <= maxAllowedLength) {
            trimmed += (trimmed ? " " : "") + sentence;
          } else {
            break;
          }
        }
        
        // If we managed to keep a reasonable amount of enhancement, return it
        if (trimmed && trimmed.length / response.length >= 1.2) {
          console.debug(`[ResponseEnhancement] Using partially trimmed enhancement (${trimmed.length} chars).`);
          return trimmed;
        }
      }
      
      return response;
    }
  }

  // 7. Final Ethics & Safety Guardrail
  const finalizedResponse = validateSocialSuggestion(enhancedResponse, input || '');
  if (finalizedResponse !== enhancedResponse) {
    transformations.push('safety_guardrail_triggered');
  }

  return finalizedResponse;
};

/**
 * Detects target language based on cultural context
 */
const detectLanguageFromContext = (culture) => {
  const lowerCulture = culture.toLowerCase();
  if (['spain', 'mexico', 'brazil', 'argentina', 'spanish', 'latin america'].some(c => lowerCulture.includes(c))) {
    return 'spanish';
  }
  // Default to English for now
  return 'english';
};

/**
 * Applies language learning specific enhancements
 */
const applyLanguageLearningSupport = (response, input, language = 'english') => {
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
const applyRelationshipCoaching = async (response, input, relationshipInsights, persona) => {
  let enhancedResponse = response;

  // Return early if relationshipInsights is undefined/null
  if (!relationshipInsights) {
    return enhancedResponse;
  }

  // Apply empathy level considerations
  if (relationshipInsights.empathyLevel === 'high') {
    enhancedResponse = `I can really understand how that feels. ${enhancedResponse}`;
  } else if (relationshipInsights.empathyLevel === 'medium') {
    enhancedResponse = `I hear what you're saying. ${enhancedResponse}`;
  }

  // Apply active listening opportunities
  if (relationshipInsights.activeListeningOpportunities && Array.isArray(relationshipInsights.activeListeningOpportunities)) {
    for (const opportunity of relationshipInsights.activeListeningOpportunities) {
      if (opportunity.type === 'reflect_emotion' && !enhancedResponse.toLowerCase().includes('i can see')) {
        enhancedResponse = `I can see you're feeling ${opportunity.description.split(' ')[2] || 'that way'}. ${enhancedResponse}`;
      } else if (opportunity.type === 'validate' && !enhancedResponse.toLowerCase().includes('that makes sense')) {
        enhancedResponse = `That makes complete sense. ${enhancedResponse}`;
      }
    }
  }

  // Apply emotional validation if needed
  if (relationshipInsights.emotionalValidationNeeded && !enhancedResponse.toLowerCase().includes('your feelings')) {
    enhancedResponse = `Your feelings are completely valid. ${enhancedResponse}`;
  }

  // Apply persona-specific relationship coaching
  if (persona === 'relationship') {
    // For relationship persona, emphasize connection and understanding
    if (!enhancedResponse.toLowerCase().includes('connection') && !enhancedResponse.toLowerCase().includes('understanding')) {
      enhancedResponse += " This helps strengthen our connection.";
    }
  } else if (persona === 'anxiety') {
    // For anxiety persona, emphasize support and reassurance
    if (!enhancedResponse.toLowerCase().includes('support') && !enhancedResponse.toLowerCase().includes('here for you')) {
      enhancedResponse += " I'm here for you and supporting you through this.";
    }
  }

  // Apply suggested response types
  if (relationshipInsights.suggestedResponseTypes && Array.isArray(relationshipInsights.suggestedResponseTypes) && relationshipInsights.suggestedResponseTypes.length > 0) {
    const primarySuggestion = relationshipInsights.suggestedResponseTypes[0];

    if (primarySuggestion.type === 'empathetic' && !enhancedResponse.toLowerCase().includes('understand')) {
      enhancedResponse = `I understand how you feel. ${enhancedResponse}`;
    } else if (primarySuggestion.type === 'validation' && !enhancedResponse.toLowerCase().includes('completely understandable')) {
      enhancedResponse = `That's completely understandable. ${enhancedResponse}`;
    } else if (primarySuggestion.type === 'supportive' && !enhancedResponse.toLowerCase().includes('here for you')) {
      enhancedResponse = `I'm here for you. ${enhancedResponse}`;
    }
  }

  // Add ethical disclaimer for emotional support features
  if (persona === 'relationship' || persona === 'anxiety') {
    enhancedResponse += " Remember, I'm not a substitute for professional mental health services.";
  }

  return enhancedResponse;
};

/**
 * Applies anxiety-specific coaching to responses
 */
const applyAnxietyCoaching = async (response, input, anxietyInsights, persona) => {
  let enhancedResponse = response;

  // Apply anxiety level considerations
  if (anxietyInsights.anxietyLevel === 'high') {
    enhancedResponse = `I can understand you're feeling anxious. ${enhancedResponse}`;
  } else if (anxietyInsights.anxietyLevel === 'medium') {
    enhancedResponse = `It's normal to feel concerned about this. ${enhancedResponse}`;
  }

  // Apply anxiety trigger considerations
  for (const trigger of anxietyInsights.anxietyTriggers) {
    if (trigger.type === 'future_worry' && !enhancedResponse.toLowerCase().includes('focus on now')) {
      enhancedResponse = `Let's focus on the present moment rather than hypotheticals. ${enhancedResponse}`;
    } else if (trigger.type === 'social_anxiety' && !enhancedResponse.toLowerCase().includes('others are kind')) {
      enhancedResponse = `Most people are more understanding than we imagine. ${enhancedResponse}`;
    }
  }

  // Apply reassurance if needed
  if (anxietyInsights.reassuranceNeeded && !enhancedResponse.toLowerCase().includes('your feelings')) {
    enhancedResponse = `Your feelings are completely valid and understandable. ${enhancedResponse}`;
  }

  // Apply coping strategies
  if (anxietyInsights.copingStrategies.length > 0) {
    const primaryStrategy = anxietyInsights.copingStrategies[0];

    if (primaryStrategy.type === 'breathing' && !enhancedResponse.toLowerCase().includes('breathe')) {
      enhancedResponse = `Take a moment to breathe deeply. ${enhancedResponse}`;
    } else if (primaryStrategy.type === 'grounding' && !enhancedResponse.toLowerCase().includes('present')) {
      enhancedResponse = `Try to ground yourself in the present moment. ${enhancedResponse}`;
    } else if (primaryStrategy.type === 'cognitive_restructuring' && !enhancedResponse.toLowerCase().includes('another way')) {
      enhancedResponse = `Is there another way to look at this situation? ${enhancedResponse}`;
    }
  }

  // Add anxiety-specific support
  if (persona === 'anxiety') {
    // For anxiety persona, emphasize support and practical coping
    if (!enhancedResponse.toLowerCase().includes('support') && !enhancedResponse.toLowerCase().includes('here for you')) {
      enhancedResponse += " I'm here for you and supporting you through this.";
    }
  }

  // Add ethical disclaimer for anxiety support
  enhancedResponse += " Remember, I'm not a substitute for professional mental health services.";

  return enhancedResponse;
};

/**
 * Applies social nuance enhancements for relationship coaching
 */
const applySocialNuance = (response, input) => {
  const lowerInput = input.toLowerCase();
  const nuances = culturalContextDatabase.socialNuance;

  for (const category in nuances) {
    for (const item of nuances[category]) {
      if (lowerInput.includes(item.trigger)) {
        return `[Social Tip] ${item.suggestion} ${response}`;
      }
    }
  }
  return response;
};

/**
 * Adjusts directness and tone based on cultural communication style
 */
const applyCulturalRefinement = (response, culture) => {
  const style = getCommunicationStyleForCulture(culture);
  let refined = response;

  const replacements = {
    'high-context': [
      { pattern: /\b(no|never|wrong)\b/gi, alternatives: ['that might be difficult', 'that is a challenge', 'perhaps not quite'] },
      { pattern: /\b(must|should|have to)\b/gi, alternatives: ['perhaps we could', 'it might be helpful to', 'may I suggest'] },
      { pattern: /\b(i want|i need)\b/gi, alternatives: ['I would appreciate it if we could', 'it would be helpful if', 'if possible, could we'] }
    ],
    'low-context': [
      { pattern: /it seems like maybe we could/gi, alternatives: ['we should', 'I recommend'] },
      { pattern: /perhaps it might be better to/gi, alternatives: ['it is better to', 'let\'s'] },
      { pattern: /i was wondering if/gi, alternatives: ['can we', 'should we'] }
    ]
  };

  const getRandomReplacement = (alts) => alts[Math.floor(Math.random() * alts.length)];

  if (replacements[style]) {
    replacements[style].forEach(({ pattern, alternatives }) => {
      // 70% chance to apply to avoid being too repetitive/robotic
      if (Math.random() > 0.3) {
        refined = refined.replace(pattern, () => getRandomReplacement(alternatives));
      }
    });

    if (style === 'high-context' && refined.length < 40 && !refined.includes('With respect')) {
      const preambles = ['With respect, ', 'I was thinking, ', 'Perhaps, '];
      refined = getRandomReplacement(preambles) + refined.charAt(0).toLowerCase() + refined.slice(1);
    }
  } else if (style === 'medium-context') {
    refined = refined.replace(/\b(wrong|bad)\b/gi, 'not quite right');
  }

  return refined;
};

/**
 * Applies professional-specific insights to responses
 */
const applyProfessionalInsights = (response, input) => {
  let professionalResponse = response;
  const lowerInput = input.toLowerCase();

  // High-Stakes detection
  const isNegotiation = lowerInput.includes('price') || lowerInput.includes('cost') || lowerInput.includes('contract');
  if (isNegotiation) {
    const tip = culturalContextDatabase.highStakes.negotiation[0];
    professionalResponse = `[Negotiation] ${tip} ${professionalResponse}`;
  }

  // Action Item Detection
  const actionKeywords = ['need to', 'should', 'will', 'let\'s', 'assign', 'deadline', 'task', 'follow up'];
  const hasActionItem = actionKeywords.some(keyword => lowerInput.includes(keyword));
  
  if (hasActionItem && !response.toLowerCase().includes('action')) {
    professionalResponse = `[Action Item] ${professionalResponse}`;
  }

  return professionalResponse;
};

/**
 * Applies tone adjustments to the response based on user preference
 * @param {string} response - Original response
 * @param {string} preferredTone - User's preferred tone ('formal', 'casual', 'balanced')
 * @param {string} persona - Current persona
 * @returns {string} Response with tone adjustments applied
 */
const applyToneAdjustment = (response, preferredTone, persona) => {
  let adjustedResponse = response;

  if (preferredTone === 'formal' && persona !== 'professional') {
    // Make more formal if user prefers it
    adjustedResponse = adjustedResponse
      .replace(/\b(i|we|you|they)\b/g, (match) => match.charAt(0).toUpperCase() + match.slice(1))
      .replace(/\bim\b/gi, 'I am')
      .replace(/\bcant\b/gi, 'cannot')
      .replace(/\bwont\b/gi, 'will not');
  } else if (preferredTone === 'casual' && persona === 'professional') {
    // Make more casual if user prefers it
    adjustedResponse = adjustedResponse
      .replace(/\bI am\b/gi, 'I\'m')
      .replace(/\bcannot\b/gi, 'can\'t')
      .replace(/\bwill not\b/gi, 'won\'t');
  }

  return adjustedResponse;
};

/**
 * Applies conversation context to make responses more relevant
 * @param {string} response - Original response
 * @param {Array} conversationHistory - Conversation history
 * @param {string} persona - Current persona
 * @returns {string} Response with conversation context applied
 */
const applyConversationContext = (response, conversationHistory, persona) => {
  if (!conversationHistory || conversationHistory.length === 0) return response;

  // Get the last few messages to understand context
  const recentMessages = conversationHistory.slice(-3);
  const lastMessage = recentMessages[recentMessages.length - 1];
  const secondToLastMessage = recentMessages.length > 1 ? recentMessages[recentMessages.length - 2] : null;

  // If the last message was from the assistant, we might want to vary our approach
  if (lastMessage && lastMessage.role === 'assistant') {
    // This might be a follow-up to our previous suggestion
    if (persona === 'anxiety' || persona === 'relationship') {
      // For supportive personas, acknowledge the continued conversation
      if (!response.toLowerCase().includes('continue') && !response.toLowerCase().includes('more')) {
        response = response + " What else would you like to discuss?";
      }
    }
  }

  // Check if we're responding to a question
  if (lastMessage && lastMessage.content.toLowerCase().includes('?')) {
    // Make sure our response addresses the question
    if (persona === 'professional' && !response.toLowerCase().includes('answer') && !response.toLowerCase().includes('suggest')) {
      response = "Based on what you've shared, I suggest: " + response;
    }
  }

  // Check for emotional continuity
  if (secondToLastMessage && lastMessage) {
    // Look for emotional patterns in the conversation
    const lastEmotion = analyzeEmotion(lastMessage.content);
    const prevEmotion = secondToLastMessage ? analyzeEmotion(secondToLastMessage.content) : null;

    if (lastEmotion.emotion !== 'neutral' && prevEmotion && prevEmotion.emotion === lastEmotion.emotion) {
      // If emotions are consistent, acknowledge the ongoing feeling
      if (persona === 'relationship' && !response.toLowerCase().includes('understand') && !response.toLowerCase().includes('feel')) {
        response = `I understand how you feel. ${response}`;
      }
    }
  }

  return response;
};

/**
 * Applies learned preferences from user feedback to a response
 * @param {string} response - Original response
 * @param {object} preferences - User preferences object
 * @returns {string} Response with preferences applied
 */
const applyLearnedPreferences = (response, preferences) => {
  if (!preferences.responsePatterns && !preferences.avoidPatterns) return response;

  let modifiedResponse = response;

  // Apply moderation to prevent over-adaptation
  const moderationFactor = calculateModerationFactor(preferences);

  // Avoid negative patterns (things users disliked)
  if (preferences.avoidPatterns && preferences.avoidPatterns.length > 0) {
    preferences.avoidPatterns.forEach(pattern => {
      if (pattern.type === 'phrase' && pattern.weight < 0) {
        // This is a pattern to avoid
        if (modifiedResponse.toLowerCase().includes(pattern.value)) {
          // Only apply changes if moderation factor allows it
          if (Math.abs(pattern.weight) * moderationFactor > 0.3) {
            // Actively replace the disliked pattern with a better alternative
            modifiedResponse = replaceDislikedPattern(modifiedResponse, pattern.value);
          }
        }
      } else if (pattern.type === 'structure' && pattern.value === 'single_question' && pattern.weight < 0) {
        // If user dislikes single questions, convert to statement
        if (modifiedResponse.trim().endsWith('?') &&
            modifiedResponse.split(/(?<=[.!?])\s+/).length === 1) {
          if (moderationFactor > 0.3) {
            modifiedResponse = convertQuestionToStatement(modifiedResponse);
          }
        }
      } else if (pattern.type === 'structure' && pattern.value === 'apologetic_pattern' && pattern.weight < 0) {
        // If user dislikes apologetic patterns, remove them
        if (moderationFactor > 0.3) {
          modifiedResponse = removeApologeticLanguage(modifiedResponse);
        }
      }
    });
  }

  return modifiedResponse;
};

/**
 * Calculates a moderation factor to prevent over-adaptation
 */
const calculateModerationFactor = (preferences) => {
  const totalFeedbackCount = (preferences.responsePatterns?.length || 0) + (preferences.avoidPatterns?.length || 0);
  return Math.min(1.0, Math.max(0.1, totalFeedbackCount / 10));
};

/**
 * Replaces a disliked pattern with a better alternative
 */
const replaceDislikedPattern = (response, dislikedPhrase) => {
  const replacements = {
    'sorry': 'I understand',
    'apologize': 'I recognize',
    'i don\'t know': 'here\'s what I can suggest',
    'maybe': 'consider',
    'perhaps': 'think about',
    'i think': 'from my perspective',
    'i guess': 'it seems'
  };

  const lowerPhrase = dislikedPhrase.toLowerCase();
  if (replacements[lowerPhrase]) {
    return response.replace(new RegExp('\\b' + dislikedPhrase + '\\b', 'gi'), replacements[lowerPhrase]);
  }

  return rephraseSentence(response, dislikedPhrase);
};

/**
 * Rephrases a sentence to remove a disliked phrase
 */
const rephraseSentence = (response, dislikedPhrase) => {
  const sentences = response.split(/(?<=[.!?])\s+/);
  const rephrasedSentences = sentences.map(sentence => {
    if (sentence.toLowerCase().includes(dislikedPhrase.toLowerCase())) {
      let newSentence = sentence.replace(new RegExp('\\b' + dislikedPhrase + '\\b', 'gi'), '');
      newSentence = newSentence.replace(/\s+/g, ' ').trim();
      if (newSentence.length > 0) {
        newSentence = newSentence.charAt(0).toUpperCase() + newSentence.slice(1);
      }
      return newSentence;
    }
    return sentence;
  });
  return rephrasedSentences.join(' ');
};

/**
 * Converts a question to a statement
 */
const convertQuestionToStatement = (question) => {
  let statement = question.replace(/\?$/, '.');
  if (statement.toLowerCase().startsWith('what')) {
    statement = 'Consider what you could do about ' + statement.substring(5);
  } else if (statement.toLowerCase().startsWith('how')) {
    statement = 'Think about how you might ' + statement.substring(4);
  }
  return statement;
};

/**
 * Removes apologetic language
 */
const removeApologeticLanguage = (response) => {
  let cleanedResponse = response.replace(/\bsorry\b/gi, '')
    .replace(/\bi apologize\b/gi, '')
    .replace(/\bmy apologies\b/gi, '')
    .replace(/\bi'm sorry\b/gi, '');
  return cleanedResponse.replace(/\s+/g, ' ').trim().replace(/\s+([,.!?;:])/g, '$1');
};

/**
 * Generates context-aware quick cues for subtle mode using NLP-based intent recognition and expert databases
 */
const generateQuickCue = (response, input, conversationHistory = []) => {
  const lowerInput = input.toLowerCase();
  
  // 1. Check for High-Stakes Expert Cues first
  if (lowerInput.includes('negotiate') || lowerInput.includes('price') || lowerInput.includes('contract')) {
    const highStakes = culturalContextDatabase.highStakes.negotiation;
    // Map full strategies to short cues
    if (lowerInput.includes('no')) return 'Avoid "No"';
    if (lowerInput.includes('how')) return 'Calibrated Q';
    return 'Strategic Silence';
  }

  if (lowerInput.includes('boss') || lowerInput.includes('lead') || lowerInput.includes('meeting')) {
    if (lowerInput.includes('wrong') || lowerInput.includes('problem')) return 'Extreme Ownership';
    return 'Project Confidence';
  }

  // 2. Check for Social Nuance triggers
  const nuances = culturalContextDatabase.socialNuance;
  for (const category in nuances) {
    for (const item of nuances[category]) {
      if (lowerInput.includes(item.trigger)) {
        // Extract a 1-3 word cue from the suggestion
        const words = item.suggestion.split(' ').slice(0, 3).join(' ');
        return words.charAt(0).toUpperCase() + words.slice(1);
      }
    }
  }

  // 3. Fallback to the new intent recognition system
  const intentBasedCue = generateIntentBasedCue(input, response, conversationHistory);
  if (intentBasedCue) {
    return intentBasedCue;
  }

  // 4. Fallback to simple keyword matching if intent recognition doesn't return a cue
  const quickCues = {
    greeting: ['Hi', 'Hello', 'Hey', 'Wave', 'Smile', 'Warmly'],
    question: ['Ask', 'Clarify', 'Follow up', 'Probe', 'Inquire', 'Investigate', 'Query'],
    agreement: ['Agree', 'Nod', 'Right', 'Exactly', 'True', 'Affirm', 'Indeed'],
    disagreement: ['Pause', 'Consider', 'Hmm', 'Wait', 'Think', 'Reassess', 'Doubt'],
    suggestion: ['Try', 'Suggest', 'Maybe', 'Consider', 'Propose', 'Experiment', 'Advise'],
    encouragement: ['Great', 'Good', 'Nice', 'Keep going', 'Well done', 'Excellent', 'Superb'],
    empathy: ['I hear', 'Understand', 'Feel', 'Acknowledge', 'Valid', 'Empathize', 'Relate'],
    transition: ['Next', 'Change', 'Switch', 'Move on', 'Continue', 'Bridge', 'Pivot'],
    clarification: ['Explain', 'Elaborate', 'Expand', 'Detail', 'Clarify', 'Specify', 'Define'],
    emotion: ['Calm', 'Breathe', 'Relax', 'Focus', 'Center', 'Ground', 'Quiet'],
    uncertainty: ['Hmm', 'Unsure', 'Thoughtful', 'Reflect', 'Consider', 'Ponder', 'Wonder'],
    strategic: ['Lean in', 'Hold eye contact', 'Lower volume', 'Slow down', 'Wait for silence', 'Mirror', 'Pause for effect'],
    conflict: ['De-escalate', 'Validate first', 'Soft tone', 'Find common ground', 'Listen more', 'Neutral stance', 'Breathe'],
    default: ['Pause', 'Think', 'Consider', 'Reflect', 'Hmm', 'Observe']
  };

  const lowerResponse = response.toLowerCase();
  const selectRandom = (cat) => quickCues[cat][Math.floor(Math.random() * quickCues[cat].length)];

  if (lowerInput.includes('no') && (lowerInput.includes('wrong') || lowerInput.includes('disagree'))) return selectRandom('conflict');
  if (lowerInput.includes('hello') || lowerInput.includes('hi')) return selectRandom('greeting');
  if (lowerInput.includes('?') || lowerInput.includes('what') || lowerInput.includes('how')) return selectRandom('question');

  if (lowerResponse.includes('should') || lowerResponse.includes('try') || lowerResponse.includes('could')) return selectRandom('suggestion');
  if (lowerResponse.includes('feel') || lowerResponse.includes('understand')) return selectRandom('empathy');

  if (conversationHistory.length > 0) {
    const lastTurn = conversationHistory[conversationHistory.length - 1];
    if (lastTurn?.content?.includes('?')) return selectRandom('question');
  }

  return selectRandom('default');
};
