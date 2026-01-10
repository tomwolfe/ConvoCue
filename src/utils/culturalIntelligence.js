/**
 * Advanced Cultural Intelligence System
 * Provides sophisticated cross-cultural communication guidance
 *
 * This system enhances the basic cultural context detection with:
 * - Multi-dimensional cultural analysis
 * - Context-aware communication style adaptation
 * - Relationship dynamic consideration
 * - Situational context awareness
 */

import { detectMultipleIntents } from './intentRecognition';
import { AppConfig } from '../config';
import { 
  submitCulturalFeedback, 
  shouldFlagRecommendation, 
  getUserCulturalBiasAdjustments 
} from './culturalFeedback';

// Cultural dimensions based on Hofstede's model and other cultural frameworks
const CULTURAL_DIMENSIONS = {
  powerDistance: {
    high: ['east-asian', 'south-asian', 'latin-american', 'middle-eastern', 'african'],
    low: ['nordic', 'germanic', 'anglo', 'anglo-canada']
  },
  individualism: {
    individualistic: ['anglo', 'germanic', 'nordic', 'anglo-canada'],
    collectivistic: ['east-asian', 'south-asian', 'latin-american', 'african', 'middle-eastern']
  },
  uncertaintyAvoidance: {
    high: ['japan', 'germanic', 'latin-american', 'middle-eastern'], // Japan is a country-specific key now
    low: ['nordic', 'anglo', 'anglo-canada']
  },
  masculinity: {
    masculine: ['japan', 'germanic', 'anglo', 'latin-american'],
    feminine: ['nordic', 'anglo-canada']
  },
  longTermOrientation: {
    longTerm: ['east-asian', 'japan', 'south-korea', 'china'],
    shortTerm: ['african', 'latin-american', 'anglo']
  },
  indulgence: {
    indulgent: ['latin-american', 'african', 'anglo', 'nordic'],
    restrained: ['east-asian', 'middle-eastern', 'germanic']
  }
};

// Communication style mappings by culture
// These serve as regional templates that can be overridden by country-specific data
const REGIONAL_STYLES = {
  'east-asian': {
    directness: 'indirect',
    formality: 'high',
    context: 'high-context',
    faceSaving: true,
    hierarchyAware: true,
    conflictApproach: 'avoidance',
    decisionMaking: 'consensus',
    feedbackStyle: 'implicit',
    greetingStyle: 'respectful'
  },
  'south-asian': {
    directness: 'indirect',
    formality: 'high',
    context: 'high-context',
    faceSaving: true,
    hierarchyAware: true,
    conflictApproach: 'mediation',
    decisionMaking: 'authority',
    feedbackStyle: 'diplomatic',
    greetingStyle: 'respectful'
  },
  'latin-american': {
    directness: 'moderate',
    formality: 'moderate',
    context: 'high-context',
    faceSaving: true,
    hierarchyAware: true,
    conflictApproach: 'personal',
    decisionMaking: 'relationship-based',
    feedbackStyle: 'diplomatic',
    greetingStyle: 'warm'
  },
  'middle-eastern': {
    directness: 'indirect',
    formality: 'high',
    context: 'high-context',
    faceSaving: true,
    hierarchyAware: true,
    conflictApproach: 'avoidance',
    decisionMaking: 'authority',
    feedbackStyle: 'diplomatic',
    greetingStyle: 'respectful'
  },
  'nordic': {
    directness: 'direct',
    formality: 'low',
    context: 'low-context',
    faceSaving: false,
    hierarchyAware: false,
    conflictApproach: 'open',
    decisionMaking: 'consensus',
    feedbackStyle: 'direct',
    greetingStyle: 'casual'
  },
  'germanic': {
    directness: 'direct',
    formality: 'moderate',
    context: 'low-context',
    faceSaving: false,
    hierarchyAware: false,
    conflictApproach: 'structured',
    decisionMaking: 'logical',
    feedbackStyle: 'constructive',
    greetingStyle: 'formal'
  },
  'anglo': {
    directness: 'moderate',
    formality: 'low-moderate',
    context: 'low-context',
    faceSaving: false,
    hierarchyAware: false,
    conflictApproach: 'direct',
    decisionMaking: 'individual',
    feedbackStyle: 'constructive',
    greetingStyle: 'casual'
  },
  'anglo-canada': {
    directness: 'moderate',
    formality: 'low',
    context: 'low-context',
    faceSaving: false,
    hierarchyAware: false,
    conflictApproach: 'diplomatic',
    decisionMaking: 'individual',
    feedbackStyle: 'constructive',
    greetingStyle: 'friendly'
  },
  'african': {
    directness: 'moderate',
    formality: 'moderate-high',
    context: 'high-context',
    faceSaving: true,
    hierarchyAware: true,
    conflictApproach: 'community',
    decisionMaking: 'collective',
    feedbackStyle: 'diplomatic',
    greetingStyle: 'warm'
  },
  'general': {
    directness: 'moderate',
    formality: 'moderate',
    context: 'neutral',
    faceSaving: false,
    hierarchyAware: false,
    conflictApproach: 'balanced',
    decisionMaking: 'collaborative',
    feedbackStyle: 'constructive',
    greetingStyle: 'neutral'
  }
};

