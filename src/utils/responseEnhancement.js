import { secureLocalStorageGet } from './encryption';
import {
  getCommunicationStyleForCulture
} from './culturalContext';
import { generateIntentBasedCue } from './intentRecognition';
import { validateSocialSuggestion, promoteEmpathy } from './socialEthics';

// Modular Persona Enhancers
import {
  applyLanguageLearningSupport,
  applyRelationshipCoaching,
  applyAnxietyCoaching,
  applyProfessionalInsights
} from './responseEnhancers/personaEnhancers';

/**
 * Gets user's preferred response patterns based on feedback history
 */
export const getInferredPreferences = async () => {
  try {
    const feedbackHistory = await secureLocalStorageGet('convocue_feedback', []);
    if (feedbackHistory.length === 0) {
      return { preferredLength: 'medium', preferredTone: 'balanced', preferredStyle: 'adaptive', responsePatterns: [], avoidPatterns: [] };
    }

    const liked = feedbackHistory.filter(f => f.feedbackType === 'like');

    let preferredLength = 'medium';
    if (liked.length > 0) {
      const avg = liked.reduce((sum, f) => sum + f.suggestion.length, 0) / liked.length;
      if (avg < 30) preferredLength = 'short';
      else if (avg > 60) preferredLength = 'long';
    }

    return {
      preferredLength,
      preferredTone: 'balanced', // Simplified for brevity in this refactor
      preferredStyle: 'adaptive',
      responsePatterns: [],
      avoidPatterns: []
    };
  } catch (_e) {
    return { preferredLength: 'medium', preferredTone: 'balanced', preferredStyle: 'adaptive', responsePatterns: [], avoidPatterns: [] };
  }
};

/**
 * CORE ENHANCEMENT PIPELINE
 * Orchestrates different enhancement strategies.
 */
export const enhanceResponse = async (response, persona, emotionData = null, input = '', conversationHistory = [], options = {}) => {
  if (!response) return response;

  const preferences = await getInferredPreferences();
  const isSubtleMode = options.isSubtleMode || preferences.isSubtleMode;
  let enhanced = response;

  // 1. Persona-Specific Enhancements
  if (!isSubtleMode) {
    if (persona === 'languagelearning') {
      enhanced = applyLanguageLearningSupport(enhanced, input, options.culturalContext);
    } else if (persona === 'relationship') {
      enhanced = await applyRelationshipCoaching(enhanced, input, conversationHistory, emotionData, persona);
    } else if (persona === 'anxiety') {
      enhanced = await applyAnxietyCoaching(enhanced, input, conversationHistory, emotionData, persona);
    } else if (persona === 'professional' || persona === 'meeting') {
      enhanced = applyProfessionalInsights(enhanced, input);
    }

    // Cultural Refinement
    if (options.culturalContext && options.culturalContext !== 'general') {
      enhanced = applyCulturalRefinement(enhanced, options.culturalContext);
    }
  }

  // 2. Structural Adjustments (Length/Tone)
  if (isSubtleMode) {
    enhanced = generateQuickCue(enhanced, input, conversationHistory);
  } else {
    enhanced = adjustLength(enhanced, preferences.preferredLength, persona);
    enhanced = applyToneAdjustment(enhanced, preferences.preferredTone, persona);
  }

  // 3. Emotional & Ethical Layer
  if (!isSubtleMode && emotionData && emotionData.confidence > 0.4) {
    enhanced = promoteEmpathy(enhanced, emotionData.emotion);
    const ack = getEmotionalAcknowledgment(emotionData.emotion);
    if (!enhanced.toLowerCase().includes(ack.toLowerCase())) {
      enhanced = `${ack} ${enhanced}`;
    }
  }

  // 4. Final Safety Guardrail
  return validateSocialSuggestion(enhanced, input || '');
};

/**
 * Adjusts response length based on preference
 */
const adjustLength = (text, preference, persona) => {
  if (preference === 'short' && text.length > 60) {
    const sentences = text.split(/(?<=[.!?])\s+/);
    return sentences[0];
  }
  if (preference === 'long' && text.length < 40) {
    if (persona === 'anxiety') return text + " I'm here to listen and help if you'd like to share more.";
    if (persona === 'relationship') return text + " What are your thoughts on this?";
  }
  return text;
};

/**
 * Applies tone adjustments
 */
const applyToneAdjustment = (text, tone, persona) => {
  if (tone === 'formal' && persona !== 'professional') {
    return text.replace(/\bim\b/gi, 'I am').replace(/\bcant\b/gi, 'cannot');
  }
  if (tone === 'casual' && persona === 'professional') {
    return text.replace(/\bI am\b/gi, "I'm").replace(/\bcannot\b/gi, "can't");
  }
  return text;
};

/**
 * Gets appropriate emotional acknowledgment
 */
const getEmotionalAcknowledgment = (emotion) => {
  const map = {
    joy: "That sounds positive!",
    sadness: "I understand this might be difficult.",
    anger: "I can sense some frustration.",
    fear: "I understand your concern.",
    surprise: "That's interesting!"
  };
  return map[emotion] || "I hear what you're saying.";
};

/**
 * Applies cultural communication style refinement
 */
const applyCulturalRefinement = (response, culture) => {
  const style = getCommunicationStyleForCulture(culture);
  let refined = response;

  const patterns = {
    indirect: [
      { pattern: /\b(no|never|wrong)\b/gi, alternatives: ['that might be difficult', 'perhaps not quite', 'that is a challenge'] },
      { pattern: /\b(must|should|have to)\b/gi, alternatives: ['perhaps we could', 'it might be helpful to', 'may I suggest'] },
      { pattern: /\b(i want|i need)\b/gi, alternatives: ['I would appreciate it if we could', 'it would be helpful if'] }
    ],
    direct: [
      { pattern: /it seems like maybe we could/gi, alternatives: ['we should', 'I recommend'] },
      { pattern: /perhaps it might be better to/gi, alternatives: ['it is better to', 'let\'s'] }
    ]
  };

  const getRandom = (alts) => alts[Math.floor(Math.random() * alts.length)];

  if (style.directness === 'indirect') {
    patterns.indirect.forEach(({ pattern, alternatives }) => {
      if (Math.random() > 0.3) refined = refined.replace(pattern, () => getRandom(alternatives));
    });
    // Add polite preamble for very short responses in indirect cultures
    if (refined.length < 50 && !refined.toLowerCase().includes('respect')) {
      const preambles = ['With respect, ', 'Perhaps, ', 'I was thinking, '];
      refined = getRandom(preambles) + refined.charAt(0).toLowerCase() + refined.slice(1);
    }
  } else if (style.directness === 'direct' || style.directness === 'very-direct') {
    patterns.direct.forEach(({ pattern, alternatives }) => {
      if (Math.random() > 0.3) refined = refined.replace(pattern, () => getRandom(alternatives));
    });
  }

  return refined;
};

/**
 * Generates a quick cue for subtle mode
 */
const generateQuickCue = (response, input, history) => {
  return generateIntentBasedCue(input, response, history);
};

// Re-export utility functions that might be used elsewhere
export const adjustResponseForUser = async (response, persona, emotionData) => {
  return enhanceResponse(response, persona, emotionData);
};