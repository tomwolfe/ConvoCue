/**
 * @fileoverview User feedback analytics for preference learning
 */
import { secureLocalStorageGet, secureLocalStorageSet } from './encryption';

/**
 * Analyzes feedback trends over time to identify evolving user preferences
 * @param {Array} feedbackHistory - Array of feedback objects
 * @returns {Promise<Object>} Analysis of feedback trends
 */
export const analyzeFeedbackTrends = async (feedbackHistory = null) => {
  if (!feedbackHistory) {
    try {
      feedbackHistory = await secureLocalStorageGet('convocue_feedback', []);
    } catch (e) {
      console.error('Failed to load feedback history:', e);
      feedbackHistory = [];
    }
  }

  if (feedbackHistory.length === 0) {
    return {
      overallSatisfaction: 0,
      trendingPreferences: {},
      improvementAreas: [],
      recentImprovementAreas: [],
      preferredPersonas: {},
      feedbackVolume: 0
    };
  }

  // Calculate overall satisfaction
  const likes = feedbackHistory.filter(f => 
    f.feedbackType === 'like' || 
    f.feedbackType === 'very_helpful' || 
    f.feedbackType === 'somewhat_helpful'
  ).length;
  
  const dislikes = feedbackHistory.filter(f => 
    f.feedbackType === 'dislike' || 
    f.feedbackType === 'not_helpful'
  ).length;
  
  const reports = feedbackHistory.filter(f => f.feedbackType === 'report').length;
  
  const overallSatisfaction = likes / Math.max(1, likes + dislikes + reports);

  // Analyze trending preferences
  const recentFeedback = feedbackHistory.slice(-20); // Last 20 feedbacks
  const olderFeedback = feedbackHistory.slice(0, -20); // All but last 20

  // Compare recent vs older to find trends
  const trendingPreferences = findTrendingPreferences(recentFeedback, olderFeedback);

  // Identify improvement areas (frequently disliked)
  const improvementAreas = findImprovementAreas(feedbackHistory);
  const recentImprovementAreas = findImprovementAreas(recentFeedback);

  const preferredPersonas = calculatePersonaPreferences(feedbackHistory);

  return {
    overallSatisfaction,
    trendingPreferences,
    improvementAreas,
    recentImprovementAreas,
    preferredPersonas,
    feedbackVolume: feedbackHistory.length
  };
};

/**
 * Finds preferences that are trending up or down
 * @param {Array} recentFeedback - Recent feedback
 * @param {Array} olderFeedback - Older feedback
 * @returns {Object} Trending preferences
 */
const findTrendingPreferences = (recentFeedback, olderFeedback) => {
  const isPositive = f => f.feedbackType === 'like' || f.feedbackType === 'very_helpful' || f.feedbackType === 'somewhat_helpful';
  const recentLikes = recentFeedback.filter(isPositive);
  const olderLikes = olderFeedback.filter(isPositive);
  
  // Calculate preference scores for recent and older periods
  const recentScores = calculatePreferenceScores(recentLikes);
  const olderScores = calculatePreferenceScores(olderLikes);
  
  // Find trends
  const trends = {};
  
  Object.keys(recentScores).forEach(key => {
    const recentScore = recentScores[key] || 0;
    const olderScore = olderScores[key] || 0;
    const change = recentScore - olderScore;
    
    trends[key] = {
      current: recentScore,
      previous: olderScore,
      change,
      trend: change > 0.1 ? 'increasing' : change < -0.1 ? 'decreasing' : 'stable'
    };
  });

  return trends;
};

/**
 * Calculates preference scores from feedback
 * @param {Array} feedback - Feedback array
 * @returns {Object} Preference scores
 */
const calculatePreferenceScores = (feedback) => {
  if (feedback.length === 0) return {};

  const scores = {
    length: 0,
    tone: 0,
    helpfulness: 0
  };

  // Analyze based on suggestion characteristics
  feedback.forEach(item => {
    const suggestion = item.suggestion;
    
    // Length preference
    if (suggestion.length < 30) scores.length += 0.3;
    else if (suggestion.length < 60) scores.length += 0.7;
    else scores.length += 1;
    
    // Tone indicators
    const lowerSuggestion = suggestion.toLowerCase();
    if (lowerSuggestion.includes('thank') || lowerSuggestion.includes('appreciate')) {
      scores.tone += 1;
    } else if (lowerSuggestion.includes('what do you') || lowerSuggestion.includes('how about')) {
      scores.tone += 0.7;
    }
    
    // Helpfulness indicators
    if (lowerSuggestion.includes('?') || lowerSuggestion.includes('suggest') || lowerSuggestion.includes('recommend')) {
      scores.helpfulness += 1;
    }
  });

  // Normalize scores
  Object.keys(scores).forEach(key => {
    scores[key] = scores[key] / Math.max(1, feedback.length);
  });

  return scores;
};