// Mapping of countries to their respective regional styles and specific overrides
const COUNTRY_DATA = {
  'china': { region: 'east-asian' },
  'japan': { region: 'east-asian', directness: 'very-indirect', conflictApproach: 'extreme-avoidance' },
  'south-korea': { region: 'east-asian', hierarchyAware: 'extremely-high' },
  'india': { region: 'south-asian' },
  'germany': { region: 'germanic', directness: 'very-direct' },
  'usa': { region: 'anglo', directness: 'direct' },
  'uk': { region: 'anglo', directness: 'moderate-indirect' },
  'canada': { region: 'anglo-canada' },
  'australia': { region: 'anglo', greetingStyle: 'casual-warm' },
  'france': { region: 'germanic', formality: 'high', context: 'high-context' }, // Simplified
  'sweden': { region: 'nordic' },
  'norway': { region: 'nordic' },
  'denmark': { region: 'nordic' },
  'nigeria': { region: 'african', formality: 'high' },
  'kenya': { region: 'african' },
  'ghana': { region: 'african', greetingStyle: 'warm' },
  'ethiopia': { region: 'african', formality: 'high' },
  'south-africa': { region: 'african', directness: 'moderate-direct' },
  'brazil': { region: 'latin-american', greetingStyle: 'very-warm' },
  'mexico': { region: 'latin-american' },
  'argentina': { region: 'latin-american' },
  'egypt': { region: 'middle-eastern' },
  'saudi-arabia': { region: 'middle-eastern', formality: 'very-high' },
  'uae': { region: 'middle-eastern', formality: 'high' },
  'israel': { region: 'middle-eastern', directness: 'direct', context: 'low-context' },
  'philippines': { region: 'east-asian', directness: 'indirect', context: 'high-context', greetingStyle: 'very-warm' },
  'thailand': { region: 'east-asian', directness: 'very-indirect', faceSaving: true }
};

// Maintain COMMUNICATION_STYLES for backward compatibility but populate it dynamically
const COMMUNICATION_STYLES = { ...REGIONAL_STYLES };
Object.entries(COUNTRY_DATA).forEach(([country, data]) => {
  COMMUNICATION_STYLES[country] = {
    ...REGIONAL_STYLES[data.region],
    ...data,
    isCountrySpecific: true
  };
});

