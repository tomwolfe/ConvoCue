/**
 * NLP-based Intent Recognition System
 * Replaces basic keyword detection with more sophisticated intent analysis.
 *
 * DESIGN PRINCIPLE: 100% Client-Side.
 * This system uses rule-based pattern matching and string similarity (Jaccard-like overlap)
 * to ensure that no conversational data ever leaves the user's device for intent analysis.
 */

import { IntentDetectionConfig } from '../config/intentDetection';
import intentPerformanceTracker from './intentPerformance';
import intentAnalytics from './intentAnalytics';

// Intent patterns with weights for similarity matching
const intentPatterns = {
  social: {
    patterns: [
      { text: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'greetings', 'howdy', 'hiya', "what's up"], weight: 1.0 },
      { text: ['everyone', 'anyone', 'thoughts', 'opinions', 'feedback', 'share'], weight: 0.9 },
      { text: ['yes', 'yeah', 'yep', 'ok', 'okay', 'sure', 'absolutely', 'right', 'exactly', 'indeed', 'correct'], weight: 0.8 }
    ],
    cue: 'social'
  },
  question: {
    patterns: [
      { text: ['what', 'how', 'why', 'when', 'where', 'who', 'question'], weight: 1.0 },
      { text: ['can you', 'could you', 'would you', 'will you', 'do you', 'are you', 'is it'], weight: 0.9 },
      { text: ['tell me', 'explain', 'clarify', 'elaborate'], weight: 0.8 }
    ],
    cue: 'question'
  },
  conflict: {
    patterns: [
      { text: ['wrong', 'disagree', 'problem', 'issue', 'not happy', 'frustrated', 'mistake', 'stop', 'wait', 'hold on'], weight: 1.0 },
      { text: ['never', 'hate', 'terrible', 'awful', 'argue', 'fight', 'dispute', 'complain'], weight: 0.8 },
      { text: ['no', 'nope', 'nah', 'not really', 'disagree', "i don't think so"], weight: 0.7 }
    ],
    cue: 'conflict'
  },
  strategic: {
    patterns: [
      { text: ['negotiate', 'important', 'boss', 'manager', 'executive', 'director', 'urgent', 'priority', 'interview', 'decide', 'strategy'], weight: 1.0 },
      { text: ['contract', 'price', 'cost', 'deal', 'agreement', 'terms', 'align', 'vision', 'goal', 'objective'], weight: 0.9 },
      { text: ['presentation', 'meeting', 'stakeholders', 'investment', 'funding', 'revenue'], weight: 0.8 }
    ],
    cue: 'strategic'
  },
  action: {
    patterns: [
      { text: ['need to', 'should', 'will', "let's", 'assign', 'deadline', 'task', 'follow up', 'suggest', 'recommend', 'idea', 'proposal', 'thought'], weight: 1.0 },
      { text: ['todo', 'action', 'next steps', 'plan', 'schedule', 'maybe', 'perhaps', 'could', 'should', 'try'], weight: 0.8 },
      { text: ['remember', 'remind', 'organize', 'arrange', 'what if', 'how about', 'consider', 'think about'], weight: 0.7 }
    ],
    cue: 'action'
  },
  empathy: {
    patterns: [
      { text: ['feel', 'think', 'believe', 'understand', 'know', 'sorry', 'hard', 'anxious', 'worried', 'stressed'], weight: 1.0 },
      { text: ['i see', 'i hear', 'i understand', 'that makes sense', 'happy', 'excited', 'sad', 'upset'], weight: 0.9 },
      { text: ['empathize', 'relate', 'connect', 'share', 'culture', 'custom', 'tradition', 'etiquette', 'support', 'feelings', 'emotions'], weight: 0.8 }
    ],
    cue: 'empathy'
  },
  language: {
    patterns: [
      { text: ['understand', 'clear', 'clarify', 'explain', 'detail', 'specification', 'meaning'], weight: 1.0 },
      { text: ['grammar', 'vocabulary', 'spelling', 'pronunciation', 'word', 'phrase'], weight: 0.9 },
      { text: ['confused', 'unsure', 'not sure', 'confirm', 'recap', 'summarize'], weight: 0.8 }
    ],
    cue: 'language'
  }
};

// Pre-compile regex patterns for better performance
const compiledPatterns = {};
Object.entries(intentPatterns).forEach(([intent, config]) => {
  compiledPatterns[intent] = config.patterns.map(pattern => ({
    ...pattern,
    regexes: pattern.text.map(t => ({
      text: t,
      regex: new RegExp(`\\b${t.replace(/[.*+?^${}()|[\/]/g, '\\$&')}\\b`, 'i'),
      isMultiWord: t.includes(' ')
    }))
  }));
});

/**
 * Synonym mapping for enhanced similarity matching
 */
