import { detectMultipleIntents } from './intentRecognition';

/**
 * Maps intents to coaching personas with associated weights
 */
const PERSONA_INTENT_MAP = {
  anxiety: {
    intents: ['emotion', 'conflict', 'interruption'],
    keywords: ['nervous', 'stressed', 'anxious', 'fear', 'scared', 'worried', 'stop', 'wait'],
    weight: 1.2 // Priority for emotional support
  },
  relationship: {
    intents: ['empathy', 'emotion', 'participation'],
    keywords: ['feel', 'understand', 'connect', 'share', 'thoughts', 'opinions'],
    weight: 1.0
  },
  professional: {
    intents: ['strategic', 'negotiation', 'leadership'],
    keywords: ['negotiate', 'important', 'manager', 'executive', 'contract', 'deal', 'strategy'],
    weight: 1.1
  },
  meeting: {
    intents: ['action', 'execution', 'clarity', 'participation'],
    keywords: ['todo', 'action', 'next steps', 'plan', 'schedule', 'understand', 'clear'],
    weight: 1.0
  },
  crosscultural: {
    intents: ['clarity'],
    keywords: ['culture', 'custom', 'tradition', 'translation', 'language', 'meaning'],
    weight: 0.9
  },
  languagelearning: {
    intents: ['clarity'],
    keywords: ['grammar', 'vocabulary', 'phrase', 'speak', 'say'],
    weight: 0.8
  }
};

/**
 * Orchestrates persona selection based on conversational context
 * 
 * @param {string} input - Current user transcript
 * @param {Array} history - Conversation history
 * @param {string} currentPersona - The currently active persona
 * @returns {Object} { suggestedPersona: string, confidence: number }
 */
export const orchestratePersona = (input, history = [], currentPersona = 'anxiety') => {
  if (!input) return { suggestedPersona: currentPersona, confidence: 1.0 };

  const intents = detectMultipleIntents(input, 0.3);
  const inputLower = input.toLowerCase();
  
  const scores = {};
  
  // Initialize scores with a slight bias towards the current persona to avoid jitter
  Object.keys(PERSONA_INTENT_MAP).forEach(persona => {
    scores[persona] = persona === currentPersona ? 0.2 : 0;
  });

  // Score based on detected intents
  intents.forEach(({ intent, confidence }) => {
    Object.entries(PERSONA_INTENT_MAP).forEach(([persona, config]) => {
      if (config.intents.includes(intent)) {
        scores[persona] += confidence * config.weight;
      }
    });
  });

  // Score based on keywords
  Object.entries(PERSONA_INTENT_MAP).forEach(([persona, config]) => {
    config.keywords.forEach(keyword => {
      if (inputLower.includes(keyword)) {
        scores[persona] += 0.3 * config.weight;
      }
    });
  });

  // Boost based on history context
  if (history.length > 0) {
    const recentHistory = history.slice(-3).map(h => h.content.toLowerCase()).join(' ');
    Object.entries(PERSONA_INTENT_MAP).forEach(([persona, config]) => {
      config.keywords.forEach(keyword => {
        if (recentHistory.includes(keyword)) {
          scores[persona] += 0.1 * config.weight;
        }
      });
    });
  }

  // Find the persona with the highest score
  let bestPersona = currentPersona;
  let maxScore = 0;

  Object.entries(scores).forEach(([persona, score]) => {
    if (score > maxScore) {
      maxScore = score;
      bestPersona = persona;
    }
  });

  // Only suggest a change if the confidence is high enough
  const threshold = 0.5;
  return {
    suggestedPersona: maxScore > threshold ? bestPersona : currentPersona,
    confidence: Math.min(1.0, maxScore)
  };
};
