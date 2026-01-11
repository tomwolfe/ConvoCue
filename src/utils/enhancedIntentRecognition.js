/**
 * Enhanced Intent Recognition System with Context Awareness
 * 
 * This module extends the base intent recognition with:
 * 1. Conversation history context analysis
 * 2. Multi-turn intent correlation
 * 3. Sentiment-aware intent detection
 * 4. Cultural context consideration
 */

import { detectIntentWithContext, detectMultipleIntents, ALL_INTENTS } from './intentRecognition';
import { getConversationManager, getConversationHistory } from '../conversationManager';

// Enhanced intent patterns with context clues
const CONTEXT_PATTERNS = {
  // Transition patterns that indicate shifts in conversation direction
  transition: {
    patterns: [
      { text: ['but', 'however', 'although', 'though', 'yet', 'still'], weight: 0.9, effect: 'shift' },
      { text: ['so', 'therefore', 'thus', 'hence', 'accordingly'], weight: 0.8, effect: 'continuation' },
      { text: ['meanwhile', 'in contrast', 'on the other hand'], weight: 0.85, effect: 'contrast' }
    ]
  },
  // Emotional intensifiers that modify intent interpretation
  emotional: {
    patterns: [
      { text: ['very', 'extremely', 'incredibly', 'highly', 'absolutely'], weight: 0.7, effect: 'intensify' },
      { text: ['slightly', 'somewhat', 'a bit', 'rather'], weight: 0.6, effect: 'moderate' },
      { text: ['not', 'never', 'no', 'nothing', 'nobody'], weight: 0.8, effect: 'negate' }
    ]
  },
  // Temporal indicators that affect intent interpretation
  temporal: {
    patterns: [
      { text: ['now', 'currently', 'today', 'right now'], weight: 0.7, effect: 'immediate' },
      { text: ['later', 'tomorrow', 'eventually', 'someday'], weight: 0.6, effect: 'future' },
      { text: ['before', 'previously', 'earlier', 'past'], weight: 0.6, effect: 'past' }
    ]
  }
};

/**
 * Analyzes conversation history to identify patterns and context
 * @param {Array} conversationHistory - Array of conversation turns
 * @returns {Object} Context analysis results
 */
export const analyzeConversationContext = (conversationHistory = []) => {
  if (!conversationHistory || conversationHistory.length === 0) {
    return {
      dominantSpeaker: null,
      topicTrends: [],
      sentimentTrend: 'neutral',
      conversationStage: 'opening', // opening, middle, closing
      culturalContext: null,
      emotionalIntensity: 'moderate'
    };
  }

  // Analyze speaker distribution
  const speakerCounts = conversationHistory.reduce((acc, turn) => {
    acc[turn.role] = (acc[turn.role] || 0) + 1;
    return acc;
  }, {});
  
  const dominantSpeaker = Object.entries(speakerCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  // Analyze topic trends (extract key terms from conversation)
  const allText = conversationHistory.map(turn => turn.content || '').join(' ').toLowerCase();
  const topicTrends = extractTopicTrends(allText);

  // Determine conversation stage based on position
  const totalTurns = conversationHistory.length;
  let conversationStage = 'middle';
  if (totalTurns <= 3) conversationStage = 'opening';
  else if (totalTurns > 15) conversationStage = 'closing';

  // Analyze sentiment trend
  const sentimentTrend = analyzeSentimentTrend(conversationHistory);

  // Analyze emotional intensity
  const emotionalIntensity = analyzeEmotionalIntensity(conversationHistory);

  return {
    dominantSpeaker,
    topicTrends,
    sentimentTrend,
    conversationStage,
    culturalContext: inferCulturalContext(conversationHistory),
    emotionalIntensity
  };
};

/**
 * Extracts topic trends from conversation text
 * @param {string} text - Combined conversation text
 * @returns {Array} Array of trending topics
 */
const extractTopicTrends = (text) => {
  const words = text.split(/\s+/);
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
    'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
    'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her', 'its', 'our', 'their'
  ]);

  const wordFreq = {};
  for (const word of words) {
    const cleanWord = word.replace(/[^\w\s]/g, '').trim();
    if (cleanWord.length > 4 && !stopWords.has(cleanWord)) {
      wordFreq[cleanWord] = (wordFreq[cleanWord] || 0) + 1;
    }
  }

  return Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
};