const SYNONYM_MAP = {
  // Social synonyms
  'hello': ['hi', 'hey', 'greetings', 'howdy', 'hiya', 'good morning', 'good afternoon', 'good evening'],
  'hi': ['hello', 'hey', 'greetings', 'howdy', 'hiya'],
  'thanks': ['thank', 'appreciate', 'grateful', 'gratitude'],
  'thank': ['thanks', 'appreciate', 'grateful', 'gratitude'],

  // Empathy synonyms
  'understand': ['comprehend', 'grasp', 'appreciate', 'relate', 'empathize', 'sympathize'],
  'empathize': ['understand', 'relate', 'sympathize', 'connect', 'feel for'],
  'sympathize': ['empathize', 'understand', 'relate', 'care', 'support'],
  'support': ['help', 'assist', 'encourage', 'back', 'aid'],

  // Question synonyms
  'what': ['which', 'what kind', 'what type', 'what sort'],
  'how': ['in what way', 'by what means', 'to what extent'],
  'why': ['for what reason', 'on what grounds'],

  // Conflict synonyms
  'disagree': ['object', 'oppose', 'counter', 'contradict', 'take issue'],
  'problem': ['issue', 'difficulty', 'trouble', 'challenge', 'obstacle'],
  'wrong': ['incorrect', 'mistaken', 'erroneous', 'faulty', 'flawed'],

  // Action synonyms
  'should': ['ought to', 'need to', 'must', 'have to', 'better'],
  'recommend': ['suggest', 'advise', 'propose', 'urge', 'endorse'],
  'suggest': ['recommend', 'advise', 'propose', 'hint', 'imply'],

  // Strategic synonyms
  'strategy': ['plan', 'approach', 'method', 'scheme', 'tactic'],
  'negotiate': ['bargain', 'discuss terms', 'compromise', 'haggle'],
  'priority': ['importance', 'urgency', 'significance', 'precedence'],

  // Language synonyms
  'explain': ['clarify', 'elucidate', 'expound', 'detail', 'describe'],
  'clarify': ['explain', 'elucidate', 'elaborate', 'detail', 'expand'],
  'unclear': ['ambiguous', 'vague', 'confusing', 'uncertain', 'obscure']
};

/**
 * Calculate similarity between two strings using an enhanced algorithm
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity score between 0 and 1
 */
export const calculateSimilarity = (str1, str2) => {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;

  // Guard against extremely long strings
  if (s1.length > 50 || s2.length > 50) return 0.0;

  // Check if one string contains the other (substring match)
  if (s1.includes(s2) || s2.includes(s1)) {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    // For very short strings, containment must be significant
    if (shorter.length < 3 && longer.length > 5) return 0.2;

    return shorter.length / longer.length;
  }

  // Enhanced synonym checking
  const s1Words = s1.split(/\s+/);
  const s2Words = s2.split(/\s+/);

  // Check if any word in s1 has a synonym in s2
  let synonymMatches = 0;
  for (const word1 of s1Words) {
    if (SYNONYM_MAP[word1]) {
      for (const synonym of SYNONYM_MAP[word1]) {
        if (s2Words.includes(synonym)) {
          synonymMatches++;
        }
      }
    }
  }

  // Check if any word in s2 has a synonym in s1
  for (const word2 of s2Words) {
    if (SYNONYM_MAP[word2]) {
      for (const synonym of SYNONYM_MAP[word2]) {
        if (s1Words.includes(synonym)) {
          synonymMatches++;
        }
      }
    }
  }

  // If we have synonym matches, boost the similarity
  if (synonymMatches > 0) {
    // Calculate base similarity using Jaccard index
    const baseSimilarity = calculateBaseSimilarity(s1, s2);
    // Boost based on number of synonym matches
    const synonymBoost = Math.min(0.3, synonymMatches * 0.15); // Max 30% boost
    return Math.min(1.0, baseSimilarity + synonymBoost);
  }

  // For short words, character overlap is a poor measure of similarity
  if (s1.length < 4 || s2.length < 4) {
    return 0;
  }

  // Calculate similarity using Jaccard index (character-based)
  return calculateBaseSimilarity(s1, s2);
};

/**
 * Calculate base similarity using Jaccard index
 * @param {string} s1 - First string
 * @param {string} s2 - Second string
 * @returns {number} Base similarity score
 */
const calculateBaseSimilarity = (s1, s2) => {
  const set1 = new Set(s1.split(''));
  const set2 = new Set(s2.split(''));
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  const jaccard = intersection.size / union.size;

  // Apply a penalty if lengths are very different
  const lengthRatio = Math.min(s1.length, s2.length) / Math.max(s1.length, s2.length);
  return jaccard * lengthRatio;
};

/**
 * Tokenize text into words
 * @param {string} text - Input text
 * @returns {Array} Array of tokens
 */
