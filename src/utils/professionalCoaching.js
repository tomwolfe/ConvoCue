import { detectMultipleIntents } from './intentRecognition';

/**
 * Shared helper to deduplicate insights by category.
 * @param {Array<Object>} insights - The list of insights to deduplicate.
 * @returns {Array<Object>} Unique insights by category.
 */
const getUniqueInsights = (insights) => {
  const uniqueInsights = [];
  const categoriesSeen = new Set();
  
  insights.forEach(insight => {
    if (!categoriesSeen.has(insight.category)) {
      uniqueInsights.push(insight);
      categoriesSeen.add(insight.category);
    }
  });
  
  return uniqueInsights;
};

/**
 * Shared helper to calculate priority based on confidence and user feedback scores.
 * @param {number} confidence - The AI's confidence in the detected intent.
 * @param {string} category - The category of the insight.
 * @param {Object} categoryScores - User's historical feedback scores for this category.
 * @param {number} [threshold=2] - The score threshold to upgrade priority to high.
 * @returns {'high'|'medium'} The calculated priority level.
 */
const getPriority = (confidence, category, categoryScores, threshold = 2) => {
  const score = categoryScores[category] || 0;
  return (confidence > 0.7 || score > threshold) ? 'high' : 'medium';
};

/**
 * Professional coaching utilities for analyzing communication in work settings.
 * @param {string} text - The transcript of the current conversation turn.
 * @param {Array<Object>} [history=[]] - The conversation history for context.
 * @param {Object} [emotionData={}] - Emotional analysis results (emotion, confidence).
 * @param {Object} [categoryScores={}] - Historical user feedback for coaching categories.
 * @returns {Object|null} An object containing insights and coping strategies, or null if nothing relevant is found.
 */
export const analyzeProfessionalCoaching = (text, _history = [], emotionData = {}, categoryScores = {}) => {
  if (!text) return null;

  const insights = [];
  const detectedIntents = detectMultipleIntents(text, 0.35);
  const emotion = emotionData?.emotion || 'neutral';
  const emotionConfidence = emotionData?.confidence || 0;

  detectedIntents.forEach(({ intent, confidence }) => {
    switch (intent) {
      case 'negotiation': {
        const isHighTensionNeg = (emotion === 'anger' || emotion === 'fear') && emotionConfidence > 0.6;
        insights.push({
          category: 'Negotiation',
          insight: isHighTensionNeg
            ? 'Tension detected in negotiation. Try to de-escalate: "I want to find a solution that works for both of us."'
            : 'Maintain value focus rather than just price. Ask: "What value are we looking to achieve here?"',
          priority: getPriority(confidence, 'Negotiation', categoryScores)
        });
        break;
      }

      case 'strategic': {
        insights.push({
          category: 'Strategy',
          insight: 'Focus on long-term implications. Ask: "How does this align with our strategic objectives?"',
          priority: getPriority(confidence, 'Strategy', categoryScores)
        });
        break;
      }

      case 'leadership': {
        insights.push({
          category: 'Leadership',
          insight: 'Encourage collaborative decision-making. Try: "How do these options align with our core goals?"',
          priority: getPriority(confidence, 'Leadership', categoryScores)
        });
        break;
      }

      case 'clarity': {
        const isConfused = (emotion === 'fear' || emotion === 'surprise') && emotionConfidence > 0.5;
        insights.push({
          category: 'Alignment',
          insight: isConfused
            ? 'Clarification needed. Try: "Could you help me understand that last point in more detail?"'
            : 'Confirm alignment explicitly. Try: "Just to be sure we are on the same page, our priority is X, correct?"',
          priority: isConfused ? 'high' : getPriority(confidence, 'Alignment', categoryScores)
        });
        break;
      }

      case 'action': {
        insights.push({
          category: 'Action',
          insight: 'Define clear next steps. Ask: "What is the immediate next step?"',
          priority: getPriority(confidence, 'Action', categoryScores)
        });
        break;
      }

      case 'execution': {
        insights.push({
          category: 'Execution',
          insight: 'Focus on implementation details. Ask: "Who is the lead on this and what is the timeline?"',
          priority: getPriority(confidence, 'Execution', categoryScores)
        });
        break;
      }
    }
  });

  if (emotion === 'anger' && emotionConfidence > 0.7) {
    insights.push({
      category: 'Professionalism',
      insight: 'Strong emotions detected. A neutral tone often yields better results in professional settings. Take a breath.',
      priority: 'high'
    });
  }

  const uniqueInsights = getUniqueInsights(insights);

  return uniqueInsights.length > 0 ? { 
    insights: uniqueInsights,
    copingStrategies: suggestProfessionalStrategies(text, emotionData, detectedIntents)
  } : null;
};

