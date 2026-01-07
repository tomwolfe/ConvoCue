/**
 * @fileoverview User feedback analytics for preference learning
 */
import { secureLocalStorageGet } from './encryption';

/**
 * Analyzes feedback trends over time to identify evolving user preferences
 * @param {Array} feedbackHistory - Array of feedback objects
 * @returns {Object} Analysis of feedback trends
 */
export const analyzeFeedbackTrends = (feedbackHistory = null) => {
  if (!feedbackHistory) {
    try {
      feedbackHistory = secureLocalStorageGet('convocue_feedback', []);
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
      preferredPersonas: {},
      feedbackVolume: 0
    };
  }

  // Calculate overall satisfaction
  const likes = feedbackHistory.filter(f => f.feedbackType === 'like').length;
  const dislikes = feedbackHistory.filter(f => f.feedbackType === 'dislike').length;
  const reports = feedbackHistory.filter(f => f.feedbackType === 'report').length;
  
  const overallSatisfaction = likes / Math.max(1, likes + dislikes + reports);

  // Analyze trending preferences
  const recentFeedback = feedbackHistory.slice(-20); // Last 20 feedbacks
  const olderFeedback = feedbackHistory.slice(0, -20); // All but last 20

  // Compare recent vs older to find trends
  const trendingPreferences = findTrendingPreferences(recentFeedback, olderFeedback);

  // Identify improvement areas (frequently disliked)
  const improvementAreas = findImprovementAreas(feedbackHistory);

  // Analyze preferred personas
  const preferredPersonas = calculatePersonaPreferences(feedbackHistory);

  return {
    overallSatisfaction,
    trendingPreferences,
    improvementAreas,
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
  const recentLikes = recentFeedback.filter(f => f.feedbackType === 'like');
  const olderLikes = olderFeedback.filter(f => f.feedbackType === 'like');
  
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
  const dislikes = feedbackHistory.filter(f => f.feedbackType === 'dislike');
  if (dislikes.length === 0) return [];

  // Analyze common issues in disliked suggestions
  const issuePatterns = {};
  
  dislikes.forEach(item => {
    const suggestion = item.suggestion.toLowerCase();
    
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
  });

  // Convert to array and sort by frequency
  return Object.entries(issuePatterns)
    .map(([issue, count]) => ({ issue, count, frequency: count / dislikes.length }))
    .sort((a, b) => b.frequency - a.frequency);
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
    if (item.feedbackType === 'like') {
      personaStats[persona].likes++;
    } else if (item.feedbackType === 'dislike') {
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