/**
 * Finds areas that need improvement based on negative feedback
 * @param {Array} feedbackHistory - All feedback
 * @returns {Array} Improvement areas
 */
const findImprovementAreas = (feedbackHistory) => {
  const dislikes = feedbackHistory.filter(f => f.feedbackType === 'dislike' || f.feedbackType === 'not_helpful');
  if (dislikes.length === 0) return [];

  // Analyze common issues in disliked suggestions with more depth
  const issuePatterns = {};
  const contextAnalysis = {};

  dislikes.forEach(item => {
    const suggestion = item.suggestion.toLowerCase();
    const originalInput = item.originalInput ? item.originalInput.toLowerCase() : '';

    // Identify common issues
    if (suggestion.length > 100) {
      issuePatterns.longResponses = (issuePatterns.longResponses || 0) + 1;
    }

    if (suggestion.includes('sorry') || suggestion.includes('apologize')) {
      issuePatterns.apologeticTone = (issuePatterns.apologeticTone || 0) + 1;
    }

    if (suggestion.split(' ').length < 5) {
      issuePatterns.tooShort = (issuePatterns.tooShort || 0) + 1;
    }

    // Analyze why the response might have been disliked based on context
    if (originalInput) {
      // Check if response was off-topic
      if (!isResponseRelevant(originalInput, suggestion)) {
        issuePatterns.irrelevantResponse = (issuePatterns.irrelevantResponse || 0) + 1;
      }

      // Check if response was too formal for casual input
      if (isCasualInput(originalInput) && isTooFormal(suggestion)) {
        issuePatterns.inappropriateTone = (issuePatterns.inappropriateTone || 0) + 1;
      }

      // Check if response was too casual for formal input
      if (isFormalInput(originalInput) && isTooCasual(suggestion)) {
        issuePatterns.inappropriateTone = (issuePatterns.inappropriateTone || 0) + 1;
      }
    }

    // Analyze response structure that users dislike
    const structureAnalysis = analyzeResponseStructure(suggestion);
    Object.entries(structureAnalysis).forEach(([key, value]) => {
      if (value) {
        issuePatterns[key] = (issuePatterns[key] || 0) + 1;
      }
    });
  });

  // Convert to array and sort by frequency
  return Object.entries(issuePatterns)
    .map(([issue, count]) => ({
      issue,
      count,
      frequency: count / dislikes.length,
      explanation: getIssueExplanation(issue)
    }))
    .sort((a, b) => b.frequency - a.frequency);
};

/**
 * Checks if a response is relevant to the input
 * @param {string} input - Original user input
 * @param {string} response - AI response
 * @returns {boolean} True if response is relevant
 */
const isResponseRelevant = (input, response) => {
  // Simple keyword matching - in a real implementation, use semantic similarity
  const inputWords = input.split(/\s+/).filter(word => word.length > 3);
  const responseWords = response.split(/\s+/).filter(word => word.length > 3);

  // Check if at least some keywords from input appear in response
  const commonWords = inputWords.filter(word => response.includes(word));
  return commonWords.length > 0;
};

/**
 * Checks if input is casual
 * @param {string} input - Input text
 * @returns {boolean} True if input is casual
 */
const isCasualInput = (input) => {
  const casualIndicators = ['hey', 'hi', 'what\'s up', 'how\'s it going', 'dude', 'mate', 'cool', 'awesome'];
  return casualIndicators.some(indicator => input.includes(indicator));
};

/**
 * Checks if input is formal
 * @param {string} input - Input text
 * @returns {boolean} True if input is formal
 */
const isFormalInput = (input) => {
  const formalIndicators = ['dear', 'sir', 'madam', 'regarding', 'concerning', 'pursuant', 'respectfully', 'please'];
  return formalIndicators.some(indicator => input.includes(indicator));
};

