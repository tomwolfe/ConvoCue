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
import { submitCulturalFeedback, shouldFlagRecommendation } from './culturalFeedback';

// Cultural dimensions based on Hofstede's model and other cultural frameworks
const CULTURAL_DIMENSIONS = {
  powerDistance: {
    high: ['asia', 'latin-america', 'middle-east', 'africa'],
    low: ['nordic', 'germanic', 'anglo', 'anglo-canada']
  },
  individualism: {
    individualistic: ['anglo', 'germanic', 'nordic', 'anglo-canuba'],
    collectivistic: ['asia', 'latin-america', 'africa', 'middle-east']
  },
  uncertaintyAvoidance: {
    high: ['japan', 'germany', 'greece', 'portugal', 'korea'],
    low: ['singapore', 'jamaica', 'ireland', 'denmark', 'sweden']
  },
  masculinity: {
    masculine: ['japan', 'hungary', 'germany', 'austria', 'venezuela'],
    feminine: ['nordic', 'netherlands', 'spain', 'portugal', 'thailand']
  },
  longTermOrientation: {
    longTerm: ['china', 'japan', 'south-korea', 'singapore', 'hong-kong'],
    shortTerm: ['pakistan', 'nigeria', 'philippines', 'thailand', 'italy']
  },
  indulgence: {
    indulgent: ['venezuela', 'mexico', 'colombia', 'thailand', 'malaysia'],
    restrained: ['pakistan', 'china', 'poland', 'jordan', 'ukraine']
  }
};