// Cultural sensitivity phrases and expressions
const CULTURAL_SENSITIVITY_PHRASES = {
  'east-asian': {
    honorifics: ['please', 'excuse me', 'if you don\'t mind', 'perhaps', 'might consider'],
    faceSaving: ['saving face', 'dignity', 'respect', 'honoring', 'esteem'],
    formalTerms: ['Mr.', 'Ms.', 'Dr.', 'Sir', 'Madam', 'Professor'],
    indirectPhrases: ['maybe', 'possibly', 'it seems', 'appears', 'could be']
  },
  'south-asian': {
    honorifics: ['ji', 'sir', 'ma\'am', 'please', 'excuse me'],
    faceSaving: ['respect', 'honor', 'dignity', 'esteem'],
    formalTerms: ['Shri', 'Smt.', 'Dr.', 'Professor', 'Uncle', 'Aunty'],
    indirectPhrases: ['maybe', 'perhaps', 'if possible', 'when convenient']
  },
  'latin-american': {
    honorifics: ['por favor', 'disculpe', 'usted', 'señor', 'señora'],
    faceSaving: ['respeto', 'honor', 'dignidad'],
    formalTerms: ['Sr.', 'Sra.', 'Dr.', 'Licenciado', 'Ingeniero'],
    indirectPhrases: ['tal vez', 'quizás', 'posiblemente', 'podría ser']
  },
  'middle-eastern': {
    honorifics: ['sayyid', 'sayyida', 'sheikh', 'doctor', 'professor'],
    faceSaving: ['karam', 'sharaf', 'ikram'],
    formalTerms: ['Sheikh', 'Doctor', 'Professor', 'Mr.', 'Ms.'],
    indirectPhrases: ['insha\'Allah', 'perhaps', 'God willing', 'maybe']
  },
  'nordic': {
    honorifics: ['please', 'excuse me', 'thank you'],
    faceSaving: ['equality', 'respect', 'consideration'],
    formalTerms: ['Mr.', 'Ms.', 'Dr.', 'Professor'],
    indirectPhrases: ['maybe', 'perhaps', 'possibly', 'could be']
  },
  'african': {
    honorifics: ['sir', 'ma\'am', 'elder', 'chief'],
    faceSaving: ['respect', 'community', 'honor', 'dignity'],
    formalTerms: ['Mr.', 'Mrs.', 'Ms.', 'Dr.'],
    indirectPhrases: ['we will see', 'God willing', 'by his grace']
  },
  'germanic': {
    honorifics: ['please', 'thank you'],
    faceSaving: ['efficiency', 'clarity', 'honesty'],
    formalTerms: ['Herr', 'Frau', 'Dr.', 'Professor'],
    indirectPhrases: ['actually', 'in fact', 'clearly']
  }
};

/**
 * Analyzes cultural context with multi-dimensional approach
 * @param {string} text - Input text to analyze
 * @param {string} currentCulturalContext - Current cultural context setting
 * @param {Object} conversationHistory - Historical conversation data
 * @param {Object} relationshipContext - Information about relationship between parties
 * @returns {Object} Detailed cultural analysis with recommendations
 */
export const analyzeCulturalContext = (text, currentCulturalContext = 'general', conversationHistory = [], relationshipContext = {}) => {
  const lowerText = text.toLowerCase();
  const intents = detectMultipleIntents(text, 0.3);

  // Analyze cultural indicators in the text
  const culturalIndicators = analyzeCulturalIndicators(lowerText);

  // Determine dominant cultural context based on multiple factors
  const culturalAnalysis = determineCulturalContext(
    text,
    currentCulturalContext,
    culturalIndicators,
    intents,
    conversationHistory,
    relationshipContext
  );

  // Generate culturally appropriate guidance
  const guidance = generateCulturalGuidance(culturalAnalysis, text);

  // Create transparency log for debugging and user explanation
  const decisionLog = createDecisionLog(text, currentCulturalContext, culturalIndicators, intents, culturalAnalysis);

  return {
    primaryCulture: culturalAnalysis.primaryCulture,
    confidence: culturalAnalysis.confidence,
    culturalDimensions: culturalAnalysis.dimensions,
    communicationStyle: culturalAnalysis.communicationStyle,
    recommendations: guidance.recommendations,
    sensitivityPhrases: guidance.sensitivityPhrases,
    relationshipDynamics: culturalAnalysis.relationshipDynamics,
    situationalContext: culturalAnalysis.situationalContext,
    decisionLog: decisionLog, // Add transparency log
    disclaimer: "Cultural guidance is based on general patterns and may not apply to all individuals. Always respect personal preferences over cultural assumptions.",
    warning: "Cultural patterns are generalizations. Individual preferences and context should take priority."
  };
};

