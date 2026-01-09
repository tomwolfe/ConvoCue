/**
 * Cultural context database for cross-cultural communication
 */

import fundamentals from './culturalContext/cultural-fundamentals.json';
import interaction from './culturalContext/cultural-interaction.json';
import intelligence from './culturalContext/cultural-intelligence.json';
import {
  detectEnhancedCulturalContext,
  generateCulturallyAppropriateResponses,
  getCulturalCommunicationTips,
  analyzeCulturalAppropriateness,
  detectMultilingualElements
} from './enhancedCulturalContext';

/**
 * Validates the structure of the cultural database
 * @param {Object} db - The cultural database object
 * @returns {boolean} True if valid
 */
const validateCulturalDatabase = (db) => {
  const requiredKeys = ['communicationStyles', 'greetings', 'naturalPhrasing', 'socialNuance'];
  const missingKeys = requiredKeys.filter(key => !db[key]);

  if (missingKeys.length > 0) {
    console.error(`Cultural database validation failed. Missing keys: ${missingKeys.join(', ')}`);
    return false;
  }
  return true;
};

const culturalContextDatabase = {
  ...fundamentals,
  ...interaction,
  ...intelligence
};

// Validate on load
validateCulturalDatabase(culturalContextDatabase);

export { culturalContextDatabase };

/**
 * Get natural phrasing suggestion for language learners
 * @param {string} language - Target language
 * @param {string} input - User input
 * @returns {object|null} Natural phrasing suggestion
 */
export const getNaturalPhrasing = (language, input) => {
  const phrases = culturalContextDatabase.naturalPhrasing[language.toLowerCase()];
  if (!phrases) return null;

  const lowerInput = input.toLowerCase();
  return phrases.find(p => lowerInput.includes(p.literal.toLowerCase())) || null;
};

/**
 * Get cultural context for a specific situation
 * @param {string} situation - The communication situation
 * @param {string} targetCulture - Optional target culture
 * @returns {object} Cultural context information
 */
export const getCulturalContext = (situation, targetCulture = null) => {
  // Find relevant cultural information based on situation
  const relevantPhrases = culturalContextDatabase.culturalPhrases[situation] || [];

  if (targetCulture) {
    // Filter for specific culture if provided
    return {
      situation,
      targetCulture,
      phrases: relevantPhrases,
      communicationStyle: getCommunicationStyleForCulture(targetCulture),
      businessEtiquette: getBusinessEtiquetteForCulture(targetCulture),
      taboos: getTaboosForCulture(targetCulture),
      greetings: getGreetingForCulture(targetCulture)
    };
  }

  return {
    situation,
    phrases: relevantPhrases,
    generalTips: culturalContextDatabase.communicationStyles['high-context'].tips.concat(
      culturalContextDatabase.communicationStyles['low-context'].tips
    )
  };
};

/**
 * Detects cultural context from conversation text
 * @param {string} text - Input text to analyze
 * @param {string} currentCulture - Current cultural context
 * @returns {object} Detected cultural elements
 */