/**
 * Suggest professional communication strategies based on detected intents and emotions.
 * @param {string} text - The transcript text.
 * @param {Object} emotionData - Emotional state data.
 * @param {Array<Object>} [intents=[]] - List of detected intents.
 * @returns {Array<Object>} List of suggested strategies (type, technique).
 */
const suggestProfessionalStrategies = (text, emotionData, intents = []) => {
  const strategies = [];
  const emotion = emotionData?.emotion || 'neutral';
  
  if (emotion === 'anger' || emotion === 'fear') {
    strategies.push({
      type: 'de-escalation',
      technique: 'Use "I" Statements',
      details: 'Focus on the impact on you rather than the other person\'s actions. For example: "I am concerned about the project timeline" instead of "You are delaying the project."'
    });
  }

  if (intents.some(i => i.intent === 'negotiation')) {
    strategies.push({
      type: 'negotiation',
      technique: 'Interest-Based Negotiation',
      details: 'Look for the "Why" behind their "What". Instead of arguing over a price, ask what outcomes they are trying to achieve to find mutually beneficial solutions.'
    });
  }

  strategies.push({
    type: 'clarity',
    technique: 'BLUF (Bottom Line Up Front)',
    details: 'Start your response with the most important information or the core request. This respects everyone\'s time and ensures your main point isn\'t lost in the details.'
  });

  return strategies;
};

/**
 * Meeting-specific coaching analysis for turn-taking, facilitation, and agenda management.
 * @param {string} text - The transcript of the current conversation turn.
 * @param {Array<Object>} [history=[]] - Conversation history for turn-taking analysis.
 * @param {Object} [emotionData={}] - Emotional analysis results.
 * @param {Object} [categoryScores={}] - Historical user feedback for coaching categories.
 * @returns {Object|null} Meeting-specific insights and strategies.
 */
export const analyzeMeetingCoaching = (text, history = [], emotionData = {}, categoryScores = {}) => {
  if (!text) return null;

  const insights = [];
  const detectedIntents = detectMultipleIntents(text, 0.3); // Lower threshold for meeting cues
  const emotion = emotionData?.emotion || 'neutral';
  
  detectedIntents.forEach(({ intent, confidence }) => {
    switch (intent) {
      case 'clarity': {
        insights.push({
          category: 'Facilitation',
          insight: 'Good use of clarification. To keep the meeting moving, try: "Does that address everyone\'s concerns, or should we move to the next item?"',
          priority: getPriority(confidence, 'Facilitation', categoryScores)
        });
        break;
      }
      
      case 'action':
      case 'execution': {
        insights.push({
          category: 'Agenda',
          insight: 'Action items detected. Ensure ownership is clear: "Let\'s note that as an action item for [Name] with a deadline of [Date]."',
          priority: getPriority(confidence, 'Agenda', categoryScores)
        });
        break;
      }

      case 'leadership': {
        insights.push({
          category: 'Dynamics',
          insight: 'You are taking a lead role. Remember to invite quieter participants: "I\'d love to hear from someone who hasn\'t shared their thoughts yet."',
          priority: getPriority(confidence, 'Dynamics', categoryScores)
        });
        break;
      }

      case 'participation':
      case 'question': {
        insights.push({
          category: 'Participation',
          insight: 'Engaging others with questions is great for meeting flow. Use open-ended questions to deepen the discussion.',
          priority: (categoryScores['Participation'] > 2) ? 'medium' : 'low'
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

  const uniqueInsights = getUniqueInsights(insights);

  return uniqueInsights.length > 0 ? { 
    insights: uniqueInsights,
    copingStrategies: suggestMeetingStrategies(text, history, detectedIntents)
  } : null;
};

/**
 * Suggest meeting facilitation strategies based on detected intents.
 * @param {string} text - The transcript text.
 * @param {Array<Object>} history - Conversation history.
 * @param {Array<Object>} [intents=[]] - List of detected intents.
 * @returns {Array<Object>} Meeting strategies.
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