// Detect greetings in multiple languages and specific countries
const GREETING_PATTERNS = [
  { culture: 'china', patterns: ['nihao', 'xiexie'] },
  { culture: 'japan', patterns: ['konichiwa', 'arigato'] },
  { culture: 'south-korea', patterns: ['annyeong', 'gamsahamnida'] },
  { culture: 'india', patterns: ['namaste', 'vanakkam', 'dhanyavad'] },
  { culture: 'mexico', patterns: ['hola', 'buenos dias', 'gracias'] },
  { culture: 'brazil', patterns: ['ola', 'obrigado', 'tudo bem'] },
  { culture: 'egypt', patterns: ['salam', 'marhaba', 'as-salamu alaykum', 'ahlan'] },
  { culture: 'saudi-arabia', patterns: ['as-salamu alaykum', 'ahlan wa sahlan'] },
  { culture: 'uae', patterns: ['as-salamu alaykum', 'marhaba'] },
  { culture: 'israel', patterns: ['shalom', 'toda'] },
  { culture: 'nigeria', patterns: ['sawubona', 'bawo ni', 'e kuabo'] },
  { culture: 'kenya', patterns: ['jambo', 'habari', 'asante'] },
  { culture: 'ghana', patterns: ['akwaaba', 'eti sen'] },
  { culture: 'ethiopia', patterns: ['selam', 'ameseginalehu'] },
  { culture: 'philippines', patterns: ['mabuhay', 'salamat'] },
  { culture: 'thailand', patterns: ['sawasdee', 'khop khun'] },
  { culture: 'germany', patterns: ['hallo', 'danke', 'guten tag'] },
  { culture: 'usa', patterns: ['howdy', "what's up", 'hello'] },
  { culture: 'uk', patterns: ['cheers', 'hello', 'hi'] }
];

// Pre-compile greeting regexes for performance
const GREETING_REGEXES = GREETING_PATTERNS.map(group => ({
  culture: group.culture,
  regexes: group.patterns.map(p => new RegExp(`\\b${p.replace(' ', '\\s+')}\\b`, 'i'))
}));

const FORMALITY_MARKERS = ['sir', 'madam', 'mr.', 'ms.', 'dr.', 'professor', 'please', 'excuse me'];
const FORMALITY_REGEXES = FORMALITY_MARKERS.map(m => ({
  marker: m,
  regex: new RegExp(`\\b${m.replace('.', '\\.')}\\b`, 'i')
}));

const RELATIONSHIP_INDICATORS = ['boss', 'manager', 'supervisor', 'teacher', 'student', 'parent', 'child', 'friend', 'colleague'];
const RELATIONSHIP_REGEXES = RELATIONSHIP_INDICATORS.map(ri => ({
  indicator: ri,
  regex: new RegExp(`\\b${ri}\\b`, 'i')
}));

/**
 * Analyzes cultural indicators in the text
 * @param {string} text - Lowercase input text
 * @returns {Object} Cultural indicators found
 */
const analyzeCulturalIndicators = (text) => {
  const indicators = {
    greetings: [],
    honorifics: [],
    formalityMarkers: [],
    relationshipIndicators: [],
    culturalReferences: []
  };
  
  // Detect greetings using pre-compiled regexes
  GREETING_REGEXES.forEach(group => {
    group.regexes.forEach((regex, index) => {
      if (regex.test(text)) {
        indicators.greetings.push({ 
          culture: group.culture, 
          greeting: GREETING_PATTERNS.find(p => p.culture === group.culture).patterns[index] 
        });
      }
    });
  });
  
  // Detect formality markers using pre-compiled regexes
  FORMALITY_REGEXES.forEach(item => {
    if (item.regex.test(text)) {
      indicators.formalityMarkers.push(item.marker);
    }
  });
  
  // Detect relationship indicators using pre-compiled regexes
  RELATIONSHIP_REGEXES.forEach(item => {
    if (item.regex.test(text)) {
      indicators.relationshipIndicators.push(item.indicator);
    }
  });
  
  return indicators;
};

/**
 * Determines the most appropriate cultural context
 * @param {string} text - Input text
 * @param {string} currentCulturalContext - Current setting
 * @param {Object} culturalIndicators - Indicators found in text
 * @param {Array} intents - Detected intents
 * @param {Array} conversationHistory - Historical conversation
 * @param {Object} relationshipContext - Relationship information
 * @returns {Object} Cultural context determination
 */
