/**
 * Enhanced Cultural Context Detection for ConvoCue
 * Improves cross-cultural communication capabilities
 *
 * IMPORTANT DISCLAIMER: This module uses generalizations about cultural groups that may not apply to individuals.
 * Cultural identity is complex, diverse, and personal. These patterns are meant as starting points for understanding,
 * not definitive characterizations of individuals. Always respect individual preferences over cultural assumptions.
 */

import { mergeCulturalContext, provideCulturalFeedback, isCulturalOptOut } from './userCulturalProfile.js';
import { getCulturalConfidenceThreshold } from '../config/conservativeDefaults.js';

// Cultural communication patterns by region - NOTE: These are generalizations for initial detection only
// IMPORTANT: These patterns should not be treated as definitive for any individual
const CULTURAL_PATTERNS = {
  'east-asian': {
    keywords: ['respect', 'hierarchy', 'face-saving', 'harmony', 'indirect', 'politeness', 'formality'],
    characteristics: {
      communication_style: 'high-context',
      formality_level: 'high',
      directness: 'low',
      emotional_expression: 'moderate',
      conflict_avoidance: 'high'
    },
    dimensions: {
      power_distance: 'high',        // Acceptance of hierarchical order
      individualism: 'low',          // Collective orientation
      masculinity: 'moderate',       // Balance between competition and care
      uncertainty_avoidance: 'moderate', // Tolerance for ambiguity
      long_term_orientation: 'high', // Focus on long-term results
      indulgence: 'low'              // Restraint vs gratification
    },
    phrases: {
      formal_greetings: ['it\'s an honor', 'respectfully', 'with respect', 'honored to'],
      indirect_expressions: ['perhaps', 'possibly', 'it might be', 'one could consider'],
      face_saving: ['let me think', 'we should consider', 'another option might be']
    }
  },
  'south-asian': {
    keywords: ['respect', 'elders', 'hierarchy', 'community', 'relationship', 'traditional', 'formal'],
    characteristics: {
      communication_style: 'high-context',
      formality_level: 'high',
      directness: 'low',
      emotional_expression: 'moderate',
      conflict_avoidance: 'moderate'
    },
    dimensions: {
      power_distance: 'high',
      individualism: 'low',
      masculinity: 'moderate',
      uncertainty_avoidance: 'high',
      long_term_orientation: 'moderate',
      indulgence: 'moderate'
    },
    phrases: {
      formal_greetings: ['namaste', 'respect', 'regards', 'with regards'],
      relationship_focused: ['family', 'community', 'together', 'bond'],
      hierarchical: ['sir', 'ma\'am', 'elder', 'respected']
    }
  },
  'latin-american': {
    keywords: ['relationship', 'personal', 'warmth', 'connection', 'family', 'community', 'expressive'],
    characteristics: {
      communication_style: 'high-context',
      formality_level: 'moderate',
      directness: 'moderate',
      emotional_expression: 'high',
      conflict_avoidance: 'moderate'
    },
    dimensions: {
      power_distance: 'high',
      individualism: 'low',
      masculinity: 'high',
      uncertainty_avoidance: 'high',
      long_term_orientation: 'low',
      indulgence: 'high'
    },
    phrases: {
      personal_greetings: ['how are your family', 'how\'s home', 'hope all is well'],
      relationship_focused: ['personal', 'relationship', 'together', 'bond'],
      expressive: ['feel', 'emotion', 'passion', 'energy']
    }
  },
  'middle-eastern': {
    keywords: ['hospitality', 'respect', 'honor', 'tradition', 'family', 'community', 'formal'],
    characteristics: {
      communication_style: 'high-context',
      formality_level: 'high',
      directness: 'moderate',
      emotional_expression: 'moderate',
      conflict_avoidance: 'high'
    },
    dimensions: {
      power_distance: 'high',
      individualism: 'low',
      masculinity: 'high',
      uncertainty_avoidance: 'high',
      long_term_orientation: 'moderate',
      indulgence: 'moderate'
    },
    phrases: {
      formal_greetings: ['peace be upon you', 'blessings', 'honor', 'grace'],
      hospitality: ['guest', 'welcome', 'honor', 'blessing'],
      respect_oriented: ['respect', 'honor', 'esteem', 'dignity']
    }
  },
  'western-european': {
    keywords: ['direct', 'efficient', 'professional', 'clear', 'precise', 'structured', 'formal'],
    characteristics: {
      communication_style: 'low-context',
      formality_level: 'moderate',
      directness: 'high',
      emotional_expression: 'moderate',
      conflict_avoidance: 'low'
    },
    dimensions: {
      power_distance: 'low',
      individualism: 'high',
      masculinity: 'moderate',
      uncertainty_avoidance: 'moderate',
      long_term_orientation: 'moderate',
      indulgence: 'moderate'
    },
    phrases: {
      direct_communication: ['clearly', 'directly', 'straightforward', 'to the point'],
      efficiency_focused: ['efficient', 'effective', 'productive', 'results-oriented'],
      professional: ['professional', 'colleague', 'workplace', 'business']
    }
  },
  'north-american': {
    keywords: ['direct', 'individual', 'assertive', 'friendly', 'informal', 'practical', 'efficient'],
    characteristics: {
      communication_style: 'low-context',
      formality_level: 'low',
      directness: 'high',
      emotional_expression: 'high',
      conflict_avoidance: 'low'
    },
    dimensions: {
      power_distance: 'low',
      individualism: 'high',
      masculinity: 'moderate',
      uncertainty_avoidance: 'low',
      long_term_orientation: 'moderate',
      indulgence: 'high'
    },
    phrases: {
      friendly_formal: ['hi there', 'hey', 'good to see you', 'how\'s it going'],
      individual_focused: ['personally', 'individual', 'person', 'my view'],
      assertive: ['I think', 'in my opinion', 'from my perspective', 'personally']
    }
  },
  'african': {
    keywords: ['community', 'respect', 'oral', 'relationship', 'collective', 'traditional', 'warm'],
    characteristics: {
      communication_style: 'high-context',
      formality_level: 'moderate',
      directness: 'moderate',
      emotional_expression: 'high',
      conflict_avoidance: 'moderate'
    },
    dimensions: {
      power_distance: 'moderate-high',
      individualism: 'low-moderate',
      masculinity: 'moderate',
      uncertainty_avoidance: 'moderate',
      long_term_orientation: 'low-moderate',
      indulgence: 'moderate-high'
    },
    phrases: {
      community_focused: ['community', 'together', 'us', 'our people'],
      respect_oriented: ['elder', 'respect', 'wisdom', 'tradition'],
      oral_tradition: ['story', 'tell', 'share', 'experience']
    }
  },
  // Additional cultural dimensions for more nuanced understanding
  'professional': {
    keywords: ['workplace', 'corporate', 'business', 'colleague', 'team', 'collaboration', 'efficiency'],
    characteristics: {
      communication_style: 'context-dependent',
      formality_level: 'moderate-high',
      directness: 'moderate',
      emotional_expression: 'controlled',
      conflict_avoidance: 'moderate'
    },
    dimensions: {
      power_distance: 'context-dependent',
      individualism: 'context-dependent',
      masculinity: 'context-dependent',
      uncertainty_avoidance: 'moderate-high',
      long_term_orientation: 'high',
      indulgence: 'low-moderate'
    },
    phrases: {
      corporate: ['per my email', 'let\'s circle back', 'touch base', 'synergy', 'bandwidth'],
      collaborative: ['team effort', 'brainstorm', 'align on', 'let\'s collaborate'],
      formal: ['respectfully', 'regarding', 'further to', 'pursuant to']
    }
  },
  'religious': {
    keywords: ['faith', 'spiritual', 'worship', 'belief', 'doctrine', 'worship', 'devotion', 'sacred'],
    characteristics: {
      communication_style: 'respectful',
      formality_level: 'high',
      directness: 'varies',
      emotional_expression: 'meaningful',
      conflict_avoidance: 'high'
    },
    dimensions: {
      power_distance: 'high',
      individualism: 'varies',
      masculinity: 'varies',
      uncertainty_avoidance: 'high',
      long_term_orientation: 'high',
      indulgence: 'varies'
    },
    phrases: {
      reverent: ['blessed', 'grace', 'divine', 'holy', 'sacred'],
      peaceful: ['peace', 'harmony', 'compassion', 'mercy', 'forgiveness']
    }
  },
  'generational': {
    keywords: ['traditional', 'modern', 'contemporary', 'classic', 'innovative', 'change', 'progress'],
    characteristics: {
      communication_style: 'varies',
      formality_level: 'varies',
      directness: 'varies',
      emotional_expression: 'varies',
      conflict_avoidance: 'varies'
    },
    dimensions: {
      power_distance: 'varies',
      individualism: 'varies',
      masculinity: 'varies',
      uncertainty_avoidance: 'varies',
      long_term_orientation: 'varies',
      indulgence: 'varies'
    },
    phrases: {
      traditional: ['the old ways', 'as we\'ve always done', 'traditional values'],
      modern: ['cutting-edge', 'disruptive', 'innovative', 'next-gen', 'digital native']
    }
  }
};

