/**
 * NLP-based Intent Recognition System
 * DESIGN PRINCIPLE: 100% Client-Side rule-based pattern matching.
 */

import { intentPatterns, SYNONYM_MAP } from '../config/intentPatterns';
import intentPerformanceTracker from './intentPerformance';
import intentAnalytics from './intentAnalytics';
import { TAG_METADATA } from './intentUtils';

export { TAG_METADATA };
export const ALL_INTENTS = Object.keys(intentPatterns);

// Pre-compile regex patterns for better performance
const compiledPatterns = {};
Object.entries(intentPatterns).forEach(([intent, config]) => {
  compiledPatterns[intent] = config.patterns.map(pattern => ({
    ...pattern,
    regexes: pattern.text.map(t => ({
      text: t,
      regex: new RegExp(`\b${t.replace(/[.*+?^${}()|[\\]/g, '\\$&')}\b`, 'i'),
      isMultiWord: t.includes(' ')
    }))
  }));
});

/**
 * Optimized similarity calculation (Jaccard Index)
 */
export const calculateSimilarity = (str1, str2) => {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0 || s1.length > 50 || s2.length > 50) return 0.0;

  // Substring match boost
  if (s1.includes(s2) || s2.includes(s1)) {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    return shorter.length < 3 && longer.length > 5 ? 0.2 : shorter.length / longer.length;
  }

  // Synonym checking
  const s1Words = s1.split(/\s+/);
  const s2Words = s2.split(/\s+/);
  let synonymMatches = 0;

  const checkSynonyms = (wordsA, wordsB) => {
    wordsA.forEach(word => {
      if (SYNONYM_MAP[word] && SYNONYM_MAP[word].some(syn => wordsB.includes(syn))) {
        synonymMatches++;
      }
    });
  };

  checkSynonyms(s1Words, s2Words);
  if (synonymMatches > 0) {
    return Math.min(1.0, calculateBaseSimilarity(s1, s2) + Math.min(0.3, synonymMatches * 0.15));
  }

  return (s1.length < 4 || s2.length < 4) ? 0 : calculateBaseSimilarity(s1, s2);
};

const calculateBaseSimilarity = (s1, s2) => {
  const set1 = new Set(s1.split(''));
  const set2 = new Set(s2.split(''));
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return (intersection.size / union.size) * (Math.min(s1.length, s2.length) / Math.max(s1.length, s2.length));
};

const tokenize = (text) => text?.toLowerCase().split(/[^a-z0-9']+/).filter(t => t.length > 0) || [];

/**
 * CORE INTENT DETECTION ENGINE
 */
const findIntents = (input, options = {}) => {
  const { threshold = 0.4, multiple = false, tokenLimit = 10, recordAnalytics = true, performanceOptimized = false } = options;

  if (!input || typeof input !== 'string') return multiple ? [] : { intent: null, confidence: 0 };

  const textToProcess = performanceOptimized && input.length > 200 ? input.substring(0, 100) : input;
  const tokens = performanceOptimized ? intentPerformanceTracker.measureTokenization(tokenize, textToProcess) : tokenize(textToProcess);
    
  if (tokens.length === 0) return multiple ? [] : { intent: null, confidence: 0 };

  const inputLower = textToProcess.toLowerCase();
  const tokenSet = performanceOptimized ? new Set(tokens) : null;
  const results = [];
  let bestMatch = null;
  let bestScore = 0;

  for (const [intent, patterns] of Object.entries(compiledPatterns)) {
    let maxIntentScore = 0;
    for (const pattern of patterns) {
      let patternScore = 0;
      for (const pItem of pattern.regexes) {
        if (tokenSet ? tokenSet.has(pItem.text) : tokens.includes(pItem.text)) {
          patternScore = Math.max(patternScore, pattern.weight);
        } else if (pItem.regex.test(inputLower)) {
          patternScore = Math.max(patternScore, pattern.weight * (pItem.isMultiWord ? 1.0 : 0.6));
        }
        if (patternScore >= 1.0) break;
      }

      if (patternScore < (performanceOptimized ? 0.7 : 0.8)) {
        const limitedTokens = tokens.slice(0, tokenLimit);
        for (const pItem of pattern.regexes) {
          if (pItem.isMultiWord) continue;
          for (const token of limitedTokens) {
            if (Math.abs(token.length - pItem.text.length) > 2 || token.length > 15) continue;
            const sim = performanceOptimized ? intentPerformanceTracker.measureSimilarityCalculation(calculateSimilarity, token, pItem.text) : calculateSimilarity(token, pItem.text);
            if (sim > 0.85) patternScore = Math.max(patternScore, pattern.weight * sim);
            if (patternScore >= 0.85) break;
          }
          if (patternScore >= 0.85) break;
        }
      }
      maxIntentScore = Math.max(maxIntentScore, patternScore);
      if (maxIntentScore >= 1.0) break;
    }

    if (maxIntentScore >= threshold) {
      if (multiple) results.push({ intent, confidence: Math.min(1.0, maxIntentScore) });
      else if (maxIntentScore > bestScore) { bestScore = maxIntentScore; bestMatch = intent; }
    }
    if (!multiple && bestScore >= 1.0) break;
  }

  const finalResult = multiple ? results.sort((a, b) => b.confidence - a.confidence) : { intent: bestMatch, confidence: Math.min(1.0, bestScore) };
  if (recordAnalytics) {
    if (multiple) finalResult.forEach(r => intentAnalytics.recordDetection(input, r.intent, r.confidence));
    else intentAnalytics.recordDetection(input, finalResult.intent, finalResult.confidence);
  }
  return finalResult;
};

export const detectIntent = (input) => findIntents(input).intent;
export const detectIntentWithConfidence = (input) => findIntents(input);
export const detectIntentWithConfidenceAndThreshold = (input, threshold = 0.4) => findIntents(input, { threshold, recordAnalytics: false });
export const detectMultipleIntents = (input, threshold = 0.4) => findIntents(input, { threshold, multiple: true });

export const detectIntentHighPerformance = (input, threshold = 0.5) => {
  const result = findIntents(input, { threshold, performanceOptimized: true, tokenLimit: 3 });
  return { intent: result.intent || 'general', confidence: result.confidence };
};

/**
 * Context-aware intent detection
 */
export const detectIntentWithContext = (input, conversationHistory = []) => {
  const startTime = Date.now();
  const baseResult = detectIntentWithConfidence(input);
  intentPerformanceTracker.recordIntentDetectionTime('contextDetectionTime', Date.now() - startTime);

  if (!input || !baseResult.intent) return baseResult;
  const inputLower = input.toLowerCase();

  // Optimized disambiguation logic
  const checkIndicators = (pos, neg, boost = 0.15) => {
    const hasPos = pos.some(i => inputLower.includes(i));
    const hasNeg = neg.some(i => inputLower.includes(i));
    if (hasPos || hasNeg) return { confidence: Math.min(1.0, baseResult.confidence + boost) };
    return null;
  };

  if (inputLower.includes('sorry')) {
    const res = checkIndicators(['hear', 'about', 'so sorry', 'understand', 'hard'], ['but', 'however']);
    if (res) {
      const hasNeg = ['but', 'however'].some(i => inputLower.includes(i));
      return { 
        intent: hasNeg ? 'conflict' : 'empathy', 
        confidence: res.confidence 
      };
    }
  }

  // Fallback to base result if no context-specific boost applies
  return baseResult;
};