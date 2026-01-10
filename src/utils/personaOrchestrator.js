import { detectMultipleIntents, calculateSimilarity } from './intentRecognition';
import { AppConfig } from '../config';

/**
 * Common English stop words that should never trigger fuzzy matching
 */
const STOP_WORDS = new Set(['about', 'there', 'their', 'would', 'could', 'should', 'these', 'those', 'where', 'which', 'while', 'under', 'after', 'again', 'other']);

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
  } catch (_e) {
    if (normalizedText.includes(normalizedKeyword)) return true;
  }

  // 2. Fuzzy matching for longer keywords (to handle minor typos or variations)
  // Stop-word check prevents common words from matching complex keywords
  if (useFuzzy && normalizedKeyword.length > 5 && !STOP_WORDS.has(normalizedKeyword)) {
    const tokens = normalizedText.split(/[^a-z0-9']+/);
    for (const token of tokens) {
      if (token.length > 4 && !STOP_WORDS.has(token) && calculateSimilarity(token, normalizedKeyword) > 0.85) {
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
 * @param {Object} options - Additional options including dampening and manual preference
 * @returns {Object} { suggestedPersona: string, confidence: number, debug: Object }
 */
export const orchestratePersona = (input, history = [], currentPersona, options = {}) => {
  const config = AppConfig.orchestratorConfig;
  const intentMap = config.intentMap;

  const intents = detectMultipleIntents(input, 0.3);

  const scores = {};
  const debug = {};

  // Initialize scores with a slight bias towards the current persona to avoid jitter
  // Also apply manual preference boost if applicable
  Object.keys(intentMap).forEach(persona => {
    const isCurrent = persona === currentPersona;
    const manualBoost = (options.manualPreference === persona) ? (config.manualPreferenceBoost || 0.4) : 0;

    scores[persona] = (isCurrent ? config.currentPersonaBias : 0) + manualBoost;
    debug[persona] = {
      total: scores[persona],
      intents: [],
      keywords: [],
      history: 0,
      bias: isCurrent ? config.currentPersonaBias : 0,
      manualBoost
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
    if (score > maxScore || (score === maxScore && persona === currentPersona)) {
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

  // Cycle 2: High-Intensity Intent Thresholding
  // If we detect high-stakes or intense intents, we increase the threshold for switching 
  // to avoid jittering when the user needs stability most.
  const highIntensityIntents = ['conflict', 'negotiation', 'leadership', 'strategic'];
  const activeHighIntensity = intents.filter(i => highIntensityIntents.includes(i.intent) && i.confidence > 0.6);
  
  debug.intensityBoost = 0;
  if (activeHighIntensity.length > 0) {
    const intensityBoost = 0.3 * activeHighIntensity.length;
    threshold += intensityBoost;
    debug.intensityBoost = intensityBoost;
  }

  const result = {
    suggestedPersona: maxScore > threshold ? bestPersona : currentPersona,
    confidence: Math.max(0, Math.min(1.0, maxScore)),
    debug: {
      scores: debug,
      threshold,
      intensityBoost: debug.intensityBoost,
      dampening,
      sensitivity,
      winner: bestPersona,
      wasSwitch: maxScore > threshold && bestPersona !== currentPersona
    }
  };

  return result;
};