// Multilingual greeting detection
const MULTILINGUAL_GREETINGS = {
  'en': ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'],
  'es': ['hola', 'buenos días', 'buenas tardes', 'buenas noches', 'oye'],
  'fr': ['bonjour', 'salut', 'bonsoir', 'coucou', 'allô'],
  'de': ['hallo', 'guten tag', 'guten morgen', 'guten abend', 'servus'],
  'it': ['ciao', 'buongiorno', 'buonasera', 'salve', 'ehi'],
  'pt': ['olá', 'oi', 'bom dia', 'boa tarde', 'boa noite'],
  'ru': ['привет', 'здравствуйте', 'добрый день', 'приветик'],
  'zh': ['你好', '您好', '早上好', '下午好', '晚上好'],
  'ja': ['こんにちは', 'おはよう', 'こんばんは', 'もしもし'],
  'ko': ['안녕하세요', '안녕', '좋은 아침', '저녁 잘'],
  'ar': ['مرحبا', 'السلام عليكم', 'أهلا', 'هلا'],
  'hi': ['नमस्ते', 'हैलो', 'सुप्रभात', 'शुभ अपराह्न']
};

// Multilingual politeness markers
const MULTILINGUAL_POLITENESS = {
  'en': ['please', 'thank you', 'sorry', 'excuse me', 'pardon', 'if you don\'t mind'],
  'es': ['por favor', 'gracias', 'lo siento', 'disculpe', 'perdón'],
  'fr': ['s\'il vous plaît', 'merci', 'désolé', 'excusez-moi', 'pardon'],
  'de': ['bitte', 'danke', 'entschuldigung', 'verzeihung', 'wenn Sie möchten'],
  'it': ['per favore', 'grazie', 'scusi', 'mi scusi', 'permetta'],
  'pt': ['por favor', 'obrigado', 'desculpe', 'com licença', 'se você quiser'],
  'zh': ['请', '谢谢', '对不起', '抱歉', '劳驾'],
  'ja': ['ください', 'ありがとう', 'すみません', '失礼します', '恐れ入ります']
};