/**
 * Analyzes sentiment trend in conversation
 * @param {Array} conversationHistory - Array of conversation turns
 * @returns {string} Overall sentiment trend
 */
const analyzeSentimentTrend = (conversationHistory) => {
  // Enhanced sentiment analysis with negation handling and context awareness
  const positiveKeywords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'love', 'like', 'happy', 'pleased', 'satisfied', 'perfect', 'awesome', 'fantastic'];
  const negativeKeywords = ['bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'angry', 'frustrated', 'annoyed', 'disappointed', 'worst', 'sucks', 'disgusting'];
  const negationWords = ['not', 'no', 'never', 'nothing', 'nowhere', 'neither', 'nor', 'none', 'nobody', 'nothing', 'don\'t', 'doesn\'t', 'didn\'t', 'won\'t', 'wouldn\'t', 'couldn\'t', 'shouldn\'t', 'can\'t', 'cannot'];
  const intensifiers = ['very', 'extremely', 'incredibly', 'highly', 'absolutely', 'totally', 'completely', 'really', 'quite', 'so', 'such'];
  const sarcasmMarkers = ['oh', 'right', 'sure', 'yeah', 'yep', 'great', 'fantastic', 'wonderful']; // Context-dependent sarcasm indicators

  let sentimentScore = 0;
  let totalWords = 0;

  conversationHistory.forEach(turn => {
    const content = (turn.content || '').toLowerCase();
    const words = content.split(/\s+/);

    for (let i = 0; i < words.length; i++) {
      const word = words[i].replace(/[^\w\s]/g, '');
      if (!word) continue;

      totalWords++;

      // Check for negation within 3 words before positive/negative keywords
      const contextWindow = 3;
      const startIdx = Math.max(0, i - contextWindow);
      const endIdx = Math.min(words.length, i + 1);
      const context = words.slice(startIdx, endIdx).join(' ');

      // Check for intensifiers
      const hasIntensifier = intensifiers.some(intensifier =>
        context.includes(intensifier) || (i > 0 && words[i-1] === intensifier)
      );

      // Check for negation
      const hasNegation = negationWords.some(negation =>
        context.includes(negation)
      );

      // Check for positive keywords
      if (positiveKeywords.includes(word)) {
        let wordScore = hasNegation ? -1 : 1;
        wordScore *= hasIntensifier ? 1.5 : 1;
        sentimentScore += wordScore;
      }
      // Check for negative keywords
      else if (negativeKeywords.includes(word)) {
        let wordScore = hasNegation ? 1 : -1;
        wordScore *= hasIntensifier ? 1.5 : 1;
        sentimentScore += wordScore;
      }
    }
  });

  // Normalize the sentiment score based on total words
  const normalizedScore = totalWords > 0 ? sentimentScore / totalWords : 0;

  // Determine sentiment based on normalized score
  if (normalizedScore > 0.1) return 'positive';
  if (normalizedScore < -0.1) return 'negative';
  return 'neutral';
};

/**
 * Analyzes emotional intensity in conversation
 * @param {Array} conversationHistory - Array of conversation turns
 * @returns {string} Emotional intensity level
 */
const analyzeEmotionalIntensity = (conversationHistory) => {
  const highIntensityMarkers = ['!', '?', 'very', 'extremely', 'incredibly', 'absolutely', 'definitely', 'totally', 'completely'];
  const moderateIntensityMarkers = ['quite', 'pretty', 'rather', 'fairly', 'somewhat'];
  
  let highIntensityCount = 0;
  let moderateIntensityCount = 0;

  conversationHistory.forEach(turn => {
    const content = (turn.content || '').toLowerCase();
    
    highIntensityMarkers.forEach(marker => {
      if (content.includes(marker)) highIntensityCount++;
    });
    
    moderateIntensityMarkers.forEach(marker => {
      if (content.includes(marker)) moderateIntensityCount++;
    });
  });

  if (highIntensityCount > moderateIntensityCount * 2) return 'high';
  if (moderateIntensityCount > 0) return 'moderate';
  return 'low';
};

