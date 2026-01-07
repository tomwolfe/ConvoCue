/**
 * @fileoverview Personalization utility to manage user communication profile and long-term memory
 */
import { secureLocalStorageGet } from './encryption';
import { analyzeFeedbackTrends, calculateSocialSuccessScore } from './feedbackAnalytics';

/**
 * Generates a concise summary of the user's communication style and progress
 * to be used as context for the LLM.
 * 
 * @returns {Promise<string>} A string summary for the LLM prompt
 */
export const getCommunicationProfileSummary = async () => {
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
    if (feedbackAnalysis.improvementAreas.length > 0) {
      const topIssue = feedbackAnalysis.improvementAreas[0];
      summary += `Focus Area: User finds ${topIssue.issue} unhelpful. `;
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

    return summary;
  } catch (error) {
    console.error('Error generating communication profile summary:', error);
    return "";
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

  return tips;
};