/**
 * Detects cultural context from input text
 * @param {string} text - Input text to analyze
 * @param {string} currentContext - Current cultural context
 * @returns {Object} Detected cultural context with confidence scores
 */
export const detectEnhancedCulturalContext = (text, currentContext = 'general') => {
  if (!text || typeof text !== 'string') {
    return { primaryCulture: currentContext, confidence: 0, detectedCultures: [] };
  }

  const lowerText = text.toLowerCase();
  const detectedCultures = [];

  // Check for each cultural pattern
  for (const [cultureKey, cultureData] of Object.entries(CULTURAL_PATTERNS)) {
    let score = 0;

    // Score based on keywords
    for (const keyword of cultureData.keywords) {
      if (lowerText.includes(keyword)) {
        score += 2;
      }
    }

    // Score based on phrases
    for (const [phraseType, phrases] of Object.entries(cultureData.phrases)) {
      for (const phrase of phrases) {
        if (lowerText.includes(phrase.toLowerCase())) {
          score += 3;
        }
      }
    }

    if (score > 0) {
      // Calculate confidence with consideration for cultural overlap
      let confidence = Math.min(1.0, score / 10); // Normalize to 0-1 range

      // Reduce confidence if this is a broad/general category that might overlap with others
      if (['professional', 'religious', 'generational'].includes(cultureKey)) {
        confidence *= 0.8; // Lower confidence for overlapping categories
      }

      detectedCultures.push({
        culture: cultureKey,
        score,
        confidence,
        confidenceRange: [Math.max(0, confidence - 0.15), Math.min(1, confidence + 0.15)], // Add confidence range
        dimensions: cultureData.dimensions || {},
        characteristics: cultureData.characteristics || {}
      });
    }
  }

  // Sort by score and get the top cultures
  detectedCultures.sort((a, b) => b.score - a.score);

  // Consider multiple cultural influences if scores are close
  const primaryCulture = detectedCultures.length > 0 ? detectedCultures[0].culture : currentContext;
  const confidence = detectedCultures.length > 0 ? detectedCultures[0].confidence : 0;

  // Check for secondary cultural influences (within 20% of primary score)
  const secondaryCultures = detectedCultures.filter((culture, index) =>
    index > 0 && culture.score >= detectedCultures[0].score * 0.8
  );

  // Create the base detection result
  const baseResult = {
    primaryCulture,
    confidence,
    confidenceRange: detectedCultures.length > 0 ? detectedCultures[0].confidenceRange : [0, 0],
    detectedCultures,
    secondaryCultures,
    characteristics: CULTURAL_PATTERNS[primaryCulture]?.characteristics || null,
    dimensions: CULTURAL_PATTERNS[primaryCulture]?.dimensions || null,
    isMixedCulturalInfluence: secondaryCultures.length > 0,
    isGeneralGuidance: true, // Flag indicating this is general guidance, not personalized
    isHighAmbiguity: confidence < 0.3, // Flag for low-confidence detections
    isLowConfidence: confidence < 0.4, // Flag for low confidence suggestions
    biasRiskLevel: confidence > 0.7 ? 'medium' : 'high', // Higher confidence in generalizations poses higher bias risk
    disclaimer: "This is general cultural guidance based on detected patterns. Individual preferences may vary significantly. These are probabilistic suggestions, not definitive characterizations.",
    warning: "Cultural patterns are broad generalizations. Always verify with the individual's actual preferences. Individual identity is complex and may not align with regional stereotypes.",
    biasAlert: confidence > 0.8 ? "High confidence detected. Be cautious of over-relying on cultural generalizations." : null,
    culturalComplexityNote: secondaryCultures.length > 0 ?
      `Multiple cultural influences detected: ${[primaryCulture, ...secondaryCultures.map(c => c.culture)].join(', ')}. Individual identity may reflect multiple cultural backgrounds.` : null,
    individualVariationNote: "Remember that cultural patterns represent group tendencies, not individual traits. Personal preferences should take precedence over cultural assumptions.",
    userOverrideRecommendation: "Consider customizing your cultural preferences in settings to receive more personalized guidance.",
    shouldApplyCulturalGuidance: confidence > getCulturalConfidenceThreshold() && !isCulturalOptOut() // Only apply cultural guidance if confidence is sufficient and user hasn't opted out
  };

  // Merge with user profile if available
  const mergedResult = mergeCulturalContext(baseResult);

  // Log the cultural suggestion for bias monitoring
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const monitoringKey = 'convoCue_biasMonitoring';
      const monitoringData = JSON.parse(window.localStorage.getItem(monitoringKey) || '{}');

      // Update statistics
      monitoringData.totalCulturalSuggestions = (monitoringData.totalCulturalSuggestions || 0) + 1;

      // Track cultural pattern usage
      const culture = mergedResult.primaryCulture || 'unknown';
      monitoringData.culturalPatternUsage = monitoringData.culturalPatternUsage || {};
      monitoringData.culturalPatternUsage[culture] = (monitoringData.culturalPatternUsage[culture] || 0) + 1;

      monitoringData.lastUpdated = Date.now();

      window.localStorage.setItem(monitoringKey, JSON.stringify(monitoringData));
    } catch (error) {
      console.warn('Could not log cultural suggestion to bias monitoring:', error);
    }
  }

  return mergedResult;
};

