/**
 * Advanced Language Learning Features for ConvoCue
 * Provides grammar correction, pronunciation feedback, and language learning support
 *
 * IMPORTANT DISCLAIMER: This module provides language learning suggestions based on general patterns.
 * Language learning is highly individual, and these suggestions may not be appropriate for all learners.
 * Native language backgrounds vary greatly even within cultural groups, and individual learning styles differ.
 * These are educational suggestions only, not definitive assessments.
 */

import { storeLanguageLearningFeedback } from './languageLearningFeedback.js';

// Common grammar patterns and corrections
const GRAMMAR_PATTERNS = {
  // Subject-verb agreement
  subjectVerb: [
    { pattern: /\bI is\b/gi, correction: 'I am', explanation: 'Use "am" with "I" instead of "is"' },
    { pattern: /\bHe are\b/gi, correction: 'He is', explanation: 'Use "is" with third person singular subjects' },
    { pattern: /\bShe are\b/gi, correction: 'She is', explanation: 'Use "is" with third person singular subjects' },
    { pattern: /\bIt are\b/gi, correction: 'It is', explanation: 'Use "is" with "it"' },
    { pattern: /\bThey is\b/gi, correction: 'They are', explanation: 'Use "are" with plural subjects' },
    { pattern: /\bWe is\b/gi, correction: 'We are', explanation: 'Use "are" with "we"' },
    { pattern: /\bYou is\b/gi, correction: 'You are', explanation: 'Use "are" with "you"' }
  ],
  
  // Article usage
  articles: [
    { pattern: /\ba apple\b/gi, correction: 'an apple', explanation: 'Use "an" before words starting with vowel sounds' },
    { pattern: /\ba hour\b/gi, correction: 'an hour', explanation: 'Use "an" before words starting with vowel sounds' },
    { pattern: /\ban university\b/gi, correction: 'a university', explanation: 'Use "a" before words starting with consonant sounds' },
    { pattern: /\ban useful\b/gi, correction: 'a useful', explanation: 'Use "a" before words starting with consonant sounds' }
  ],
  
  // Preposition errors
  prepositions: [
    { pattern: /\bdepend of\b/gi, correction: 'depend on', explanation: 'Use "depend on" instead of "depend of"' },
    { pattern: /\binterested of\b/gi, correction: 'interested in', explanation: 'Use "interested in" instead of "interested of"' },
    { pattern: /\bgood for\b/gi, correction: 'good at', explanation: 'Use "good at" for skills instead of "good for"' },
    { pattern: /\bafraid from\b/gi, correction: 'afraid of', explanation: 'Use "afraid of" instead of "afraid from"' }
  ],
  
  // Tense errors
  tenses: [
    { pattern: /\bI was went\b/gi, correction: 'I went', explanation: 'Use simple past "went" instead of "was went"' },
    { pattern: /\bI have went\b/gi, correction: 'I have gone', explanation: 'Use past participle "gone" with "have"' },
    { pattern: /\bI go yesterday\b/gi, correction: 'I went yesterday', explanation: 'Use past tense "went" for past events' },
    { pattern: /\bI will go yesterday\b/gi, correction: 'I went yesterday', explanation: 'Use past tense for past events, not future tense' }
  ],
  
  // Word order
  wordOrder: [
    { pattern: /\bvery much like\b/gi, correction: 'like very much', explanation: 'In English, adverbs of degree come before the verb' },
    { pattern: /\bI very like\b/gi, correction: 'I like very much', explanation: 'In English, adverbs of degree come after the verb' }
  ]
};

// Common pronunciation challenges by language background
const PRONUNCIATION_CHALLENGES = {
  'spanish': {
    'th': { example: 'think', challenge: 'The "th" sound doesn\'t exist in Spanish' },
    'v': { example: 'very', challenge: 'Spanish "b" and "v" are pronounced the same' },
    'r': { example: 'red', challenge: 'English "r" is different from Spanish rolled "r"' }
  },
  'chinese': {
    'th': { example: 'think', challenge: 'The "th" sound doesn\'t exist in Mandarin' },
    'r_l': { example: 'right'/'light', challenge: 'Mandarin doesn\'t distinguish "r" and "l" sounds' },
    'v_w': { example: 'very'/'wet', challenge: 'Mandarin doesn\'t distinguish "v" and "w" sounds' }
  },
  'french': {
    'th': { example: 'think', challenge: 'The "th" sound doesn\'t exist in French' },
    'h': { example: 'house', challenge: 'French "h" is silent, English "h" is pronounced' },
    'w': { example: 'wine', challenge: 'French "ou" sound is different from English "w"' }
  },
  'german': {
    'v': { example: 'very', challenge: 'German "v" is pronounced like English "f"' },
    'w': { example: 'what', challenge: 'German "w" is pronounced like English "v"' },
    'th': { example: 'think', challenge: 'The "th" sound is different from German "d"' }
  },
  'japanese': {
    'l_r': { example: 'light'/'right', challenge: 'Japanese doesn\'t distinguish "r" and "l" sounds' },
    'f_h': { example: 'fish'/'his', challenge: 'Japanese "h" sounds are different from English "f"' },
    'v': { example: 'very', challenge: 'The "v" sound is challenging for Japanese speakers' }
  }
};