const determineCulturalContext = (text, currentCulturalContext, culturalIndicators, intents, conversationHistory, relationshipContext) => {
  const scores = {};
  const cultures = Object.keys(COMMUNICATION_STYLES);
  
  // Initialize scores
  cultures.forEach(culture => {
    scores[culture] = 0;
  });
  
  // Score based on cultural indicators
  culturalIndicators.greetings.forEach(greeting => {
    if (COMMUNICATION_STYLES[greeting.culture]) {
      scores[greeting.culture] += 0.8;
    }
  });
  
  // Score based on formality markers
  if (culturalIndicators.formalityMarkers.length > 0) {
    // Cultures with high formality expectations get a boost
    Object.entries(COMMUNICATION_STYLES).forEach(([culture, style]) => {
      if (style.formality === 'high') {
        scores[culture] += 0.3;
      }
    });
  }
  
  // Score based on relationship indicators
  if (culturalIndicators.relationshipIndicators.some(rel => ['boss', 'manager', 'supervisor', 'teacher'].includes(rel))) {
    // Hierarchy-aware cultures get a boost
    Object.entries(COMMUNICATION_STYLES).forEach(([culture, style]) => {
      if (style.hierarchyAware) {
        scores[culture] += 0.4;
      }
    });
  }
  
  // Score based on detected intents that might indicate cultural context
  intents.forEach(intent => {
    if (intent.intent === 'conflict' && intent.confidence > 0.5) {
      // Some cultures prefer conflict avoidance
      Object.entries(COMMUNICATION_STYLES).forEach(([culture, style]) => {
        if (style.conflictApproach === 'avoidance') {
          scores[culture] += 0.2;
        }
      });
    } else if (intent.intent === 'empathy' && intent.confidence > 0.5) {
      // Some cultures emphasize empathy/relationship in communication
      Object.entries(COMMUNICATION_STYLES).forEach(([culture, style]) => {
        if (style.greetingStyle === 'warm' || style.decisionMaking === 'relationship-based') {
          scores[culture] += 0.2;
        }
      });
    }
  });
  
  // Consider relationship context if provided
  if (relationshipContext.powerDistance) {
    if (relationshipContext.powerDistance === 'high') {
      cultures.filter(c => CULTURAL_DIMENSIONS.powerDistance.high.includes(c)).forEach(c => {
        scores[c] += 0.3;
      });
    } else {
      cultures.filter(c => CULTURAL_DIMENSIONS.powerDistance.low.includes(c)).forEach(c => {
        scores[c] += 0.3;
      });
    }
  }
  
  // Consider previous cultural context as a baseline
  if (currentCulturalContext !== 'general' && scores[currentCulturalContext] !== undefined) {
    scores[currentCulturalContext] += 0.1; // Slight bias toward current context
  }
  
  // Calculate confidence based on score magnitude and spread
  const sortedScores = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const maxScore = sortedScores[0][1];
  const bestCulture = sortedScores[0][0];
  const confidence = maxScore > 0 ? Math.min(1.0, maxScore / 2.0) : 0;

  // Determine effective culture based on confidence and user settings
  // Use CulturalIntelligenceConfig threshold if available
  const overrideThreshold = AppConfig.culturalIntelligenceConfig?.confidence?.overrideThreshold || 0.75;
  const detectionThreshold = AppConfig.culturalIntelligenceConfig?.confidence?.low || 0.3;

  let effectiveCulture = 'general';
  
  if (currentCulturalContext !== 'general' && COMMUNICATION_STYLES[currentCulturalContext]) {
    // If user has a specific setting, only override if detection is VERY confident
    if (confidence >= overrideThreshold && bestCulture !== currentCulturalContext) {
      effectiveCulture = bestCulture;
    } else {
      effectiveCulture = currentCulturalContext;
    }
  } else {
    // If no user setting (general), use detection if it meets minimum confidence
    if (confidence >= detectionThreshold) {
      effectiveCulture = bestCulture;
    } else {
      effectiveCulture = 'general';
    }
  }

  // Get cultural dimensions for the selected culture
  const dimensions = effectiveCulture !== 'general' ? getCulturalDimensions(effectiveCulture) : {};
  const communicationStyle = COMMUNICATION_STYLES[effectiveCulture] || COMMUNICATION_STYLES['general'];

  return {
    primaryCulture: effectiveCulture,
    confidence,
    dimensions,
    communicationStyle,
    scores,
    relationshipDynamics: relationshipContext,
    situationalContext: getSituationalContext(text, intents)
  };
};

/**
 * Gets cultural dimensions for a specific culture
 * @param {string} culture - Culture identifier
 * @returns {Object} Cultural dimensions
 */
const getCulturalDimensions = (culture) => {
  const dimensions = {};
  
  Object.entries(CULTURAL_DIMENSIONS).forEach(([dimension, values]) => {
    Object.entries(values).forEach(([level, cultures]) => {
      if (cultures.includes(culture)) {
        dimensions[dimension] = level;
      }
    });
  });
  
  return dimensions;
};

/**
 * Determines situational context from the conversation
 * @param {string} text - Input text
 * @param {Array} intents - Detected intents
 * @returns {Object} Situational context
 */