/**
 * Detects multilingual elements in text
 * @param {string} text - Input text to analyze
 * @returns {Array} Array of detected languages with confidence
 */
export const detectMultilingualElements = (text) => {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const detectedLanguages = [];
  const textLower = text.toLowerCase();

  for (const [langCode, greetings] of Object.entries(MULTILINGUAL_GREETINGS)) {
    let greetingCount = 0;
    for (const greeting of greetings) {
      if (textLower.includes(greeting.toLowerCase())) {
        greetingCount++;
      }
    }
    
    if (greetingCount > 0) {
      detectedLanguages.push({
        language: langCode,
        type: 'greeting',
        count: greetingCount,
        confidence: Math.min(1.0, greetingCount * 0.3)
      });
    }
  }

  // Also check for politeness markers
  for (const [langCode, politeness] of Object.entries(MULTILINGUAL_POLITENESS)) {
    let politenessCount = 0;
    for (const polite of politeness) {
      if (textLower.includes(politeeness.toLowerCase())) {
        politenessCount++;
      }
    }
    
    if (politenessCount > 0) {
      detectedLanguages.push({
        language: langCode,
        type: 'politeness',
        count: politenessCount,
        confidence: Math.min(1.0, politenessCount * 0.2)
      });
    }
  }

  return detectedLanguages;
};

