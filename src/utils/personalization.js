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
 * Resets mirroring baselines to defaults.
 */
export const resetMirroringBaselines = async () => {
  await secureLocalStorageSet(MIRRORING_BASELINES_KEY, { ...DEFAULT_BASELINES });
};

/**
 * Updates mirroring baselines using an Exponential Moving Average (EMA).
 * 
 * @param {number} currentPace - Pace of the current interaction
 * @param {number} currentVolume - Volume (RMS) of the current interaction
 */
export const updateMirroringBaselines = async (currentPace, currentVolume) => {
  if (currentPace <= 0) return;

  // Noise floor check: ignore very quiet samples (likely background noise or far mic)
  // 0.002 is a conservative threshold for meaningful speech
  const NOISE_FLOOR = 0.002;
  const isMeaningfulVolume = currentVolume > NOISE_FLOOR;

  const baselines = await getMirroringBaselines();
  
  // Accelerated learning for first 5 samples (alpha 0.3), then standard smoothing (0.1)
  const alpha = baselines.count < 5 ? 0.3 : 0.1;

  // Use simple average for first 3 samples to establish a baseline floor, then EMA
  if (baselines.count < 3) {
    baselines.pace = (baselines.pace * baselines.count + currentPace) / (baselines.count + 1);
    if (isMeaningfulVolume) {
      baselines.volume = (baselines.volume * baselines.count + currentVolume) / (baselines.count + 1);
    }
  } else {
    baselines.pace = (alpha * currentPace) + (1 - alpha) * baselines.pace;
    if (isMeaningfulVolume) {
      baselines.volume = (alpha * currentVolume) + (1 - alpha) * baselines.volume;
    }
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
 * @param {Object} settings - User settings including mirroring sensitivity
 * @param {number} consecutiveUrgentTurns - Number of consecutive turns with high urgency
 * @returns {Object} Session tone metrics
 */
export const calculateSessionTone = (text, metadata, emotionData, baselines = DEFAULT_BASELINES, settings = {}, consecutiveUrgentTurns = 0) => {
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
  
  // High-arousal emotions add to intensity, but with reduced weight to minimize misclassification impact
  // Check if emotion data is reliable (has confidence score) or if emotion is uncertain
  const hasReliableEmotion = emotionData && emotionData.emotion && emotionData.confidence !== undefined;
  const isHighArousal = hasReliableEmotion
    ? ['anger', 'fear', 'surprise', 'joy'].includes(emotionData.emotion.toLowerCase())
    : ['anger', 'fear', 'surprise', 'joy'].includes(emotionData.emotion?.toLowerCase()); // fallback for when no confidence data

  // Reduce emotion weight when confidence is low or absent, prioritize pace and volume as more reliable metrics
  const emotionWeight = hasReliableEmotion && emotionData.confidence > 0.7 ? 0.2 : 0.05;
  const emotionScore = isHighArousal ? 1.4 : 1.0;

  // Weighted Urgency Score - prioritizing pace and volume over emotion data
  const urgencyScore = (paceRatio * 0.5) + (volumeRatio * 0.3) + (emotionScore * emotionWeight);
  
  // Configurable Thresholds based on sensitivity setting
  const sensitivity = settings.mirroringSensitivity || 'medium';

  // Adaptive thresholds that consider user's natural speaking patterns
  // For users with naturally high energy, adjust thresholds to prevent over-triggering
  const userPaceFactor = Math.min(2.0, paceRatio); // Cap at 2x baseline to prevent extreme adjustments
  const userVolumeFactor = Math.min(2.0, volumeRatio); // Cap at 2x baseline to prevent extreme adjustments

  // Adjust thresholds based on user's natural patterns to prevent false positives
  const baseThresholds = {
    low: { urgent: 2.2, reflective: 0.4 },
    medium: { urgent: 1.6, reflective: 0.6 },
    high: { urgent: 1.2, reflective: 0.8 }
  };

  // For high sensitivity, increase thresholds if user naturally speaks with high pace/volume
  // This prevents naturally energetic users from being flagged as distressed
  // Use more conservative adjustment to prevent over-correction
  if (sensitivity === 'high') {
    baseThresholds.high.urgent = 1.2 + (0.1 * userPaceFactor * userVolumeFactor);
  } else if (sensitivity === 'medium') {
    baseThresholds.medium.urgent = 1.6 + (0.1 * userPaceFactor * userVolumeFactor);
  }

  const activeThresholds = baseThresholds[sensitivity] || baseThresholds.medium;

  // Respect Privacy Mode: Return balanced metrics without instructions
  if (settings.privacyMode) {
    return {
      pace,
      volume,
      urgencyScore,
      isUrgent: false,
      shouldOverride: false,
      mirroringInstruction: ""
    };
  }

  const isUrgent = urgencyScore > activeThresholds.urgent;
  
  // Refined Reflective Detection:
  // Must have a slow pace BUT also a reasonable density of words to avoid 
  // misclassifying silence or single-word thinking pauses as "reflective coaching" moments.
  const isTooSlowForReflective = pace < 0.3; // Less than 1 word every 3 seconds is likely just pausing
  const isReflective = paceRatio < activeThresholds.reflective && 
                      wordCount > 3 && 
                      !isTooSlowForReflective;

  // Calming Override Logic: Dynamic based on severity
  // Extreme urgency triggers immediately; moderate urgency requires persistence.
  const CALMING_THRESHOLD = 2.5;
  const EXTREME_URGENCY_THRESHOLD = 4.0;
  const MAX_URGENT_TURNS = 2;
  
  const isExtremelyUrgent = urgencyScore > EXTREME_URGENCY_THRESHOLD;
  const shouldOverride = isExtremelyUrgent || (urgencyScore > CALMING_THRESHOLD && consecutiveUrgentTurns >= MAX_URGENT_TURNS - 1);

  // Proactive De-escalation Layer for High Sensitivity
  // Triggers when urgency is rising but hasn't hit the full calming override threshold yet.
  const isDeEscalating = sensitivity === 'high' && 
                        urgencyScore > activeThresholds.urgent && 
                        urgencyScore <= CALMING_THRESHOLD && 
                        !shouldOverride;

  let mirroringInstruction = "";
  if (shouldOverride) {
    mirroringInstruction = "[MIRROR: CALMING] I'm here. Let's take a breath. (Respond with a slow, steady pace and calming tone, even if the user is urgent).";
  } else if (isDeEscalating) {
    mirroringInstruction = "[MIRROR: DE-ESCALATE] I'm here with you. (Respond briefly, but maintain a steady, grounding presence. Use slightly longer pauses or '...' between thoughts. Do not match the user's high intensity; act as a calm anchor).";
  } else if (isUrgent) {
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
    isDeEscalating,
    shouldOverride,
    mirroringInstruction,
    suggestedDelay: isDeEscalating ? 1500 : (shouldOverride ? 2000 : 0)
  };
};

/**
 * Stores user feedback on mirroring behavior to improve future responses
 * @param {string} feedback - 'right' or 'wrong' indicating if the AI's tone felt appropriate
 * @param {Object} sessionTone - The session tone data that was used
 * @param {Object} userSettings - Current user settings
 */
export const recordMirroringFeedback = async (feedback, sessionTone, userSettings) => {
  const feedbackKey = 'convocue_mirroring_feedback';
  const currentFeedback = await secureLocalStorageGet(feedbackKey, []);

  // Ensure currentFeedback is an array
  const feedbackArray = Array.isArray(currentFeedback) ? currentFeedback : [];

  // Add new feedback entry with timestamp and context
  const feedbackEntry = {
    timestamp: Date.now(),
    feedback, // 'right' or 'wrong'
    sessionTone,
    userSettings: { ...userSettings },
    id: Date.now() + Math.random() // unique ID
  };

  // Keep only the last 50 feedback entries to prevent storage bloat
  const updatedFeedback = [feedbackEntry, ...feedbackArray].slice(0, 50);

  await secureLocalStorageSet(feedbackKey, updatedFeedback);

  // Adjust sensitivity based on negative feedback
  if (feedback === 'wrong' && userSettings.mirroringSensitivity === 'high') {
    // If user frequently feels the AI is inappropriate, suggest lowering sensitivity
    const wrongFeedbackCount = updatedFeedback.filter(f => f.feedback === 'wrong').length;
    const rightFeedbackCount = updatedFeedback.filter(f => f.feedback === 'right').length;

    // If more than 60% of feedback is negative, consider adjusting sensitivity
    if (wrongFeedbackCount > 0 && (wrongFeedbackCount / (wrongFeedbackCount + rightFeedbackCount)) > 0.6) {
      console.log("Consider adjusting mirroring sensitivity based on user feedback");
    }
  }
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

  // Add mirroring-specific tip if there's been negative feedback
  const mirroringFeedback = await secureLocalStorageGet('convocue_mirroring_feedback', []);
  const negativeFeedbackCount = mirroringFeedback.filter(f => f.feedback === 'wrong').length;
  const positiveFeedbackCount = mirroringFeedback.filter(f => f.feedback === 'right').length;

  if (negativeFeedbackCount > positiveFeedbackCount && negativeFeedbackCount > 2) {
    tips.push("The AI's tone adaptation might not match your preferences. Consider adjusting the Mirroring Sensitivity in Settings.");
  }

  return tips;
};
