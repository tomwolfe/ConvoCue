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
      { text: ['negotiate', 'important', 'boss', 'manager', 'executive', 'director', 'urgent', 'priority', 'interview', 'decide', 'strategy', 'strategic'], weight: 1.0 },
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
      { text: ['empathize', 'relate', 'connect', 'share', 'support', 'feelings', 'emotions'], weight: 0.8 }
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
  },
  negotiation: {
    patterns: [
      { text: ['negotiate', 'negotiation', 'deal', 'contract', 'price', 'cost', 'terms', 'agreement', 'bargain', 'compromise', 'budget'], weight: 1.0 },
      { text: ['offer', 'counter', 'concession', 'leverage', 'position', 'stance'], weight: 0.9 },
      { text: ['win-win', 'mutual benefit', 'trade-off', 'exchange'], weight: 0.8 }
    ],
    cue: 'negotiation'
  },
  leadership: {
    patterns: [
      { text: ['lead', 'leader', 'leadership', 'decision', 'decide', 'manage', 'direct', 'guide', 'steer'], weight: 1.0 },
      { text: ['team', 'delegate', 'authority', 'responsibility', 'vision', 'mission'], weight: 0.9 },
      { text: ['motivate', 'inspire', 'influence', 'empower', 'direction'], weight: 0.8 }
    ],
    cue: 'leadership'
  },
  clarity: {
    patterns: [
      { text: ['clarify', 'clear', 'explain', 'detail', 'elaborate', 'specify', 'define'], weight: 1.0 },
      { text: ['understand', 'comprehend', 'grasp', 'get it', 'make sense'], weight: 0.9 },
      { text: ['confused', 'unclear', 'vague', 'ambiguous', 'uncertain'], weight: 0.8 }
    ],
    cue: 'clarity'
  },
  execution: {
    patterns: [
      { text: ['execute', 'implement', 'carry out', 'perform', 'complete', 'finish'], weight: 1.0 },
      { text: ['do', 'act', 'proceed', 'move forward', 'advance', 'achieve'], weight: 0.9 },
      { text: ['plan', 'schedule', 'timeline', 'deadline', 'deliverable'], weight: 0.8 }
    ],
    cue: 'execution'
  },
  cultural: {
    patterns: [
      { text: ['culture', 'custom', 'tradition', 'etiquette', 'cultural', 'international', 'foreign', 'abroad', 'travel', 'local'], weight: 1.0 },
      { text: ['greeting', 'greet', 'formal', 'informal', 'respectful', 'respect', 'courtesy'], weight: 0.9 },
      { text: ['difference', 'diversity', 'inclusion', 'inclusive', 'multicultural'], weight: 0.8 }
    ],
    cue: 'cultural'
  },
  learning: {
    patterns: [
      { text: ['learn', 'learning', 'teach', 'teaching', 'study', 'studying', 'education', 'educational'], weight: 1.0 },
      { text: ['grammar', 'vocabulary', 'pronunciation', 'phrase', 'sentence', 'word', 'language'], weight: 0.9 },
      { text: ['practice', 'exercise', 'lesson', 'homework', 'assignment', 'class'], weight: 0.8 }
    ],
    cue: 'learning'
  }
};

