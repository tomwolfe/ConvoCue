/**
 * @fileoverview Advanced sentiment analysis for conversations
 */

import { analyzeEmotion } from './emotion';

// Cache for message-level sentiment analysis to avoid redundant computations
const messageAnalysisCache = new Map();

/**
 * Analyzes sentiment across an entire conversation
 * @param {Array} conversationHistory - Array of conversation messages [{role, content, timestamp}]
 * @returns {Object} Comprehensive sentiment analysis
 */
export const analyzeConversationSentiment = (conversationHistory) => {
  if (!conversationHistory || conversationHistory.length === 0) {
    return {
      overallSentiment: 'neutral',
      sentimentScore: 0,
      emotionalTrend: 'stable',
      speakerSentiments: {},
      keyEmotionalMoments: []
    };
  }

  // Analyze sentiment for each message, using cache when possible
  const messageAnalyses = conversationHistory.map((msg, index) => {
    // Generate a unique key for the message based on content and role
    const cacheKey = `${msg.role}:${msg.content}`;
    
    if (messageAnalysisCache.has(cacheKey)) {
      return messageAnalysisCache.get(cacheKey);
    }

    const emotionAnalysis = analyzeEmotion(msg.content);
    const analysis = {
      ...msg,
      emotion: emotionAnalysis.emotion,
      emotionConfidence: emotionAnalysis.confidence,
      sentimentScore: getSentimentScoreFromEmotion(emotionAnalysis.emotion, emotionAnalysis.confidence, msg.content)
    };

    // Cache the analysis result
    if (messageAnalysisCache.size < 500) { // Limit cache size
      messageAnalysisCache.set(cacheKey, analysis);
    }

    return analysis;
  });

  // Calculate overall sentiment
  const overallSentiment = calculateOverallSentiment(messageAnalyses);
  
  // Analyze trend
  const emotionalTrend = analyzeEmotionalTrend(messageAnalyses);
  
  // Analyze by speaker
  const speakerSentiments = analyzeBySpeaker(messageAnalyses);
  
  // Identify key emotional moments
  const keyEmotionalMoments = identifyKeyEmotionalMoments(messageAnalyses);

  return {
    overallSentiment,
    sentimentScore: calculateAverageSentimentScore(messageAnalyses),
    emotionalTrend,
    speakerSentiments,
    keyEmotionalMoments,
    messageAnalyses
  };
};

/**
 * Converts emotion to a numerical sentiment score
 * @param {string} emotion - The emotion detected
 * @param {number} confidence - The confidence of the emotion detection
 * @param {string} text - The original text for context analysis
 * @returns {number} Sentiment score (-1 to 1)
 */
const getSentimentScoreFromEmotion = (emotion, confidence, text = '') => {
  const sentimentMap = {
    joy: 0.8,
    surprise: 0.3,
    neutral: 0,
    fear: -0.4,
    sadness: -0.6,
    disgust: -0.7,
    anger: -0.9
  };

  let baseScore = sentimentMap[emotion] || 0;

  // Apply context-based adjustments
  if (text) {
    // Check for sarcasm indicators
    const sarcasmDetected = detectSarcasm(text);
    if (sarcasmDetected) {
      // Flip the sentiment for sarcastic statements
      baseScore = -baseScore * 0.7; // Reduce magnitude for sarcasm
    }

    // Check for mixed emotions in the same sentence
    const mixedEmotions = detectMixedEmotions(text);
    if (mixedEmotions.length > 1) {
      // Reduce confidence for mixed emotions
      baseScore *= 0.8;
    }
  }

  return baseScore * confidence; // Weight by confidence
};

/**
 * Detects sarcasm in text with improved accuracy
 * @param {string} text - Input text to analyze
 * @returns {boolean} True if sarcasm is detected
 */