/**
 * Infers cultural context from conversation
 * @param {Array} conversationHistory - Array of conversation turns
 * @returns {string|null} Inferred cultural context
 */
const inferCulturalContext = (conversationHistory) => {
  // Enhanced cultural context detection with more nuanced patterns
  const culturalPatterns = {
    'formal': {
      keywords: ['sir', 'ma\'am', 'please', 'thank you', 'excuse me', 'pardon me', 'regards', 'dear', 'respected', 'esteemed', 'honorable'],
      phrases: ['i would like to', 'if you would be so kind', 'i was wondering if', 'i respectfully', 'with due respect'],
      formalityIndicators: ['title', 'last_name_usage', 'proper_salutations']
    },
    'business': {
      keywords: ['meeting', 'project', 'deadline', 'budget', 'contract', 'negotiation', 'proposal', 'quarterly', 'revenue', 'strategy', 'objective', 'agenda'],
      phrases: ['per our discussion', 'as per the agreement', 'let\'s circle back', 'synergize', 'moving forward', 'at your earliest convenience'],
      formalityIndicators: ['professional_jargon', 'structured_format']
    },
    'casual_professional': {
      keywords: ['team', 'collaborate', 'feedback', 'thoughts', 'input', 'brainstorm', 'chill', 'cool', 'awesome', 'sweet'],
      phrases: ['sounds good', 'let me know', 'what do you think', 'check this out', 'got it', 'no worries'],
      formalityIndicators: ['first_name_usage', 'friendly_tone']
    },
    'casual': {
      keywords: ['weekend', 'movie', 'food', 'coffee', 'fun', 'party', 'game', 'dude', 'bro', 'chill', 'hang out'],
      phrases: ['what\'s up', 'how\'s it going', 'catch me up', 'tell me about it', 'for sure', 'no way', 'cool beans'],
      formalityIndicators: ['slang', 'informal_greetings']
    }
  };

  const culturalScores = {};

  Object.entries(culturalPatterns).forEach(([context, pattern]) => {
    let score = 0;

    // Score based on keywords
    conversationHistory.forEach(turn => {
      const content = (turn.content || '').toLowerCase();

      // Keyword matching
      pattern.keywords.forEach(keyword => {
        if (content.includes(keyword)) score++;
      });

      // Phrase matching
      pattern.phrases.forEach(phrase => {
        if (content.includes(phrase)) score += 1.5; // Phrases get higher weight
      });
    });

    culturalScores[context] = score;
  });

  // Find the context with the highest score, but also consider if multiple contexts are present
  const sortedContexts = Object.entries(culturalScores).sort((a, b) => b[1] - a[1]);
  const maxContext = sortedContexts[0];

  // Return the context if it has a meaningful score, otherwise return null
  return maxContext && maxContext[1] > 0 ? maxContext[0] : null;
};

/**
 * Enhanced intent detection with full context awareness
 * @param {string} input - Input text to analyze
 * @param {Array} conversationHistory - Recent conversation history
 * @param {Object} options - Configuration options
 * @returns {Object} Enhanced intent detection result
 */
