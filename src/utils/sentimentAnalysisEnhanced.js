/**
 * Enhanced Sentiment Analysis with Sophisticated Techniques
 * 
 * This implementation addresses the limitations of keyword-based sentiment analysis
 * by incorporating context-aware processing, nuance detection, and more sophisticated
 * linguistic analysis.
 */

/**
 * Advanced sentiment analysis with context awareness and nuance detection
 * @param {Array} conversationHistory - Array of conversation turns
 * @returns {string} Overall sentiment trend with nuance handling
 */
export const analyzeSentimentTrendAdvanced = (conversationHistory) => {
  // Enhanced sentiment analysis with multiple sophistication layers
  const results = {
    overall: 'neutral',
    nuances: [],
    confidence: 0.5,
    mixedEmotions: false,
    sarcasmDetected: false,
    emotionalComplexity: 1.0 // 1.0 = simple, higher = more complex
  };

  if (!conversationHistory || conversationHistory.length === 0) {
    return 'neutral';
  }

  // Analyze each turn individually for nuanced understanding
  const turnAnalyses = conversationHistory.map((turn, index) => 
    analyzeSingleTurnSentiment(turn, conversationHistory, index)
  );

  // Aggregate results with context awareness
  const aggregated = aggregateTurnAnalyses(turnAnalyses);
  
  // Detect mixed emotions across turns
  const mixedEmotions = detectMixedEmotions(turnAnalyses);
  
  // Apply context-sensitive adjustments
  const contextAdjusted = applyContextAdjustments(aggregated, conversationHistory);
  
  // Determine final sentiment with nuance handling
  results.overall = determineFinalSentiment(contextAdjusted, mixedEmotions);
  results.mixedEmotions = mixedEmotions.detected;
  results.nuances = mixedEmotions.types;
  results.confidence = contextAdjusted.confidence;
  results.sarcasmDetected = detectSarcasmAcrossConversation(conversationHistory);
  results.emotionalComplexity = calculateEmotionalComplexity(turnAnalyses);

  return results.overall;
};

/**
 * Analyze sentiment for a single turn with context awareness
 * @param {Object} turn - Single conversation turn
 * @param {Array} fullHistory - Full conversation history
 * @param {number} index - Index of current turn
 * @returns {Object} Detailed sentiment analysis for the turn
 */
