/**
 * @fileoverview Personalization utility to manage user communication profile and long-term memory
 */
import { secureLocalStorageGet } from './encryption';
import { analyzeFeedbackTrends, calculateSocialSuccessScore } from './feedbackAnalytics';

let cachedSummary = null;
let lastFetchTime = 0;
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

/**
 * Resets the communication profile cache (used for testing)
 */
export const _resetCommunicationProfileCache = () => {
  cachedSummary = null;
  lastFetchTime = 0;
};

/**
 * Generates a concise summary of the user's communication style and progress
 * to be used as context for the LLM.
 * 
 * @returns {Promise<string>} A string summary for the LLM prompt
 */
export const getCommunicationProfileSummary = async () => {
  const now = Date.now();
  if (cachedSummary && (now - lastFetchTime < CACHE_TTL)) {
    return cachedSummary;
  }

  try {
    const feedbackAnalysis = await analyzeFeedbackTrends();
    const sssData = await calculateSocialSuccessScore();
    const preferences = await secureLocalStorageGet('convocue_preferences', {});

    let summary = "User Communication Profile: ";

    // Add level and score
    summary += `Current Level: ${sssData.level} (Score: ${sssData.score}/100). `;

    // Add strengths based on high sentiment/satisfaction
    if (sssData.breakdown.sentiment > 20) {
      summary += "Strength: Maintaining positive emotional tone. ";
    }
    if (sssData.breakdown.satisfaction > 35) {
      summary += "Strength: Responding well to helpful cues. ";
    }

    // Add improvement areas from feedback analytics
    if (feedbackAnalysis.recentImprovementAreas.length > 0) {
      const topRecent = feedbackAnalysis.recentImprovementAreas[0];
      summary += `Current Focus: User recently found ${topRecent.issue} unhelpful. `;
    } else if (feedbackAnalysis.improvementAreas.length > 0) {
      const topIssue = feedbackAnalysis.improvementAreas[0];
      summary += `Focus Area: User historically finds ${topIssue.issue} unhelpful. `;
    }

    // Add trending preferences
    const increasingTrends = Object.entries(feedbackAnalysis.trendingPreferences)
      .filter(([_, data]) => data.trend === 'increasing');
    
    if (increasingTrends.length > 0) {
      summary += `Trending: User is responding better to ${increasingTrends.map(([k]) => k).join(', ')}. `;
    }

    // Add preferred persona
    const topPersona = Object.entries(feedbackAnalysis.preferredPersonas)
      .sort((a, b) => b[1].satisfaction - a[1].satisfaction)[0];
    
    if (topPersona && topPersona[1].satisfaction > 0.7) {
      summary += `Preferred Style: Responds best to the "${topPersona[0]}" approach. `;
    }

    // Add preferred length
    if (preferences.preferredLength) {
      summary += `Preference: Prefers ${preferences.preferredLength} length suggestions. `;
    }

    cachedSummary = summary;
    lastFetchTime = Date.now();
    return summary;
  } catch (error) {
    console.error('Error generating communication profile summary:', error);
    return "";
  }
};

/**
 * Calculates real-time session tone based on recent interactions.
 * This is used for "Mirroring" where the AI matches the user's pace and intensity.
 * 
 * @param {string} text - The current user transcript
 * @param {Object} metadata - Metadata containing duration and RMS (volume)
 * @param {Object} emotionData - Emotional analysis results
 * @returns {Object} Session tone metrics
 */
export const calculateSessionTone = (text, metadata, emotionData) => {
  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  
  // Pace: words per second
  const duration = metadata?.duration || 1;
  const pace = wordCount / duration;
  
  // Intensity: volume (RMS) + emotional valence
  const volume = metadata?.rms || 0;
  const isUrgent = pace > 3.5 || volume > 0.05 || ['anger', 'fear', 'surprise'].includes(emotionData.emotion);
  
  let mirroringInstruction = "";
  if (isUrgent) {
    mirroringInstruction = "User is in a HIGH-PACE state. Respond with extreme brevity (1-5 words), focusing on immediate survival or tactical social cues.";
  } else if (pace < 1.5 && wordCount > 0) {
    mirroringInstruction = "User is in a REFLECTIVE/SLOW state. Provide more nuanced, empathetic coaching (10-15 words).";
  } else {
    mirroringInstruction = "User is in a BALANCED state. Match their natural rhythm with medium-length suggestions.";
  }

  return {
    pace,
    volume,
    isUrgent,
    mirroringInstruction
  };
};

/**
 * Gets specific advice for the user based on their historical data
 * @returns {Promise<Array>} List of personalized growth tips
 */
export const getPersonalizedGrowthTips = async () => {
  const feedbackAnalysis = await analyzeFeedbackTrends();
  const tips = [];

  if (feedbackAnalysis.overallSatisfaction < 0.5) {
    tips.push("Try a different persona to find a communication style that matches yours better.");
  }

  feedbackAnalysis.improvementAreas.forEach(area => {
    if (area.issue === 'longResponses') {
      tips.push("You prefer concise advice. We'll try to keep suggestions shorter.");
    }
    if (area.issue === 'inappropriateTone') {
      tips.push("We're working on matching your conversational tone more accurately.");
    }
  });

  return tips;
};