export const detectIntentWithFullContext = (input, conversationHistory = [], options = {}) => {
  const startTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

  const {
    threshold = 0.4,
    enableMultiIntent = true,
    enableSentimentAdjustment = true,
    enableTemporalAdjustment = true
  } = options;

  // Get base intent detection
  const baseResult = detectIntentWithContext(input, conversationHistory);

  // Analyze conversation context
  const contextAnalysis = analyzeConversationContext(conversationHistory);

  // If multi-intent detection is enabled, return multiple intents with context-weighted scores
  if (enableMultiIntent) {
    const multiIntents = detectMultipleIntents(input, threshold);

    // Apply context weights to multiple intents using a unified approach
    const contextualIntents = multiIntents.map(intentObj => {
      let weightedConfidence = intentObj.confidence;
      let totalBoost = 0; // Track total boost to prevent over-adjustment

      // Apply all context adjustments consistently
      if (enableSentimentAdjustment) {
        const sentimentBoost = applySentimentAdjustment(weightedConfidence, contextAnalysis.sentimentTrend, input, intentObj.intent) - weightedConfidence;
        if (Math.abs(sentimentBoost) > 0.01) { // Only apply if there's a meaningful change
          const cappedBoost = Math.max(-0.15, Math.min(0.15, sentimentBoost)); // Cap individual boosts
          weightedConfidence += cappedBoost;
          totalBoost += Math.abs(cappedBoost);
        }
      }

      const culturalBoost = applyCulturalContextAdjustment(weightedConfidence, contextAnalysis.culturalContext, intentObj.intent) - weightedConfidence;
      if (Math.abs(culturalBoost) > 0.01) {
        const cappedBoost = Math.max(-0.1, Math.min(0.1, culturalBoost)); // Cap individual boosts
        weightedConfidence += cappedBoost;
        totalBoost += Math.abs(cappedBoost);
      }

      if (enableTemporalAdjustment) {
        const temporalBoost = applyTemporalContextAdjustment(weightedConfidence, contextAnalysis.conversationStage, input, intentObj.intent) - weightedConfidence;
        if (Math.abs(temporalBoost) > 0.01) {
          const cappedBoost = Math.max(-0.1, Math.min(0.1, temporalBoost)); // Cap individual boosts
          weightedConfidence += cappedBoost;
          totalBoost += Math.abs(cappedBoost);
        }
      }

      // Boost confidence based on conversation context
      if (contextAnalysis.topicTrends.some(topic =>
        intentObj.intent.toLowerCase().includes(topic) ||
        topic.toLowerCase().includes(intentObj.intent.toLowerCase())
      )) {
        const topicBoost = weightedConfidence * 0.2 - weightedConfidence; // 20% increase
        if (Math.abs(topicBoost) > 0.01) {
          const cappedBoost = Math.max(-0.15, Math.min(0.15, topicBoost)); // Cap individual boosts
          weightedConfidence = Math.min(1.0, weightedConfidence + cappedBoost);
          totalBoost += Math.abs(cappedBoost);
        }
      }

      // Adjust based on emotional intensity
      if (contextAnalysis.emotionalIntensity === 'high' && ['conflict', 'empathy', 'strategic'].includes(intentObj.intent)) {
        const emotionBoost = weightedConfidence * 0.15 - weightedConfidence; // 15% increase
        if (Math.abs(emotionBoost) > 0.01) {
          const cappedBoost = Math.max(-0.15, Math.min(0.15, emotionBoost)); // Cap individual boosts
          weightedConfidence = Math.min(1.0, weightedConfidence + cappedBoost);
          totalBoost += Math.abs(cappedBoost);
        }
      }

      // Prevent over-adjustment by limiting total boost
      if (totalBoost > 0.3) { // Limit total adjustment to 30%
        // Scale down all adjustments proportionally
        const scaleFactor = 0.3 / totalBoost;
        weightedConfidence = intentObj.confidence + (weightedConfidence - intentObj.confidence) * scaleFactor;
      }

      return {
        ...intentObj,
        confidence: Math.min(1.0, weightedConfidence), // Ensure confidence doesn't exceed 1.0
        contextWeight: calculateContextWeight(intentObj.intent, contextAnalysis)
      };
    });

    // Sort by weighted confidence
    contextualIntents.sort((a, b) => b.confidence - a.confidence);

    const endTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    const processingTime = endTime - startTime;

    const result = {
      primaryIntent: contextualIntents[0] || { intent: null, confidence: 0 },
      allIntents: contextualIntents,
      contextAnalysis,
      isContextual: true
    };

    // Log performance metrics
    logIntentDetectionMetrics(input, result, processingTime);

    return result;
  }

  // Apply context adjustments to single intent result with over-adjustment prevention
  let adjustedResult = { ...baseResult };
  let totalBoost = 0; // Track total boost to prevent over-adjustment

  // Adjust confidence based on conversation context
  if (enableSentimentAdjustment) {
    const originalConfidence = adjustedResult.confidence;
    const newConfidence = applySentimentAdjustment(originalConfidence, contextAnalysis.sentimentTrend, input, adjustedResult.intent);
    const boost = newConfidence - originalConfidence;
    if (Math.abs(boost) > 0.01) {
      const cappedBoost = Math.max(-0.15, Math.min(0.15, boost)); // Cap individual boosts
      adjustedResult.confidence = originalConfidence + cappedBoost;
      totalBoost += Math.abs(cappedBoost);
    }
  }

  // Apply cultural context adjustments
  const originalConfidenceAfterSentiment = adjustedResult.confidence;
  const culturalAdjustedConfidence = applyCulturalContextAdjustment(originalConfidenceAfterSentiment, contextAnalysis.culturalContext, adjustedResult.intent);
  const culturalBoost = culturalAdjustedConfidence - originalConfidenceAfterSentiment;
  if (Math.abs(culturalBoost) > 0.01) {
    const cappedBoost = Math.max(-0.1, Math.min(0.1, culturalBoost)); // Cap individual boosts
    adjustedResult.confidence = originalConfidenceAfterSentiment + cappedBoost;
    totalBoost += Math.abs(cappedBoost);
  }

  // Apply temporal context adjustments
  if (enableTemporalAdjustment) {
    const originalConfidenceAfterCultural = adjustedResult.confidence;
    const temporalAdjustedConfidence = applyTemporalContextAdjustment(originalConfidenceAfterCultural, contextAnalysis.conversationStage, input, adjustedResult.intent);
    const temporalBoost = temporalAdjustedConfidence - originalConfidenceAfterCultural;
    if (Math.abs(temporalBoost) > 0.01) {
      const cappedBoost = Math.max(-0.1, Math.min(0.1, temporalBoost)); // Cap individual boosts
      adjustedResult.confidence = originalConfidenceAfterCultural + cappedBoost;
      totalBoost += Math.abs(cappedBoost);
    }
  }

  // Prevent over-adjustment by limiting total boost
  if (totalBoost > 0.3) { // Limit total adjustment to 30%
    // Scale down all adjustments proportionally
    const scaleFactor = 0.3 / totalBoost;
    adjustedResult.confidence = baseResult.confidence + (adjustedResult.confidence - baseResult.confidence) * scaleFactor;
  }

  // Ensure confidence doesn't exceed 1.0
  adjustedResult.confidence = Math.min(1.0, adjustedResult.confidence);

  const endTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  const processingTime = endTime - startTime;

  const result = {
    ...adjustedResult,
    contextAnalysis,
    isContextual: true
  };

  // Log performance metrics
  logIntentDetectionMetrics(input, result, processingTime);

  // Return single intent with context information
  return result;
};