// Vocabulary enhancement suggestions
const VOCABULARY_ENHANCEMENTS = {
  basic: {
    'good': ['excellent', 'wonderful', 'great', 'fantastic', 'superb'],
    'bad': ['terrible', 'awful', 'horrible', 'dreadful', 'atrocious'],
    'big': ['large', 'huge', 'enormous', 'massive', 'gigantic'],
    'small': ['tiny', 'little', 'miniature', 'petite', 'compact'],
    'happy': ['joyful', 'cheerful', 'delighted', 'pleased', 'thrilled'],
    'sad': ['unhappy', 'dejected', 'miserable', 'sorrowful', 'downcast']
  },
  formal: {
    'said': ['mentioned', 'stated', 'indicated', 'noted', 'remarked'],
    'asked': ['inquired', 'requested', 'questioned', 'queried', 'enquired'],
    'help': ['assist', 'aid', 'support', 'facilitate', 'benefit'],
    'get': ['obtain', 'acquire', 'secure', 'procure', 'attain'],
    'make': ['create', 'produce', 'generate', 'develop', 'establish']
  }
};

/**
 * Detects grammar errors in text
 * @param {string} text - Input text to analyze
 * @returns {Array} Array of detected errors with corrections
 */
export const detectGrammarErrors = (text) => {
  if (!text) return [];

  const errors = [];
  
  // Check each grammar pattern category
  for (const [category, patterns] of Object.entries(GRAMMAR_PATTERNS)) {
    for (const patternObj of patterns) {
      const matches = text.match(patternObj.pattern);
      if (matches) {
        matches.forEach(match => {
          errors.push({
            original: match,
            corrected: text.replace(patternObj.pattern, patternObj.correction),
            correction: patternObj.correction,
            explanation: patternObj.explanation,
            category,
            position: text.indexOf(match)
          });
        });
      }
    }
  }
  
  return errors;
};

/**
 * Provides pronunciation feedback based on language background
 * NOTE: This function analyzes text content only, not actual speech audio.
 * It identifies potential pronunciation challenges based on words present in the text.
 * @param {string} text - Input text to analyze
 * @param {string} nativeLanguage - User's native language
 * @returns {Array} Pronunciation challenges and suggestions
 */
export const providePronunciationFeedback = (text, nativeLanguage = 'general') => {
  if (!text || nativeLanguage === 'general') return [];

  const challenges = [];
  const lowerText = text.toLowerCase();

  const languageChallenges = PRONUNCIATION_CHALLENGES[nativeLanguage.toLowerCase()];
  if (!languageChallenges) return [];

  for (const [sound, details] of Object.entries(languageChallenges)) {
    // Check if the text contains words with potential pronunciation challenges
    if (lowerText.includes(details.example.toLowerCase())) {
      challenges.push({
        sound,
        example: details.example,
        challenge: details.challenge,
        suggestion: `Practice the ${sound} sound by focusing on the position of your tongue and lips`,
        note: "This is a text-based analysis identifying potential challenges. Actual pronunciation would require audio analysis."
      });
    }
  }

  // Add disclaimer about text-based nature
  if (challenges.length > 0) {
    challenges.push({
      type: 'disclaimer',
      message: "Note: This is text-based pronunciation guidance. For actual pronunciation feedback, audio analysis would be needed."
    });
  }

  return challenges;
};

/**
 * Suggests vocabulary enhancements
 * @param {string} text - Input text to analyze
 * @param {string} level - 'basic' or 'formal' for different enhancement levels
 * @returns {Array} Vocabulary enhancement suggestions
 */
export const suggestVocabularyEnhancements = (text, level = 'basic') => {
  if (!text) return [];

  const suggestions = [];
  const lowerText = text.toLowerCase();
  const enhancements = VOCABULARY_ENHANCEMENTS[level];
  
  if (!enhancements) return [];

  for (const [basicWord, alternatives] of Object.entries(enhancements)) {
    if (lowerText.includes(basicWord)) {
      suggestions.push({
        original: basicWord,
        alternatives,
        suggestion: `Consider using "${alternatives[0]}" instead of "${basicWord}" for more variety`
      });
    }
  }
  
  return suggestions;
};