const getSituationalContext = (text, intents) => {
  const context = {
    formalityLevel: 'neutral',
    urgency: 'low',
    relationshipType: 'neutral',
    communicationChannel: 'general',
    interactionGoal: 'general',
    isPublicSetting: false
  };
  
  const lowerText = text.toLowerCase();
  
  // Determine formality based on language use
  if (lowerText.includes('sir') || lowerText.includes('madam') || lowerText.includes('please') || lowerText.includes('excuse me')) {
    context.formalityLevel = 'high';
  } else if (lowerText.includes('hey') || lowerText.includes('hi') || lowerText.includes('dude') || lowerText.includes('sup')) {
    context.formalityLevel = 'low';
  }
  
  // Determine interaction goal from intents and keywords
  if (intents.some(i => i.intent === 'strategic') || lowerText.includes('negotiate') || lowerText.includes('price') || lowerText.includes('contract')) {
    context.interactionGoal = 'negotiation';
  } else if (lowerText.includes('weather') || lowerText.includes('how are you') || lowerText.includes('nice day')) {
    context.interactionGoal = 'small-talk';
  } else if (intents.some(i => i.intent === 'conflict') || lowerText.includes('disagree') || lowerText.includes('wrong')) {
    context.interactionGoal = 'conflict-resolution';
  }
  
  // Detect setting indicators
  if (lowerText.includes('everyone') || lowerText.includes('all') || lowerText.includes('team') || lowerText.includes('group')) {
    context.isPublicSetting = true;
  }
  
  // Determine urgency from intents
  const urgentIntents = ['conflict', 'strategic', 'action'];
  if (intents.some(intent => urgentIntents.includes(intent.intent) && intent.confidence > 0.6) || lowerText.includes('asap') || lowerText.includes('urgent')) {
    context.urgency = 'high';
  }
  
  // Determine relationship type
  if (text.includes('boss') || text.includes('manager') || text.includes('supervisor')) {
    context.relationshipType = 'hierarchical';
  } else if (text.includes('friend') || text.includes('buddy') || text.includes('pal')) {
    context.relationshipType = 'peer';
  } else if (text.includes('date') || text.includes('romantic') || text.includes('relationship')) {
    context.relationshipType = 'personal';
  }
  
  return context;
};

/**
 * Generates cultural guidance based on analysis
 * @param {Object} culturalAnalysis - Cultural analysis result
 * @param {string} text - Original text
 * @returns {Object} Cultural guidance
 */