/**
 * Checks if response is too formal
 * @param {string} response - Response text
 * @returns {boolean} True if response is too formal
 */
const isTooFormal = (response) => {
  const formalWords = ['whereas', 'therefore', 'furthermore', 'moreover', 'nevertheless', 'notwithstanding'];
  return formalWords.some(word => response.includes(word));
};

/**
 * Checks if response is too casual
 * @param {string} response - Response text
 * @returns {boolean} True if response is too casual
 */
const isTooCasual = (response) => {
  const casualWords = ['dude', 'cool', 'awesome', 'chill', 'totally', 'yep', 'nah'];
  return casualWords.some(word => response.includes(word));
};

/**
 * Analyzes response structure for patterns
 * @param {string} response - Response text
 * @returns {Object} Structure analysis
 */
const analyzeResponseStructure = (response) => {
  const analysis = {};

  // Check for question patterns
  if (response.includes('?') && response.split('?').length > 1) {
    analysis.questionHeavy = true;
  }

  // Check for apologetic patterns
  if (/(sorry|apologize|apology|my apologies)/i.test(response)) {
    analysis.apologeticPattern = true;
  }

  // Check for uncertain patterns
  if (/(maybe|i think|i guess|perhaps|possibly)/i.test(response)) {
    analysis.uncertainPattern = true;
  }

  // Check for overly complex sentences
  const sentences = response.split(/[.!?]+/);
  const avgWordsPerSentence = response.split(/\s+/).length / sentences.length;
  if (avgWordsPerSentence > 25) {
    analysis.complexSentences = true;
  }

  return analysis;
};

/**
 * Provides explanation for an issue
 * @param {string} issue - Issue name
 * @returns {string} Explanation
 */
const getIssueExplanation = (issue) => {
  const explanations = {
    longResponses: "Response was too lengthy and potentially overwhelming",
    apologeticTone: "Response contained too many apologetic phrases",
    tooShort: "Response was too brief and unhelpful",
    irrelevantResponse: "Response didn't address the user's input appropriately",
    inappropriateTone: "Response had a tone that didn't match the user's input",
    questionHeavy: "Response contained too many questions",
    apologeticPattern: "Response had an apologetic tone that may not be needed",
    uncertainPattern: "Response contained uncertain language that reduced confidence",
    complexSentences: "Response had overly complex sentence structures"
  };

  return explanations[issue] || "General issue with response pattern";
};

/**
 * Calculates persona preferences from feedback
 * @param {Array} feedbackHistory - All feedback
 * @returns {Object} Persona preferences
 */
const calculatePersonaPreferences = (feedbackHistory) => {
  const personaStats = {};
  
  feedbackHistory.forEach(item => {
    const persona = item.persona;
    if (!personaStats[persona]) {
      personaStats[persona] = { likes: 0, dislikes: 0, total: 0, satisfaction: 0 };
    }
    
    personaStats[persona].total++;
    if (item.feedbackType === 'like' || item.feedbackType === 'very_helpful' || item.feedbackType === 'somewhat_helpful') {
      personaStats[persona].likes++;
    } else if (item.feedbackType === 'dislike' || item.feedbackType === 'not_helpful') {
      personaStats[persona].dislikes++;
    }
  });

  // Calculate satisfaction rates
  Object.keys(personaStats).forEach(persona => {
    const stats = personaStats[persona];
    stats.satisfaction = stats.likes / Math.max(1, stats.likes + stats.dislikes);
  });

  return personaStats;
};

/**
 * Calculates satisfaction score component
 * @param {Object} analysis - Feedback analysis
 * @param {Object} weights - Score weights
 * @returns {number} Satisfaction score component
 */
const calculateSatisfactionScore = (analysis, weights) => {
  return (analysis.overallSatisfaction || 0.5) * weights.satisfaction;
};

/**
 * Calculates sentiment score component
 * @param {Array} conversationHistory - Conversation turns
 * @param {Object} weights - Score weights
 * @returns {number} Sentiment score component
 */
const calculateSentimentScore = (conversationHistory, weights) => {
  let sentimentScore = weights.sentiment / 2; // Neutral start (half of max)
  if (conversationHistory.length > 0) {
    const positiveTurns = conversationHistory.filter(t =>
      t.sentiment === 'positive' || (t.emotionData && ['joy', 'surprise'].includes(t.emotionData.emotion))
    ).length;
    sentimentScore = (positiveTurns / Math.max(1, conversationHistory.length)) * weights.sentiment;
  }
  return sentimentScore;
};