export const detectCulturalContext = (text, currentCulture = 'general') => {
  // Check if user has opted out of cultural suggestions
  const isOptedOut = typeof window !== 'undefined' && window.localStorage ?
    JSON.parse(window.localStorage.getItem('convoCue_culturalOptOut') || 'false') : false;
  if (isOptedOut) {
    return {
      detectedCultures: [],
      culturalElements: [],
      primaryCulture: currentCulture,
      needsCulturalAwareness: false,
      confidence: 0,
      characteristics: null,
      disclaimer: "Cultural suggestions are disabled per user preference.",
      warning: "User has opted out of cultural guidance features."
    };
  }

  // Use enhanced cultural detection first
  const enhancedDetection = detectEnhancedCulturalContext(text, currentCulture);

  // If enhanced detection finds a specific culture with high confidence, use it
  if (enhancedDetection.confidence > 0.5 && enhancedDetection.primaryCulture !== 'general') {
    // Apply any temporary overrides
    const tempOverridesKey = 'convoCue_tempCulturalOverrides';
    let contextWithOverrides = enhancedDetection;

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const tempOverrides = JSON.parse(window.localStorage.getItem(tempOverridesKey) || '{}');
        const now = Date.now();

        // Clean up expired overrides and apply active ones
        let hasChanges = false;
        const cleanedOverrides = {};

        for (const [overrideType, overrideData] of Object.entries(tempOverrides)) {
          if (now < overrideData.expiresAt) {
            // Override is still valid
            cleanedOverrides[overrideType] = overrideData;

            // Apply the override to the context
            if (contextWithOverrides.characteristics) {
              contextWithOverrides.characteristics[overrideType] = overrideData.value;
              hasChanges = true;
            }
          }
        }

        // Save cleaned overrides back to storage
        window.localStorage.setItem(tempOverridesKey, JSON.stringify(cleanedOverrides));

        if (hasChanges) {
          contextWithOverrides = {
            ...contextWithOverrides,
            hasTemporaryOverrides: true,
            temporaryOverridesApplied: Object.keys(cleanedOverrides)
          };
        }
      } catch (error) {
        console.warn('Could not apply temporary cultural overrides from storage:', error);
      }
    }

    return {
      detectedCultures: [enhancedDetection.primaryCulture],
      culturalElements: enhancedDetection.detectedCultures,
      primaryCulture: enhancedDetection.primaryCulture,
      needsCulturalAwareness: true,
      confidence: enhancedDetection.confidence,
      characteristics: contextWithOverrides.characteristics,
      disclaimer: enhancedDetection.disclaimer,
      warning: enhancedDetection.warning,
      biasRiskLevel: enhancedDetection.biasRiskLevel,
      biasAlert: enhancedDetection.biasAlert,
      ...(contextWithOverrides.hasTemporaryOverrides && {
        hasTemporaryOverrides: true,
        temporaryOverridesApplied: contextWithOverrides.temporaryOverridesApplied
      })
    };
  }

  const lowerText = text.toLowerCase();
  const detectedCultures = [];
  const culturalElements = [];

  // Check for cultural references in the text
  for (const [_region, cultures] of Object.entries(culturalContextDatabase.greetings)) {
    for (const [cultureName, greetings] of Object.entries(cultures)) {
      if (lowerText.includes(cultureName.toLowerCase()) ||
          greetings.some(greeting => lowerText.includes(greeting.toLowerCase()))) {
        detectedCultures.push(cultureName);
      }
    }
  }

  // Check for cultural concepts
  culturalContextDatabase.taboos.forEach(taboo => {
    if (lowerText.includes(taboo.culture.toLowerCase())) {
      culturalElements.push({
        type: 'taboo',
        culture: taboo.culture,
        elements: taboo.taboos
      });
    }
  });

  // Check for business contexts
  if (lowerText.includes('meeting') || lowerText.includes('business') || lowerText.includes('work')) {
    culturalElements.push({
      type: 'business',
      context: 'professional'
    });
  }

  // Check for social contexts
  if (lowerText.includes('friend') || lowerText.includes('family') || lowerText.includes('home')) {
    culturalElements.push({
      type: 'social',
      context: 'personal'
    });
  }

  return {
    detectedCultures,
    culturalElements,
    primaryCulture: detectedCultures[0] || currentCulture,
    needsCulturalAwareness: detectedCultures.length > 0 || culturalElements.length > 0,
    confidence: enhancedDetection.confidence
  };
};

/**
 * Get prompt-ready tips for a specific culture
 * @param {string} culture - The target culture
 * @returns {string} A string containing specific behavioral tips
 */
export const getCulturalPromptTips = (culture) => {
  // Use enhanced cultural tips if available, otherwise fall back to basic ones
  const enhancedTips = getCulturalCommunicationTips(culture);
  if (enhancedTips) {
    return enhancedTips;
  }

  if (!culture || culture === 'general') return '';

  const style = getCommunicationStyleForCulture(culture);
  const etiquette = getBusinessEtiquetteForCulture(culture);
  const preferences = getCommunicationPreferencesForCulture(culture);
  const concept = getTimeConceptForCulture(culture);
  const greeting = getGreetingForCulture(culture);

  const styleData = culturalContextDatabase.communicationStyles[style];
  const tips = styleData ? styleData.tips.slice(0, 3) : []; // Top 3 tips

  let promptTips = `Cultural Context (${culture}): `;
  promptTips += `Communication Style: ${styleData?.description || style}. `;
  if (tips.length > 0) promptTips += `Key Tips: ${tips.join(', ')}. `;
  promptTips += `Formality: ${preferences.formality}. `;
  promptTips += `Time Concept: ${concept}. `;
  promptTips += `Native Greeting: ${greeting}. `;

  if (etiquette && etiquette.practices) {
    promptTips += `Business Etiquette: ${etiquette.practices.slice(0, 2).join(', ')}. `;
  }

  return promptTips;
};