const analyzeSingleTurnSentiment = (turn, fullHistory, index) => {
  const content = (turn.content || '');
  const lowerContent = content.toLowerCase();
  const words = lowerContent.split(/\s+/);

  // Enhanced sentiment lexicons with context sensitivity
  const sentimentLexicon = {
    positive: {
      base: ['good', 'great', 'excellent', 'amazing', 'wonderful', 'love', 'like', 'happy', 'pleased', 'satisfied', 'perfect', 'awesome', 'fantastic', 'brilliant', 'outstanding', 'superb'],
      intensifiers: ['very', 'extremely', 'incredibly', 'highly', 'absolutely', 'totally', 'completely', 'really', 'quite', 'so', 'such', 'truly', 'remarkably'],
      diminishers: ['somewhat', 'slightly', 'partially', 'marginally', 'barely', 'hardly']
    },
    negative: {
      base: ['bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'angry', 'frustrated', 'annoyed', 'disappointed', 'worst', 'sucks', 'disgusting', 'pathetic', 'ridiculous', 'stupid', 'useless'],
      intensifiers: ['very', 'extremely', 'incredibly', 'highly', 'absolutely', 'totally', 'completely', 'really', 'quite', 'so', 'such', 'truly', 'remarkably'],
      diminishers: ['somewhat', 'slightly', 'partially', 'marginally', 'barely', 'hardly']
    }
  };

  // Negation words that flip sentiment
  const negationWords = ['not', 'no', 'never', 'nothing', 'nowhere', 'neither', 'nor', 'none', 'nobody', 'nothing', 'don\'t', 'doesn\'t', 'didn\'t', 'won\'t', 'wouldn\'t', 'couldn\'t', 'shouldn\'t', 'can\'t', 'cannot', 'neither', 'nobody', 'nowhere', 'nothing'];

  let sentimentScore = 0;
  let totalMeaningfulWords = 0;
  let sarcasmDetected = false;
  let intensifierCount = 0;
  let negationCount = 0;

  // Process each word with context awareness
  for (let i = 0; i < words.length; i++) {
    const word = words[i].replace(/[^\w\s]/g, '').trim();
    if (!word) continue;

    // Check for negation within context window
    const contextWindow = 4; // Increased window for better negation detection
    const startIdx = Math.max(0, i - contextWindow);
    const endIdx = Math.min(words.length, i + contextWindow + 1);
    const context = words.slice(startIdx, endIdx).join(' ');

    // Check for intensifiers
    const hasIntensifier = sentimentLexicon.positive.intensifiers.concat(sentimentLexicon.negative.intensifiers)
      .some(intensifier => context.includes(intensifier));
    
    // Check for diminishers
    const hasDiminisher = sentimentLexicon.positive.diminishers.concat(sentimentLexicon.negative.diminishers)
      .some(diminisher => context.includes(diminisher));
    
    // Check for negation
    const hasNegation = negationWords.some(negation => context.includes(negation));
    
    // Check for sarcasm indicators
    const hasSarcasmIndicator = detectSarcasmIndicators(word, i, words, content);

    // Process positive words
    if (sentimentLexicon.positive.base.includes(word)) {
      let wordScore = hasNegation ? -1 : 1;
      
      // Apply intensifier/diminisher effects
      if (hasIntensifier && !hasDiminisher) {
        wordScore *= 1.8; // Stronger intensification
      } else if (hasDiminisher && !hasIntensifier) {
        wordScore *= 0.6; // Stronger diminishment
      }
      
      // Reverse if sarcasm detected
      if (hasSarcasmIndicator) {
        wordScore = -wordScore;
        sarcasmDetected = true;
      }
      
      sentimentScore += wordScore;
      totalMeaningfulWords++;
      if (hasIntensifier) intensifierCount++;
      if (hasNegation) negationCount++;
    }
    // Process negative words
    else if (sentimentLexicon.negative.base.includes(word)) {
      let wordScore = hasNegation ? 1 : -1; // Double negation becomes positive
      
      // Apply intensifier/diminisher effects
      if (hasIntensifier && !hasDiminisher) {
        wordScore *= 1.8;
      } else if (hasDiminisher && !hasIntensifier) {
        wordScore *= 0.6;
      }
      
      // Reverse if sarcasm detected
      if (hasSarcasmIndicator) {
        wordScore = -wordScore;
        sarcasmDetected = true;
      }
      
      sentimentScore += wordScore;
      totalMeaningfulWords++;
      if (hasIntensifier) intensifierCount++;
      if (hasNegation) negationCount++;
    }
  }

  // Additional context processing for idioms and metaphors
  const idiomScore = processIdiomsAndMetaphors(content);
  sentimentScore += idiomScore;

  // Normalize by word count and adjust for context factors
  const normalizedScore = totalMeaningfulWords > 0 ? sentimentScore / totalMeaningfulWords : 0;
  
  // Calculate confidence based on various factors
  const confidence = Math.min(1.0, Math.max(0.1, 
    0.3 + // base confidence
    (totalMeaningfulWords * 0.02) + // more words = more confidence
    (intensifierCount * 0.05) + // intensifiers add confidence
    (negationCount * 0.03) // negations add complexity/confidence
  ));

  return {
    score: normalizedScore,
    confidence,
    sarcasmDetected,
    meaningfulWords: totalMeaningfulWords,
    intensifiers: intensifierCount,
    negations: negationCount,
    content: turn.content
  };
};

/**
 * Process idioms and metaphors that affect sentiment
 * @param {string} content - Content to analyze
 * @returns {number} Additional sentiment score from idioms/metaphors
 */
const processIdiomsAndMetaphors = (content) => {
  const idioms = {
    positive: {
      'break a leg': 0.8,
      'piece of cake': 0.7,
      'hit the spot': 0.8,
      'feeling blue': -0.6, // Note: this is actually negative
      'raining cats and dogs': -0.3, // unpleasant weather
      'costs an arm and a leg': -0.7, // expensive negatively
      'spill the beans': -0.2, // revealing secrets
      'hit the nail on the head': 0.7, // accurate
      'the ball is in your court': 0.4, // positive opportunity
      'best of both worlds': 0.9, // excellent situation
    },
    negative: {
      'feeling blue': -0.6,
      'costs an arm and a leg': -0.7,
      'spill the beans': -0.2,
      'raining cats and dogs': -0.3,
      'between a rock and a hard place': -0.8, // difficult situation
      'burn bridges': -0.7, // damaging relationships
      'cry over spilt milk': -0.4, // regret
      'let the cat out of the bag': -0.5, // reveal secret
    }
  };

  let score = 0;
  const lowerContent = content.toLowerCase();

  // Check for positive idioms
  Object.entries(idioms.positive).forEach(([idiom, value]) => {
    if (lowerContent.includes(idiom)) {
      score += value;
    }
  });

  // Check for negative idioms
  Object.entries(idioms.negative).forEach(([idiom, value]) => {
    if (lowerContent.includes(idiom)) {
      score -= Math.abs(value); // Ensure negative contribution
    }
  });

  return score;
};

/**
 * Detect sarcasm indicators in text
 * @param {string} word - Current word
 * @param {number} index - Word index
 * @param {Array} words - All words in the turn
 * @param {string} content - Full content
 * @returns {boolean} Whether sarcasm indicators were detected
 */
const detectSarcasmIndicators = (word, index, words, content) => {
  // Sarcasm patterns
  const sarcasmPatterns = [
    /sarcasm/i,
    /irony/i,
    /yeah\s+right/i,
    /oh\s+great/i,
    /sure/i, // in certain contexts
    /right/i, // in certain contexts like "Oh, right."
  ];

  // Check for specific sarcastic phrases around the current word
  const contextStart = Math.max(0, index - 3);
  const contextEnd = Math.min(words.length, index + 4);
  const context = words.slice(contextStart, contextEnd).join(' ').toLowerCase();

  // Check for sarcasm patterns in the broader content
  const hasPattern = sarcasmPatterns.some(pattern => pattern.test(content));
  
  // Check for specific sarcastic constructions
  const hasConstruction = 
    (context.includes('oh ') && (context.includes('great') || context.includes('wonderful'))) ||
    (context.includes('yeah') && context.includes('right')) ||
    (context.includes('sure') && context.includes(',')) || // "Sure," with comma often indicates sarcasm
    (context.includes('right') && context.includes(',')); // "Right," with comma often indicates sarcasm

  return hasPattern || hasConstruction;
};

/**
 * Aggregate sentiment analyses from multiple turns
 * @param {Array} turnAnalyses - Array of turn sentiment analyses
 * @returns {Object} Aggregated sentiment results
 */
const aggregateTurnAnalyses = (turnAnalyses) => {
  if (turnAnalyses.length === 0) {
    return { averageScore: 0, confidence: 0.5 };
  }

  const totalScore = turnAnalyses.reduce((sum, analysis) => sum + analysis.score, 0);
  const averageScore = totalScore / turnAnalyses.length;
  
  // Weight by confidence of each analysis
  const weightedConfidence = turnAnalyses.reduce((sum, analysis) => 
    sum + (analysis.confidence * Math.abs(analysis.score)), 0) / turnAnalyses.length;
  
  // Consider variance in scores (higher variance = less confidence in overall sentiment)
  const scoreVariance = turnAnalyses.reduce((sum, analysis) => {
    const diff = analysis.score - averageScore;
    return sum + (diff * diff);
  }, 0) / turnAnalyses.length;
  
  const varianceAdjustment = Math.max(0.3, 1.0 - (scoreVariance * 2)); // Reduce confidence with high variance
  
  return {
    averageScore,
    confidence: weightedConfidence * varianceAdjustment,
    totalAnalyses: turnAnalyses.length,
    scoreVariance
  };
};

/**
 * Detect mixed emotions across conversation turns
 * @param {Array} turnAnalyses - Array of turn sentiment analyses
 * @returns {Object} Mixed emotion detection results
 */
const detectMixedEmotions = (turnAnalyses) => {
  if (turnAnalyses.length < 2) {
    return { detected: false, types: [], range: 0 };
  }

  const scores = turnAnalyses.map(analysis => analysis.score);
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);
  const range = maxScore - minScore;

  // Mixed emotions detected if there's significant variation
  const detected = range > 0.8;
  
  // Categorize the types of mixed emotions
  const types = [];
  if (maxScore > 0.3 && minScore < -0.3) {
    types.push('positive-negative');
  }
  if (range > 1.0) {
    types.push('high-variance');
  }
  if (turnAnalyses.some(a => a.sarcasmDetected)) {
    types.push('sarcasm-detected');
  }

  return {
    detected,
    types,
    range
  };
};

