/**
 * @fileoverview Advanced sentiment analysis for conversations
 */

import { analyzeEmotion } from './emotion';

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

  // Analyze sentiment for each message
  const messageAnalyses = conversationHistory.map((msg, index) => {
    const emotionAnalysis = analyzeEmotion(msg.content);
    return {
      ...msg,
      emotion: emotionAnalysis.emotion,
      emotionConfidence: emotionAnalysis.confidence,
      sentimentScore: getSentimentScoreFromEmotion(emotionAnalysis.emotion, emotionAnalysis.confidence)
    };
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
 * @returns {number} Sentiment score (-1 to 1)
 */
const getSentimentScoreFromEmotion = (emotion, confidence) => {
  const sentimentMap = {
    joy: 0.8,
    surprise: 0.3,
    neutral: 0,
    fear: -0.4,
    sadness: -0.6,
    disgust: -0.7,
    anger: -0.9
  };

  const baseScore = sentimentMap[emotion] || 0;
  return baseScore * confidence; // Weight by confidence
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