const tokenize = (text) => {
  if (!text) return [];
  return text.toLowerCase()
    .split(/[^a-z0-9']+/) // Corrected regex to escape forward slash
    .filter(token => token.length > 0);
};

/**
 * Detect intent from input text using pattern matching and similarity
 * @param {string} input - The input text to analyze for intent
 * @returns {string|null} The detected intent or null if no intent is detected
 */
export const detectIntent = (input) => {
  const { intent } = detectIntentWithConfidence(input);
  return intent;
};

/**
 * Get a confidence score for the detected intent
 * @param {string} input - The input text to analyze for intent
 * @returns {Object} An object containing the detected intent and confidence score
 */
export const detectIntentWithConfidence = (input) => {
  if (!input || typeof input !== 'string') return { intent: null, confidence: 0 };

  // Measure tokenization performance
  const tokens = intentPerformanceTracker.measureTokenization(tokenize, input);
  const inputLower = input.toLowerCase();

  let bestMatch = null;
  let bestScore = 0;

  for (const [intent, patterns] of Object.entries(compiledPatterns)) {
    let maxIntentScore = 0;

    for (const pattern of patterns) {
      let patternScore = 0;

      // Phase 1: Fast Matches (Exact & RegEx)
      for (const patternItem of pattern.regexes) {
        // Direct token match (exact word)
        if (tokens.includes(patternItem.text)) {
          patternScore = Math.max(patternScore, pattern.weight);
        }

        // Substring/RegEx match at word boundaries
        if (patternScore < pattern.weight && patternItem.regex.test(inputLower)) {
          const weightMultiplier = patternItem.isMultiWord ? 1.0 : 0.6;
          patternScore = Math.max(patternScore, pattern.weight * weightMultiplier);
        }

        if (patternScore >= 1.0) break;
      }

      // Phase 2: Similarity Match (Slow, only if no strong match yet)
      if (patternScore < 0.8) {
        // Optimization: Limit similarity checks to first 10 tokens
        const limitedTokens = tokens.slice(0, 10);
        for (const patternItem of pattern.regexes) {
          if (!patternItem.isMultiWord) {
            for (const token of limitedTokens) {
              if (Math.abs(token.length - patternItem.text.length) > 2) continue;
              if (token.length > 15) continue;

              // Measure similarity calculation performance
              const similarity = intentPerformanceTracker.measureSimilarityCalculation(calculateSimilarityOptimized, token, patternItem.text);
              if (similarity > 0.85) {
                patternScore = Math.max(patternScore, pattern.weight * similarity);
              }
              if (patternScore >= 0.85) break;
            }
          }
          if (patternScore >= 0.85) break;
        }
      }

      maxIntentScore = Math.max(maxIntentScore, patternScore);
      if (maxIntentScore >= 1.0) break;
    }

    if (maxIntentScore > bestScore) {
      bestScore = maxIntentScore;
      bestMatch = intent;
    }

    if (bestScore >= 1.0) break;
  }

  // Use default threshold (0.4) - the configurable version will be handled in the calling function
  const threshold = 0.4;

  const result = {
    intent: bestScore > threshold ? bestMatch : null,
    confidence: Math.min(1.0, bestScore)
  };

  // Record analytics for this detection
  intentAnalytics.recordDetection(input, result.intent, result.confidence);

  return result;
};

/**
 * Detect intent from input text using pattern matching and similarity with configurable threshold
 * @param {string} input - The input text to analyze for intent
 * @param {number} threshold - The confidence threshold for intent detection (default: 0.4)
 * @returns {Object} An object containing the detected intent and confidence score
 */
export const detectIntentWithConfidenceAndThreshold = (input, threshold = 0.4) => {
  if (!input || typeof input !== 'string') return { intent: null, confidence: 0 };

  const tokens = tokenize(input);
  const inputLower = input.toLowerCase();

  let bestMatch = null;
  let bestScore = 0;

  for (const [intent, patterns] of Object.entries(compiledPatterns)) {
    let maxIntentScore = 0;

    for (const pattern of patterns) {
      let patternScore = 0;

      // Phase 1: Fast Matches (Exact & RegEx)
      for (const patternItem of pattern.regexes) {
        // Direct token match (exact word)
        if (tokens.includes(patternItem.text)) {
          patternScore = Math.max(patternScore, pattern.weight);
        }

        // Substring/RegEx match at word boundaries
        if (patternScore < pattern.weight && patternItem.regex.test(inputLower)) {
          const weightMultiplier = patternItem.isMultiWord ? 1.0 : 0.6;
          patternScore = Math.max(patternScore, pattern.weight * weightMultiplier);
        }

        if (patternScore >= 1.0) break;
      }

      // Phase 2: Similarity Match (Slow, only if no strong match yet)
      if (patternScore < 0.8) {
        // Optimization: Limit similarity checks to first 10 tokens
        const limitedTokens = tokens.slice(0, 10);
        for (const patternItem of pattern.regexes) {
          if (!patternItem.isMultiWord) {
            for (const token of limitedTokens) {
              if (Math.abs(token.length - patternItem.text.length) > 2) continue;
              if (token.length > 15) continue;

              const similarity = calculateSimilarityOptimized(token, patternItem.text);
              if (similarity > 0.85) {
                patternScore = Math.max(patternScore, pattern.weight * similarity);
              }
              if (patternScore >= 0.85) break;
            }
          }
          if (patternScore >= 0.85) break;
        }
      }

      maxIntentScore = Math.max(maxIntentScore, patternScore);
      if (maxIntentScore >= 1.0) break;
    }

    if (maxIntentScore > bestScore) {
      bestScore = maxIntentScore;
      bestMatch = intent;
    }

    if (bestScore >= 1.0) break;
  }

  return {
    intent: bestScore > threshold ? bestMatch : null,
    confidence: Math.min(1.0, bestScore)
  };
};

/**
 * High-performance intent detection for real-time processing
 * Optimized for speed over accuracy, with early termination
 * @param {string} input - The input text to analyze for intent
 * @param {number} threshold - The confidence threshold for intent detection (default: 0.5)
 * @returns {Object} An object containing the detected intent and confidence score
 */
export const detectIntentHighPerformance = (input, threshold = 0.5) => {
  if (!input || typeof input !== 'string') return { intent: null, confidence: 0 };

  // Quick length check to avoid processing very long inputs
  if (input.length > 200) {
    // For very long inputs, just take the first 100 characters
    input = input.substring(0, 100);
  }

  // Measure tokenization performance
  const tokens = intentPerformanceTracker.measureTokenization(tokenize, input);

  // Early termination: if we have few tokens, skip similarity checks
  if (tokens.length === 0) return { intent: null, confidence: 0 };

  const inputLower = input.toLowerCase();

  let bestMatch = null;
  let bestScore = 0;

  // Precompute token set for faster lookup
  const tokenSet = new Set(tokens);

  for (const [intent, patterns] of Object.entries(compiledPatterns)) {
    let maxIntentScore = 0;

    for (const pattern of patterns) {
      let patternScore = 0;

      // Phase 1: Fast Matches (Exact & RegEx) - Primary focus for performance
      for (const patternItem of pattern.regexes) {
        // Direct token match (exact word) - fastest check
        if (tokenSet.has(patternItem.text)) {
          patternScore = Math.max(patternScore, pattern.weight);
          // Early exit if we have a strong match
          if (patternScore >= 1.0) break;
        }

        // Substring/RegEx match at word boundaries
        if (patternScore < pattern.weight && patternItem.regex.test(inputLower)) {
          const weightMultiplier = patternItem.isMultiWord ? 1.0 : 0.6;
          patternScore = Math.max(patternScore, pattern.weight * weightMultiplier);
          // Early exit if we have a strong match
          if (patternScore >= 1.0) break;
        }
      }

      // Skip similarity checks if we already have a strong match
      if (patternScore < 0.7) {
        // Phase 2: Similarity Match (Only for weak matches)
        // Further limit tokens for performance
        const limitedTokens = tokens.slice(0, 3); // Reduced from 5 to 3 for better performance
        for (const patternItem of pattern.regexes) {
          if (!patternItem.isMultiWord) {
            for (const token of limitedTokens) {
              if (Math.abs(token.length - patternItem.text.length) > 2) continue;
              if (token.length > 15) continue;

              // Measure similarity calculation performance
              const similarity = intentPerformanceTracker.measureSimilarityCalculation(calculateSimilarity, token, patternItem.text);
              if (similarity > 0.85) {
                patternScore = Math.max(patternScore, pattern.weight * similarity);
                // Early exit if we have a strong match
                if (patternScore >= 0.9) break;
              }
            }
            if (patternScore >= 0.9) break;
          }
        }
      }

      maxIntentScore = Math.max(maxIntentScore, patternScore);
      // Early exit if we have a very strong intent
      if (maxIntentScore >= 1.0) {
        bestScore = maxIntentScore;
        bestMatch = intent;
        break;
      }
    }

    if (maxIntentScore > bestScore) {
      bestScore = maxIntentScore;
      bestMatch = intent;
    }

    // Early exit if we have a very strong intent
    if (bestScore >= 1.0) break;
  }

  const result = {
    intent: bestScore > threshold ? bestMatch : null,
    confidence: Math.min(1.0, bestScore)
  };

  // Record analytics for this detection with limited input
  intentAnalytics.recordDetection(input, result.intent, result.confidence);

  return result;
};

/**
 * Optimized similarity calculation with performance safeguards
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity score between 0 and 1
 */
export const calculateSimilarityOptimized = (str1, str2) => {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;

  // Additional guard against extremely long strings for performance
  if (s1.length > 30 || s2.length > 30) return 0.0;

  // Check if one string contains the other (substring match)
  if (s1.includes(s2) || s2.includes(s1)) {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    // For very short strings, containment must be significant
    if (shorter.length < 3 && longer.length > 5) return 0.2;

    return shorter.length / longer.length;
  }

  // Enhanced synonym checking
  const s1Words = s1.split(/\s+/);
  const s2Words = s2.split(/\s+/);

  // Check if any word in s1 has a synonym in s2
  let synonymMatches = 0;
  for (const word1 of s1Words) {
    if (SYNONYM_MAP[word1]) {
      for (const synonym of SYNONYM_MAP[word1]) {
        if (s2Words.includes(synonym)) {
          synonymMatches++;
        }
      }
    }
  }

  // Check if any word in s2 has a synonym in s1
  for (const word2 of s2Words) {
    if (SYNONYM_MAP[word2]) {
      for (const synonym of SYNONYM_MAP[word2]) {
        if (s1Words.includes(synonym)) {
          synonymMatches++;
        }
      }
    }
  }

  // If we have synonym matches, boost the similarity
  if (synonymMatches > 0) {
    // Calculate base similarity using Jaccard index
    const baseSimilarity = calculateBaseSimilarity(s1, s2);
    // Boost based on number of synonym matches
    const synonymBoost = Math.min(0.3, synonymMatches * 0.15); // Max 30% boost
    return Math.min(1.0, baseSimilarity + synonymBoost);
  }

  // For short words, character overlap is a poor measure of similarity
  if (s1.length < 4 || s2.length < 4) {
    return 0;
  }

  // Calculate similarity using Jaccard index (character-based)
  return calculateBaseSimilarity(s1, s2);
};

/**
 * Detect all intents above a threshold
 * @param {string} input - The input text to analyze for intents
 * @param {number} threshold - The confidence threshold for intent detection (default: 0.4)
 * @returns {Array} An array of objects containing detected intents and their confidence scores
 */
export const detectMultipleIntents = (input, threshold = 0.4) => {
  if (!input || typeof input !== 'string') return [];

  // Measure tokenization performance
  const tokens = intentPerformanceTracker.measureTokenization(tokenize, input);
  const inputLower = input.toLowerCase();
  const results = [];

  for (const [intent, patterns] of Object.entries(compiledPatterns)) {
    let maxIntentScore = 0;

    for (const pattern of patterns) {
      let patternScore = 0;

      // Phase 1: Fast Matches
      for (const patternItem of pattern.regexes) {
        if (tokens.includes(patternItem.text)) {
          patternScore = Math.max(patternScore, pattern.weight);
        }

        if (patternScore < pattern.weight && patternItem.regex.test(inputLower)) {
          const weightMultiplier = patternItem.isMultiWord ? 1.0 : 0.6;
          patternScore = Math.max(patternScore, pattern.weight * weightMultiplier);
        }
        if (patternScore >= 1.0) break;
      }

      // Phase 2: Similarity Match
      if (patternScore < threshold && patternScore < 0.8) {
        const limitedTokens = tokens.slice(0, 10);
        for (const patternItem of pattern.regexes) {
          if (!patternItem.isMultiWord) {
            for (const token of limitedTokens) {
              if (Math.abs(token.length - patternItem.text.length) > 2) continue;
              if (token.length > 15) continue;

              // Measure similarity calculation performance
              const similarity = intentPerformanceTracker.measureSimilarityCalculation(calculateSimilarityOptimized, token, patternItem.text);
              if (similarity > 0.85) {
                patternScore = Math.max(patternScore, pattern.weight * similarity);
              }
              if (patternScore >= 0.85) break;
            }
          }
          if (patternScore >= 0.85) break;
        }
      }

      maxIntentScore = Math.max(maxIntentScore, patternScore);
      if (maxIntentScore >= 1.0) break;
    }

    if (maxIntentScore >= threshold) {
      results.push({ intent, confidence: maxIntentScore });
    }
  }

  // Record analytics for each detected intent
  results.forEach(result => {
    intentAnalytics.recordDetection(input, result.intent, result.confidence);
  });

  return results.sort((a, b) => b.confidence - a.confidence);
};

/**
 * Generates an intent-based cue based on the detected intent from input text
 * @param {string} input - The input text to analyze for intent
 * @param {string} response - The AI response to consider for cue generation
 * @param {Array} conversationHistory - The conversation history for context
 * @returns {string} A contextual cue based on the detected intent
 */
export const generateIntentBasedCue = (input, response = '', conversationHistory = []) => {
  const { intent, confidence } = detectIntentWithConfidence(input);
  
  if (!intent || confidence < 0.4) {
    return generateCueFromResponse(response, conversationHistory);
  }
  
  const intentToCueMap = {
    social: ['Hi', 'Hello', 'Hey', 'Smile', 'Wave', 'Connect', 'Share', 'Nod'],
    question: ['Ask', 'Clarify', 'Follow up', 'Probe', 'Inquire', 'Investigate', 'Query'],
    conflict: ['De-escalate', 'Validate first', 'Soft tone', 'Find common ground', 'Listen more', 'Breathe'],
    strategic: ['Strategic', 'Consider implications', 'Think long-term', 'Plan ahead', 'Evaluate', 'Project Confidence'],
    action: ['Action', 'Try', 'Propose', 'Recommend', 'Plan', 'Organize', 'Next step'],
    empathy: ['Acknowledge', 'Validate', 'Empathize', 'Listen', 'Support', 'Understand', 'Relate'],
    language: ['Clarify', 'Explain', 'Simplify', 'Rephrase', 'Detail']
  };

  const cues = intentToCueMap[intent] || ['Pause', 'Think', 'Consider', 'Reflect', 'Hmm', 'Observe'];

  if (intent === 'strategic') {
    return 'Project Confidence';
  }

  const seed = input.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + conversationHistory.length;
  const index = seed % cues.length;

  return cues[index];
};

/**
 * Generates a cue based on the content of the AI response
 * @param {string} response - The AI response to analyze
 * @param {Array} conversationHistory - The conversation history for context
 * @returns {string} A contextual cue based on the response content
 */
const generateCueFromResponse = (response, conversationHistory = []) => {
  if (!response) return 'Pause';
  
  const lowerResponse = response.toLowerCase();
  const seed = response.length + conversationHistory.length;
  
  if (lowerResponse.includes('suggest') || lowerResponse.includes('recommend')) {
    const cues = ['Suggest', 'Try', 'Recommend', 'Propose', 'Consider', 'Experiment'];
    return cues[seed % cues.length];
  }
  
  if (lowerResponse.includes('feel') || lowerResponse.includes('understand') || lowerResponse.includes('hear')) {
    const cues = ['Acknowledge', 'Validate', 'Empathize', 'Listen', 'Support', 'Connect'];
    return cues[seed % cues.length];
  }
  
  if (lowerResponse.includes('should') || lowerResponse.includes('try') || lowerResponse.includes('could')) {
    const cues = ['Suggest', 'Try', 'Recommend', 'Propose', 'Consider', 'Experiment'];
    return cues[seed % cues.length];
  }
  
  if (conversationHistory.length > 0) {
    const lastTurn = conversationHistory[conversationHistory.length - 1];
    if (lastTurn?.content?.includes('?')) {
      const cues = ['Ask', 'Clarify', 'Follow up', 'Probe', 'Inquire', 'Investigate'];
      return cues[seed % cues.length];
    }
  }
  
  const defaultCues = ['Pause', 'Think', 'Consider', 'Reflect', 'Hmm', 'Observe'];
  return defaultCues[seed % defaultCues.length];
};

/**
 * Enhanced intent detection that also considers conversation context
 * @param {string} input - The input text to analyze for intent
 * @param {Array} conversationHistory - The conversation history for context
 * @returns {Object} An object containing the detected intent and confidence score
 */
export const detectIntentWithContext = (input, conversationHistory = []) => {
  // Measure context-aware detection performance
  const startTime = performance.now();
  const baseResult = detectIntentWithConfidence(input);
  const endTime = performance.now();
  intentPerformanceTracker.recordIntentDetectionTime('contextDetectionTime', endTime - startTime);

  // Early return if no input or base result
  if (!input || !baseResult.intent) {
    return baseResult;
  }

  // Handle intent ambiguity for specific cases like "I'm sorry"
  if (input.toLowerCase().includes('sorry')) {
    // Check if the phrase is expressing empathy vs conflict
    const empathyIndicators = ['sorry to hear', 'sorry about', 'so sorry', 'i understand', 'must be hard', 'my condolences', 'sympathies'];
    const conflictIndicators = ['sorry but', 'sorry, but', 'but sorry', 'sorry however', 'sorry though'];

    const inputLower = input.toLowerCase();
    const hasEmpathyIndicator = empathyIndicators.some(indicator => inputLower.includes(indicator));
    const hasConflictIndicator = conflictIndicators.some(indicator => inputLower.includes(indicator));

    // If both indicators exist, favor empathy (more common use case)
    if (hasEmpathyIndicator && !hasConflictIndicator) {
      return {
        intent: 'empathy',
        confidence: Math.min(1.0, baseResult.confidence + 0.15)
      };
    } else if (hasConflictIndicator && !hasEmpathyIndicator) {
      return {
        intent: 'conflict',
        confidence: Math.min(1.0, baseResult.confidence + 0.15)
      };
    }
  }

  // Check for business context for "maybe" or "perhaps"
  if (input.toLowerCase().includes('maybe') || input.toLowerCase().includes('perhaps')) {
    // Check if it's in a business context (strategic intent)
    const businessIndicators = ['proposal', 'deal', 'contract', 'negotiation', 'meeting', 'project', 'budget', 'strategy'];
    const inputLower = input.toLowerCase();

    // First check the current input for business indicators
    const hasBusinessInInput = businessIndicators.some(indicator => inputLower.includes(indicator));

    if (hasBusinessInInput) {
      return {
        intent: 'strategic',
        confidence: Math.min(1.0, baseResult.confidence + 0.1)
      };
    }

    // Only check conversation history if business terms not in current input
    const isBusinessContext = conversationHistory.some(turn =>
      businessIndicators.some(indicator => turn.content.toLowerCase().includes(indicator))
    );

    if (isBusinessContext) {
      return {
        intent: 'strategic',
        confidence: Math.min(1.0, baseResult.confidence + 0.1)
      };
    }
  }

  // Enhanced disambiguation for "action" vs "strategic" based on context
  if (baseResult.intent === 'action' || baseResult.intent === 'strategic') {
    // Look for temporal indicators that suggest strategic planning vs immediate action
    const strategicIndicators = ['plan', 'strategy', 'future', 'long-term', 'vision', 'goal', 'objective', 'timeline'];
    const immediateIndicators = ['now', 'immediately', 'right away', 'today', 'this week', 'urgent', 'asap'];

    const inputLower = input.toLowerCase();
    const hasStrategicIndicator = strategicIndicators.some(indicator => inputLower.includes(indicator));
    const hasImmediateIndicator = immediateIndicators.some(indicator => inputLower.includes(indicator));

    // If both types of indicators exist, check conversation history for context
    if (hasStrategicIndicator && hasImmediateIndicator) {
      // Look at recent conversation for context
      const recentContext = conversationHistory.slice(-5).map(turn => turn.content.toLowerCase()).join(' ');
      if (strategicIndicators.some(indicator => recentContext.includes(indicator))) {
        return {
          intent: 'strategic',
          confidence: Math.min(1.0, baseResult.confidence + 0.1)
        };
      } else if (immediateIndicators.some(indicator => recentContext.includes(indicator))) {
        return {
          intent: 'action',
          confidence: Math.min(1.0, baseResult.confidence + 0.1)
        };
      }
    } else if (hasStrategicIndicator) {
      return {
        intent: 'strategic',
        confidence: Math.min(1.0, baseResult.confidence + 0.1)
      };
    } else if (hasImmediateIndicator) {
      return {
        intent: 'action',
        confidence: Math.min(1.0, baseResult.confidence + 0.1)
      };
    }
  }

  // Enhanced disambiguation for question vs language based on context
  if (baseResult.intent === 'question' || baseResult.intent === 'language') {
    const questionWords = ['what', 'how', 'why', 'when', 'where', 'who'];
    const languageWords = ['explain', 'clarify', 'phrasing', 'word', 'grammar', 'vocabulary'];

    const inputLower = input.toLowerCase();
    const hasQuestionWord = questionWords.some(word => inputLower.startsWith(word));
    const hasLanguageWord = languageWords.some(word => inputLower.includes(word));

    // If it's clearly a question word at the start, favor question intent
    if (hasQuestionWord && !hasLanguageWord) {
      return {
        intent: 'question',
        confidence: Math.min(1.0, baseResult.confidence + 0.1)
      };
    } else if (hasLanguageWord && !hasQuestionWord) {
      return {
        intent: 'language',
        confidence: Math.min(1.0, baseResult.confidence + 0.1)
      };
    }
  }

  // Enhanced disambiguation for empathy vs social based on emotional context
  if (baseResult.intent === 'empathy' || baseResult.intent === 'social') {
    const emotionalWords = ['feel', 'emotion', 'sad', 'happy', 'angry', 'frustrated', 'anxious', 'excited', 'scared', 'worried', 'depressed', 'lonely', 'overwhelmed', 'stressed', 'upset', 'heartbroken', 'grief', 'pain', 'hurt', 'comfort', 'support', 'care', 'love', 'miss', 'concerned', 'worry'];
    const socialWords = ['hello', 'hi', 'hey', 'good morning', 'thanks', 'please', 'you', 'nice', 'everyone', 'what do you think', 'what are your thoughts', 'what\'s your opinion', 'anyone', 'anybody', 'greetings', 'how are you', 'how\'s it going', 'what\'s up', 'goodbye', 'bye', 'see you', 'talk to you later', 'have a good day', 'enjoy', 'welcome', 'appreciate', 'grateful', 'thank you', 'thanks', 'much appreciated'];

    const inputLower = input.toLowerCase();
    const hasEmotionalWord = emotionalWords.some(word => inputLower.includes(word));
    const hasSocialWord = socialWords.some(word => inputLower.includes(word));

    // More specific empathy indicators
    const empathyIndicators = ['sorry to hear', 'so sorry', 'my condolences', 'i\'m here for you', 'how can i help', 'i care about', 'i understand how you feel', 'that must be', 'i can imagine', 'sending thoughts', 'thinking of you', 'i feel for you', 'must be difficult', 'must be hard', 'must be tough', 'i sympathize', 'i relate to', 'i\'ve been there', 'that sounds challenging', 'that sounds difficult', 'i appreciate what you\'re going through'];

    // More specific social indicators
    const socialIndicators = ['hello everyone', 'hi everyone', 'good morning everyone', 'what do you think', 'what are your thoughts', 'what\'s your opinion', 'how are you all', 'how\'s everyone doing', 'thanks everyone', 'thank you all', 'appreciate everyone', 'good to see you', 'nice to meet you', 'pleased to meet you', 'hope you\'re doing well', 'hope everyone is well', 'hope you all had a good weekend'];

    const hasEmpathyIndicator = empathyIndicators.some(indicator => inputLower.includes(indicator));
    const hasSocialIndicator = socialIndicators.some(indicator => inputLower.includes(indicator));

    // Check conversation history for emotional context
    const recentEmotionalContext = conversationHistory.slice(-3).some(turn =>
      emotionalWords.some(word => turn.content.toLowerCase().includes(word))
    );

    // Prioritize specific indicators over general word matching
    if (hasEmpathyIndicator) {
      return {
        intent: 'empathy',
        confidence: Math.min(1.0, baseResult.confidence + 0.25) // Higher boost for specific empathy indicators
      };
    } else if (hasSocialIndicator) {
      return {
        intent: 'social',
        confidence: Math.min(1.0, baseResult.confidence + 0.25) // Higher boost for specific social indicators
      };
    } else if (hasEmotionalWord || recentEmotionalContext) {
      return {
        intent: 'empathy',
        confidence: Math.min(1.0, baseResult.confidence + 0.15)
      };
    } else if (hasSocialWord && !hasEmotionalWord) {
      return {
        intent: 'social',
        confidence: Math.min(1.0, baseResult.confidence + 0.1)
      };
    }
  }

  // Enhanced detection for sarcasm and idiomatic expressions
  if (baseResult.confidence < 0.7) {
    const sarcasmIndicators = [
      'oh great', 'oh wonderful', 'of course', 'sure thing', 'totally', 'obviously',
      'right', 'yeah right', 'as if', 'not surprising', 'typical', 'figures',
      'oh boy', 'great', 'wonderful', 'fantastic', 'amazing', 'incredible'
    ];

    const inputLower = input.toLowerCase();
    const hasSarcasmIndicator = sarcasmIndicators.some(indicator =>
      inputLower.includes(indicator) || inputLower.includes(indicator.toUpperCase())
    );

    // Check for exaggerated positive words that might indicate sarcasm
    const exaggeratedPositives = ['amazing', 'incredible', 'fantastic', 'wonderful', 'perfect', 'awesome'];
    const hasExaggeratedPositive = exaggeratedPositives.some(word =>
      inputLower.includes(word) && (inputLower.includes('so') || inputLower.includes('really') || inputLower.includes('very'))
    );

    // Check for contradiction markers that might indicate sarcasm
    const contradictionMarkers = ['but', 'however', 'though', 'although', 'yet', 'despite', 'though'];
    const hasContradiction = contradictionMarkers.some(marker => inputLower.includes(marker));

    // If we detect potential sarcasm, reduce confidence and reconsider intent
    if (hasSarcasmIndicator && hasExaggeratedPositive && hasContradiction) {
      // For sarcastic expressions, we might want to invert the interpretation
      // For now, we'll just reduce confidence to allow for human override
      return {
        intent: baseResult.intent,
        confidence: Math.max(0.1, baseResult.confidence - 0.2)
      };
    }
  }

  // Context-based adjustments based on conversation history
  if (conversationHistory.length > 0) {
    const lastTurn = conversationHistory[conversationHistory.length - 1];
    const lastContent = lastTurn?.content?.toLowerCase() || '';

    // If the last turn was a question and current result is not question,
    // consider if this might be a response that should be classified differently
    if (lastContent.includes('?') && baseResult.intent !== 'question') {
      // Check if this is likely a response to the question
      const responseIndicators = ['yes', 'no', 'maybe', 'i think', 'i believe', 'probably', 'definitely', 'absolutely', 'sure'];
      const inputLower = input.toLowerCase();
      const isResponse = responseIndicators.some(indicator => inputLower.includes(indicator));

      if (isResponse && baseResult.confidence < 0.6) {
        // Re-evaluate with context that this is likely a response to a question
        const reevaluatedResult = detectIntentWithConfidence(input);
        if (reevaluatedResult.confidence > baseResult.confidence) {
          return reevaluatedResult;
        }
      }
    }

    // Check for recent conflict in conversation
    const recentConflict = conversationHistory.slice(-3).some(turn =>
      turn.content.toLowerCase().includes('no') &&
      (turn.content.toLowerCase().includes('wrong') || turn.content.toLowerCase().includes('disagree'))
    );

    if (recentConflict && baseResult.intent === 'conflict') {
      return {
        intent: 'conflict',
        confidence: Math.min(1.0, baseResult.confidence + 0.15)
      };
    }
  }

  return baseResult;
};

/**
 * Metadata for semantic tags used in the intent detection system
 * Maps intent types to their visual representation and behavior
 */
export const TAG_METADATA = {
  conflict: {
    tag: '[conflict]',
    aliases: ['[diplomatic]'],
    label: 'Conflict Alert',
    icon: 'ShieldAlert',
    variant: 'conflict',
    description: 'De-escalation needed'
  },
  action: {
    tag: '[action item]',
    aliases: ['[action]', '[suggestion]', '[recommendation]'],
    label: 'Action',
    icon: 'Zap',
    variant: 'action',
    description: 'Actionable advice or task'
  },
  strategic: {
    tag: '[strategic]',
    aliases: ['[negotiation]', '[leadership]'],
    label: 'Strategic',
    icon: 'Target',
    variant: 'strategic',
    description: 'Negotiation or long-term strategy'
  },
  social: {
    tag: '[social tip]',
    aliases: ['[social]', '[greeting]', '[participation]'],
    label: 'Social Tip',
    icon: 'MessageCircle',
    variant: 'social',
    description: 'Etiquette or phrasing tip'
  },
  language: {
    tag: '[language tip]',
    aliases: ['[natural phrasing]', '[clarity]'],
    label: 'Language',
    icon: 'Zap',
    variant: 'language',
    description: 'Language or phrasing suggestion'
  },
  empathy: {
    tag: '[empathy]',
    aliases: ['[support]', '[emotion]'],
    label: 'Empathy',
    icon: 'Heart',
    variant: 'empathy',
    description: 'Emotional support or validation'
  },
  question: {
    tag: '[question]',
    aliases: ['[ask]'],
    label: 'Question',
    icon: 'MessageCircle',
    variant: 'question',
    description: 'Follow-up question'
  }
};

/**
 * Parses semantic tags from text and returns clean text and tag information
 * @param {string} text - The text to parse for semantic tags
 * @returns {Object} An object containing the clean text and array of detected tags
 */
export const parseSemanticTags = (text) => {
  if (!text) return { cleanText: '', tags: [] };

  let cleanText = text;
  const foundTags = [];

  Object.entries(TAG_METADATA).forEach(([key, meta]) => {
    const allTags = [meta.tag, ...(meta.aliases || [])];
    allTags.forEach(tag => {
      if (text.toLowerCase().includes(tag.toLowerCase())) {
        if (!foundTags.some(t => t.key === key)) {
          foundTags.push({ ...meta, key });
        }
        const escapedTag = tag.replace(/[.*+?^${}()|[\/]/g, '\\$&'); // Corrected escaping for regex
        const regex = new RegExp(escapedTag, 'gi');
        cleanText = cleanText.replace(regex, '').trim();
      }
    });
  });

  return { cleanText, tags: foundTags };
};