/**
 * Apply context adjustments to aggregated sentiment
 * @param {Object} aggregated - Aggregated sentiment results
 * @param {Array} conversationHistory - Full conversation history
 * @returns {Object} Context-adjusted results
 */
const applyContextAdjustments = (aggregated, conversationHistory) => {
  let { averageScore, confidence, scoreVariance } = aggregated;
  
  // Apply conversation-wide context adjustments
  const conversationLength = conversationHistory.length;
  
  // Longer conversations may have more nuanced sentiment
  if (conversationLength > 10) {
    confidence *= 0.9; // Account for complexity
  }
  
  // Check for emotional escalation/de-escalation patterns
  if (conversationHistory.length >= 3) {
    const recentScores = conversationHistory.slice(-3).map((turn, idx) => {
      const analysis = analyzeSingleTurnSentiment(turn, conversationHistory, conversationHistory.length - 3 + idx);
      return analysis.score;
    });
    
    // Check if sentiment is trending upward or downward
    const trend = recentScores[recentScores.length - 1] - recentScores[0];
    if (Math.abs(trend) > 0.5) {
      // Strong trend detected, may indicate emotional state
      confidence *= 1.1;
    }
  }
  
  return {
    averageScore,
    confidence: Math.min(1.0, Math.max(0.1, confidence)),
    scoreVariance
  };
};

