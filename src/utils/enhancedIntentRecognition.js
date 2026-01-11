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
  // Simple sentiment analysis based on keywords
  const positiveKeywords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'love', 'like', 'happy', 'pleased', 'satisfied', 'perfect', 'awesome', 'fantastic'];
  const negativeKeywords = ['bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'angry', 'frustrated', 'annoyed', 'disappointed', 'worst', 'sucks', 'disgusting'];

  let positiveCount = 0;
  let negativeCount = 0;

  conversationHistory.forEach(turn => {
    const content = (turn.content || '').toLowerCase();
    positiveKeywords.forEach(keyword => {
      if (content.includes(keyword)) positiveCount++;
    });
    negativeKeywords.forEach(keyword => {
      if (content.includes(keyword)) negativeCount++;
    });
  });

  if (positiveCount > negativeCount * 1.5) return 'positive';
  if (negativeCount > positiveCount * 1.5) return 'negative';
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
  const culturalKeywords = {
    'formal': ['sir', 'ma\'am', 'please', 'thank you', 'excuse me', 'pardon me', 'regards'],
    'informal': ['dude', 'bro', 'chill', 'hang out', 'cool', 'awesome', 'sweet'],
    'business': ['meeting', 'project', 'deadline', 'budget', 'contract', 'negotiation', 'proposal'],
    'casual': ['weekend', 'movie', 'food', 'coffee', 'fun', 'party', 'game']
  };

  const culturalScores = {};
  
  Object.entries(culturalKeywords).forEach(([context, keywords]) => {
    let score = 0;
    conversationHistory.forEach(turn => {
      const content = (turn.content || '').toLowerCase();
      keywords.forEach(keyword => {
        if (content.includes(keyword)) score++;
      });
    });
    culturalScores[context] = score;
  });

  const maxContext = Object.entries(culturalScores).sort((a, b) => b[1] - a[1])[0];
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
  
  // Apply context adjustments to the base result
  let adjustedResult = { ...baseResult };
  
  // Adjust confidence based on conversation context
  if (enableSentimentAdjustment) {
    adjustedResult = adjustIntentBySentiment(adjustedResult, contextAnalysis.sentimentTrend, input);
  }
  
  // Apply cultural context adjustments
  adjustedResult = adjustIntentByCulturalContext(adjustedResult, contextAnalysis.culturalContext);
  
  // Apply temporal context adjustments
  if (enableTemporalAdjustment) {
    adjustedResult = adjustIntentByTemporalContext(adjustedResult, contextAnalysis.conversationStage, input);
  }
  
  // If multi-intent detection is enabled, return multiple intents with context-weighted scores
  if (enableMultiIntent) {
    const multiIntents = detectMultipleIntents(input, threshold);
    
    // Apply context weights to multiple intents
    const contextualIntents = multiIntents.map(intentObj => {
      let weightedConfidence = intentObj.confidence;
      
      // Boost confidence based on conversation context
      if (contextAnalysis.topicTrends.some(topic => 
        intentObj.intent.toLowerCase().includes(topic) || 
        topic.toLowerCase().includes(intentObj.intent.toLowerCase())
      )) {
        weightedConfidence = Math.min(1.0, weightedConfidence * 1.2);
      }
      
      // Adjust based on emotional intensity
      if (contextAnalysis.emotionalIntensity === 'high' && ['conflict', 'empathy', 'strategic'].includes(intentObj.intent)) {
        weightedConfidence = Math.min(1.0, weightedConfidence * 1.15);
      }
      
      return {
        ...intentObj,
        confidence: weightedConfidence,
        contextWeight: calculateContextWeight(intentObj.intent, contextAnalysis)
      };
    });
    
    // Sort by weighted confidence
    contextualIntents.sort((a, b) => b.confidence - a.confidence);
    
    return {
      primaryIntent: contextualIntents[0] || { intent: null, confidence: 0 },
      allIntents: contextualIntents,
      contextAnalysis,
      isContextual: true
    };
  }
  
  // Return single intent with context information
  return {
    ...adjustedResult,
    contextAnalysis,
    isContextual: true
  };
};

