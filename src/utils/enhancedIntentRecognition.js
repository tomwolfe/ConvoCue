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
import { logIntentDetectionMetricsEnhanced } from './trainingDataCollector';

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

  const culturalContextResult = inferCulturalContext(conversationHistory);
  return {
    dominantSpeaker,
    topicTrends,
    sentimentTrend,
    conversationStage,
    culturalContext: culturalContextResult.context,
    culturalContextConfidence: culturalContextResult.confidence,
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
  // Enhanced sentiment analysis with negation handling, sarcasm detection, and mixed emotion handling
  const positiveKeywords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'love', 'like', 'happy', 'pleased', 'satisfied', 'perfect', 'awesome', 'fantastic'];
  const negativeKeywords = ['bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'angry', 'frustrated', 'annoyed', 'disappointed', 'worst', 'sucks', 'disgusting'];
  const negationWords = ['not', 'no', 'never', 'nothing', 'nowhere', 'neither', 'nor', 'none', 'nobody', 'nothing', 'don\'t', 'doesn\'t', 'didn\'t', 'won\'t', 'wouldn\'t', 'couldn\'t', 'shouldn\'t', 'can\'t', 'cannot'];
  const intensifiers = ['very', 'extremely', 'incredibly', 'highly', 'absolutely', 'totally', 'completely', 'really', 'quite', 'so', 'such'];
  const sarcasmMarkers = ['oh', 'right', 'sure', 'yeah', 'yep', 'great', 'fantastic', 'wonderful', 'brilliant', 'lovely', 'super']; // Context-dependent sarcasm indicators

  let sentimentScore = 0;
  let totalWords = 0;
  const turnSentiments = []; // Track sentiment per turn for mixed emotion detection

  conversationHistory.forEach(turn => {
    const content = (turn.content || '');
    const lowerContent = content.toLowerCase();
    const words = lowerContent.split(/\s+/);

    let turnScore = 0;
    let sarcasmDetected = false;

    // Check for sarcasm patterns
    if (lowerContent.includes('oh great') || lowerContent.includes('oh wonderful') ||
        lowerContent.includes('right,') || lowerContent.includes('sure,') ||
        (lowerContent.includes('yeah') && lowerContent.includes('right')) ||
        (lowerContent.includes('great') && (lowerContent.includes('problem') || lowerContent.includes('issue') || lowerContent.includes('error')))) {
      sarcasmDetected = true;
    }

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

      // Check for sarcasm markers near sentiment words
      const hasSarcasmMarker = sarcasmMarkers.some(marker =>
        context.includes(marker) && Math.abs(words.indexOf(marker) - i) <= 2
      );

      // Check for positive keywords
      if (positiveKeywords.includes(word)) {
        let wordScore = hasNegation ? -1 : 1;

        // If sarcasm is detected and this is a positive word, reverse the sentiment
        if (sarcasmDetected || hasSarcasmMarker) {
          wordScore = -wordScore;
        }

        wordScore *= hasIntensifier ? 1.5 : 1;
        turnScore += wordScore;
      }
      // Check for negative keywords
      else if (negativeKeywords.includes(word)) {
        let wordScore = hasNegation ? 1 : -1;

        // If sarcasm is detected and this is a negative word, reverse the sentiment
        if (sarcasmDetected || hasSarcasmMarker) {
          wordScore = -wordScore;
        }

        wordScore *= hasIntensifier ? 1.5 : 1;
        turnScore += wordScore;
      }
    }

    // Normalize turn score by word count in turn
    const turnWordCount = words.filter(w => w.trim() !== '').length;
    const normalizedTurnScore = turnWordCount > 0 ? turnScore / turnWordCount : 0;
    turnSentiments.push(normalizedTurnScore);
  });

  // Calculate overall sentiment
  const normalizedScore = totalWords > 0 ? sentimentScore / totalWords : 0;

  // Check for mixed emotions (significant variation in turn sentiments)
  if (turnSentiments.length > 1) {
    const maxSentiment = Math.max(...turnSentiments);
    const minSentiment = Math.min(...turnSentiments);
    const sentimentRange = maxSentiment - minSentiment;

    // If there's a wide range of sentiments, it's a mixed emotional conversation
    if (sentimentRange > 0.8) {
      return 'mixed';
    }
  }

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
  // Enhanced cultural context detection with more nuanced patterns and sophisticated NLP
  const culturalPatterns = {
    'formal': {
      keywords: ['sir', 'ma\'am', 'please', 'thank you', 'excuse me', 'pardon me', 'regards', 'dear', 'respected', 'esteemed', 'honorable', 'mr.', 'ms.', 'dr.', 'professor'],
      phrases: ['i would like to', 'if you would be so kind', 'i was wondering if', 'i respectfully', 'with due respect', 'i humbly request', 'it would be appreciated'],
      formalityIndicators: ['title', 'last_name_usage', 'proper_salutations'],
      // Detect formality through sentence structure and politeness markers
      formalityRegex: /\b(?:would|could|might|may|please|i would appreciate|if you would be so kind)\b/gi
    },
    'business': {
      keywords: ['meeting', 'project', 'deadline', 'budget', 'contract', 'negotiation', 'proposal', 'quarterly', 'revenue', 'strategy', 'objective', 'agenda', 'presentation', 'report', 'analysis', 'stakeholder', 'deliverable'],
      phrases: ['per our discussion', 'as per the agreement', 'let\'s circle back', 'synergize', 'moving forward', 'at your earliest convenience', 'touch base', 'circle back', 'drill down'],
      formalityIndicators: ['professional_jargon', 'structured_format'],
      // Detect business context through jargon and professional terminology
      businessRegex: /\b(?:roi|kpi|synergy|bandwidth|leverage|deep dive|action item|follow up|escalate|align|sync|calendar|quarter|fiscal|bottom line)\b/gi
    },
    'casual_professional': {
      keywords: ['team', 'collaborate', 'feedback', 'thoughts', 'input', 'brainstorm', 'chill', 'cool', 'awesome', 'sweet', 'guys', 'folks'],
      phrases: ['sounds good', 'let me know', 'what do you think', 'check this out', 'got it', 'no worries', 'thanks team', 'appreciate it'],
      formalityIndicators: ['first_name_usage', 'friendly_tone'],
      // Detect casual-professional through mixed formality levels
      casualProfessionalRegex: /\b(?:team|awesome|cool|chill|sounds good|got it|no worries|thanks guys)\b/gi
    },
    'casual': {
      keywords: ['weekend', 'movie', 'food', 'coffee', 'fun', 'party', 'game', 'dude', 'bro', 'chill', 'hang out', 'hey', 'hi', 'sup', 'yo'],
      phrases: ['what\'s up', 'how\'s it going', 'catch me up', 'tell me about it', 'for sure', 'no way', 'cool beans', 'see ya', 'later'],
      formalityIndicators: ['slang', 'informal_greetings'],
      // Detect casual context through slang and informal expressions
      casualRegex: /\b(?:dude|bro|chill|hang out|gonna|wanna|lemme|ain\'t|y\'all|ya|sup|hey|ok\b|cool|fun|party|game|movie|food|beer|wine|coffee|weekend)\b/gi
    }
  };

  const culturalScores = {};

  Object.entries(culturalPatterns).forEach(([context, pattern]) => {
    let score = 0;

    // Score based on keywords
    conversationHistory.forEach(turn => {
      const content = (turn.content || '');
      const lowerContent = content.toLowerCase();

      // Keyword matching
      pattern.keywords.forEach(keyword => {
        if (lowerContent.includes(keyword)) score++;
      });

      // Phrase matching
      pattern.phrases.forEach(phrase => {
        if (lowerContent.includes(phrase)) score += 1.5; // Phrases get higher weight
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

  // Find the context with the highest score, but also consider if multiple contexts are present
  const sortedContexts = Object.entries(culturalScores).sort((a, b) => b[1] - a[1]);
  const maxContext = sortedContexts[0];

  // Apply additional heuristics to refine the decision
  if (maxContext && maxContext[1] > 0) {
    const topScore = maxContext[1];
    const secondBest = sortedContexts[1] ? sortedContexts[1][1] : 0;

    // If the difference between top and second best is small, it might be a mixed context
    // In such cases, we might want to return a more nuanced result or default to a safer option
    if (topScore > 0 && (topScore - secondBest) < 1) {
      // Mixed context detected - return the one with higher score but with lower confidence
      return { context: maxContext[0], confidence: 'medium' };
    }

    // Return the context if it has a meaningful score, otherwise return null
    return { context: maxContext[0], confidence: topScore > 2 ? 'high' : 'medium' };
  }

  return { context: null, confidence: 'low' };
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

    // Apply context as a tie-breaker/filter rather than a multiplier
    const contextualIntents = multiIntents.map(intentObj => {
      // Calculate context relevance score for this intent
      const contextRelevance = calculateContextRelevance(
        intentObj.intent, 
        contextAnalysis, 
        input
      );
      
      // Only adjust confidence if the context is highly relevant to this intent
      let adjustedConfidence = intentObj.confidence;
      
      // Use context as a tie-breaker when base confidence is similar between intents
      // Instead of blindly adding boosts, we'll use context to differentiate between close intents
      if (contextRelevance > 0.7) {
        // Only slightly boost confidence if context strongly supports this intent
        adjustedConfidence = Math.min(1.0, intentObj.confidence + 0.05);
      } else if (contextRelevance < 0.3) {
        // Slightly reduce confidence if context contradicts this intent
        adjustedConfidence = Math.max(0.0, intentObj.confidence - 0.05);
      }
      
      return {
        ...intentObj,
        confidence: adjustedConfidence,
        contextRelevance, // Include context relevance score for transparency
        contextWeight: calculateContextWeight(intentObj.intent, contextAnalysis)
      };
    });

    // Sort by adjusted confidence (with context considerations)
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

  // For single intent detection, use context as a tie-breaker when needed
  // Only apply context adjustments when base confidence is low or when there are competing intents
  let adjustedResult = { ...baseResult };
  
  // Get competing intents to see if context should be used as a tie-breaker
  const competingIntents = detectMultipleIntents(input, 0.1) // Lower threshold to find potential competitors
    .filter(intent => intent.intent !== baseResult.intent)
    .filter(intent => Math.abs(intent.confidence - baseResult.confidence) < 0.15); // Close confidence scores
  
  if (competingIntents.length > 0 || baseResult.confidence < 0.6) {
    // Use context to break ties when confidence is low or when competing intents exist
    const contextRelevance = calculateContextRelevance(
      baseResult.intent, 
      contextAnalysis, 
      input
    );
    
    if (contextRelevance > 0.7) {
      // Boost confidence if context strongly supports this intent
      adjustedResult.confidence = Math.min(1.0, baseResult.confidence + 0.1);
    } else if (contextRelevance < 0.3) {
      // Reduce confidence if context contradicts this intent
      adjustedResult.confidence = Math.max(0.0, baseResult.confidence - 0.1);
    }
  }

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
 * Calculates how relevant the context is to a specific intent
 * @param {string} intent - Intent name
 * @param {Object} contextAnalysis - Context analysis results
 * @param {string} input - Input text
 * @returns {number} Context relevance score (0-1)
 */
const calculateContextRelevance = (intent, contextAnalysis, input) => {
  let relevanceScore = 0;
  let maxPossibleScore = 0;

  // Check sentiment relevance
  if (contextAnalysis.sentimentTrend === 'negative' && ['empathy', 'conflict'].includes(intent)) {
    relevanceScore += 0.25;
  } else if (contextAnalysis.sentimentTrend === 'positive' && ['social', 'agreement'].includes(intent)) {
    relevanceScore += 0.25;
  } else if (contextAnalysis.sentimentTrend === 'mixed' && ['clarification', 'question', 'exploration'].includes(intent)) {
    // Mixed sentiment often requires clarification or exploration intents
    relevanceScore += 0.25;
  }
  maxPossibleScore += 0.25;

  // Check cultural context relevance
  if (contextAnalysis.culturalContext === 'business' && ['strategic', 'negotiation', 'action', 'execution'].includes(intent)) {
    // Adjust score based on cultural context detection confidence
    const confidenceMultiplier = contextAnalysis.culturalContextConfidence === 'high' ? 1.0 :
                                contextAnalysis.culturalContextConfidence === 'medium' ? 0.7 : 0.3;
    relevanceScore += 0.25 * confidenceMultiplier;
  } else if (contextAnalysis.culturalContext === 'formal' && ['strategic', 'language', 'clarity'].includes(intent)) {
    const confidenceMultiplier = contextAnalysis.culturalContextConfidence === 'high' ? 1.0 :
                                contextAnalysis.culturalContextConfidence === 'medium' ? 0.7 : 0.3;
    relevanceScore += 0.25 * confidenceMultiplier;
  } else if (contextAnalysis.culturalContext === 'casual_professional' && ['social', 'empathy', 'agreement'].includes(intent)) {
    const confidenceMultiplier = contextAnalysis.culturalContextConfidence === 'high' ? 1.0 :
                                contextAnalysis.culturalContextConfidence === 'medium' ? 0.7 : 0.3;
    relevanceScore += 0.25 * confidenceMultiplier;
  }
  maxPossibleScore += 0.25;

  // Check temporal context relevance
  if (contextAnalysis.conversationStage === 'opening' && ['social', 'question'].includes(intent)) {
    relevanceScore += 0.25;
  } else if (contextAnalysis.conversationStage === 'closing' && ['action', 'execution'].includes(intent)) {
    relevanceScore += 0.25;
  }
  maxPossibleScore += 0.25;

  // Check topic relevance
  if (contextAnalysis.topicTrends.some(topic =>
    intent.toLowerCase().includes(topic) ||
    topic.toLowerCase().includes(intent.toLowerCase())
  )) {
    relevanceScore += 0.25;
  }
  maxPossibleScore += 0.25;

  // Normalize the score
  return maxPossibleScore > 0 ? relevanceScore / maxPossibleScore : 0;
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
  // Handle mixed emotions differently
  if (sentimentTrend === 'mixed') {
    // For mixed emotions, boost intents that help clarify or explore
    if (['clarification', 'question', 'exploration'].includes(intent)) {
      return Math.min(1.0, confidence + 0.12);
    }
    // Reduce confidence for intents that require clear sentiment
    if (['empathy', 'conflict', 'agreement'].includes(intent)) {
      return Math.max(0.0, confidence - 0.05);
    }
  }

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
 * @param {string} culturalContextConfidence - Confidence level of cultural context detection
 * @returns {number} Adjusted confidence score
 */
const applyCulturalContextAdjustment = (confidence, culturalContext, intent, culturalContextConfidence = 'medium') => {
  if (!culturalContext) return confidence;

  // Adjust the boost based on the confidence of cultural context detection
  let boostMultiplier = 1.0;
  if (culturalContextConfidence === 'high') boostMultiplier = 1.0;
  else if (culturalContextConfidence === 'medium') boostMultiplier = 0.7;
  else boostMultiplier = 0.3; // low confidence

  // In formal contexts, boost strategic and language intents
  if (culturalContext === 'formal' && ['strategic', 'language', 'clarity'].includes(intent)) {
    return Math.min(1.0, confidence + (0.05 * boostMultiplier));
  }

  // In business contexts, boost strategic, negotiation, and action intents
  if (culturalContext === 'business' &&
      ['strategic', 'negotiation', 'action', 'execution'].includes(intent)) {
    return Math.min(1.0, confidence + (0.07 * boostMultiplier));
  }

  // In casual professional contexts, boost social and empathy intents
  if (culturalContext === 'casual_professional' &&
      ['social', 'empathy', 'agreement'].includes(intent)) {
    return Math.min(1.0, confidence + (0.06 * boostMultiplier));
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

  // For longer conversations, use a more intelligent summarization approach
  // This preserves important early context while maintaining performance
  const firstTurns = conversationHistory.slice(0, Math.floor(maxTurns / 4));
  const middleTurns = conversationHistory.slice(Math.floor(conversationHistory.length / 2) - Math.floor(maxTurns / 4), 
                                               Math.floor(conversationHistory.length / 2) + Math.floor(maxTurns / 4));
  const lastTurns = conversationHistory.slice(-Math.floor(maxTurns / 2));

  // Combine and deduplicate while preserving order
  const combined = [...firstTurns, ...middleTurns, ...lastTurns];
  const seenContent = new Set();
  const uniqueCombined = [];

  for (const turn of combined) {
    const contentKey = `${turn.role}:${turn.content.substring(0, 50)}`;
    if (!seenContent.has(contentKey)) {
      seenContent.add(contentKey);
      uniqueCombined.push(turn);
    }
  }

  // If still too long, trim from the middle
  if (uniqueCombined.length > maxTurns) {
    const excess = uniqueCombined.length - maxTurns;
    const removeFromMiddle = Math.floor(excess / 2);
    return [
      ...uniqueCombined.slice(0, Math.floor(maxTurns / 2)),
      ...uniqueCombined.slice(uniqueCombined.length - Math.floor(maxTurns / 2))
    ];
  }

  return uniqueCombined;
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
  // Use the enhanced logging function that also collects training data
  return logIntentDetectionMetricsEnhanced(input, result, processingTime);
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