const detectSarcasm = (text) => {
  const lowerText = text.toLowerCase();
  const words = lowerText.split(/\s+/);

  // Common sarcasm indicators
  const sarcasmIndicators = [
    'yeah right', 'sure thing', 'oh great', 'fantastic', 'wonderful',
    'oh boy', 'big surprise', 'like i care', 'as if', 'right',
    'totally', 'obviously', 'clearly', 'of course', 'no way',
    'oh really', 'how nice', 'that\'s just perfect', 'just my luck',
    'oh good', 'great idea', 'brilliant', 'marvelous', 'lovely',
    'cool story bro', 'thanks a lot', 'like that\'s going to happen', 'right, like that\'s true'
  ];

  // Check for sarcasm patterns
  for (const indicator of sarcasmIndicators) {
    if (lowerText.includes(indicator)) {
      return true;
    }
  }

  // Check for exaggerated positive words in negative contexts
  const positiveWords = ['amazing', 'incredible', 'fantastic', 'wonderful', 'perfect', 'awesome', 'brilliant'];
  const negativeContexts = ['not ', 'never ', 'no ', 'nothing', 'bad', 'wrong', 'terrible', 'awful', 'hate', 'don\'t'];

  for (const posWord of positiveWords) {
    for (const negContext of negativeContexts) {
      if (lowerText.includes(posWord) && lowerText.includes(negContext)) {
        // Check if they appear in close proximity
        const posIndex = lowerText.indexOf(posWord);
        const negIndex = lowerText.indexOf(negContext);

        if (posIndex !== -1 && negIndex !== -1 && Math.abs(posIndex - negIndex) < 20) {
          return true;
        }
      }
    }
  }

  // Check for contradiction patterns (positive followed by negative or vice versa)
  const contradictionDetected = detectContradictionPattern(words);
  if (contradictionDetected) {
    return true;
  }

  // Check for exaggerated punctuation (multiple exclamation points or question marks)
  const exclamationCount = (text.match(/!/g) || []).length;
  const questionCount = (text.match(/\?/g) || []).length;
  if (exclamationCount > 2 || questionCount > 1) {
    // Check if this is in context of positive words
    if (positiveWords.some(word => lowerText.includes(word))) {
      return true;
    }
  }

  // Check for specific sarcastic patterns
  const sarcasticPatterns = [
    /sarcasm|being sarcastic/i,
    /oh\s+really/i,
    /like\s+that's\s+new/i,
    /tell\s+me\s+about\s+it/i,
    /i'm\s+sure/i,
    /as\s+if\s+i\s+care/i
  ];

  for (const pattern of sarcasticPatterns) {
    if (pattern.test(text)) {
      return true;
    }
  }

  return false;
};

/**
 * Detects contradiction patterns in text that may indicate sarcasm
 * @param {Array} words - Array of words from the text
 * @returns {boolean} True if contradiction pattern detected
 */
const detectContradictionPattern = (words) => {
  const positiveIndicators = ['love', 'great', 'perfect', 'amazing', 'fantastic', 'wonderful', 'best'];
  const negativeIndicators = ['not', 'never', 'no', 'hate', 'terrible', 'awful', 'worst', 'don\'t'];

  let hasPositive = false;
  let hasNegative = false;

  for (const word of words) {
    if (positiveIndicators.includes(word)) {
      hasPositive = true;
    }
    if (negativeIndicators.includes(word)) {
      hasNegative = true;
    }
  }

  // If both positive and negative indicators exist, it might be sarcasm
  return hasPositive && hasNegative;
};

/**
 * Detects mixed emotions in text
 * @param {string} text - Input text to analyze
 * @returns {Array} Array of detected emotions
 */
const detectMixedEmotions = (text) => {
  const lowerText = text.toLowerCase();
  const emotions = [];

  // Look for indicators of different emotions in the same text
  if (/(happy|joy|excited|thrilled|delighted)/.test(lowerText)) emotions.push('joy');
  if (/(sad|upset|depressed|heartbroken|disappointed)/.test(lowerText)) emotions.push('sadness');
  if (/(angry|mad|furious|annoyed|irritated)/.test(lowerText)) emotions.push('anger');
  if (/(scared|afraid|nervous|worried|frightened)/.test(lowerText)) emotions.push('fear');
  if (/(disgusted|sick|nauseous|revolted)/.test(lowerText)) emotions.push('disgust');
  if (/(surprised|shocked|amazed|stunned)/.test(lowerText)) emotions.push('surprise');

  return emotions;
};

/**
 * Calculates the overall sentiment of a conversation
 * @param {Array} messageAnalyses - Array of analyzed messages
 * @returns {string} Overall sentiment category
 */
const calculateOverallSentiment = (messageAnalyses) => {
  const totalScore = messageAnalyses.reduce((sum, msg) => sum + msg.sentimentScore, 0);
  const averageScore = totalScore / messageAnalyses.length;

  if (averageScore > 0.3) return 'positive';
  if (averageScore > -0.1) return 'neutral';
  if (averageScore > -0.4) return 'mixed';
  return 'negative';
};

/**
 * Analyzes the emotional trend over the conversation
 * @param {Array} messageAnalyses - Array of analyzed messages
 * @returns {string} Emotional trend
 */