/**
 * Analyzes text for language learning feedback
 * @param {string} text - Input text to analyze
 * @param {string} nativeLanguage - User's native language
 * @param {string} targetLanguage - Target language (default: 'english')
 * @returns {Object} Comprehensive language learning feedback
 */
export const analyzeLanguageLearningText = (text, nativeLanguage = 'general', targetLanguage = 'english') => {
  if (!text) {
    return {
      grammarErrors: [],
      pronunciationChallenges: [],
      vocabularySuggestions: [],
      overallScore: 0,
      feedbackSummary: 'No text provided for analysis'
    };
  }

  const grammarErrors = detectGrammarErrors(text);
  const pronunciationChallenges = providePronunciationFeedback(text, nativeLanguage);
  const vocabularySuggestions = suggestVocabularyEnhancements(text, 'basic');
  
  // Calculate overall score based on errors and suggestions
  const maxPoints = 100;
  let score = maxPoints;
  
  // Deduct points for grammar errors
  score -= grammarErrors.length * 10;
  
  // Add points for good vocabulary usage
  score += Math.min(vocabularySuggestions.length * 2, 10);
  
  // Ensure score stays within bounds
  score = Math.max(0, Math.min(100, score));
  
  let feedbackSummary = '';
  if (grammarErrors.length > 0) {
    feedbackSummary += `Detected ${grammarErrors.length} grammar error(s). `;
  }
  if (pronunciationChallenges.length > 0) {
    feedbackSummary += `Identified ${pronunciationChallenges.length} pronunciation challenge(s). `;
  }
  if (vocabularySuggestions.length > 0) {
    feedbackSummary += `Suggested ${vocabularySuggestions.length} vocabulary enhancement(s). `;
  }
  
  if (!feedbackSummary) {
    feedbackSummary = 'Well done! No major errors detected.';
  }
  
  return {
    grammarErrors,
    pronunciationChallenges,
    vocabularySuggestions,
    overallScore: Math.round(score),
    feedbackSummary: feedbackSummary.trim()
  };
};

/**
 * Generates language learning response based on analysis
 * @param {string} originalText - Original user input
 * @param {Object} analysis - Analysis result from analyzeLanguageLearningText
 * @returns {string} Language learning focused response
 */
export const generateLanguageLearningResponse = (originalText, analysis) => {
  let response = '';
  
  if (analysis.grammarErrors.length > 0) {
    response += 'Grammar tip: ';
    analysis.grammarErrors.forEach((error, index) => {
      response += `${error.explanation}. `;
    });
  }
  
  if (analysis.pronunciationChallenges.length > 0) {
    response += 'Pronunciation tip: ';
    analysis.pronunciationChallenges.forEach((challenge, index) => {
      response += `${challenge.challenge} `;
    });
  }
  
  if (analysis.vocabularySuggestions.length > 0) {
    response += 'Vocabulary tip: ';
    analysis.vocabularySuggestions.forEach((suggestion, index) => {
      response += `Consider using "${suggestion.alternatives[0]}" instead of "${suggestion.original}". `;
    });
  }
  
  if (!response) {
    response = 'Great job! Your English sounds natural and fluent.';
  }
  
  return response.trim();
};

/**
 * Provides contextual language learning feedback
 * @param {string} inputText - User's input text
 * @param {string} nativeLanguage - User's native language (separate from cultural context)
 * @param {Array} conversationHistory - Conversation history for context
 * @returns {Object} Contextual language learning feedback
 */
export const provideContextualLanguageFeedback = (inputText, nativeLanguage, conversationHistory = []) => {
  const analysis = analyzeLanguageLearningText(inputText, nativeLanguage);
  const response = generateLanguageLearningResponse(inputText, analysis);

  // Add context from conversation history
  let contextualFeedback = response;

  if (conversationHistory.length > 0) {
    const lastTurn = conversationHistory[conversationHistory.length - 1];
    if (lastTurn && lastTurn.content.toLowerCase().includes('how')) {
      contextualFeedback += ' Since the question was about a process, consider using more specific action words.';
    }
  }

  // Create result object
  const result = {
    ...analysis,
    contextualResponse: contextualFeedback,
    isLearningFocused: true
  };

  // Store feedback for future improvement (this would be triggered by user action in practice)
  // For now, we'll just make the function available for when user provides feedback
  result.feedbackCollector = (isHelpful, userComment = '') => {
    storeLanguageLearningFeedback(inputText, analysis, isHelpful, userComment, nativeLanguage);
  };

  return result;
};