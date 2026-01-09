/**
 * Enhanced Cultural Context Detection for ConvoCue
 * Improves cross-cultural communication capabilities
 */

// Cultural communication patterns by region
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
    phrases: {
      community_focused: ['community', 'together', 'us', 'our people'],
      respect_oriented: ['elder', 'respect', 'wisdom', 'tradition'],
      oral_tradition: ['story', 'tell', 'share', 'experience']
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
      detectedCultures.push({
        culture: cultureKey,
        score,
        confidence: Math.min(1.0, score / 10) // Normalize to 0-1 range
      });
    }
  }

  // Sort by score and get the top culture
  detectedCultures.sort((a, b) => b.score - a.score);
  
  const primaryCulture = detectedCultures.length > 0 ? detectedCultures[0].culture : currentContext;
  const confidence = detectedCultures.length > 0 ? detectedCultures[0].confidence : 0;

  return {
    primaryCulture,
    confidence,
    detectedCultures,
    characteristics: CULTURAL_PATTERNS[primaryCulture]?.characteristics || null
  };
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

  // Generate responses based on cultural characteristics
  if (cultureData.characteristics.formality_level === 'high') {
    responses.push('Address with appropriate titles and formal language');
    if (inputLower.includes('hello') || inputLower.includes('hi')) {
      responses.push('Use formal greeting structures');
    }
  }

  if (cultureData.characteristics.directness === 'low') {
    responses.push('Use indirect language and soften statements');
    responses.push('Suggest alternatives rather than direct refusals');
  }

  if (cultureData.characteristics.conflict_avoidance === 'high') {
    responses.push('Avoid confrontational language');
    responses.push('Use diplomatic and harmonious phrasing');
  }

  if (cultureData.characteristics.emotional_expression === 'high') {
    responses.push('Acknowledge emotions and relationships');
    responses.push('Use warmer, more expressive language');
  }

  // Add specific phrase suggestions
  if (cultureData.phrases.indirect_expressions && cultureData.characteristics.directness === 'low') {
    responses.push(`Consider using indirect expressions like: "${cultureData.phrases.indirect_expressions.slice(0, 2).join('", "')}"`);
  }

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
    return { isAppropriate: true, suggestions: [], confidence: 0.5 };
  }

  const cultureData = CULTURAL_PATTERNS[targetCulture];
  if (!cultureData) {
    return { isAppropriate: true, suggestions: [], confidence: 0.5 };
  }

  const issues = [];
  const suggestions = [];
  const textLower = text.toLowerCase();

  // Check for cultural mismatches
  if (cultureData.characteristics.formality_level === 'high' && 
      (textLower.includes('hey') || textLower.includes('dude') || textLower.includes('man'))) {
    issues.push('Informal language may be inappropriate');
    suggestions.push('Use more formal address terms');
  }

  if (cultureData.characteristics.directness === 'low' && 
      text.match(/\byou should\b|\byou must\b|\byou need to\b/i)) {
    issues.push('Direct imperative language detected');
    suggestions.push('Rephrase using softer language like "perhaps" or "you might consider"');
  }

  if (cultureData.characteristics.conflict_avoidance === 'high' && 
      text.match(/\bbut\b|\bhowever\b|\bnevertheless\b/i)) {
    issues.push('Potentially confrontational transition words detected');
    suggestions.push('Use more harmonious transitions');
  }

  const isAppropriate = issues.length === 0;
  const confidence = isAppropriate ? 0.9 : Math.max(0.1, 1.0 - (issues.length * 0.2));

  return {
    isAppropriate,
    issues,
    suggestions,
    confidence
  };
};