const generateCulturalGuidance = (culturalAnalysis, _text) => {
  const { primaryCulture, communicationStyle } = culturalAnalysis;
  const recommendations = [];
  const sensitivityPhrases = [];

  // Get user-specific bias adjustments based on their feedback history
  const biasAdjustments = getUserCulturalBiasAdjustments();

  if (primaryCulture !== 'general') {
    // Helper to determine if a category should be included based on user bias
    const shouldIncludeCategory = (category) => {
      const adjustment = biasAdjustments[category] || 0;
      return (0.5 + adjustment) > 0.3; // Threshold for inclusion
    };

    // Generate recommendations based on communication style
    if (communicationStyle.directness === 'indirect' && shouldIncludeCategory('directness')) {
      const suggestion = 'Use more indirect language to avoid confrontation';
      // Check if this recommendation has been flagged as problematic
      if (!shouldFlagRecommendation(suggestion)) {
        recommendations.push({
          category: 'directness',
          suggestion: suggestion,
          examples: ['Perhaps we could consider...', 'It might be beneficial to...', 'One option would be...'],
          priority: 'high'
        });
      }
    } else if (communicationStyle.directness === 'direct' && shouldIncludeCategory('directness')) {
      const suggestion = 'Be clear and direct in your communication';
      // Check if this recommendation has been flagged as problematic
      if (!shouldFlagRecommendation(suggestion)) {
        recommendations.push({
          category: 'directness',
          suggestion: suggestion,
          examples: ['I recommend...', 'The issue is...', 'We need to...'],
          priority: 'high'
        });
      }
    }

    if (communicationStyle.formality === 'high' && shouldIncludeCategory('formality')) {
      const suggestion = 'Maintain formal language and titles';
      // Check if this recommendation has been flagged as problematic
      if (!shouldFlagRecommendation(suggestion)) {
        recommendations.push({
          category: 'formality',
          suggestion: suggestion,
          examples: ['Mr./Ms. [Name]', 'Thank you for your time', 'I respectfully suggest...'],
          priority: 'medium'
        });
      }
    }

    if (communicationStyle.faceSaving && shouldIncludeCategory('face-saving')) {
      const suggestion = 'Frame suggestions to preserve dignity and respect';
      // Check if this recommendation has been flagged as problematic
      if (!shouldFlagRecommendation(suggestion)) {
        // For direct cultures, use slightly more direct face-saving framing
        const isDirectCulture = communicationStyle.directness === 'direct' || communicationStyle.directness === 'very-direct';
        recommendations.push({
          category: 'face-saving',
          suggestion: suggestion,
          examples: isDirectCulture 
            ? ['One alternative approach is...', 'Let\'s consider another perspective...', 'How about we try...']
            : ['This is just a thought...', 'Others might consider...', 'What if we tried...'],
          priority: 'high'
        });
      }
    }

    if (communicationStyle.directness === 'direct' && !communicationStyle.faceSaving) {
      const suggestion = 'Prioritize clarity and efficiency in your points';
      if (!shouldFlagRecommendation(suggestion)) {
        recommendations.push({
          category: 'efficiency',
          suggestion: suggestion,
          examples: ['The goal is...', 'To be efficient...', 'In short...'],
          priority: 'medium'
        });
      }
    }

    if (communicationStyle.hierarchyAware && shouldIncludeCategory('hierarchy')) {
      const suggestion = 'Acknowledge status differences appropriately';
      // Check if this recommendation has been flagged as problematic
      if (!shouldFlagRecommendation(suggestion)) {
        recommendations.push({
          category: 'hierarchy',
          suggestion: suggestion,
          examples: ['As you know best...', 'Your expertise suggests...', 'Following your lead...'],
          priority: 'medium'
        });
      }
    }

    // Add sensitivity phrases based on culture
    if (CULTURAL_SENSITIVITY_PHRASES[primaryCulture]) {
      const culturePhrases = CULTURAL_SENSITIVITY_PHRASES[primaryCulture];
      Object.entries(culturePhrases).forEach(([_category, phrases]) => {
        sensitivityPhrases.push(...phrases.slice(0, 3)); // Take first 3 phrases from each category
      });
    }
  }

  return {
    recommendations,
    sensitivityPhrases
  };
};

/**
 * Generates culturally appropriate response suggestions
 * @param {string} originalText - Original input text
 * @param {Object} culturalAnalysis - Cultural analysis result
 * @returns {Array} Culturally adapted response options
 */
export const generateCulturallyAppropriateResponses = (originalText, culturalAnalysis) => {
  const { primaryCulture, communicationStyle, _situationalContext } = culturalAnalysis;
  const responses = [];
  
  if (primaryCulture === 'general') {
    // Return original text as-is for general context
    return [originalText];
  }
  
  // Generate culturally adapted responses based on communication style
  if (communicationStyle.directness === 'indirect') {
    // Create indirect versions of the original text
    responses.push(`Perhaps ${originalText.toLowerCase()}`);
    responses.push(`It seems like ${originalText.toLowerCase()} might be worth considering.`);
    responses.push(`One approach could be to ${originalText.toLowerCase().replace(/^let's |^we should |^i think we should /, '')}.`);
  } else {
    // For direct cultures, keep responses straightforward
    responses.push(originalText);
    responses.push(`I recommend ${originalText.toLowerCase().replace(/^let's |^we should |^i think we should /, '')}.`);
  }
  
  if (communicationStyle.formality === 'high') {
    // Add formal variants
    responses.push(`Dear colleague, ${originalText}`);
    responses.push(`Thank you for your consideration. ${originalText}`);
  }
  
  if (communicationStyle.faceSaving) {
    // Add face-saving variants
    responses.push(`I understand your perspective. Additionally, ${originalText.toLowerCase()}`);
    responses.push(`Just a thought: ${originalText}`);
  }
  
  // Limit to 3-4 suggestions to avoid overwhelming the user
  return responses.slice(0, 4);
};

/**
 * Validates if a response is culturally appropriate
 * @param {string} response - Response to validate
 * @param {Object} culturalAnalysis - Cultural analysis
 * @returns {Object} Validation result
 */
