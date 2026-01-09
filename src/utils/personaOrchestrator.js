import { detectMultipleIntents } from './intentRecognition';
import { AppConfig } from '../config';

/**
 * Helper to check if a keyword exists in text with word boundaries
 */
const hasKeyword = (text, keyword) => {
  try {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    return regex.test(text);
  } catch (e) {
    return text.toLowerCase().includes(keyword.toLowerCase());
  }
};

/**
 * Orchestrates persona selection based on conversational context
 * 
 * @param {string} input - Current user transcript
 * @param {Array} history - Conversation history
 * @param {string} currentPersona - The currently active persona
 * @param {Object} options - Additional options including dampening
 * @returns {Object} { suggestedPersona: string, confidence: number }
 */
export const orchestratePersona = (input, history = [], currentPersona, options = {}) => {
  const config = AppConfig.system.orchestrator;
  const intentMap = config.intentMap;

  const intents = detectMultipleIntents(input, 0.3);
  
  const scores = {};
  
  // Initialize scores with a slight bias towards the current persona to avoid jitter
  Object.keys(intentMap).forEach(persona => {
    scores[persona] = persona === currentPersona ? config.currentPersonaBias : 0;
  });

  // Score based on detected intents
  intents.forEach(({ intent, confidence }) => {
    Object.entries(intentMap).forEach(([persona, pConfig]) => {
      if (pConfig.intents.includes(intent)) {
        scores[persona] += confidence * (pConfig.weight || 1.0);
      }
      
      // Negative intents (if we had any defined, for now we use keywords more)
      if (pConfig.negativeIntents?.includes(intent)) {
        scores[persona] -= confidence * (pConfig.weight || 1.0);
      }
    });
  });

  // Score based on keywords (Positive and Negative)
  Object.entries(intentMap).forEach(([persona, pConfig]) => {
    // Positive Keywords
    pConfig.keywords?.forEach(keyword => {
      if (hasKeyword(input, keyword)) {
        scores[persona] += config.keywordWeight * (pConfig.weight || 1.0);
      }
    });

    // Negative Keywords (Negative Reinforcement)
    pConfig.negativeKeywords?.forEach(keyword => {
      if (hasKeyword(input, keyword)) {
        scores[persona] -= config.keywordWeight * 2.0; // Stronger penalty for negative matches
      }
    });
  });

  // Boost based on history context
  if (history.length > 0) {
    const recentHistory = history.slice(-3).map(h => h.content).join(' ');
    Object.entries(intentMap).forEach(([persona, pConfig]) => {
      pConfig.keywords?.forEach(keyword => {
        if (hasKeyword(recentHistory, keyword)) {
          scores[persona] += config.historyWeight * (pConfig.weight || 1.0);
        }
      });
    });
  }

  // Find the persona with the highest score
  let bestPersona = currentPersona;
  let maxScore = -Infinity;

  Object.entries(scores).forEach(([persona, score]) => {
    if (score > maxScore) {
      maxScore = score;
      bestPersona = persona;
    }
  });

  // Determine base threshold from sensitivity or config
  const sensitivity = options.sensitivity || 'medium';
  let threshold = config.sensitivityPresets?.[sensitivity] || config.threshold;

  // Apply dampening if provided (user rejection logic)
  if (options.rejectionDampening) {
    threshold += options.rejectionDampening;
  }

  // Only suggest a change if the confidence is high enough
  return {
    suggestedPersona: maxScore > threshold ? bestPersona : currentPersona,
    confidence: Math.max(0, Math.min(1.0, maxScore))
  };
};