/**
 * Get language learning specific prompt tips
 * @param {string} language - Target language
 * @returns {string} Prompt tips for language learning
 */
export const getLanguageLearningPromptTips = (language) => {
  const support = getLanguageLearningSupport(language);
  if (!support) return '';

  let tips = `Language Learning (${language}): `;
  if (support.commonMistakes) {
    tips += `Watch for: ${support.commonMistakes.map(m => m.mistake).join(', ')}. `;
  }
  if (support.culturalNotes) {
    tips += `Cultural Notes: ${support.culturalNotes.join(' ')} `;
  }
  return tips;
};

/**
 * Get professional meeting specific prompt tips
 * @param {string} context - Meeting context
 * @returns {string} Prompt tips for professional meetings
 */
export const getProfessionalPromptTips = (context) => {
  const support = getProfessionalMeetingSupport(context);
  if (!support) return '';

  let tips = `Meeting Context (${context}): `;
  if (support.keyPhrases) {
    tips += `Useful Phrases: ${support.keyPhrases.slice(0, 3).join(', ')}. `;
  }
  if (support.etiquette) {
    tips += `Etiquette: ${support.etiquette.join(', ')}. `;
  }
  return tips;
};

/**
 * Get appropriate communication style for a specific culture
 * @param {string} culture - The target culture
 * @returns {string} Communication style ('high-context', 'medium-context', or 'low-context')
 */
export const getCommunicationStyleForCulture = (culture) => {
  for (const [style, data] of Object.entries(culturalContextDatabase.communicationStyles)) {
    if (data.cultures.includes(culture)) {
      return style;
    }
  }
  return 'low-context'; // Default to low-context
};

/**
 * Get business etiquette for a specific culture
 * @param {string} culture - The target culture
 * @returns {object} Business etiquette information
 */
export const getBusinessEtiquetteForCulture = (culture) => {
  // Check for specific cultural matches
  if (culturalContextDatabase.communicationStyles['high-context'].cultures.includes(culture)) {
    return culturalContextDatabase.businessEtiquette['East Asian'];
  }
  if (culturalContextDatabase.communicationStyles['low-context'].cultures.includes(culture)) {
    return culturalContextDatabase.businessEtiquette['Western'];
  }
  if (culturalContextDatabase.communicationStyles['medium-context'].cultures.includes(culture)) {
    return culturalContextDatabase.businessEtiquette['European'];
  }
  if (['Arab countries', 'India'].includes(culture) ||
      culturalContextDatabase.taboos.some(taboo => taboo.culture === 'Middle Eastern' && culture.toLowerCase().includes('arab') || culture === 'India')) {
    return culturalContextDatabase.businessEtiquette['Middle Eastern'];
  }
  if (['Latin America', 'Brazil', 'Mexico', 'Argentina', 'Spanish'].some(latin => culture.toLowerCase().includes(latin.toLowerCase()))) {
    return culturalContextDatabase.businessEtiquette['Latin American'];
  }

  return culturalContextDatabase.businessEtiquette.Western; // Default
};

/**
 * Get cultural communication preferences for a specific culture
 * @param {string} culture - The target culture
 * @returns {object} Communication preferences
 */
export const getCommunicationPreferencesForCulture = (culture) => {
  const preferences = {
    formality: 'neutral',
    relationshipFocus: 'balanced',
    touchPreference: 'neutral'
  };

  const formalCultures = culturalContextDatabase.communicationPreferences.formal;
  const informalCultures = culturalContextDatabase.communicationPreferences.informal;
  const relationshipCultures = culturalContextDatabase.communicationPreferences['relationship-focused'];
  const taskCultures = culturalContextDatabase.communicationPreferences['task-focused'];
  const highTouchCultures = culturalContextDatabase.communicationPreferences['high-touch'];
  const lowTouchCultures = culturalContextDatabase.communicationPreferences['low-touch'];

  if (formalCultures.some(c => culture.toLowerCase().includes(c.toLowerCase()))) {
    preferences.formality = 'high';
  } else if (informalCultures.some(c => culture.toLowerCase().includes(c.toLowerCase()))) {
    preferences.formality = 'low';
  }

  if (relationshipCultures.some(c => culture.toLowerCase().includes(c.toLowerCase()))) {
    preferences.relationshipFocus = 'high';
  } else if (taskCultures.some(c => culture.toLowerCase().includes(c.toLowerCase()))) {
    preferences.relationshipFocus = 'low';
  }

  if (highTouchCultures.some(c => culture.toLowerCase().includes(c.toLowerCase()))) {
    preferences.touchPreference = 'high';
  } else if (lowTouchCultures.some(c => culture.toLowerCase().includes(c.toLowerCase()))) {
    preferences.touchPreference = 'low';
  }

  return preferences;
};