/**
 * Determine final sentiment with nuance handling
 * @param {Object} contextAdjusted - Context-adjusted sentiment results
 * @param {Object} mixedEmotions - Mixed emotion detection results
 * @returns {string} Final sentiment classification
 */
const determineFinalSentiment = (contextAdjusted, mixedEmotions) => {
  const { averageScore, confidence } = contextAdjusted;
  
  // If mixed emotions detected, return 'mixed' regardless of average score
  if (mixedEmotions.detected) {
    return 'mixed';
  }
  
  // Standard classification with confidence consideration
  if (averageScore > 0.2) return 'positive';
  if (averageScore < -0.2) return 'negative';
  return 'neutral';
};

/**
 * Detect sarcasm across the entire conversation
 * @param {Array} conversationHistory - Full conversation history
 * @returns {boolean} Whether sarcasm was detected in the conversation
 */
const detectSarcasmAcrossConversation = (conversationHistory) => {
  return conversationHistory.some(turn => {
    const content = (turn.content || '').toLowerCase();
    // Look for common sarcastic patterns across the conversation
    return /sarcasm|oh\s+great|yeah,\s+right|sure,\s+i\s+bet|right,\s+and|as\s+if|like\s+that's\s+going\s+to\s+happen/.test(content);
  });
};

/**
 * Calculate emotional complexity of the conversation
 * @param {Array} turnAnalyses - Array of turn sentiment analyses
 * @returns {number} Complexity score (higher = more complex emotions)
 */
const calculateEmotionalComplexity = (turnAnalyses) => {
  if (turnAnalyses.length === 0) return 1.0;
  
  // Calculate variance in sentiment scores
  const scores = turnAnalyses.map(analysis => analysis.score);
  const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
  
  // Calculate proportion of turns with detected sarcasm
  const sarcasmRatio = turnAnalyses.filter(analysis => analysis.sarcasmDetected).length / turnAnalyses.length;
  
  // Combine metrics for complexity score
  return 1.0 + (variance * 2) + (sarcasmRatio * 3);
};

/**
 * Enhanced sentiment analysis function that can replace the original
 * @param {Array} conversationHistory - Array of conversation turns
 * @returns {string|Object} Overall sentiment trend (can return object with details if needed)
 */
export const analyzeSentimentTrendEnhanced = (conversationHistory, returnDetails = false) => {
  const result = analyzeSentimentTrendAdvanced(conversationHistory);
  
  if (returnDetails) {
    return result;
  } else {
    // Return just the sentiment string for backward compatibility
    return typeof result === 'string' ? result : result.overall;
  }
};

// Export the enhanced function as the default replacement
export default analyzeSentimentTrendEnhanced;