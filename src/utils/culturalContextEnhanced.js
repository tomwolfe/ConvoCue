/**
 * Enhanced Cultural Context Detection with Fuzzy Logic
 * 
 * This implementation addresses the brittleness of discrete category detection
 * by using fuzzy logic and continuous context vectors instead of hard boundaries.
 */

import { logIntentDetectionMetrics } from './enhancedIntentRecognition';

// Define cultural dimensions as continuous values rather than discrete categories
const CULTURAL_DIMENSIONS = {
  formality: {
    name: 'Formality Level',
    keywords: {
      high: ['sir', 'ma\'am', 'please', 'thank you', 'excuse me', 'regards', 'dear', 'respected', 'esteemed', 'honorable', 'mr.', 'ms.', 'dr.', 'professor'],
      medium: ['hello', 'hi', 'good morning', 'good afternoon'],
      low: ['hey', 'hi', 'sup', 'yo']
    },
    regex: {
      high: /\b(?:would|could|might|may|please|i would appreciate|if you would be so kind|kindly)\b/gi,
      medium: /\b(?:hello|good morning|good afternoon|nice to meet you)\b/gi,
      low: /\b(?:hey|hi|yo|sup|what's up)\b/gi
    }
  },
  professionalism: {
    name: 'Professionalism Level',
    keywords: {
      high: ['meeting', 'project', 'deadline', 'budget', 'contract', 'negotiation', 'proposal', 'quarterly', 'revenue', 'strategy', 'objective', 'agenda', 'presentation', 'report', 'analysis', 'stakeholder', 'deliverable'],
      medium: ['team', 'collaborate', 'feedback', 'thoughts', 'input', 'brainstorm'],
      low: ['fun', 'weekend', 'movie', 'food', 'coffee', 'party', 'game']
    },
    regex: {
      high: /\b(?:roi|kpi|synergy|bandwidth|leverage|deep dive|action item|follow up|escalate|align|sync|calendar|quarter|fiscal|bottom line|stakeholder|deliverable)\b/gi,
      medium: /\b(?:team|collaborate|feedback|brainstorm|sync|touch base)\b/gi,
      low: /\b(?:weekend|movie|food|coffee|fun|party|game|dude|bro)\b/gi
    }
  },
  casualness: {
    name: 'Casualness Level',
    keywords: {
      high: ['dude', 'bro', 'chill', 'hang out', 'gonna', 'wanna', 'lemme', 'ain\'t', 'y\'all', 'ya', 'cool', 'awesome', 'sweet', 'guys', 'folks'],
      medium: ['sounds good', 'let me know', 'what do you think', 'check this out', 'got it', 'no worries', 'thanks team', 'appreciate it'],
      low: []
    },
    regex: {
      high: /\b(?:dude|bro|chill|hang out|gonna|wanna|lemme|ain't|y'all|ya|cool|awesome|sweet|sounds good|got it|no worries|thanks guys)\b/gi,
      medium: /\b(?:sounds good|let me know|what do you think|check this out|got it|no worries|thanks team|appreciate it)\b/gi
    }
  },
  directness: {
    name: 'Directness Level',
    keywords: {
      high: ['just', 'simply', 'directly', 'straightforward'],
      medium: ['perhaps', 'maybe', 'possibly', 'could'],
      low: ['if you don\'t mind', 'when you have a moment', 'at your convenience']
    },
    regex: {
      high: /\b(?:just|simply|directly|straightforward|right away)\b/gi,
      medium: /\b(?:perhaps|maybe|possibly|could|might)\b/gi,
      low: /\b(?:if you don't mind|when you have a moment|at your convenience|whenever you can)\b/gi
    }
  }
};

/**
 * Calculate cultural dimension scores using fuzzy logic
 * @param {Array} conversationHistory - Array of conversation turns
 * @returns {Object} Scores for each cultural dimension
 */
export const calculateCulturalDimensions = (conversationHistory) => {
  const scores = {};
  
  // Initialize scores for each dimension
  Object.keys(CULTURAL_DIMENSIONS).forEach(dimension => {
    scores[dimension] = { high: 0, medium: 0, low: 0, total: 0 };
  });

  // Process each turn in the conversation
  conversationHistory.forEach(turn => {
    const content = (turn.content || '').toLowerCase();
    
    // Score each dimension
    Object.entries(CULTURAL_DIMENSIONS).forEach(([dimension, config]) => {
      // Score based on keywords
      Object.entries(config.keywords).forEach(([level, keywords]) => {
        keywords.forEach(keyword => {
          if (content.includes(keyword)) {
            scores[dimension][level]++;
            scores[dimension].total++;
          }
        });
      });
      
      // Score based on regex patterns
      Object.entries(config.regex).forEach(([level, regex]) => {
        const matches = content.match(regex);
        if (matches) {
          scores[dimension][level] += matches.length;
          scores[dimension].total += matches.length;
        }
      });
    });
  });

  // Convert counts to normalized scores (0-1 range)
  const normalizedScores = {};
  Object.entries(scores).forEach(([dimension, values]) => {
    if (values.total > 0) {
      normalizedScores[dimension] = {
        high: values.high / values.total,
        medium: values.medium / values.total,
        low: values.low / values.total
      };
    } else {
      normalizedScores[dimension] = { high: 0, medium: 0, low: 0 };
    }
  });

  return normalizedScores;
};

/**
 * Infer cultural context using fuzzy logic
 * @param {Array} conversationHistory - Array of conversation turns
 * @returns {Object} Cultural context with continuous values
 */
export const inferCulturalContextFuzzy = (conversationHistory) => {
  const dimensionScores = calculateCulturalDimensions(conversationHistory);
  
  // Calculate composite scores for traditional categories
  const contextScores = {
    formal: dimensionScores.formality.high,
    business: dimensionScores.professionalism.high,
    casual_professional: (dimensionScores.professionalism.medium + dimensionScores.casualness.medium) / 2,
    casual: dimensionScores.casualness.high
  };
  
  // Find the highest scoring traditional category
  const maxContext = Object.entries(contextScores).reduce((max, current) => 
    current[1] > max[1] ? current : max, ['', 0]);
  
  // But also return the full dimensional breakdown
  return {
    // Traditional category (for backward compatibility)
    context: maxContext[0] || null,
    confidence: maxContext[1] > 0.3 ? 'high' : maxContext[1] > 0.1 ? 'medium' : 'low',
    
    // Fuzzy dimensional breakdown (the real value)
    dimensions: dimensionScores,
    
    // Composite scores for traditional categories
    scores: contextScores,
    
    // Hybrid context detection - identify if multiple dimensions are elevated
    hybrid: detectHybridContext(dimensionScores, contextScores),
    
    // Cultural style profile
    profile: generateCulturalProfile(dimensionScores)
  };
};

/**
 * Detect if the context is hybrid (multiple cultural styles mixed)
 * @param {Object} dimensionScores - Scores for each cultural dimension
 * @param {Object} contextScores - Scores for traditional categories
 * @returns {Object} Hybrid context indicators
 */
const detectHybridContext = (dimensionScores, contextScores) => {
  const activeDimensions = Object.entries(dimensionScores)
    .filter(([_, scores]) => scores.high > 0.1 || scores.medium > 0.2)
    .map(([dimension, _]) => dimension);
  
  const activeContexts = Object.entries(contextScores)
    .filter(([_, score]) => score > 0.1)
    .map(([context, _]) => context);
  
  return {
    isHybrid: activeContexts.length > 1 || activeDimensions.length > 2,
    activeDimensions,
    activeContexts,
    complexity: activeContexts.length // Higher number means more complex/mixed context
  };
};

/**
 * Generate a cultural style profile based on dimensional scores
 * @param {Object} dimensionScores - Scores for each cultural dimension
 * @returns {Object} Cultural style profile
 */
const generateCulturalProfile = (dimensionScores) => {
  const profile = {};
  
  Object.entries(dimensionScores).forEach(([dimension, scores]) => {
    // Determine the dominant level for this dimension
    let dominantLevel = 'low';
    if (scores.high > scores.medium && scores.high > scores.low) {
      dominantLevel = 'high';
    } else if (scores.medium > scores.low) {
      dominantLevel = 'medium';
    }
    
    profile[dimension] = {
      level: dominantLevel,
      score: scores[dominantLevel],
      descriptor: `${dominantLevel} ${CULTURAL_DIMENSIONS[dimension].name.toLowerCase()}`
    };
  });
  
  return profile;
};

/**
 * Enhanced cultural context analysis that combines fuzzy logic with traditional approaches
 * @param {Array} conversationHistory - Array of conversation turns
 * @returns {Object} Comprehensive cultural context analysis
 */
export const analyzeCulturalContextEnhanced = (conversationHistory) => {
  // Get fuzzy cultural context
  const fuzzyContext = inferCulturalContextFuzzy(conversationHistory);
  
  // Also run the traditional analysis for comparison and validation
  const traditionalContext = inferCulturalContextTraditional(conversationHistory);
  
  // Combine results
  return {
    ...fuzzyContext,
    traditional: traditionalContext,
    recommendation: generateRecommendation(fuzzyContext, traditionalContext),
    confidenceAdjustment: calculateConfidenceAdjustment(fuzzyContext)
  };
};

/**
 * Traditional cultural context detection (preserved for comparison)
 * @param {Array} conversationHistory - Array of conversation turns
 * @returns {Object} Traditional cultural context result
 */
const inferCulturalContextTraditional = (conversationHistory) => {
  // This replicates the original function logic for comparison purposes
  const culturalPatterns = {
    'formal': {
      keywords: ['sir', 'ma\'am', 'please', 'thank you', 'excuse me', 'pardon me', 'regards', 'dear', 'respected', 'esteemed', 'honorable', 'mr.', 'ms.', 'dr.', 'professor'],
      phrases: ['i would like to', 'if you would be so kind', 'i was wondering if', 'i respectfully', 'with due respect', 'i humbly request', 'it would be appreciated'],
      formalityIndicators: ['title', 'last_name_usage', 'proper_salutations'],
      formalityRegex: /\b(?:would|could|might|may|please|i would appreciate|if you would be so kind)\b/gi
    },
    'business': {
      keywords: ['meeting', 'project', 'deadline', 'budget', 'contract', 'negotiation', 'proposal', 'quarterly', 'revenue', 'strategy', 'objective', 'agenda', 'presentation', 'report', 'analysis', 'stakeholder', 'deliverable'],
      phrases: ['per our discussion', 'as per the agreement', 'let\'s circle back', 'synergize', 'moving forward', 'at your earliest convenience', 'touch base', 'circle back', 'drill down'],
      formalityIndicators: ['professional_jargon', 'structured_format'],
      businessRegex: /\b(?:roi|kpi|synergy|bandwidth|leverage|deep dive|action item|follow up|escalate|align|sync|calendar|quarter|fiscal|bottom line)\b/gi
    },
    'casual_professional': {
      keywords: ['team', 'collaborate', 'feedback', 'thoughts', 'input', 'brainstorm', 'chill', 'cool', 'awesome', 'sweet', 'guys', 'folks'],
      phrases: ['sounds good', 'let me know', 'what do you think', 'check this out', 'got it', 'no worries', 'thanks team', 'appreciate it'],
      formalityIndicators: ['first_name_usage', 'friendly_tone'],
      casualProfessionalRegex: /\b(?:team|awesome|cool|chill|sounds good|got it|no worries|thanks guys)\b/gi
    },
    'casual': {
      keywords: ['weekend', 'movie', 'food', 'coffee', 'fun', 'party', 'game', 'dude', 'bro', 'chill', 'hang out', 'hey', 'hi', 'sup', 'yo'],
      phrases: ['what\'s up', 'how\'s it going', 'catch me up', 'tell me about it', 'for sure', 'no way', 'cool beans', 'see ya', 'later'],
      formalityIndicators: ['slang', 'informal_greetings'],
      casualRegex: /\b(?:dude|bro|chill|hang out|gonna|wanna|lemme|ain\'t|y\'all|ya|sup|hey|ok\b|cool|fun|party|game|movie|food|beer|wine|coffee|weekend)\b/gi
    }
  };

  const culturalScores = {};

  Object.entries(culturalPatterns).forEach(([context, pattern]) => {
    let score = 0;

    conversationHistory.forEach(turn => {
      const content = (turn.content || '');
      const lowerContent = content.toLowerCase();

      // Keyword matching
      pattern.keywords.forEach(keyword => {
        if (lowerContent.includes(keyword)) score++;
      });

      // Phrase matching
      pattern.phrases.forEach(phrase => {
        if (lowerContent.includes(phrase)) score += 1.5;
      });

      // Regex pattern matching
      if (pattern.formalityRegex) {
        const matches = content.match(pattern.formalityRegex);
        if (matches) score += matches.length * 0.5;
      }
      if (pattern.businessRegex) {
        const matches = content.match(pattern.businessRegex);
        if (matches) score += matches.length * 0.5;
      }
      if (pattern.casualProfessionalRegex) {
        const matches = content.match(pattern.casualProfessionalRegex);
        if (matches) score += matches.length * 0.5;
      }
      if (pattern.casualRegex) {
        const matches = content.match(pattern.casualRegex);
        if (matches) score += matches.length * 0.5;
      }
    });

    culturalScores[context] = score;
  });

  const sortedContexts = Object.entries(culturalScores).sort((a, b) => b[1] - a[1]);
  const maxContext = sortedContexts[0];

  if (maxContext && maxContext[1] > 0) {
    const topScore = maxContext[1];
    const secondBest = sortedContexts[1] ? sortedContexts[1][1] : 0;

    if (topScore > 0 && (topScore - secondBest) < 1) {
      return { context: maxContext[0], confidence: 'medium' };
    }

    return { context: maxContext[0], confidence: topScore > 2 ? 'high' : 'medium' };
  }

  return { context: null, confidence: 'low' };
};

/**
 * Generate recommendations based on cultural context analysis
 * @param {Object} fuzzyContext - Fuzzy cultural context result
 * @param {Object} traditionalContext - Traditional cultural context result
 * @returns {Object} Recommendations for handling the detected context
 */
const generateRecommendation = (fuzzyContext, traditionalContext) => {
  const recommendations = [];
  
  // Add recommendations based on fuzzy dimensions
  Object.entries(fuzzyContext.dimensions).forEach(([dimension, scores]) => {
    if (scores.high > 0.3) {
      recommendations.push(`Increase ${dimension.replace(/([A-Z])/g, ' $1').toLowerCase()} sensitivity`);
    }
  });
  
  // Add recommendations based on hybrid context
  if (fuzzyContext.hybrid.isHybrid) {
    recommendations.push('Mixed cultural context detected - use adaptive communication style');
    recommendations.push('Avoid assumptions based on single cultural norms');
  }
  
  // Add traditional recommendations
  if (traditionalContext.context) {
    recommendations.push(`Traditional context: ${traditionalContext.context} (${traditionalContext.confidence} confidence)`);
  }
  
  return recommendations;
};

/**
 * Calculate confidence adjustment based on context analysis
 * @param {Object} fuzzyContext - Fuzzy cultural context result
 * @returns {number} Confidence adjustment factor
 */
const calculateConfidenceAdjustment = (fuzzyContext) => {
  // Higher complexity (hybrid contexts) may require lower confidence in categorical assignments
  if (fuzzyContext.hybrid.complexity > 2) {
    return 0.7; // Reduce confidence for complex hybrid contexts
  }
  
  // If there's a clear dominant dimension, increase confidence
  const maxDimensionScore = Math.max(
    ...Object.values(fuzzyContext.dimensions).map(dim => 
      Math.max(dim.high, dim.medium, dim.low)
    )
  );
  
  if (maxDimensionScore > 0.5) {
    return 1.1; // Increase confidence for clear signals
  }
  
  return 1.0; // Neutral adjustment
};

// Export the enhanced functions
export {
  calculateCulturalDimensions,
  inferCulturalContextFuzzy,
  detectHybridContext,
  generateCulturalProfile
};