/**
 * Get time concept for a specific culture
 * @param {string} culture - The target culture
 * @returns {string} Time concept ('monochronic' or 'polychronic')
 */
export const getTimeConceptForCulture = (culture) => {
  const monochronicCultures = culturalContextDatabase.timeConcepts.monochronic.cultures;
  const polychronicCultures = culturalContextDatabase.timeConcepts.polychronic.cultures;

  if (monochronicCultures.some(c => culture.toLowerCase().includes(c.toLowerCase()))) {
    return 'monochronic';
  } else if (polychronicCultures.some(c => culture.toLowerCase().includes(c.toLowerCase()))) {
    return 'polychronic';
  }

  return 'monochronic'; // Default
};

/**
 * Get taboos for a specific culture
 * @param {string} culture - Target culture
 * @returns {Array} Array of cultural taboos
 */
export const getTaboosForCulture = (culture) => {
  const taboos = culturalContextDatabase.taboos.filter(taboo =>
    taboo.culture.toLowerCase().includes(culture.toLowerCase()) ||
    culture.toLowerCase().includes(taboo.culture.toLowerCase())
  );

  return taboos.length > 0 ? taboos[0].taboos : [];
};

/**
 * Get appropriate greeting for a culture
 * @param {string} culture - Target culture
 * @returns {string} Appropriate greeting
 */
export const getGreetingForCulture = (culture) => {
  for (const [_region, cultures] of Object.entries(culturalContextDatabase.greetings)) {
    if (cultures[culture]) {
      return cultures[culture][0]; // Return the native greeting
    }
  }
  return 'Hello'; // Default greeting
};

/**
 * Check if a phrase might be culturally inappropriate
 * @param {string} phrase - The phrase to check
 * @param {string} targetCulture - Target culture for context
 * @returns {object|null} Inappropriateness information or null if appropriate
 */
export const checkCulturalInappropriateness = (phrase, targetCulture) => {
  // This is a simplified check - in a real implementation, this would be more sophisticated
  const lowerPhrase = phrase.toLowerCase();

  // Common patterns that might be inappropriate in certain cultures
  const inappropriatePatterns = [
    { pattern: /you did that wrong/i, cultures: ['East Asian'], suggestion: 'Consider rephrasing to be more indirect' },
    { pattern: /stupid/i, cultures: ['most'], suggestion: 'Avoid using potentially offensive language' },
    { pattern: /whatever/i, cultures: ['formal cultures'], suggestion: 'Use more respectful language' },
    { pattern: /dude|bro/i, cultures: ['formal cultures'], suggestion: 'Use more respectful language' },
    { pattern: /hurry up|faster/i, cultures: ['high-context'], suggestion: 'Be more patient and respectful' }
  ];

  for (const pattern of inappropriatePatterns) {
    if (pattern.pattern.test(lowerPhrase) &&
        (pattern.cultures.includes('most') || pattern.cultures.includes(targetCulture))) {
      return {
        issue: 'Potentially inappropriate',
        suggestion: pattern.suggestion,
        culture: targetCulture
      };
    }
  }

  return null;
};

/**
 * Get social nuance tips based on detected triggers
 * @param {string} text - Input text to analyze
 * @returns {string} Social nuance tips
 */
export const getSocialNuanceTips = (text) => {
  const lowerText = text.toLowerCase();
  let tips = '';

  // Check empathy triggers
  culturalContextDatabase.socialNuance.empathy.forEach(item => {
    if (lowerText.includes(item.trigger)) {
      tips += `Empathy Tip: ${item.suggestion} `;
    }
  });

  // Check social anxiety triggers
  culturalContextDatabase.socialNuance.socialAnxiety.forEach(item => {
    if (lowerText.includes(item.trigger)) {
      tips += `Social Tip: ${item.suggestion} `;
    }
  });

  // Check conflict triggers
  culturalContextDatabase.socialNuance.conflict.forEach(item => {
    if (lowerText.includes(item.trigger)) {
      tips += `Conflict Tip: ${item.suggestion} `;
    }
  });

  return tips.trim();
};

