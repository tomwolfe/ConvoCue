/**
 * NLP-based Intent Recognition System
 * Replaces basic keyword detection with more sophisticated intent analysis.
 *
 * DESIGN PRINCIPLE: 100% Client-Side.
 * This system uses rule-based pattern matching and string similarity (Jaccard-like overlap)
 * to ensure that no conversational data ever leaves the user's device for intent analysis.
 */

import { IntentDetectionConfig } from '../config/intentDetection';

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
      { text: ['empathize', 'relate', 'connect', 'share', 'culture', 'custom', 'tradition', 'etiquette'], weight: 0.8 }
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
 * Calculate similarity between two strings using a simple algorithm
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
  
  // For short words, character overlap is a poor measure of similarity
  if (s1.length < 4 || s2.length < 4) {
    return 0;
  }

  // Calculate similarity using Jaccard index (character-based)
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
 */
export const detectIntent = (input) => {
  const { intent } = detectIntentWithConfidence(input);
  return intent;
};

/**
 * Get a confidence score for the detected intent
 */
export const detectIntentWithConfidence = (input) => {
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
              
              const similarity = calculateSimilarity(token, patternItem.text);
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

  return {
    intent: bestScore > threshold ? bestMatch : null,
    confidence: Math.min(1.0, bestScore)
  };
};

/**
 * Detect intent from input text using pattern matching and similarity with configurable threshold
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

              const similarity = calculateSimilarity(token, patternItem.text);
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
 * Detect all intents above a threshold
 */
export const detectMultipleIntents = (input, threshold = 0.4) => {
  if (!input || typeof input !== 'string') return [];
  
  const tokens = tokenize(input);
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
              
              const similarity = calculateSimilarity(token, patternItem.text);
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
  
  return results.sort((a, b) => b.confidence - a.confidence);
};

/**
 * Enhanced intent-based cue generation
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
 * Generate cue from response content
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
 */
export const detectIntentWithContext = (input, conversationHistory = []) => {
  const baseResult = detectIntentWithConfidence(input);
  
  if (conversationHistory.length > 0) {
    const lastTurn = conversationHistory[conversationHistory.length - 1];
    const lastContent = lastTurn?.content?.toLowerCase() || '';
    
    if (lastContent.includes('?') && baseResult.intent !== 'question') {
      if (baseResult.confidence < 0.5) {
        return {
          intent: 'question',
          confidence: Math.min(0.7, baseResult.confidence + 0.2)
        };
      }
    }
    
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
 * Metadata for semantic tags
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