// Pre-compile regex patterns for better performance
const compiledPatterns = {};
Object.entries(intentPatterns).forEach(([intent, config]) => {
  compiledPatterns[intent] = config.patterns.map(pattern => ({
    ...pattern,
    regexes: pattern.text.map(t => ({
      text: t,
      regex: new RegExp(`\\b${t.replace(/[.*+?^${}()|[\\]/g, '\\$&')}\\b`, 'i'),
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
 * Optimized similarity calculation with performance safeguards and synonym support
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity score between 0 and 1
 */
export const calculateSimilarity = (str1, str2) => {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;

  // Guard against extremely long strings for performance
  if (s1.length > 50 || s2.length > 50) return 0.0;

  // Substring match boost
  if (s1.includes(s2) || s2.includes(s1)) {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    if (shorter.length < 3 && longer.length > 5) return 0.2;
    return shorter.length / longer.length;
  }

  // Synonym checking
  const s1Words = s1.split(/\s+/);
  const s2Words = s2.split(/\s+/);
  let synonymMatches = 0;

  const checkSynonyms = (wordsA, wordsB) => {
    wordsA.forEach(word => {
      if (SYNONYM_MAP[word]) {
        if (SYNONYM_MAP[word].some(syn => wordsB.includes(syn))) {
          synonymMatches++;
        }
      }
    });
  };

  checkSynonyms(s1Words, s2Words);
  checkSynonyms(s2Words, s1Words);

  if (synonymMatches > 0) {
    const baseSimilarity = calculateBaseSimilarity(s1, s2);
    const synonymBoost = Math.min(0.3, synonymMatches * 0.15);
    return Math.min(1.0, baseSimilarity + synonymBoost);
  }

  // Jaccard similarity for short strings is often zero
  if (s1.length < 4 || s2.length < 4) return 0;

  return calculateBaseSimilarity(s1, s2);
};

/**
 * Backward compatible alias for calculateSimilarity
 */
export const calculateSimilarityOptimized = calculateSimilarity;

/**
 * Internal helper for Jaccard index
 */
const calculateBaseSimilarity = (s1, s2) => {
  const set1 = new Set(s1.split(''));
  const set2 = new Set(s2.split(''));
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  const jaccard = intersection.size / union.size;
  const lengthRatio = Math.min(s1.length, s2.length) / Math.max(s1.length, s2.length);
  return jaccard * lengthRatio;
};

/**
 * Tokenize text into words
 */
const tokenize = (text) => {
  if (!text) return [];
  return text.toLowerCase().split(/[^a-z0-9']+/).filter(token => token.length > 0);
};

/**
 * CORE INTENT DETECTION ENGINE
 * Private internal function to unify detection logic.
 */
const findIntents = (input, options = {}) => {
  const {
    threshold = 0.4,
    multiple = false,
    tokenLimit = 10,
    recordAnalytics = true,
    performanceOptimized = false
  } = options;

  if (!input || typeof input !== 'string') {
    return multiple ? [] : { intent: null, confidence: 0 };
  }

  // Optimization for high-performance mode
  let textToProcess = input;
  if (performanceOptimized && input.length > 200) {
    textToProcess = input.substring(0, 100);
  }

  const tokens = performanceOptimized 
    ? intentPerformanceTracker.measureTokenization(tokenize, textToProcess)
    : tokenize(textToProcess);
    
  if (tokens.length === 0) {
    return multiple ? [] : { intent: null, confidence: 0 };
  }

  const inputLower = textToProcess.toLowerCase();
  const tokenSet = performanceOptimized ? new Set(tokens) : null;
  const results = [];
  let bestMatch = null;
  let bestScore = 0;

  for (const [intent, patterns] of Object.entries(compiledPatterns)) {
    let maxIntentScore = 0;

    for (const pattern of patterns) {
      let patternScore = 0;

      // Phase 1: Fast Matches (Exact & RegEx)
      for (const patternItem of pattern.regexes) {
        const isMatch = tokenSet ? tokenSet.has(patternItem.text) : tokens.includes(patternItem.text);
        if (isMatch) {
          patternScore = Math.max(patternScore, pattern.weight);
        }

        if (patternScore < pattern.weight && patternItem.regex.test(inputLower)) {
          const weightMultiplier = patternItem.isMultiWord ? 1.0 : 0.6;
          patternScore = Math.max(patternScore, pattern.weight * weightMultiplier);
        }
        if (patternScore >= 1.0) break;
      }

      // Phase 2: Similarity Match (only if no strong match yet)
      const similarityThreshold = performanceOptimized ? 0.7 : 0.8;
      if (patternScore < similarityThreshold) {
        const limitedTokens = tokens.slice(0, tokenLimit);
        for (const patternItem of pattern.regexes) {
          if (patternItem.isMultiWord) continue;
          
          for (const token of limitedTokens) {
            if (Math.abs(token.length - patternItem.text.length) > 2) continue;
            if (token.length > 15) continue;

            const similarity = performanceOptimized
              ? intentPerformanceTracker.measureSimilarityCalculation(calculateSimilarity, token, patternItem.text)
              : calculateSimilarity(token, patternItem.text);
              
            if (similarity > 0.85) {
              patternScore = Math.max(patternScore, pattern.weight * similarity);
            }
            if (patternScore >= 0.85) break;
          }
          if (patternScore >= 0.85) break;
        }
      }

      maxIntentScore = Math.max(maxIntentScore, patternScore);
      if (maxIntentScore >= 1.0) break;
    }

    if (maxIntentScore >= threshold) {
      if (multiple) {
        results.push({ intent, confidence: Math.min(1.0, maxIntentScore) });
      } else if (maxIntentScore > bestScore) {
        bestScore = maxIntentScore;
        bestMatch = intent;
      }
    }
    
    if (!multiple && bestScore >= 1.0) break;
  }

  if (multiple) {
    const sorted = results.sort((a, b) => b.confidence - a.confidence);
    if (recordAnalytics) {
      sorted.forEach(r => intentAnalytics.recordDetection(input, r.intent, r.confidence));
    }
    return sorted;
  }

  const result = {
    intent: bestMatch,
    confidence: Math.min(1.0, bestScore)
  };

  if (recordAnalytics) {
    intentAnalytics.recordDetection(input, result.intent, result.confidence);
  }

  return result;
};

/**
 * Public API - Refactored to use the central engine
 */

export const detectIntent = (input) => findIntents(input).intent;

export const detectIntentWithConfidence = (input) => findIntents(input);

export const detectIntentWithConfidenceAndThreshold = (input, threshold = 0.4) => 
  findIntents(input, { threshold, recordAnalytics: false });

export const detectIntentHighPerformance = (input, threshold = 0.5) => {
  const result = findIntents(input, {
    threshold,
    performanceOptimized: true,
    tokenLimit: 3
  });
  return {
    intent: result.intent || 'general',
    confidence: result.confidence
  };
};

export const detectMultipleIntents = (input, threshold = 0.4) => 
  findIntents(input, { threshold, multiple: true });

/**
 * Generates an intent-based cue based on the detected intent from input text
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

  if (intent === 'strategic') return 'Project Confidence';

  const seed = input.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + conversationHistory.length;
  return cues[seed % cues.length];
};

/**
 * Generates a cue based on the content of the AI response
 */
const generateCueFromResponse = (response, conversationHistory = []) => {
  if (!response) return 'Pause';
  
  const lowerResponse = response.toLowerCase();
  const seed = response.length + conversationHistory.length;
  
  const matchAndReturn = (keywords, cues) => {
    if (keywords.some(k => lowerResponse.includes(k))) {
      return cues[seed % cues.length];
    }
    return null;
  };

  return matchAndReturn(['suggest', 'recommend', 'should', 'try', 'could'], ['Suggest', 'Try', 'Recommend', 'Propose', 'Consider', 'Experiment']) || 
         matchAndReturn(['feel', 'understand', 'hear'], ['Acknowledge', 'Validate', 'Empathize', 'Listen', 'Support', 'Connect']) || 
         (conversationHistory.length > 0 && conversationHistory[conversationHistory.length-1]?.content?.includes('?') 
           ? ['Ask', 'Clarify', 'Follow up', 'Probe', 'Inquire', 'Investigate'][seed % 6] 
           : ['Pause', 'Think', 'Consider', 'Reflect', 'Hmm', 'Observe'][seed % 6]);
};

/**
 * Enhanced intent detection that also considers conversation context
 */
export const detectIntentWithContext = (input, conversationHistory = []) => {
  const startTime = Date.now();
  const baseResult = detectIntentWithConfidence(input);
  intentPerformanceTracker.recordIntentDetectionTime('contextDetectionTime', Date.now() - startTime);

  if (!input || !baseResult.intent) return baseResult;

  const inputLower = input.toLowerCase();

  // "Sorry" disambiguation
  if (inputLower.includes('sorry')) {
    const isConflict = ['sorry but', 'sorry, but', 'but sorry', 'sorry however'].some(i => inputLower.includes(i));
    if (isConflict) return { intent: 'conflict', confidence: Math.min(1.0, baseResult.confidence + 0.15) };
    return { intent: 'empathy', confidence: Math.min(1.0, baseResult.confidence + 0.15) };
  }

  // "Maybe/Perhaps" strategic boost
  if (inputLower.includes('maybe') || inputLower.includes('perhaps')) {
    const biz = ['proposal', 'deal', 'contract', 'negotiation', 'meeting', 'project', 'budget', 'strategy'];
    const isBiz = biz.some(i => inputLower.includes(i)) || 
                  conversationHistory.some(t => biz.some(i => t.content.toLowerCase().includes(i)));
    if (isBiz) return { intent: 'strategic', confidence: Math.min(1.0, baseResult.confidence + 0.1) };
  }

  // Action vs Strategic temporal boost
  if (baseResult.intent === 'action' || baseResult.intent === 'strategic') {
    const strat = ['plan', 'strategy', 'future', 'long-term', 'vision', 'goal'];
    const imm = ['now', 'immediately', 'urgent', 'asap'];
    if (strat.some(i => inputLower.includes(i))) return { intent: 'strategic', confidence: Math.min(1.0, baseResult.confidence + 0.1) };
    if (imm.some(i => inputLower.includes(i))) return { intent: 'action', confidence: Math.min(1.0, baseResult.confidence + 0.1) };
  }

  // Question vs Language
  if (baseResult.intent === 'question' || baseResult.intent === 'language') {
    if (['what', 'how', 'why', 'when', 'where', 'who'].some(w => inputLower.startsWith(w))) {
      return { intent: 'question', confidence: Math.min(1.0, baseResult.confidence + 0.1) };
    }
  }

  // Empathy vs Social
  if (baseResult.intent === 'empathy' || baseResult.intent === 'social') {
    const emp = ['sorry to hear', 'so sorry', 'my condolences', 'i\'m here for you', 'i care about'];
    if (emp.some(i => inputLower.includes(i))) return { intent: 'empathy', confidence: Math.min(1.0, baseResult.confidence + 0.25) };
  }

  return baseResult;
};

/**
 * Metadata for semantic tags used in the intent detection system
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
  },
  negotiation: {
    tag: '[negotiation]',
    aliases: ['[deal]', '[bargain]'],
    label: 'Negotiation',
    icon: 'Handshake',
    variant: 'strategic',
    description: 'Bargaining or deal-making'
  },
  leadership: {
    tag: '[leadership]',
    aliases: ['[lead]', '[direct]'],
    label: 'Leadership',
    icon: 'Star',
    variant: 'strategic',
    description: 'Guiding or directing others'
  },
  clarity: {
    tag: '[clarity]',
    aliases: ['[clear]', '[explain]'],
    label: 'Clarity',
    icon: 'Lightbulb',
    variant: 'language',
    description: 'Improving understanding'
  },
  execution: {
    tag: '[execution]',
    aliases: ['[execute]', '[do]'],
    label: 'Execution',
    icon: 'Target',
    variant: 'action',
    description: 'Focus on implementation'
  },
  cultural: {
    tag: '[cultural]',
    aliases: ['[culture]', '[etiquette]'],
    label: 'Cultural',
    icon: 'Globe',
    variant: 'social',
    description: 'Cultural context or etiquette'
  },
  learning: {
    tag: '[learning]',
    aliases: ['[learn]', '[study]'],
    label: 'Learning',
    icon: 'BookOpen',
    variant: 'language',
    description: 'Educational or learning moment'
  }
};

/**
 * Parses semantic tags from text
 */
export const parseSemanticTags = (text) => {
  if (!text) return { cleanText: '', tags: [] };
  let cleanText = text;
  const foundTags = [];

  Object.entries(TAG_METADATA).forEach(([key, meta]) => {
    const allTags = [meta.tag, ...(meta.aliases || [])];
    allTags.forEach(tag => {
      if (text.toLowerCase().includes(tag.toLowerCase())) {
        if (!foundTags.some(t => t.key === key)) foundTags.push({ ...meta, key });
        cleanText = cleanText.replace(new RegExp(tag.replace(/[.*+?^${}()|[\\]/g, '\\$&'), 'gi'), '').trim();
      }
    });
  });

  return { cleanText, tags: foundTags };
};