/**
 * Adjusts intent based on sentiment context
 * @param {Object} intentResult - Original intent detection result
 * @param {string} sentimentTrend - Overall conversation sentiment
 * @param {string} input - Input text
 * @returns {Object} Adjusted intent result
 */
const adjustIntentBySentiment = (intentResult, sentimentTrend, input) => {
  // Boost empathy intent when sentiment is negative
  if (sentimentTrend === 'negative' && input.toLowerCase().includes('sorry')) {
    return {
      intent: 'empathy',
      confidence: Math.min(1.0, intentResult.confidence + 0.15)
    };
  }
  
  // Boost conflict intent when sentiment is negative and input contains disagreement
  if (sentimentTrend === 'negative' && 
      (input.toLowerCase().includes('wrong') || input.toLowerCase().includes('disagree'))) {
    return {
      intent: 'conflict',
      confidence: Math.min(1.0, intentResult.confidence + 0.1)
    };
  }
  
  // Boost social intent when sentiment is positive
  if (sentimentTrend === 'positive' && 
      (input.toLowerCase().includes('thanks') || input.toLowerCase().includes('great'))) {
    return {
      intent: 'social',
      confidence: Math.min(1.0, intentResult.confidence + 0.08)
    };
  }
  
  return intentResult;
};

/**
 * Adjusts intent based on cultural context
 * @param {Object} intentResult - Original intent detection result
 * @param {string} culturalContext - Inferred cultural context
 * @returns {Object} Adjusted intent result
 */
const adjustIntentByCulturalContext = (intentResult, culturalContext) => {
  if (!culturalContext) return intentResult;
  
  // In formal contexts, boost strategic and language intents
  if (culturalContext === 'formal' && ['strategic', 'language', 'clarity'].includes(intentResult.intent)) {
    return {
      ...intentResult,
      confidence: Math.min(1.0, intentResult.confidence + 0.05)
    };
  }
  
  // In business contexts, boost strategic, negotiation, and action intents
  if (culturalContext === 'business' && 
      ['strategic', 'negotiation', 'action', 'execution'].includes(intentResult.intent)) {
    return {
      ...intentResult,
      confidence: Math.min(1.0, intentResult.confidence + 0.07)
    };
  }
  
  return intentResult;
};

/**
 * Adjusts intent based on temporal context
 * @param {Object} intentResult - Original intent detection result
 * @param {string} conversationStage - Current stage of conversation
 * @param {string} input - Input text
 * @returns {Object} Adjusted intent result
 */
const adjustIntentByTemporalContext = (intentResult, conversationStage, input) => {
  // In opening stages, boost social and question intents
  if (conversationStage === 'opening' && ['social', 'question'].includes(intentResult.intent)) {
    return {
      ...intentResult,
      confidence: Math.min(1.0, intentResult.confidence + 0.05)
    };
  }
  
  // In closing stages, boost action and execution intents
  if (conversationStage === 'closing' && ['action', 'execution'].includes(intentResult.intent)) {
    return {
      ...intentResult,
      confidence: Math.min(1.0, intentResult.confidence + 0.05)
    };
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
      if (timeType === 'immediate' && ['action', 'execution'].includes(intentResult.intent)) {
        return {
          ...intentResult,
          confidence: Math.min(1.0, intentResult.confidence + 0.08)
        };
      }
      // Boost strategic for future terms
      if (timeType === 'future' && ['strategic', 'planning'].includes(intentResult.intent)) {
        return {
          ...intentResult,
          confidence: Math.min(1.0, intentResult.confidence + 0.06)
        };
      }
    }
  }
  
  return intentResult;
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
 * Detects intent with enhanced context from the current conversation
 * @param {string} input - Input text to analyze
 * @param {number} contextTurns - Number of recent turns to consider for context
 * @returns {Object} Enhanced intent detection result
 */
export const detectIntentWithConversationContext = (input, contextTurns = 5) => {
  const recentHistory = getRecentConversationHistory(contextTurns);
  return detectIntentWithFullContext(input, recentHistory);
};

// Export all functions for use
export {
  analyzeConversationContext,
  extractTopicTrends,
  analyzeSentimentTrend,
  analyzeEmotionalIntensity,
  inferCulturalContext
};