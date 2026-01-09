import { detectMultipleIntents } from './intentRecognition';

/**
 * Professional coaching utilities for analyzing communication in work settings.
 * Enhanced with multiple intent recognition and emotional context.
 */

export const analyzeProfessionalCoaching = (text, history = [], emotionData = {}) => {
  if (!text) return null;

  const insights = [];
  const detectedIntents = detectMultipleIntents(text, 0.35); // Slightly higher threshold for professional
  const emotion = emotionData?.emotion || 'neutral';
  const emotionConfidence = emotionData?.confidence || 0;

  // Map intents to processing logic
  detectedIntents.forEach(({ intent, confidence }) => {
    switch (intent) {
      case 'negotiation':
        const isHighTensionNeg = (emotion === 'anger' || emotion === 'fear') && emotionConfidence > 0.6;
        insights.push({
          category: 'Negotiation',
          insight: isHighTensionNeg 
            ? 'Tension detected in negotiation. Try to de-escalate: "I want to find a solution that works for both of us."'
            : 'Maintain value focus rather than just price. Ask: "What value are we looking to achieve here?"',
          priority: confidence > 0.7 ? 'high' : 'medium'
        });
        break;

      case 'leadership':
        insights.push({
          category: 'Leadership',
          insight: 'Encourage collaborative decision-making. Try: "How do these options align with our core goals?"',
          priority: 'medium'
        });
        break;

      case 'clarity':
        const isConfused = (emotion === 'fear' || emotion === 'surprise') && emotionConfidence > 0.5;
        insights.push({
          category: 'Alignment',
          insight: isConfused
            ? 'Clarification needed. Try: "Could you help me understand that last point in more detail?"'
            : 'Confirm alignment explicitly. Try: "Just to be sure we are on the same page, our priority is X, correct?"',
          priority: isConfused ? 'high' : 'medium'
        });
        break;

      case 'execution':
        insights.push({
          category: 'Execution',
          insight: 'Define clear next steps and owners. Ask: "Who is the lead on this and what is the timeline?"',
          priority: 'medium'
        });
        break;
    }
  });

  // Emotional Professionalism (Separate check)
  if (emotion === 'anger' && emotionConfidence > 0.7) {
    insights.push({
      category: 'Professionalism',
      insight: 'Strong emotions detected. A neutral tone often yields better results in professional settings. Take a breath.',
      priority: 'high'
    });
  }

  // Deduplicate insights by category (in case multiple intents map to same category)
  const uniqueInsights = [];
  const categoriesSeen = new Set();
  
  insights.forEach(insight => {
    if (!categoriesSeen.has(insight.category)) {
      uniqueInsights.push(insight);
      categoriesSeen.add(insight.category);
    }
  });

  return uniqueInsights.length > 0 ? { insights: uniqueInsights } : null;
};