/**
 * Generates culturally appropriate response suggestions
 * @param {string} inputText - Original input text
 * @param {string} targetCulture - Target cultural context
 * @returns {Array} Culturally appropriate response suggestions
 */
export const generateCulturallyAppropriateResponses = (inputText, targetCulture) => {
  if (!inputText || !targetCulture || targetCulture === 'general') {
    return [];
  }

  const cultureData = CULTURAL_PATTERNS[targetCulture];
  if (!cultureData) {
    return [];
  }

  const responses = [];
  const inputLower = inputText.toLowerCase();

  // Add disclaimer about generalizations
  responses.push('Note: These are general cultural guidelines. Individual preferences may differ significantly.');

  // Generate responses based on cultural characteristics
  if (cultureData.characteristics.formality_level === 'high') {
    responses.push('Address with appropriate titles and formal language (general guidance)');
    if (inputLower.includes('hello') || inputLower.includes('hi')) {
      responses.push('Use formal greeting structures (general guidance)');
    }
  }

  if (cultureData.characteristics.directness === 'low') {
    responses.push('Use indirect language and soften statements (general guidance)');
    responses.push('Suggest alternatives rather than direct refusals (general guidance)');
  }

  if (cultureData.characteristics.conflict_avoidance === 'high') {
    responses.push('Avoid confrontational language (general guidance)');
    responses.push('Use diplomatic and harmonious phrasing (general guidance)');
  }

  if (cultureData.characteristics.emotional_expression === 'high') {
    responses.push('Acknowledge emotions and relationships (general guidance)');
    responses.push('Use warmer, more expressive language (general guidance)');
  }

  // Add specific phrase suggestions
  if (cultureData.phrases.indirect_expressions && cultureData.characteristics.directness === 'low') {
    responses.push(`Consider using indirect expressions like: "${cultureData.phrases.indirect_expressions.slice(0, 2).join('", "')}" (general guidance)`);
  }

  // Add reminder to verify with individual
  responses.push('Always confirm communication preferences directly with the individual when possible.');

  return responses;
};