// Communication style mappings by culture
const COMMUNICATION_STYLES = {
  'east-asian': {
    directness: 'indirect',
    formality: 'high',
    context: 'high-context',
    faceSaving: true,
    hierarchyAware: true,
    conflictApproach: 'avoidance',
    decisionMaking: 'consensus',
    feedbackStyle: 'implicit',
    greetingStyle: 'respectful',
    examples: ['China', 'Japan', 'South Korea', 'Taiwan', 'Singapore']
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
    greetingStyle: 'respectful',
    examples: ['India', 'Pakistan', 'Bangladesh', 'Sri Lanka', 'Nepal']
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
    greetingStyle: 'warm',
    examples: ['Mexico', 'Brazil', 'Argentina', 'Colombia', 'Peru']
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
    greetingStyle: 'respectful',
    examples: ['Saudi Arabia', 'UAE', 'Egypt', 'Iran', 'Turkey']
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
    greetingStyle: 'casual',
    examples: ['Sweden', 'Norway', 'Denmark', 'Finland', 'Iceland']
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
    greetingStyle: 'formal',
    examples: ['Germany', 'Netherlands', 'Switzerland', 'Austria']
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
    greetingStyle: 'casual',
    examples: ['USA', 'UK', 'Australia', 'New Zealand']
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
    greetingStyle: 'friendly',
    examples: ['Canada']
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
    greetingStyle: 'warm',
    examples: ['Nigeria', 'South Africa', 'Kenya', 'Ghana', 'Ethiopia']
  }
};

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
  
  // Detect greetings in multiple languages
  const greetingPatterns = [
    { culture: 'east-asian', patterns: ['nihao', 'konichiwa', 'annyeong', 'xiexie', 'arigato', 'gamsahamnida'] },
    { culture: 'south-asian', patterns: ['namaste', 'vanakkam', 'salaam', 'adab', 'jai shri krishna'] },
    { culture: 'latin-american', patterns: ['hola', 'buenos dias', 'buenas tardes', 'buenas noches', 'como esta'] },
    { culture: 'middle-eastern', patterns: ['salam', 'marhaban', 'ahlan wa sahlan', 'marhaban bik', 'sabah al khair'] },
    { culture: 'african', patterns: ['sawubona', 'jambo', 'hujambo', 'salama', 'mambo'] }
  ];
  
  greetingPatterns.forEach(greetingGroup => {
    greetingGroup.patterns.forEach(pattern => {
      if (text.includes(pattern)) {
        indicators.greetings.push({ culture: greetingGroup.culture, greeting: pattern });
      }
    });
  });
  
  // Detect formality markers
  const formalityMarkers = ['sir', 'madam', 'mr.', 'ms.', 'dr.', 'professor', 'please', 'excuse me'];
  formalityMarkers.forEach(marker => {
    if (text.includes(marker)) {
      indicators.formalityMarkers.push(marker);
    }
  });
  
  // Detect relationship indicators
  const relationshipIndicators = ['boss', 'manager', 'supervisor', 'teacher', 'student', 'parent', 'child', 'friend', 'colleague'];
  relationshipIndicators.forEach(indicator => {
    if (text.includes(indicator)) {
      indicators.relationshipIndicators.push(indicator);
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
    // High formality cultures get a boost
    ['east-asian', 'south-asian', 'middle-eastern'].forEach(culture => {
      scores[culture] += 0.3;
    });
  }
  
  // Score based on relationship indicators
  if (culturalIndicators.relationshipIndicators.some(rel => ['boss', 'manager', 'supervisor', 'teacher'].includes(rel))) {
    // Hierarchy-aware cultures get a boost
    Object.keys(COMMUNICATION_STYLES).filter(c => COMMUNICATION_STYLES[c].hierarchyAware).forEach(culture => {
      scores[culture] += 0.4;
    });
  }
  
  // Score based on detected intents that might indicate cultural context
  intents.forEach(intent => {
    if (intent.intent === 'conflict' && intent.confidence > 0.5) {
      // Some cultures prefer conflict avoidance
      ['east-asian', 'middle-eastern'].forEach(culture => {
        scores[culture] += 0.2;
      });
    } else if (intent.intent === 'empathy' && intent.confidence > 0.5) {
      // Some cultures emphasize empathy
      ['nordic', 'latin-american'].forEach(culture => {
        scores[culture] += 0.2;
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

  // Only return a specific culture if confidence is above threshold
  const effectiveCulture = confidence > 0.3 ? bestCulture : 'general';

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
    communicationChannel: 'general'
  };
  
  // Determine formality based on language use
  if (text.includes('sir') || text.includes('madam') || text.includes('please') || text.includes('excuse me')) {
    context.formalityLevel = 'high';
  } else if (text.includes('hey') || text.includes('hi') || text.includes('dude')) {
    context.formalityLevel = 'low';
  }
  
  // Determine urgency from intents
  const urgentIntents = ['conflict', 'strategic', 'action'];
  if (intents.some(intent => urgentIntents.includes(intent.intent) && intent.confidence > 0.6)) {
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
const generateCulturalGuidance = (culturalAnalysis, text) => {
  const { primaryCulture, communicationStyle } = culturalAnalysis;
  const recommendations = [];
  const sensitivityPhrases = [];

  if (primaryCulture !== 'general') {
    // Generate recommendations based on communication style
    if (communicationStyle.directness === 'indirect') {
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
    } else if (communicationStyle.directness === 'direct') {
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

    if (communicationStyle.formality === 'high') {
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

    if (communicationStyle.faceSaving) {
      const suggestion = 'Frame suggestions to preserve dignity and respect';
      // Check if this recommendation has been flagged as problematic
      if (!shouldFlagRecommendation(suggestion)) {
        recommendations.push({
          category: 'face-saving',
          suggestion: suggestion,
          examples: ['This is just a thought...', 'Others might consider...', 'What if we tried...'],
          priority: 'high'
        });
      }
    }

    if (communicationStyle.hierarchyAware) {
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
      Object.entries(culturePhrases).forEach(([category, phrases]) => {
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
  const { primaryCulture, communicationStyle, situationalContext } = culturalAnalysis;
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
  const { communicationStyle, situationalContext } = culturalAnalysis;
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

export const submitCulturalRecommendationFeedback = (recommendationId, recommendationText, userFeedback, culturalContext, userContext = '') => {
  return submitCulturalFeedback(recommendationId, recommendationText, userFeedback, culturalContext, userContext);
};