const analyzeEmotionalTrend = (messageAnalyses) => {
  if (messageAnalyses.length < 2) return 'stable';

  const firstHalf = messageAnalyses.slice(0, Math.ceil(messageAnalyses.length / 2));
  const secondHalf = messageAnalyses.slice(Math.ceil(messageAnalyses.length / 2));
  
  const firstAvg = firstHalf.reduce((sum, msg) => sum + msg.sentimentScore, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, msg) => sum + msg.sentimentScore, 0) / secondHalf.length;
  
  const difference = secondAvg - firstAvg;
  
  if (difference > 0.2) return 'improving';
  if (difference < -0.2) return 'declining';
  return 'stable';
};

/**
 * Analyzes sentiment by speaker
 * @param {Array} messageAnalyses - Array of analyzed messages
 * @returns {Object} Sentiment analysis by speaker
 */
const analyzeBySpeaker = (messageAnalyses) => {
  const speakerData = {};
  
  messageAnalyses.forEach(msg => {
    const role = msg.role;
    if (!speakerData[role]) {
      speakerData[role] = {
        totalMessages: 0,
        totalSentimentScore: 0,
        emotions: {},
        mostCommonEmotion: 'neutral'
      };
    }
    
    speakerData[role].totalMessages++;
    speakerData[role].totalSentimentScore += msg.sentimentScore;
    
    // Track emotions
    if (!speakerData[role].emotions[msg.emotion]) {
      speakerData[role].emotions[msg.emotion] = 0;
    }
    speakerData[role].emotions[msg.emotion]++;
  });
  
  // Calculate averages and most common emotions
  Object.keys(speakerData).forEach(role => {
    speakerData[role].averageSentimentScore = 
      speakerData[role].totalSentimentScore / speakerData[role].totalMessages;
    
    // Find most common emotion
    let maxCount = 0;
    let mostCommon = 'neutral';
    for (const [emotion, count] of Object.entries(speakerData[role].emotions)) {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = emotion;
      }
    }
    speakerData[role].mostCommonEmotion = mostCommon;
  });
  
  return speakerData;
};

/**
 * Identifies key emotional moments in the conversation
 * @param {Array} messageAnalyses - Array of analyzed messages
 * @returns {Array} Key emotional moments
 */
const identifyKeyEmotionalMoments = (messageAnalyses) => {
  const keyMoments = [];
  
  messageAnalyses.forEach((msg, index) => {
    // High emotional intensity moments
    if (Math.abs(msg.sentimentScore) > 0.6) {
      keyMoments.push({
        index,
        type: 'intense_emotion',
        emotion: msg.emotion,
        score: msg.sentimentScore,
        content: msg.content,
        role: msg.role
      });
    }
    
    // Significant shifts in sentiment
    if (index > 0) {
      const prevMsg = messageAnalyses[index - 1];
      const sentimentChange = Math.abs(msg.sentimentScore - prevMsg.sentimentScore);
      
      if (sentimentChange > 0.5) {
        keyMoments.push({
          index,
          type: 'sentiment_shift',
          from: prevMsg.emotion,
          to: msg.emotion,
          changeMagnitude: sentimentChange,
          content: msg.content,
          role: msg.role
        });
      }
    }
  });
  
  // Sort by significance (highest impact first)
  return keyMoments.sort((a, b) => Math.abs(b.score || b.changeMagnitude) - Math.abs(a.score || a.changeMagnitude));
};

/**
 * Calculates the average sentiment score
 * @param {Array} messageAnalyses - Array of analyzed messages
 * @returns {number} Average sentiment score
 */
const calculateAverageSentimentScore = (messageAnalyses) => {
  if (messageAnalyses.length === 0) return 0;
  
  const totalScore = messageAnalyses.reduce((sum, msg) => sum + msg.sentimentScore, 0);
  return totalScore / messageAnalyses.length;
};

/**
 * Generates a summary of the conversation sentiment
 * @param {Object} sentimentAnalysis - Full sentiment analysis result
 * @returns {string} Human-readable sentiment summary
 */
export const generateSentimentSummary = (sentimentAnalysis) => {
  const { 
    overallSentiment, 
    emotionalTrend, 
    speakerSentiments, 
    keyEmotionalMoments 
  } = sentimentAnalysis;
  
  const summaries = [];
  
  // Overall sentiment
  summaries.push(`Overall sentiment: ${overallSentiment}`);
  
  // Trend
  summaries.push(`Emotional trend: ${emotionalTrend}`);
  
  // By speaker
  Object.entries(speakerSentiments).forEach(([role, data]) => {
    summaries.push(`${role}: avg. sentiment ${data.averageSentimentScore.toFixed(2)}, mostly ${data.mostCommonEmotion}`);
  });
  
  // Key moments
  if (keyEmotionalMoments.length > 0) {
    summaries.push(`Key emotional moments: ${keyEmotionalMoments.length} significant events detected`);
  }
  
  return summaries.join(' | ');
};