/**
 * Get high-stakes tips for a specific category
 * @param {string} category - 'negotiation' or 'leadership'
 * @returns {string} High-stakes tips
 */
export const getHighStakesTips = (category) => {
  const highStakes = culturalContextDatabase.highStakes[category];
  if (!highStakes) return '';

  // Return top 3 tips for the category
  return `High-Stakes ${category.charAt(0).toUpperCase() + category.slice(1)}: ${highStakes.slice(0, 3).join(' ')}`;
};

/**
 * Get language learning support for a specific language
 * @param {string} language - Target language
 * @returns {object} Language learning support information
 */
export const getLanguageLearningSupport = (language) => {
  const languageSupport = {
    'english': {
      commonMistakes: [
        { mistake: 'Using wrong prepositions', example: 'in the weekend' },
        { mistake: 'Forgetting articles', example: 'I go store' },
        { mistake: 'Wrong verb tenses', example: 'I go yesterday' }
      ],
      culturalNotes: [
        'In American English, be direct but polite',
        'In British English, be more formal and indirect',
        'Use "please" and "thank you" frequently'
      ]
    },
    'spanish': {
      commonMistakes: [
        { mistake: 'Gender agreement', example: 'la mesa rojo' },
        { mistake: 'Ser vs. Estar', example: 'Estoy aburrido' },
        { mistake: 'Formal vs. informal', example: 'Tú vs. Usted' }
      ],
      culturalNotes: [
        'Use formal "usted" with elders or in professional settings',
        'Physical contact is more common in greetings',
        'Punctuality may be more flexible'
      ]
    },
    'chinese': {
      commonMistakes: [
        { mistake: 'Tone errors', example: 'mā vs. má' },
        { mistake: 'Missing measure words', example: 'three book' },
        { mistake: 'Literal translations', example: 'head very pain' }
      ],
      culturalNotes: [
        'Respect for hierarchy is important',
        'Face-saving is crucial',
        'Indirect communication is preferred'
      ]
    }
  };

  return languageSupport[language.toLowerCase()] || languageSupport.english;
};

/**
 * Get professional meeting support for different contexts
 * @param {string} context - Meeting context (e.g., 'business', 'academic', 'casual')
 * @returns {object} Professional meeting support information
 */
export const getProfessionalMeetingSupport = (context) => {
  const meetingSupport = {
    'business': {
      keyPhrases: [
        'Thank you for your time',
        'Let\'s circle back on this',
        'I\'ll follow up with you',
        'What are the next steps?'
      ],
      etiquette: [
        'Arrive on time',
        'Come prepared with agenda',
        'Listen actively',
        'Take notes if appropriate'
      ]
    },
    'academic': {
      keyPhrases: [
        'Could you elaborate on that?',
        'I have a different perspective',
        'What are the implications?',
        'How does this connect to...?'
      ],
      etiquette: [
        'Respect for expertise',
        'Constructive criticism',
        'Evidence-based arguments',
        'Open-mindedness'
      ]
    },
    'casual': {
      keyPhrases: [
        'That\'s interesting',
        'Tell me more about that',
        'I see your point',
        'What do you think?'
      ],
      etiquette: [
        'Be genuine',
        'Show interest in others',
        'Share appropriately',
        'Respect personal boundaries'
      ]
    }
  };

  return meetingSupport[context] || meetingSupport.business;
};

/**
 * Generates culturally appropriate response suggestions based on detected context
 * @param {string} inputText - Original input text
 * @param {string} culturalContext - Detected cultural context
 * @returns {Array} Culturally appropriate response suggestions
 */
export const generateCulturalResponseSuggestions = (inputText, culturalContext) => {
  return generateCulturallyAppropriateResponses(inputText, culturalContext);
};

/**
 * Analyzes text for cultural appropriateness
 * @param {string} text - Text to analyze
 * @param {string} targetCulture - Target culture for appropriateness
 * @returns {Object} Appropriateness analysis
 */
export const analyzeTextCulturalAppropriateness = (text, targetCulture) => {
  return analyzeCulturalAppropriateness(text, targetCulture);
};

/**
 * Detects multilingual elements in text
 * @param {string} text - Input text to analyze
 * @returns {Array} Array of detected languages with confidence
 */
export const detectMultilingualElementsInText = (text) => {
  return detectMultilingualElements(text);
};