/**
 * Adjusts intent confidence based on sentiment context
 * @param {number} confidence - Original confidence score
 * @param {string} sentimentTrend - Overall conversation sentiment
 * @param {string} input - Input text
 * @param {string} intent - Intent name
 * @returns {number} Adjusted confidence score
 */
const applySentimentAdjustment = (confidence, sentimentTrend, input, intent) => {
  // Boost empathy intent when sentiment is negative
  if (sentimentTrend === 'negative' && input.toLowerCase().includes('sorry') && intent === 'empathy') {
    return Math.min(1.0, confidence + 0.15);
  }

  // Boost conflict intent when sentiment is negative and input contains disagreement
  if (sentimentTrend === 'negative' &&
      (input.toLowerCase().includes('wrong') || input.toLowerCase().includes('disagree')) && intent === 'conflict') {
    return Math.min(1.0, confidence + 0.1);
  }

  // Boost social intent when sentiment is positive
  if (sentimentTrend === 'positive' &&
      (input.toLowerCase().includes('thanks') || input.toLowerCase().includes('great')) && intent === 'social') {
    return Math.min(1.0, confidence + 0.08);
  }

  return confidence;
};

/**
 * Adjusts intent based on sentiment context (for single intent)
 * @param {Object} intentResult - Original intent detection result
 * @param {string} sentimentTrend - Overall conversation sentiment
 * @param {string} input - Input text
 * @returns {Object} Adjusted intent result
 */
const adjustIntentBySentiment = (intentResult, sentimentTrend, input) => {
  const adjustedConfidence = applySentimentAdjustment(intentResult.confidence, sentimentTrend, input, intentResult.intent);
  return {
    ...intentResult,
    confidence: adjustedConfidence
  };
};

/**
 * Adjusts intent confidence based on cultural context
 * @param {number} confidence - Original confidence score
 * @param {string} culturalContext - Inferred cultural context
 * @param {string} intent - Intent name
 * @returns {number} Adjusted confidence score
 */