/**
 * Gets cultural communication tips for a specific culture
 * @param {string} culture - Culture identifier
 * @returns {string} Cultural communication tips
 */
export const getCulturalCommunicationTips = (culture) => {
  if (!culture || culture === 'general') {
    return '';
  }

  const cultureData = CULTURAL_PATTERNS[culture];
  if (!cultureData) {
    return '';
  }

  let tips = `Cultural Context: ${culture.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}. `;
  
  if (cultureData.characteristics.communication_style === 'high-context') {
    tips += 'Use implicit communication and read between the lines. ';
  } else {
    tips += 'Be explicit and direct in your communication. ';
  }
  
  if (cultureData.characteristics.formality_level === 'high') {
    tips += 'Maintain formal language and proper titles. ';
  } else if (cultureData.characteristics.formality_level === 'low') {
    tips += 'Casual language is acceptable. ';
  }
  
  if (cultureData.characteristics.directness === 'low') {
    tips += 'Use indirect language and avoid blunt statements. ';
  }
  
  if (cultureData.characteristics.conflict_avoidance === 'high') {
    tips += 'Avoid confrontation and preserve harmony. ';
  }

  return tips;
};

/**
 * Analyzes text for cultural appropriateness
 * @param {string} text - Text to analyze
 * @param {string} targetCulture - Target culture for appropriateness
 * @returns {Object} Appropriateness analysis
 */
export const analyzeCulturalAppropriateness = (text, targetCulture) => {
  if (!text || !targetCulture || targetCulture === 'general') {
    return {
      isAppropriate: true,
      suggestions: [],
      confidence: 0.5,
      disclaimer: "This analysis is based on general cultural patterns. Individual preferences may vary significantly."
    };
  }

  const cultureData = CULTURAL_PATTERNS[targetCulture];
  if (!cultureData) {
    return {
      isAppropriate: true,
      suggestions: [],
      confidence: 0.5,
      disclaimer: "This analysis is based on general cultural patterns. Individual preferences may vary significantly."
    };
  }

  const issues = [];
  const suggestions = [];
  const textLower = text.toLowerCase();

  // Add disclaimer about generalizations
  suggestions.push('Note: This analysis is based on general cultural patterns. Individual preferences may differ significantly.');

  // Check for cultural mismatches
  if (cultureData.characteristics.formality_level === 'high' &&
      (textLower.includes('hey') || textLower.includes('dude') || textLower.includes('man'))) {
    issues.push('Informal language detected (based on general pattern)');
    suggestions.push('Consider more formal address terms (general guidance)');
  }

  if (cultureData.characteristics.directness === 'low' &&
      text.match(/\byou should\b|\byou must\b|\byou need to\b/i)) {
    issues.push('Direct imperative language detected (based on general pattern)');
    suggestions.push('Consider softer language like "perhaps" or "you might consider" (general guidance)');
  }

  if (cultureData.characteristics.conflict_avoidance === 'high' &&
      text.match(/\bbut\b|\bhowever\b|\bnevertheless\b/i)) {
    issues.push('Potentially confrontational transition words detected (based on general pattern)');
    suggestions.push('Consider more harmonious transitions (general guidance)');
  }

  const isAppropriate = issues.length === 0;
  const confidence = isAppropriate ? 0.7 : Math.max(0.1, 0.7 - (issues.length * 0.2)); // Lower confidence due to generalizations

  return {
    isAppropriate,
    issues,
    suggestions,
    confidence,
    confidenceRange: [Math.max(0, confidence - 0.2), Math.min(1, confidence + 0.2)], // Add confidence range
    issuesCount: issues.length,
    suggestionsCount: suggestions.length,
    biasRiskLevel: issues.length > 0 ? 'medium' : 'low',
    disclaimer: "This analysis is based on general cultural patterns. Always verify with the individual's actual preferences.",
    biasAlert: issues.length > 2 ? "Multiple cultural mismatches detected. Consider that individual preferences may differ significantly from cultural generalizations." : null
  };
};