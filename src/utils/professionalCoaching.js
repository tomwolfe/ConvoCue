import { detectMultipleIntents } from './intentRecognition';

/**
 * Professional coaching utilities for analyzing communication in work settings.
 * Enhanced with multiple intent recognition and emotional context.
 */

export const analyzeProfessionalCoaching = (text, history = [], emotionData = {}, categoryScores = {}) => {
  if (!text) return null;

  const insights = [];
  const detectedIntents = detectMultipleIntents(text, 0.35); // Slightly higher threshold for professional
  const emotion = emotionData?.emotion || 'neutral';
  const emotionConfidence = emotionData?.confidence || 0;

  // Map intents to processing logic
  detectedIntents.forEach(({ intent, confidence }) => {
    switch (intent) {
      case 'negotiation': {
        const isHighTensionNeg = (emotion === 'anger' || emotion === 'fear') && emotionConfidence > 0.6;
        const negScore = categoryScores['Negotiation'] || 0;
        insights.push({
          category: 'Negotiation',
          insight: isHighTensionNeg 
            ? 'Tension detected in negotiation. Try to de-escalate: "I want to find a solution that works for both of us."'
            : 'Maintain value focus rather than just price. Ask: "What value are we looking to achieve here?"',
          priority: (confidence > 0.7 || negScore > 2) ? 'high' : 'medium'
        });
        break;
      }

      case 'leadership': {
        const leadScore = categoryScores['Leadership'] || 0;
        insights.push({
          category: 'Leadership',
          insight: 'Encourage collaborative decision-making. Try: "How do these options align with our core goals?"',
          priority: leadScore > 2 ? 'high' : 'medium'
        });
        break;
      }

      case 'clarity': {
        const isConfused = (emotion === 'fear' || emotion === 'surprise') && emotionConfidence > 0.5;
        const alignScore = categoryScores['Alignment'] || 0;
        insights.push({
          category: 'Alignment',
          insight: isConfused
            ? 'Clarification needed. Try: "Could you help me understand that last point in more detail?"'
            : 'Confirm alignment explicitly. Try: "Just to be sure we are on the same page, our priority is X, correct?"',
          priority: (isConfused || alignScore > 2) ? 'high' : 'medium'
        });
        break;
      }

      case 'execution': {
        const execScore = categoryScores['Execution'] || 0;
        insights.push({
          category: 'Execution',
          insight: 'Define clear next steps and owners. Ask: "Who is the lead on this and what is the timeline?"',
          priority: execScore > 2 ? 'high' : 'medium'
        });
        break;
      }
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

  // Deduplicate insights by category
  const uniqueInsights = [];
  const categoriesSeen = new Set();
  
  insights.forEach(insight => {
    if (!categoriesSeen.has(insight.category)) {
      uniqueInsights.push(insight);
      categoriesSeen.add(insight.category);
    }
  });

  return uniqueInsights.length > 0 ? { 
    insights: uniqueInsights,
    copingStrategies: suggestCopingStrategies(text, emotionData, detectedIntents)
  } : null;
};

/**
 * Suggest professional coping/communication strategies
 */
const suggestCopingStrategies = (text, emotionData, intents = []) => {
  const strategies = [];
  const emotion = emotionData?.emotion || 'neutral';
  
  // High tension communication
  if (emotion === 'anger' || emotion === 'fear') {
    strategies.push({
      type: 'de-escalation',
      technique: 'Use "I" statements to focus on impact: "I am concerned about the timeline," rather than "You are late."'
    });
  }

  // Negotiation tips
  if (intents.some(i => i.intent === 'negotiation')) {
    strategies.push({
      type: 'negotiation',
      technique: 'Focus on interests, not positions. Ask "Why is that important to you?" to uncover deeper needs.'
    });
  }

  // General professional tip
  strategies.push({
    type: 'clarity',
    technique: 'Bottom Line Up Front (BLUF): State your main point in the first sentence for maximum impact.'
  });

  return strategies;
};

/**
 * Meeting-specific coaching analysis.
 * Focuses on meeting dynamics like participation, agenda adherence, and turn-taking.
 */
export const analyzeMeetingCoaching = (text, history = [], emotionData = {}, categoryScores = {}) => {
  if (!text) return null;

  const insights = [];
  const detectedIntents = detectMultipleIntents(text, 0.3); // Lower threshold for meeting cues
  const emotion = emotionData?.emotion || 'neutral';
  
  // Meeting-specific behavior detection
  detectedIntents.forEach(({ intent, confidence }) => {
    switch (intent) {
      case 'clarity': {
        const facScore = categoryScores['Facilitation'] || 0;
        insights.push({
          category: 'Facilitation',
          insight: 'Good use of clarification. To keep the meeting moving, try: "Does that address everyone\'s concerns, or should we move to the next item?"',
          priority: facScore > 2 ? 'high' : 'medium'
        });
        break;
      }
      
      case 'action':
      case 'execution': {
        const agendaScore = categoryScores['Agenda'] || 0;
        insights.push({
          category: 'Agenda',
          insight: 'Action items detected. Ensure ownership is clear: "Let\'s note that as an action item for [Name] with a deadline of [Date]."',
          priority: (confidence > 0.8 || agendaScore > 2) ? 'high' : 'medium'
        });
        break;
      }

      case 'leadership': {
        const dynScore = categoryScores['Dynamics'] || 0;
        insights.push({
          category: 'Dynamics',
          insight: 'You are taking a lead role. Remember to invite quieter participants: "I\'d love to hear from someone who hasn\'t shared their thoughts yet."',
          priority: dynScore > 2 ? 'high' : 'medium'
        });
        break;
      }

      case 'participation':
      case 'question': {
        const partScore = categoryScores['Participation'] || 0;
        insights.push({
          category: 'Participation',
          insight: 'Engaging others with questions is great for meeting flow. Use open-ended questions to deepen the discussion.',
          priority: partScore > 2 ? 'medium' : 'low'
        });
        break;
      }
      
      case 'interruption': {
        insights.push({
          category: 'Dynamics',
          insight: 'Interruption detected. Try to ensure everyone can finish their thoughts: "Sorry, I think [Name] was still finishing their point."',
          priority: 'high'
        });
        break;
      }
    }
  });

  // Turn-taking and interruption analysis (simulated via history if possible)
  if (history.length > 5) {
    const lastFewTurns = history.slice(-5);
    const userTurns = lastFewTurns.filter(t => t.role === 'user').length;
    if (userTurns >= 4) {
      insights.push({
        category: 'Turn-taking',
        insight: 'You\'ve been speaking quite a bit. Consider pausing to let others contribute or ask for feedback: "I\'ll stop there—what do you all think?"',
        priority: 'high'
      });
    }
  }

  // Emotional tone in meetings
  if (emotion === 'anger' || emotion === 'frustration') {
    insights.push({
      category: 'Meeting Tone',
      insight: 'Tension detected. In meetings, it helps to acknowledge the difficulty: "I recognize this is a challenging topic. Let\'s focus on our shared goal."',
      priority: 'high'
    });
  }

  // Deduplicate
  const uniqueInsights = [];
  const categoriesSeen = new Set();
  
  insights.forEach(insight => {
    if (!categoriesSeen.has(insight.category)) {
      uniqueInsights.push(insight);
      categoriesSeen.add(insight.category);
    }
  });

  return uniqueInsights.length > 0 ? { 
    insights: uniqueInsights,
    copingStrategies: suggestMeetingStrategies(text, history, detectedIntents)
  } : null;
};

/**
 * Suggest meeting facilitation strategies
 */
const suggestMeetingStrategies = (text, history, intents = []) => {
  const strategies = [];
  
  // Leadership/Facilitation
  if (intents.some(i => i.intent === 'leadership')) {
    strategies.push({
      type: 'inclusion',
      technique: 'Invite specific input: "[Name], you have great experience here, what is your perspective?"'
    });
  }

  // Action orientation
  if (intents.some(i => i.intent === 'execution' || i.intent === 'action')) {
    strategies.push({
      type: 'accountability',
      technique: 'Summarize decisions: "So we agreed on X, with Y as the owner for Z by Friday."'
    });
  }

  // Default meeting tip
  strategies.push({
    type: 'efficiency',
    technique: 'Parkinson\'s Law: If the discussion is circling, suggest a "parking lot" for the topic to stay on track.'
  });

  return strategies;
};