const applyCulturalContextAdjustment = (confidence, culturalContext, intent) => {
  if (!culturalContext) return confidence;

  // In formal contexts, boost strategic and language intents
  if (culturalContext === 'formal' && ['strategic', 'language', 'clarity'].includes(intent)) {
    return Math.min(1.0, confidence + 0.05);
  }

  // In business contexts, boost strategic, negotiation, and action intents
  if (culturalContext === 'business' &&
      ['strategic', 'negotiation', 'action', 'execution'].includes(intent)) {
    return Math.min(1.0, confidence + 0.07);
  }

  // In casual professional contexts, boost social and empathy intents
  if (culturalContext === 'casual_professional' &&
      ['social', 'empathy', 'agreement'].includes(intent)) {
    return Math.min(1.0, confidence + 0.06);
  }

  return confidence;
};

/**
 * Adjusts intent based on cultural context
 * @param {Object} intentResult - Original intent detection result
 * @param {string} culturalContext - Inferred cultural context
 * @returns {Object} Adjusted intent result
 */
const adjustIntentByCulturalContext = (intentResult, culturalContext) => {
  if (!culturalContext) return intentResult;

  const adjustedConfidence = applyCulturalContextAdjustment(intentResult.confidence, culturalContext, intentResult.intent);
  return {
    ...intentResult,
    confidence: adjustedConfidence
  };
};

/**
 * Adjusts intent confidence based on temporal context
 * @param {number} confidence - Original confidence score
 * @param {string} conversationStage - Current stage of conversation
 * @param {string} input - Input text
 * @param {string} intent - Intent name
 * @returns {number} Adjusted confidence score
 */
const applyTemporalContextAdjustment = (confidence, conversationStage, input, intent) => {
  // In opening stages, boost social and question intents
  if (conversationStage === 'opening' && ['social', 'question'].includes(intent)) {
    return Math.min(1.0, confidence + 0.05);
  }

  // In closing stages, boost action and execution intents
  if (conversationStage === 'closing' && ['action', 'execution'].includes(intent)) {
    return Math.min(1.0, confidence + 0.05);
  }

  // Adjust based on temporal keywords in input
  const temporalKeywords = {
    'immediate': ['now', 'immediately', 'right now', 'today'],
    'future': ['later', 'tomorrow', 'next week', 'eventually'],
    'past': ['before', 'previously', 'earlier', 'yesterday']
  };

  for (const [timeType, keywords] of Object.entries(temporalKeywords)) {
    if (keywords.some(keyword => input.toLowerCase().includes(keyword))) {
      // Boost action and execution for immediate terms
      if (timeType === 'immediate' && ['action', 'execution'].includes(intent)) {
        return Math.min(1.0, confidence + 0.08);
      }
      // Boost strategic for future terms
      if (timeType === 'future' && ['strategic', 'planning'].includes(intent)) {
        return Math.min(1.0, confidence + 0.06);
      }
    }
  }

  return confidence;
};

/**
 * Adjusts intent based on temporal context
 * @param {Object} intentResult - Original intent detection result
 * @param {string} conversationStage - Current stage of conversation
 * @param {string} input - Input text
 * @returns {Object} Adjusted intent result
 */
const adjustIntentByTemporalContext = (intentResult, conversationStage, input) => {
  const adjustedConfidence = applyTemporalContextAdjustment(intentResult.confidence, conversationStage, input, intentResult.intent);
  return {
    ...intentResult,
    confidence: adjustedConfidence
  };
};

/**
 * Calculates context weight for an intent
 * @param {string} intent - Intent name
 * @param {Object} contextAnalysis - Context analysis results
 * @returns {number} Context weight (0-1)
 */
