/**
 * Professional coaching utilities for analyzing communication in work settings.
 */

export const analyzeProfessionalCoaching = (text, history = [], emotionData = {}) => {
  const lowerText = text.toLowerCase();
  const insights = [];

  // 1. Negotiation Detection
  if (lowerText.includes('price') || lowerText.includes('cost') || lowerText.includes('budget') || lowerText.includes('discount')) {
    insights.push({
      category: 'Negotiation',
      insight: 'Maintain value focus rather than just price. Ask: "What value are we looking to achieve here?"',
      priority: 'high'
    });
  }

  // 2. Leadership/Decision Making
  if (lowerText.includes('decide') || lowerText.includes('choose') || lowerText.includes('option') || lowerText.includes('plan')) {
    insights.push({
      category: 'Leadership',
      insight: 'Encourage collaborative decision-making. Try: "How do these options align with our core goals?"',
      priority: 'medium'
    });
  }

  // 3. Clarity/Alignment
  if (lowerText.includes('understand') || lowerText.includes('clear') || lowerText.includes('goal') || lowerText.includes('objective')) {
    insights.push({
      category: 'Alignment',
      insight: 'Confirm alignment explicitly. Try: "Just to be sure we are on the same page, our priority is X, correct?"',
      priority: 'medium'
    });
  }

  // 4. Action Oriented
  if (lowerText.includes('do') || lowerText.includes('next') || lowerText.includes('action') || lowerText.includes('follow up')) {
    insights.push({
      category: 'Execution',
      insight: 'Define clear next steps and owners. Ask: "Who is the lead on this and what is the timeline?"',
      priority: 'medium'
    });
  }

  return insights.length > 0 ? { insights } : null;
};