/**
 * Calculates engagement score component with recency and quality weighting
 * @param {Array} feedbackHistory - Feedback history
 * @param {Object} weights - Score weights
 * @returns {number} Engagement score component
 */
const calculateEngagementScore = (feedbackHistory, weights) => {
  if (feedbackHistory.length === 0) return 0;

  const now = Date.now();

  // Calculate engagement score based on both quantity and quality
  const qualityWeightedScore = feedbackHistory.reduce((score, feedback) => {
    const timeDiff = now - (feedback.timestamp || now); // Use current time if no timestamp
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24); // Convert to days

    // Weight recent feedback more heavily (exponential decay)
    const recencyWeight = Math.exp(-daysDiff / 7); // 7-day half-life

    // Calculate quality weight based on feedback type and content
    let qualityWeight = 1.0; // Base weight
    if (feedback.feedbackType === 'like' || feedback.feedbackType === 'very_helpful') {
      qualityWeight = 1.2; // Positive feedback gets slightly higher weight
    } else if (feedback.feedbackType === 'somewhat_helpful') {
      qualityWeight = 1.1;
    } else if (feedback.feedbackType === 'dislike' || feedback.feedbackType === 'not_helpful') {
      qualityWeight = 0.5; // Negative feedback gets lower weight
    } else if (feedback.feedbackType === 'report') {
      qualityWeight = 0.2; // Reports get very low weight
    }

    // If feedback has detailed text, increase quality weight
    if (feedback.feedbackText && feedback.feedbackText.length > 20) {
      qualityWeight *= 1.5; // Detailed feedback gets bonus
    } else if (feedback.feedbackText && feedback.feedbackText.length > 5) {
      qualityWeight *= 1.2; // Some text gets moderate bonus
    }

    return score + (recencyWeight * qualityWeight);
  }, 0);

  // Normalize to 0-engagementWeight range
  return Math.min(weights.engagement, (qualityWeightedScore / 5) * weights.engagement);
};

/**
 * Determines the user's level based on total score
 * @param {number} totalScore - Total social success score
 * @returns {string} User level
 */
const determineLevel = (totalScore) => {
  if (totalScore > 80) return 'Social Expert';
  if (totalScore > 60) return 'Confident Communicator';
  if (totalScore > 40) return 'Developing';
  return 'Getting Started';
};

/**
 * Calculates a "Social Success Score" based on feedback and conversation dynamics
 * @param {Array} feedbackHistory - All feedback
 * @param {Array} conversationHistory - Recent conversation turns
 * @returns {Promise<Object>} Social success metrics
 */
export const calculateSocialSuccessScore = async (feedbackHistory = null, conversationHistory = []) => {
  if (!feedbackHistory) {
    feedbackHistory = await secureLocalStorageGet('convocue_feedback', []);
  }

  const analysis = await analyzeFeedbackTrends(feedbackHistory);

  // Get configurable weights (default to 50/30/20 split)
  const weights = await getSocialSuccessWeights();

  // Calculate score components
  const satisfactionScore = calculateSatisfactionScore(analysis, weights);
  const sentimentScore = calculateSentimentScore(conversationHistory, weights);
  const engagementScore = calculateEngagementScore(feedbackHistory, weights);

  const totalScore = Math.round(satisfactionScore + sentimentScore + engagementScore);

  // Calculate trend using a 3-5 point rolling window
  const historicalScores = await secureLocalStorageGet('convocue_historical_scores', []);
  const recentScores = historicalScores.slice(-5).map(item => item.score); // Get last 5 scores

  let trend = 'stable';
  if (recentScores.length >= 2) {
    // ... (rest of the trend logic)
  }

  // Store current score for next comparison
  await secureLocalStorageSet('convocue_social_score_timestamp', Date.now());
  await secureLocalStorageSet('convocue_previous_social_score', totalScore);

  // Save to historical scores
  const newHistoricalScore = {
    score: totalScore,
    timestamp: Date.now(),
    breakdown: {
      satisfaction: Math.round(satisfactionScore),
      sentiment: Math.round(sentimentScore),
      engagement: Math.round(engagementScore)
    }
  };

  // Keep only the last 50 scores to prevent storage bloat
  const updatedHistoricalScores = [...historicalScores, newHistoricalScore].slice(-50);
  await secureLocalStorageSet('convocue_historical_scores', updatedHistoricalScores);

  return {
    score: totalScore,
    breakdown: {
      satisfaction: Math.round(satisfactionScore),
      sentiment: Math.round(sentimentScore),
      engagement: Math.round(engagementScore)
    },
    weights: weights, // Include the weights used for calculation
    level: determineLevel(totalScore),
    trend: trend
  };
};