export const validateCulturalAppropriateness = (response, culturalAnalysis) => {
  const { communicationStyle, _situationalContext } = culturalAnalysis;
  const issues = [];
  
  // Check for cultural mismatches
  if (communicationStyle.directness === 'indirect' && response.toLowerCase().includes('you should')) {
    issues.push({
      type: 'directness_mismatch',
      message: 'Response is too direct for the cultural context',
      suggestion: 'Use more tentative language like "perhaps" or "it might be"'
    });
  }
  
  if (communicationStyle.formality === 'high' && response.toLowerCase().includes('casual')) {
    issues.push({
      type: 'formality_mismatch',
      message: 'Response is too informal for the cultural context',
      suggestion: 'Use more formal language and titles'
    });
  }
  
  if (communicationStyle.faceSaving && response.toLowerCase().includes('confrontational')) {
    issues.push({
      type: 'face_saving_mismatch',
      message: 'Response might threaten someone\'s dignity',
      suggestion: 'Reframe to preserve respect and dignity'
    });
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    suggestions: issues.map(issue => issue.suggestion)
  };
};

/**
 * Submit feedback for a cultural recommendation
 * @param {string} recommendationId - Unique identifier for the recommendation
 * @param {string} recommendationText - The text of the recommendation
 * @param {string} userFeedback - 'positive' (👍) or 'negative' (👎)
 * @param {string} culturalContext - The cultural context where the recommendation was made
 * @param {string} userContext - Additional context about the user's situation
 * @returns {string} Feedback entry ID
 */
/**
 * Creates a transparency log for cultural detection decisions
 * @param {string} text - Input text that was analyzed
 * @param {string} currentCulturalContext - Current cultural context setting
 * @param {Object} culturalIndicators - Indicators found in the text
 * @param {Array} intents - Detected intents
 * @param {Object} culturalAnalysis - Result of cultural analysis
 * @returns {Object} Decision log with detailed information
 */
const createDecisionLog = (text, currentCulturalContext, culturalIndicators, intents, culturalAnalysis) => {
  const log = {
    timestamp: new Date().toISOString(),
    inputText: text.substring(0, 100) + (text.length > 100 ? '...' : ''), // Truncate long texts
    currentCulturalContext,
    detectedIndicators: {
      greetings: culturalIndicators.greetings,
      formalityMarkers: culturalIndicators.formalityMarkers,
      relationshipIndicators: culturalIndicators.relationshipIndicators,
    },
    detectedIntents: intents.map(intent => ({ intent: intent.intent, confidence: intent.confidence })),
    analysisResult: {
      primaryCulture: culturalAnalysis.primaryCulture,
      confidence: culturalAnalysis.confidence,
      scores: culturalAnalysis.scores ? Object.entries(culturalAnalysis.scores)
        .sort(([,a], [,b]) => b - a) // Sort by score descending
        .slice(0, 3) // Top 3 cultures
        .map(([culture, score]) => ({ culture, score }))
        : []
    },
    decisionBasis: []
  };

  // Add specific basis for the decision
  if (culturalIndicators.greetings.length > 0) {
    log.decisionBasis.push(`Detected greetings suggesting: ${culturalIndicators.greetings.map(g => g.culture).join(', ')}`);
  }

  if (culturalIndicators.formalityMarkers.length > 0) {
    log.decisionBasis.push(`Detected formality markers: ${culturalIndicators.formalityMarkers.slice(0, 3).join(', ')}`);
  }

  if (culturalIndicators.relationshipIndicators.length > 0) {
    log.decisionBasis.push(`Detected relationship indicators: ${culturalIndicators.relationshipIndicators.slice(0, 3).join(', ')}`);
  }

  const highConfidenceIntents = intents.filter(intent => intent.confidence > 0.5);
  if (highConfidenceIntents.length > 0) {
    log.decisionBasis.push(`Detected high-confidence intents: ${highConfidenceIntents.map(intent => intent.intent).join(', ')}`);
  }

  log.summary = `Detected '${culturalAnalysis.primaryCulture}' culture with ${Math.round(culturalAnalysis.confidence * 100)}% confidence based on: ${log.decisionBasis.join('; ')}`;

  return log;
};

export const submitCulturalRecommendationFeedback = (recommendationId, recommendationText, userFeedback, culturalContext, userContext = '', category = 'general') => {

  return submitCulturalFeedback(recommendationId, recommendationText, userFeedback, culturalContext, userContext, category);

};
