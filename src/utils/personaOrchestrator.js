import { detectMultipleIntents, calculateSimilarity } from './intentRecognition';
import { AppConfig } from '../config';

/**
 * Helper to check if a keyword exists in text with word boundaries
 * Enhanced with plural handling and fuzzy matching for high-value words
 */
const hasKeyword = (text, keyword, useFuzzy = false) => {
  const normalizedText = text.toLowerCase();
  const normalizedKeyword = keyword.toLowerCase();
  
  // 1. Exact match with word boundaries
  try {
    const regex = new RegExp(`\\b${normalizedKeyword}s?\\b`, 'i');
    if (regex.test(normalizedText)) return true;
  } catch (e) {
    if (normalizedText.includes(normalizedKeyword)) return true;
  }

  // 2. Fuzzy matching for longer keywords (to handle minor typos or variations)
  if (useFuzzy && normalizedKeyword.length > 5) {
    const tokens = normalizedText.split(/[^a-z0-9']+/);
    for (const token of tokens) {
      if (token.length > 4 && calculateSimilarity(token, normalizedKeyword) > 0.85) {
        return true;
      }
    }
  }

  return false;
};

/**
 * Orchestrates persona selection based on conversational context
 * 
 * @param {string} input - Current user transcript
 * @param {Array} history - Conversation history
 * @param {string} currentPersona - The currently active persona
 * @param {Object} options - Additional options including dampening
 * @returns {Object} { suggestedPersona: string, confidence: number, debug: Object }
 */
export const orchestratePersona = (input, history = [], currentPersona, options = {}) => {
  const config = AppConfig.system.orchestrator;
  const intentMap = config.intentMap;

  const intents = detectMultipleIntents(input, 0.3);
  
  const scores = {};
  const debug = {};
  
  // Initialize scores with a slight bias towards the current persona to avoid jitter
  Object.keys(intentMap).forEach(persona => {
    scores[persona] = persona === currentPersona ? config.currentPersonaBias : 0;
    debug[persona] = {
      total: scores[persona],
      intents: [],
      keywords: [],
      history: 0,
      bias: persona === currentPersona ? config.currentPersonaBias : 0
    };
  });

  // Score based on detected intents
  intents.forEach(({ intent, confidence }) => {
    Object.entries(intentMap).forEach(([persona, pConfig]) => {
      if (pConfig.intents.includes(intent)) {
        const contribution = confidence * (pConfig.weight || 1.0);
        scores[persona] += contribution;
        debug[persona].intents.push({ intent, confidence, contribution });
      }
      
      // Negative intents
      if (pConfig.negativeIntents?.includes(intent)) {
        const penalty = confidence * (pConfig.weight || 1.0);
        scores[persona] -= penalty;
        debug[persona].intents.push({ intent, confidence, penalty: -penalty });
      }
    });
  });

  // Score based on keywords (Positive and Negative)
  Object.entries(intentMap).forEach(([persona, pConfig]) => {
    // Positive Keywords
    pConfig.keywords?.forEach(keyword => {
      if (hasKeyword(input, keyword, true)) {
        const contribution = config.keywordWeight * (pConfig.weight || 1.0);
        scores[persona] += contribution;
        debug[persona].keywords.push({ keyword, contribution });
      }
    });

    // Negative Keywords (Negative Reinforcement)
    pConfig.negativeKeywords?.forEach(keyword => {
      if (hasKeyword(input, keyword, false)) {
        const penalty = config.keywordWeight * 2.0; // Stronger penalty for negative matches
        scores[persona] -= penalty;
        debug[persona].keywords.push({ keyword, penalty: -penalty });
      }
    });
  });

  // Boost based on history context
  if (history.length > 0) {
    const recentHistory = history.slice(-3).map(h => h.content).join(' ');
    Object.entries(intentMap).forEach(([persona, pConfig]) => {
      pConfig.keywords?.forEach(keyword => {
        if (hasKeyword(recentHistory, keyword, false)) {
          const contribution = config.historyWeight * (pConfig.weight || 1.0);
          scores[persona] += contribution;
          debug[persona].history += contribution;
        }
      });
    });
  }

  // Find the persona with the highest score
  let bestPersona = currentPersona;
  let maxScore = -Infinity;

  Object.entries(scores).forEach(([persona, score]) => {
    debug[persona].total = score;
    if (score > maxScore) {
      maxScore = score;
      bestPersona = persona;
    }
  });

  // Determine base threshold from sensitivity or config
  const sensitivity = options.sensitivity || 'medium';
  const baseThreshold = config.thresholdBase || 1.0;
  const sensitivityMultiplier = config.sensitivityPresets?.[sensitivity] || 1.0;
  let threshold = baseThreshold * sensitivityMultiplier;

  // Apply dampening if provided (user rejection logic)
  const dampening = options.rejectionDampening || 0;
  threshold += dampening;

  const result = {
    suggestedPersona: maxScore > threshold ? bestPersona : currentPersona,
    confidence: Math.max(0, Math.min(1.0, maxScore)),
    debug: {
      scores: debug,
      threshold,
      dampening,
      sensitivity,
      winner: bestPersona,
      wasSwitch: maxScore > threshold && bestPersona !== currentPersona
    }
  };

  return result;
};