const calculateContextWeight = (intent, contextAnalysis) => {
  let weight = 0.5; // Base weight
  
  // Boost weight if intent aligns with topic trends
  if (contextAnalysis.topicTrends.some(topic => 
    intent.toLowerCase().includes(topic) || 
    topic.toLowerCase().includes(intent.toLowerCase())
  )) {
    weight += 0.2;
  }
  
  // Boost weight based on cultural context alignment
  if (contextAnalysis.culturalContext === 'business' && 
      ['strategic', 'negotiation', 'action', 'execution'].includes(intent)) {
    weight += 0.15;
  }
  
  // Boost weight based on emotional intensity alignment
  if (contextAnalysis.emotionalIntensity === 'high' && 
      ['conflict', 'empathy', 'strategic'].includes(intent)) {
    weight += 0.1;
  }
  
  // Boost weight based on conversation stage alignment
  if (contextAnalysis.conversationStage === 'opening' && 
      ['social', 'question'].includes(intent)) {
    weight += 0.1;
  }
  
  if (contextAnalysis.conversationStage === 'closing' && 
      ['action', 'execution'].includes(intent)) {
    weight += 0.1;
  }
  
  return Math.min(1.0, weight);
};

/**
 * Gets recent conversation history for context
 * @param {number} maxTurns - Maximum number of turns to retrieve
 * @returns {Array} Recent conversation history
 */
export const getRecentConversationHistory = (maxTurns = 10) => {
  const history = getConversationHistory();
  return history.slice(-maxTurns);
};

/**
 * Gets conversation summary for longer contexts
 * @param {Array} conversationHistory - Full conversation history
 * @param {number} maxTurns - Maximum number of turns to summarize
 * @returns {Array} Summarized conversation history
 */
export const getSummarizedConversationHistory = (conversationHistory, maxTurns = 10) => {
  if (conversationHistory.length <= maxTurns) {
    return conversationHistory;
  }

  // For longer conversations, return the most recent turns plus key earlier turns
  // This preserves important early context while maintaining performance
  const recentTurns = conversationHistory.slice(-Math.floor(maxTurns / 2));
  const keyEarlyTurns = conversationHistory.slice(0, maxTurns - recentTurns.length);

  return [...keyEarlyTurns, ...recentTurns];
};

/**
 * Detects intent with enhanced context from the current conversation
 * @param {string} input - Input text to analyze
 * @param {number} contextTurns - Number of recent turns to consider for context
 * @param {boolean} useSummarization - Whether to use summarization for longer contexts
 * @returns {Object} Enhanced intent detection result
 */
export const detectIntentWithConversationContext = (input, contextTurns = 5, useSummarization = false) => {
  let recentHistory;
  if (useSummarization) {
    const fullHistory = getConversationHistory();
    recentHistory = getSummarizedConversationHistory(fullHistory, contextTurns);
  } else {
    recentHistory = getRecentConversationHistory(contextTurns);
  }
  return detectIntentWithFullContext(input, recentHistory);
};

/**
 * Logs performance metrics for intent detection
 * @param {Object} input - Input text and context
 * @param {Object} result - Detection result
 * @param {number} processingTime - Time taken for processing
 */
export const logIntentDetectionMetrics = (input, result, processingTime) => {
  // In a real implementation, this would send metrics to an analytics service
  // For now, we'll just store them locally for potential retrieval
  const metricEntry = {
    timestamp: Date.now(),
    inputLength: input.length,
    processingTime,
    primaryIntent: result.primaryIntent?.intent || null,
    primaryConfidence: result.primaryIntent?.confidence || 0,
    numIntents: result.allIntents?.length || 0,
    contextUsed: !!result.contextAnalysis,
    sentimentTrend: result.contextAnalysis?.sentimentTrend,
    culturalContext: result.contextAnalysis?.culturalContext,
    conversationStage: result.contextAnalysis?.conversationStage
  };

  // Store metrics in localStorage or send to analytics service
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const existingMetrics = JSON.parse(localStorage.getItem('intentDetectionMetrics') || '[]');
      existingMetrics.push(metricEntry);
      // Keep only the last 1000 entries to prevent storage overflow
      const recentMetrics = existingMetrics.slice(-1000);
      localStorage.setItem('intentDetectionMetrics', JSON.stringify(recentMetrics));
    } catch (e) {
      console.warn('Could not store intent detection metrics:', e);
    }
  }

  return metricEntry;
};

// Export all functions for use
export {
  analyzeConversationContext,
  extractTopicTrends,
  analyzeSentimentTrend,
  analyzeEmotionalIntensity,
  inferCulturalContext,
  logIntentDetectionMetrics
};