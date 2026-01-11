/**
 * @fileoverview Personalization utility to manage user communication profile and long-term memory
 */
import { secureLocalStorageGet, secureLocalStorageSet } from './encryption';
import { analyzeFeedbackTrends, calculateSocialSuccessScore } from './feedbackAnalytics';

let cachedSummary = null;
let lastFetchTime = 0;
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

const MIRRORING_BASELINES_KEY = 'convocue_mirroring_baselines';
const DEFAULT_BASELINES = {
  pace: 2.5,   // words per second
  volume: 0.02, // RMS
  count: 0      // Number of samples
};

/**
 * Resets the communication profile cache (used for testing)
 */
export const _resetCommunicationProfileCache = () => {
  cachedSummary = null;
  lastFetchTime = 0;
};

/**
 * Retrieves the current user's mirroring baselines.
 * @returns {Promise<Object>} Baselines for pace and volume
 */
export const getMirroringBaselines = async () => {
  return await secureLocalStorageGet(MIRRORING_BASELINES_KEY, { ...DEFAULT_BASELINES });
};

/**
 * Updates mirroring baselines using an Exponential Moving Average (EMA).
 * 
 * @param {number} currentPace - Pace of the current interaction
 * @param {number} currentVolume - Volume (RMS) of the current interaction
 */
export const updateMirroringBaselines = async (currentPace, currentVolume) => {
  if (currentPace <= 0) return;

  const baselines = await getMirroringBaselines();
  const alpha = 0.1; // Smoothing factor

  // Use simple average for first few samples, then EMA
  if (baselines.count < 10) {
    baselines.pace = (baselines.pace * baselines.count + currentPace) / (baselines.count + 1);
    baselines.volume = (baselines.volume * baselines.count + currentVolume) / (baselines.count + 1);
  } else {
    baselines.pace = (alpha * currentPace) + (1 - alpha) * baselines.pace;
    baselines.volume = (alpha * currentVolume) + (1 - alpha) * baselines.volume;
  }
  
  baselines.count += 1;
  await secureLocalStorageSet(MIRRORING_BASELINES_KEY, baselines);
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
 * @param {Object} baselines - User-specific pace/volume baselines
 * @returns {Object} Session tone metrics
 */
export const calculateSessionTone = (text, metadata, emotionData, baselines = DEFAULT_BASELINES) => {
  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  
  // Pace: words per second
  const duration = metadata?.duration || 1;
  const pace = wordCount / duration;
  const volume = metadata?.rms || 0;

  // Use dynamic baselines for normalization (with safety floor)
  const safeBasePace = Math.max(0.5, baselines.pace || DEFAULT_BASELINES.pace);
  const safeBaseVolume = Math.max(0.001, baselines.volume || DEFAULT_BASELINES.volume);
  
  const paceRatio = pace / safeBasePace;
  const volumeRatio = volume / safeBaseVolume;
  
  // High-arousal emotions add to intensity
  const isHighArousal = ['anger', 'fear', 'surprise', 'joy'].includes(emotionData.emotion);
  const emotionScore = isHighArousal ? 1.4 : 1.0;

  // Weighted Urgency Score (80/20 robustness improvement)
  // Pace is most indicative of urgency in conversation, followed by volume
  const urgencyScore = (paceRatio * 0.5) + (volumeRatio * 0.3) + (emotionScore * 0.2);
  
  // Thresholds for instructions
  const isUrgent = urgencyScore > 1.6; // High deviation from baseline
  const isReflective = paceRatio < 0.6 && wordCount > 3;

  let mirroringInstruction = "";
  if (isUrgent) {
    mirroringInstruction = "[MIRROR: HIGH-PACE] Respond with extreme brevity (1-5 words). Focus only on immediate tactical needs.";
  } else if (isReflective) {
    mirroringInstruction = "[MIRROR: REFLECTIVE] Use a slower, more empathetic pace. Provide nuanced coaching (10-15 words).";
  } else {
    mirroringInstruction = "[MIRROR: BALANCED] Match natural conversational flow with medium-length suggestions.";
  }

  return {
    pace,
    volume,
    urgencyScore,
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