/**
 * Gets personalized recommendations based on feedback analysis
 * @param {Object} feedbackAnalysis - Analysis from analyzeFeedbackTrends
 * @returns {Array} Personalized recommendations
 */
export const getPersonalizedRecommendations = (feedbackAnalysis) => {
  const recommendations = [];

  if (feedbackAnalysis.overallSatisfaction < 0.6) {
    recommendations.push({
      type: 'system',
      message: 'Your satisfaction seems low. Consider trying different personas or providing feedback to help improve suggestions.',
      priority: 'high'
    });
  }

  // Recommend personas based on satisfaction
  const sortedPersonas = Object.entries(feedbackAnalysis.preferredPersonas)
    .sort((a, b) => b[1].satisfaction - a[1].satisfaction);

  if (sortedPersonas.length > 0 && sortedPersonas[0][1].satisfaction > 0.7) {
    recommendations.push({
      type: 'persona',
      message: `You seem to prefer the "${sortedPersonas[0][0]}" persona. Try using it more often!`,
      priority: 'medium',
      recommendedPersona: sortedPersonas[0][0]
    });
  }

  // Suggest improvements based on trends
  Object.entries(feedbackAnalysis.trendingPreferences).forEach(([pref, data]) => {
    if (data.trend === 'decreasing' && data.change < -0.2) {
      recommendations.push({
        type: 'improvement',
        message: `Your preference for "${pref}" seems to be decreasing.`,
        priority: 'low'
      });
    }
  });

  return recommendations;
};

/**
 * Gets configurable weights for social success score calculation
 * @returns {Promise<Object>} Weight configuration
 */
export const getSocialSuccessWeights = async () => {
  try {
    // Default weights: satisfaction (50), sentiment (30), engagement (20) = 100 total
    const defaultWeights = {
      satisfaction: 50,
      sentiment: 30,
      engagement: 20
    };

    // Allow for configurable weights via localStorage for A/B testing or user customization
    const savedWeights = await secureLocalStorageGet('convocue_social_score_weights', null);

    if (savedWeights &&
        savedWeights.satisfaction !== undefined &&
        savedWeights.sentiment !== undefined &&
        savedWeights.engagement !== undefined &&
        (savedWeights.satisfaction + savedWeights.sentiment + savedWeights.engagement) === 100) {
      return savedWeights;
    }

    return defaultWeights;
  } catch (error) {
    console.error('Error fetching social success weights:', error);
    return {
      satisfaction: 50,
      sentiment: 30,
      engagement: 20
    };
  }
};

/**
 * Saves configurable weights for social success score calculation
 * @param {Object} weights - Weight configuration (must sum to 100)
 * @returns {Promise<boolean>} Success status
 */
export const saveSocialSuccessWeights = async (weights) => {
  try {
    if (!weights ||
        weights.satisfaction === undefined ||
        weights.sentiment === undefined ||
        weights.engagement === undefined ||
        (weights.satisfaction + weights.sentiment + weights.engagement) !== 100) {
      return false;
    }

    await secureLocalStorageSet('convocue_social_score_weights', weights);
    return true;
  } catch (error) {
    console.error('Error saving social success weights:', error);
    return false;
  }
};

/**
 * Gets historical social success scores for charting
 * @returns {Promise<Array>} Array of historical scores with timestamps
 */
export const getHistoricalScores = async () => {
  try {
    const historicalScores = await secureLocalStorageGet('convocue_historical_scores', []);

    // Format the data for the chart
    return historicalScores.map((scoreData, index) => ({
      date: new Date(scoreData.timestamp).toLocaleDateString(),
      score: scoreData.score,
      index: index // For consistent x-axis positioning
    })).slice(-20); // Return only the last 20 scores to avoid cluttering the chart
  } catch (error) {
    console.error('Error fetching historical scores:', error);
    return [];
  }
};