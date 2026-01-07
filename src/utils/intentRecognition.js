/**
 * NLP-based Intent Recognition System
 * Replaces basic keyword detection with more sophisticated intent analysis
 */

// Intent patterns with weights for similarity matching
const intentPatterns = {
  greeting: {
    patterns: [
      { text: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'], weight: 1.0 },
      { text: ['greetings', 'howdy', 'hiya', 'what\'s up'], weight: 0.8 },
      { text: ['morning', 'afternoon', 'evening'], weight: 0.6 }
    ],
    cue: 'greeting'
  },
  question: {
    patterns: [
      { text: ['what', 'how', 'why', 'when', 'where', 'who'], weight: 1.0 },
      { text: ['can you', 'could you', 'would you', 'will you', 'do you', 'are you', 'is it'], weight: 0.9 },
      { text: ['tell me', 'explain', 'clarify', 'elaborate'], weight: 0.8 }
    ],
    cue: 'question'
  },
  agreement: {
    patterns: [
      { text: ['yes', 'yeah', 'yep', 'ok', 'okay', 'sure', 'absolutely'], weight: 1.0 },
      { text: ['right', 'exactly', 'indeed', 'correct', 'that\'s right'], weight: 0.9 },
      { text: ['agreed', 'i agree', 'me too', 'same here'], weight: 0.8 }
    ],
    cue: 'agreement'
  },
  disagreement: {
    patterns: [
      { text: ['no', 'nope', 'nah', 'not really'], weight: 1.0 },
      { text: ['disagree', 'i don\'t think so', 'not sure about that'], weight: 0.9 },
      { text: ['wrong', 'incorrect', 'that\'s not right'], weight: 0.8 }
    ],
    cue: 'disagreement'
  },
  conflict: {
    patterns: [
      { text: ['wrong', 'disagree', 'problem', 'issue', 'not happy', 'frustrated', 'mistake'], weight: 1.0 },
      { text: ['no', 'never', 'hate', 'terrible', 'awful'], weight: 0.8 },
      { text: ['argue', 'fight', 'dispute', 'complain'], weight: 0.7 }
    ],
    cue: 'conflict'
  },
  strategic: {
    patterns: [
      { text: ['negotiate', 'important', 'boss', 'manager', 'executive', 'director', 'urgent', 'priority'], weight: 1.0 },
      { text: ['contract', 'price', 'cost', 'deal', 'agreement', 'terms'], weight: 0.9 },
      { text: ['interview', 'presentation', 'meeting', 'stakeholders'], weight: 0.8 }
    ],
    cue: 'strategic'
  },
  action: {
    patterns: [
      { text: ['need to', 'should', 'will', 'let\'s', 'assign', 'deadline', 'task', 'follow up'], weight: 1.0 },
      { text: ['todo', 'action', 'next steps', 'plan', 'schedule'], weight: 0.8 },
      { text: ['remember', 'remind', 'organize', 'arrange'], weight: 0.7 }
    ],
    cue: 'suggestion'
  },
  emotion: {
    patterns: [
      { text: ['anxious', 'worried', 'stressed', 'nervous', 'scared', 'fearful'], weight: 1.0 },
      { text: ['happy', 'excited', 'thrilled', 'joyful', 'pleased'], weight: 0.9 },
      { text: ['sad', 'upset', 'depressed', 'disappointed', 'hurt'], weight: 0.9 },
      { text: ['angry', 'mad', 'furious', 'annoyed', 'irritated'], weight: 0.9 }
    ],
    cue: 'emotion'
  },
  empathy: {
    patterns: [
      { text: ['feel', 'think', 'believe', 'understand', 'know'], weight: 0.8 },
      { text: ['i see', 'i hear', 'i understand', 'that makes sense'], weight: 0.9 },
      { text: ['empathize', 'relate', 'connect', 'share'], weight: 0.7 }
    ],
    cue: 'empathy'
  },
  suggestion: {
    patterns: [
      { text: ['suggest', 'recommend', 'idea', 'proposal', 'thought'], weight: 1.0 },
      { text: ['maybe', 'perhaps', 'could', 'should', 'try'], weight: 0.8 },
      { text: ['what if', 'how about', 'consider', 'think about'], weight: 0.9 }
    ],
    cue: 'suggestion'
  }
};

/**
 * Calculate similarity between two strings using a simple algorithm
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity score between 0 and 1
 */
const calculateSimilarity = (str1, str2) => {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;
  
  // Check if one string contains the other
  if (s1.includes(s2) || s2.includes(s1)) {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    return shorter.length / longer.length;
  }
  
  // Calculate similarity using character overlap
  const set1 = new Set(s1.split(''));
  const set2 = new Set(s2.split(''));
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
};

/**
 * Tokenize text into words
 * @param {string} text - Input text
 * @returns {Array} Array of tokens
 */
const tokenize = (text) => {
  return text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')  // Remove punctuation
    .split(/\s+/)              // Split by whitespace
    .filter(token => token.length > 0);  // Remove empty tokens
};

/**
 * Detect intent from input text using pattern matching and similarity
 * @param {string} input - Input text to analyze
 * @returns {string|null} Detected intent or null if no clear intent
 */
export const detectIntent = (input) => {
  if (!input || typeof input !== 'string') return null;
  
  const tokens = tokenize(input);
  const inputLower = input.toLowerCase();
  
  let bestMatch = null;
  let bestScore = 0;
  
  // Check each intent type
  for (const [intent, config] of Object.entries(intentPatterns)) {
    let intentScore = 0;
    
    // Check each pattern for this intent
    for (const pattern of config.patterns) {
      for (const patternText of pattern.text) {
        // Direct token match
        if (tokens.includes(patternText)) {
          intentScore += pattern.weight;
        }
        
        // Partial match using similarity
        for (const token of tokens) {
          const similarity = calculateSimilarity(token, patternText);
          if (similarity > 0.7) {  // Threshold for similarity match
            intentScore += pattern.weight * similarity * 0.5;  // Reduced weight for similarity matches
          }
        }
        
        // Check if the pattern text appears in the input
        if (inputLower.includes(patternText)) {
          intentScore += pattern.weight * 0.3;  // Reduced weight for substring matches
        }
      }
    }
    
    // Normalize by number of patterns to prevent bias toward intents with more patterns
    intentScore = intentScore / config.patterns.length;
    
    if (intentScore > bestScore) {
      bestScore = intentScore;
      bestMatch = intent;
    }
  }
  
  // Only return an intent if the confidence is above a threshold
  return bestScore > 0.3 ? bestMatch : null;
};

/**
 * Get a confidence score for the detected intent
 * @param {string} input - Input text to analyze
 * @returns {object} Object with intent and confidence score
 */
export const detectIntentWithConfidence = (input) => {
  if (!input || typeof input !== 'string') return { intent: null, confidence: 0 };
  
  const tokens = tokenize(input);
  const inputLower = input.toLowerCase();
  
  let bestMatch = null;
  let bestScore = 0;
  
  // Check each intent type
  for (const [intent, config] of Object.entries(intentPatterns)) {
    let intentScore = 0;
    
    // Check each pattern for this intent
    for (const pattern of config.patterns) {
      for (const patternText of pattern.text) {
        // Direct token match
        if (tokens.includes(patternText)) {
          intentScore += pattern.weight;
        }
        
        // Partial match using similarity
        for (const token of tokens) {
          const similarity = calculateSimilarity(token, patternText);
          if (similarity > 0.7) {  // Threshold for similarity match
            intentScore += pattern.weight * similarity * 0.5;  // Reduced weight for similarity matches
          }
        }
        
        // Check if the pattern text appears in the input
        if (inputLower.includes(patternText)) {
          intentScore += pattern.weight * 0.3;  // Reduced weight for substring matches
        }
      }
    }
    
    // Normalize by number of patterns to prevent bias toward intents with more patterns
    intentScore = intentScore / config.patterns.length;
    
    if (intentScore > bestScore) {
      bestScore = intentScore;
      bestMatch = intent;
    }
  }
  
  // Normalize the score to 0-1 range
  const confidence = Math.min(1.0, bestScore);
  
  return {
    intent: confidence > 0.3 ? bestMatch : null,
    confidence: confidence
  };
};

/**
 * Enhanced intent-based cue generation that replaces simple keyword matching
 * @param {string} input - User input
 * @param {string} response - Generated response
 * @param {Array} conversationHistory - Conversation history
 * @returns {string|null} Appropriate cue based on detected intent
 */
export const generateIntentBasedCue = (input, response = '', conversationHistory = []) => {
  const { intent, confidence } = detectIntentWithConfidence(input);
  
  if (!intent || confidence < 0.3) {
    // If no clear intent, fall back to analyzing the response
    return generateCueFromResponse(response, conversationHistory);
  }
  
  // Map intents to appropriate cues
  const intentToCueMap = {
    greeting: ['Hi', 'Hello', 'Hey', 'Wave', 'Smile', 'Warmly'],
    question: ['Ask', 'Clarify', 'Follow up', 'Probe', 'Inquire', 'Investigate', 'Query'],
    agreement: ['Agree', 'Nod', 'Right', 'Exactly', 'True', 'Affirm', 'Indeed'],
    disagreement: ['Pause', 'Consider', 'Reflect', 'Hmm', 'Think', 'Reassess'],
    conflict: ['De-escalate', 'Validate first', 'Soft tone', 'Find common ground', 'Listen more', 'Neutral stance', 'Breathe'],
    strategic: ['Strategic', 'Consider implications', 'Think long-term', 'Plan ahead', 'Evaluate', 'Assess'],
    action: ['Suggest', 'Try', 'Propose', 'Recommend', 'Consider', 'Plan', 'Organize'],
    emotion: ['Acknowledge', 'Validate', 'Empathize', 'Listen', 'Support', 'Understand'],
    empathy: ['Acknowledge', 'Validate', 'Connect', 'Relate', 'Understand', 'Empathize'],
    suggestion: ['Suggest', 'Try', 'Recommend', 'Propose', 'Consider', 'Experiment', 'Maybe']
  };
  
  const cues = intentToCueMap[intent] || ['Pause', 'Think', 'Consider', 'Reflect', 'Hmm', 'Observe'];
  
  // Use a deterministic selection based on input and history length to avoid randomness
  // while still providing variety across different inputs
  const seed = input.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + conversationHistory.length;
  const index = seed % cues.length;
  
  return cues[index];
};

/**
 * Generate cue from response content when intent detection is inconclusive
 * @param {string} response - Generated response
 * @param {Array} conversationHistory - Conversation history
 * @returns {string} Appropriate cue based on response content
 */
const generateCueFromResponse = (response, conversationHistory = []) => {
  if (!response) return 'Pause';
  
  const lowerResponse = response.toLowerCase();
  const seed = response.length + conversationHistory.length;
  
  // Check for specific response patterns
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
  
  // Check conversation history for context
  if (conversationHistory.length > 0) {
    const lastTurn = conversationHistory[conversationHistory.length - 1];
    if (lastTurn?.content?.includes('?')) {
      const cues = ['Ask', 'Clarify', 'Follow up', 'Probe', 'Inquire', 'Investigate'];
      return cues[seed % cues.length];
    }
  }
  
  // Default cues
  const defaultCues = ['Pause', 'Think', 'Consider', 'Reflect', 'Hmm', 'Observe'];
  return defaultCues[seed % defaultCues.length];
};

/**
 * Enhanced intent detection that also considers conversation context
 * @param {string} input - Current input
 * @param {Array} conversationHistory - Full conversation history
 * @returns {object} Intent detection results with context
 */
export const detectIntentWithContext = (input, conversationHistory = []) => {
  const baseResult = detectIntentWithConfidence(input);
  
  // Enhance detection with context from conversation history
  if (conversationHistory.length > 0) {
    const lastTurn = conversationHistory[conversationHistory.length - 1];
    const lastContent = lastTurn?.content?.toLowerCase() || '';
    
    // If the last turn was a question, boost question intent
    if (lastContent.includes('?') && baseResult.intent !== 'question') {
      // Add context-based boost
      if (baseResult.confidence < 0.5) {
        return {
          intent: 'question',
          confidence: Math.min(0.7, baseResult.confidence + 0.2)
        };
      }
    }
    
    // If there's conflict in recent history, boost conflict detection
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