import { analyzeEmotion } from './emotion';
import { getDislikedPhrases } from './feedback';
import { secureLocalStorageGet } from './encryption';

/**
 * Gets user's preferred response patterns based on feedback history
 *
 * @returns {Promise<object>} Preferred response characteristics
 */
export const getUserPreferences = async () => {
  try {
    const feedbackHistory = await secureLocalStorageGet('convocue_feedback', []);

    if (feedbackHistory.length === 0) {
      return {
        preferredLength: 'medium', // 'short', 'medium', 'long'
        preferredTone: 'balanced', // 'formal', 'casual', 'balanced'
        preferredStyle: 'adaptive', // 'directive', 'supportive', 'adaptive'
        responsePatterns: [], // Commonly liked patterns
        avoidPatterns: [] // Commonly disliked patterns
      };
    }

    // Analyze feedback to determine user preferences
    const likedSuggestions = feedbackHistory.filter(f => f.feedbackType === 'like');
    const dislikedSuggestions = feedbackHistory.filter(f => f.feedbackType === 'dislike');

    // Determine preferred length based on liked suggestions
    let preferredLength = 'medium';
    if (likedSuggestions.length > 0) {
      const avgLength = likedSuggestions.reduce((sum, f) => sum + f.suggestion.length, 0) / likedSuggestions.length;
      if (avgLength < 30) preferredLength = 'short';
      else if (avgLength > 60) preferredLength = 'long';
    }

    // Determine preferred tone based on persona usage
    const personaCounts = {};
    likedSuggestions.forEach(f => {
      personaCounts[f.persona] = (personaCounts[f.persona] || 0) + 1;
    });

    let preferredTone = 'balanced';
    if (personaCounts.professional > (personaCounts.anxiety || 0) + (personaCounts.relationship || 0)) {
      preferredTone = 'formal';
    } else if ((personaCounts.anxiety || 0) + (personaCounts.relationship || 0) > personaCounts.professional) {
      preferredTone = 'casual';
    }

    // Analyze response patterns from liked suggestions
    const responsePatterns = analyzeResponsePatterns(likedSuggestions);
    const avoidPatterns = analyzeResponsePatterns(dislikedSuggestions, true);

    return {
      preferredLength,
      preferredTone,
      preferredStyle: 'adaptive',
      responsePatterns,
      avoidPatterns
    };
  } catch (e) {
    console.error('Failed to determine user preferences:', e);
    return {
      preferredLength: 'medium',
      preferredTone: 'balanced',
      preferredStyle: 'adaptive',
      responsePatterns: [],
      avoidPatterns: []
    };
  }
};

/**
 * Analyzes patterns in suggestions to identify what users like/dislike
 * @param {Array} suggestions - Array of feedback suggestions
 * @param {boolean} forDisliked - Whether analyzing disliked suggestions
 * @returns {Array} Array of common patterns
 */
const analyzeResponsePatterns = (suggestions, forDisliked = false) => {
  if (suggestions.length === 0) return [];

  // Extract common patterns like phrases, structures, etc.
  const patterns = [];
  const phraseCounts = {};
  const structureCounts = {};

  suggestions.forEach(suggestion => {
    const text = suggestion.suggestion.toLowerCase();

    // Look for common phrases
    const phrases = extractCommonPhrases(text);
    phrases.forEach(phrase => {
      phraseCounts[phrase] = (phraseCounts[phrase] || 0) + 1;
    });

    // Look for structural patterns
    const structure = analyzeStructure(text);
    if (structure) {
      structureCounts[structure] = (structureCounts[structure] || 0) + 1;
    }
  });

  // Convert to array and sort by frequency
  Object.entries(phraseCounts).forEach(([phrase, count]) => {
    if (count >= (forDisliked ? 1 : 2)) { // Lower threshold for disliked patterns
      patterns.push({
        type: 'phrase',
        value: phrase,
        count,
        weight: forDisliked ? -count : count
      });
    }
  });

  Object.entries(structureCounts).forEach(([structure, count]) => {
    if (count >= (forDisliked ? 1 : 2)) {
      patterns.push({
        type: 'structure',
        value: structure,
        count,
        weight: forDisliked ? -count : count
      });
    }
  });

  return patterns.slice(0, 10); // Return top 10 patterns
};

/**
 * Extracts common conversational phrases from text
 * @param {string} text - Input text
 * @returns {Array} Array of common phrases
 */
const extractCommonPhrases = (text) => {
  const commonPhrases = [
    'how are you', 'what do you think', 'i understand', 'that sounds',
    'what about', 'could you', 'would you', 'maybe we', 'in my opinion',
    'i see', 'you know', 'actually', 'definitely', 'absolutely', 'perhaps',
    'on the other hand', 'i agree', 'that makes sense', 'tell me more',
    'what if', 'how about', 'i feel', 'it seems', 'personally', 'to be honest'
  ];

  return commonPhrases.filter(phrase => text.includes(phrase));
};

/**
 * Analyzes the structural pattern of a response
 * @param {string} text - Input text
 * @returns {string|null} Structural pattern
 */
const analyzeStructure = (text) => {
  const sentences = text.split(/(?<=[.!?])\s+/);

  if (sentences.length === 1) {
    if (text.endsWith('?')) return 'single_question';
    if (text.endsWith('.') || text.endsWith('!')) return 'single_statement';
  } else if (sentences.length === 2) {
    return 'two_part';
  } else if (sentences.length > 2) {
    return 'multi_part';
  }

  // Check for question patterns
  if (text.toLowerCase().startsWith('what') ||
      text.toLowerCase().startsWith('how') ||
      text.toLowerCase().startsWith('why')) {
    return 'question_start';
  }

  return null;
};

/**
 * Adjusts a response based on user preferences and feedback patterns
 *
 * @param {string} response - Original response to adjust
 * @param {string} persona - Current persona being used
 * @param {object} emotionData - Emotional analysis data
 * @returns {Promise<string>} Adjusted response
 */
export const adjustResponseForUser = async (response, persona, emotionData) => {
  const preferences = await getUserPreferences();
  
  // Adjust length based on user preference
  let adjustedResponse = response;
  
  if (preferences.preferredLength === 'short' && response.length > 50) {
    // Truncate to first sentence if too long
    const sentences = response.split(/(?<=[.!?])\s+/);
    if (sentences.length > 1) {
      adjustedResponse = sentences[0];
    } else if (response.length > 60) {
      // If it's one long sentence, truncate to ~60 chars
      adjustedResponse = response.substring(0, 60).trim() + '...';
    }
  } else if (preferences.preferredLength === 'long' && response.length < 40) {
    // Expand short responses with follow-up if user prefers longer responses
    if (persona === 'anxiety') {
      adjustedResponse += " I'm here to listen and help if you'd like to share more.";
    } else if (persona === 'relationship') {
      adjustedResponse += " What are your thoughts on this? I'm interested to hear more.";
    }
  }
  
  // Adjust tone based on user preference
  if (preferences.preferredTone === 'formal' && persona !== 'professional') {
    // Make more formal if user prefers it
    adjustedResponse = adjustedResponse
      .replace(/\b(i|we|you|they)\b/g, (match) => match.charAt(0).toUpperCase() + match.slice(1))
      .replace(/\bim\b/gi, 'I am')
      .replace(/\bcant\b/gi, 'cannot')
      .replace(/\bwont\b/gi, 'will not');
  } else if (preferences.preferredTone === 'casual' && persona === 'professional') {
    // Make more casual if user prefers it
    adjustedResponse = adjustedResponse
      .replace(/\bI am\b/gi, 'I\'m')
      .replace(/\bcannot\b/gi, 'cannot')
      .replace(/\bwill not\b/gi, 'won\'t');
  }
  
  // Add emotional awareness if emotion detected
  if (emotionData && emotionData.emotion !== 'neutral' && emotionData.confidence > 0.4) {
    const emotionalAcknowledge = getEmotionalAcknowledgment(emotionData.emotion);
    if (!adjustedResponse.toLowerCase().includes(emotionalAcknowledge.toLowerCase())) {
      adjustedResponse = `${emotionalAcknowledge} ${adjustedResponse}`;
    }
  }
  
  return adjustedResponse;
};

/**
 * Gets appropriate emotional acknowledgment based on detected emotion
 * @param {string} emotion - Detected emotion
 * @returns {string} Appropriate acknowledgment
 */
const getEmotionalAcknowledgment = (emotion) => {
  const acknowledgments = {
    joy: "That sounds positive!",
    sadness: "I understand this might be difficult.",
    anger: "I can sense some frustration.",
    fear: "I understand your concern.",
    surprise: "That's interesting!",
    disgust: "I understand your reaction."
  };
  
  return acknowledgments[emotion] || "I hear what you're saying.";
};

/**
 * Checks if a response contains disliked phrases
 * @param {string} response - Response to check
 * @returns {Promise<boolean>} True if response contains disliked phrases
 */
export const hasDislikedPhrases = async (response) => {
  const dislikedPhrases = await getDislikedPhrases();
  const lowerResponse = response.toLowerCase();

  return dislikedPhrases.some(phrase => lowerResponse.includes(phrase));
};

/**
 * Applies professional-specific insights to responses
 * @param {string} response - Original response
 * @param {string} input - User input/transcript
 * @returns {string} Response with professional insights
 */
const applyProfessionalInsights = (response, input) => {
  let professionalResponse = response;
  const lowerInput = input.toLowerCase();

  // 1. Action Item Detection
  const actionKeywords = ['need to', 'should', 'will', 'let\'s', 'assign', 'deadline', 'task', 'follow up'];
  const hasActionItem = actionKeywords.some(keyword => lowerInput.includes(keyword));
  
  if (hasActionItem && !response.toLowerCase().includes('action') && !response.toLowerCase().includes('next steps')) {
    professionalResponse = `[Action Item] ${professionalResponse} Should we note down the next steps?`;
  }

  // 2. Conflict Resolution Cues
  const conflictKeywords = ['disagree', 'wrong', 'problem', 'issue', 'not happy', 'frustrated', 'mistake'];
  const hasConflict = conflictKeywords.some(keyword => lowerInput.includes(keyword));

  if (hasConflict) {
    professionalResponse = `[Diplomatic] ${professionalResponse} I hear the concern. How can we find a middle ground?`;
  }

  // 3. Power Dynamic Alerts (subtle cues for high-stakes situations)
  const powerKeywords = ['boss', 'manager', 'executive', 'director', 'urgent', 'priority', 'important'];
  const isHighStakes = powerKeywords.some(keyword => lowerInput.includes(keyword));

  if (isHighStakes && !hasConflict) {
    professionalResponse = `[Strategic] ${professionalResponse} This seems like a priority for leadership.`;
  }

  return professionalResponse;
};

/**
 * Enhances a response based on user preferences, emotional context, and feedback patterns
 *
 * @param {string} response - Original response to enhance
 * @param {string} persona - Current persona being used
 * @param {object} emotionData - Optional emotional analysis data
 * @param {string} input - Optional original user transcript for deeper context
 * @param {Array} conversationHistory - Optional conversation history for context
 * @returns {Promise<string>} Enhanced response
 */
export const enhanceResponse = async (response, persona, emotionData = null, input = '', conversationHistory = []) => {
  if (!response) return response;

  const preferences = await getUserPreferences();
  let enhancedResponse = response;

  // Apply professional insights for relevant personas
  if ((persona === 'professional' || persona === 'meeting') && input) {
    enhancedResponse = applyProfessionalInsights(enhancedResponse, input);
  }

  // Adjust length based on user preference
  if (preferences.preferredLength === 'short' && enhancedResponse.length > 50) {
    // Truncate to first sentence if too long
    const sentences = enhancedResponse.split(/(?<=[.!?])\s+/);
    if (sentences.length > 1) {
      enhancedResponse = sentences[0];
    } else if (enhancedResponse.length > 60) {
      // If it's one long sentence, truncate to ~60 chars
      enhancedResponse = enhancedResponse.substring(0, 60).trim() + '...';
    }
  } else if (preferences.preferredLength === 'long' && enhancedResponse.length < 40) {
    // Expand short responses with follow-up if user prefers longer responses
    if (persona === 'anxiety') {
      enhancedResponse += " I'm here to listen and help if you'd like to share more.";
    } else if (persona === 'relationship') {
      enhancedResponse += " What are your thoughts on this? I'm interested to hear more.";
    }
  }

  // Adjust tone based on user preference
  if (preferences.preferredTone === 'formal' && persona !== 'professional') {
    // Make more formal if user prefers it
    enhancedResponse = enhancedResponse
      .replace(/\b(i|we|you|they)\b/g, (match) => match.charAt(0).toUpperCase() + match.slice(1))
      .replace(/\bim\b/gi, 'I am')
      .replace(/\bcant\b/gi, 'cannot')
      .replace(/\bwont\b/gi, 'will not');
  } else if (preferences.preferredTone === 'casual' && persona === 'professional') {
    // Make more casual if user prefers it
    enhancedResponse = enhancedResponse
      .replace(/\bI am\b/gi, 'I\'m')
      .replace(/\bcannot\b/gi, 'cannot')
      .replace(/\bwill not\b/gi, 'won\'t');
  }

  // Add emotional awareness if emotion detected
  if (emotionData && emotionData.emotion !== 'neutral' && emotionData.confidence > 0.4) {
    const emotionalAcknowledge = getEmotionalAcknowledgment(emotionData.emotion);
    if (!enhancedResponse.toLowerCase().includes(emotionalAcknowledge.toLowerCase())) {
      enhancedResponse = `${emotionalAcknowledge} ${enhancedResponse}`;
    }
  }

  // Apply conversation context awareness
  if (conversationHistory && conversationHistory.length > 0) {
    enhancedResponse = applyConversationContext(enhancedResponse, conversationHistory, persona);
  }

  // Apply learned preferences from feedback
  enhancedResponse = applyLearnedPreferences(enhancedResponse, preferences);

  // Safety Valve: If enhancement changed the response too radically, fallback
  // This prevents "hallucinations" or weird artifacts from rule-based rephrasing
  const lengthRatio = enhancedResponse.length / Math.max(1, response.length);
  if (lengthRatio > 2.0 || lengthRatio < 0.3) {
    console.warn("Safety valve triggered: Enhancement was too aggressive. Falling back to original.");
    return response;
  }

  // Check for disliked phrases and try to avoid them
  if (await hasDislikedPhrases(enhancedResponse)) {
    // For now, just log that we detected disliked phrases
    // In a more advanced implementation, we could try to rephrase
    console.log("Response contains disliked phrases:", enhancedResponse);
  }

  return enhancedResponse;
};

/**
 * Applies conversation context to make responses more relevant
 * @param {string} response - Original response
 * @param {Array} conversationHistory - Conversation history
 * @param {string} persona - Current persona
 * @returns {string} Response with conversation context applied
 */
const applyConversationContext = (response, conversationHistory, persona) => {
  if (!conversationHistory || conversationHistory.length === 0) return response;

  // Get the last few messages to understand context
  const recentMessages = conversationHistory.slice(-3);
  const lastMessage = recentMessages[recentMessages.length - 1];
  const secondToLastMessage = recentMessages.length > 1 ? recentMessages[recentMessages.length - 2] : null;

  // If the last message was from the assistant, we might want to vary our approach
  if (lastMessage && lastMessage.role === 'assistant') {
    // This might be a follow-up to our previous suggestion
    if (persona === 'anxiety' || persona === 'relationship') {
      // For supportive personas, acknowledge the continued conversation
      if (!response.toLowerCase().includes('continue') && !response.toLowerCase().includes('more')) {
        response = response + " What else would you like to discuss?";
      }
    }
  }

  // Check if we're responding to a question
  if (lastMessage && lastMessage.content.toLowerCase().includes('?')) {
    // Make sure our response addresses the question
    if (persona === 'professional' && !response.toLowerCase().includes('answer') && !response.toLowerCase().includes('suggest')) {
      response = "Based on what you've shared, I suggest: " + response;
    }
  }

  // Check for emotional continuity
  if (secondToLastMessage && lastMessage) {
    // Look for emotional patterns in the conversation
    const lastEmotion = analyzeEmotion(lastMessage.content);
    const prevEmotion = secondToLastMessage ? analyzeEmotion(secondToLastMessage.content) : null;

    if (lastEmotion.emotion !== 'neutral' && prevEmotion && prevEmotion.emotion === lastEmotion.emotion) {
      // If emotions are consistent, acknowledge the ongoing feeling
      if (persona === 'relationship' && !response.toLowerCase().includes('understand') && !response.toLowerCase().includes('feel')) {
        response = `I understand how you feel. ${response}`;
      }
    }
  }

  return response;
};

/**
 * Applies learned preferences from user feedback to a response
 * @param {string} response - Original response
 * @param {object} preferences - User preferences object
 * @returns {string} Response with preferences applied
 */
const applyLearnedPreferences = (response, preferences) => {
  if (!preferences.responsePatterns && !preferences.avoidPatterns) return response;

  let modifiedResponse = response;

  // Apply positive patterns (things users liked)
  if (preferences.responsePatterns && preferences.responsePatterns.length > 0) {
    // For now, we'll just make sure we're not contradicting learned preferences
    // In a more advanced system, we might inject preferred patterns
  }

  // Avoid negative patterns (things users disliked)
  if (preferences.avoidPatterns && preferences.avoidPatterns.length > 0) {
    preferences.avoidPatterns.forEach(pattern => {
      if (pattern.type === 'phrase' && pattern.weight < 0) {
        // This is a pattern to avoid
        if (modifiedResponse.toLowerCase().includes(pattern.value)) {
          // Actively replace the disliked pattern with a better alternative
          modifiedResponse = replaceDislikedPattern(modifiedResponse, pattern.value);
        }
      } else if (pattern.type === 'structure' && pattern.value === 'single_question' && pattern.weight < 0) {
        // If user dislikes single questions, convert to statement
        if (modifiedResponse.trim().endsWith('?') &&
            modifiedResponse.split(/(?<=[.!?])\s+/).length === 1) {
          modifiedResponse = convertQuestionToStatement(modifiedResponse);
        }
      } else if (pattern.type === 'structure' && pattern.value === 'apologetic_pattern' && pattern.weight < 0) {
        // If user dislikes apologetic patterns, remove them
        modifiedResponse = removeApologeticLanguage(modifiedResponse);
      }
    });
  }

  // Adjust based on structural preferences
  if (preferences.preferredLength) {
    // Already handled in the main function
  }

  return modifiedResponse;
};

/**
 * Replaces a disliked pattern with a better alternative
 * @param {string} response - Original response
 * @param {string} dislikedPhrase - The phrase to replace
 * @returns {string} Response with replaced phrase
 */
const replaceDislikedPattern = (response, dislikedPhrase) => {
  // Define better alternatives for common disliked phrases
  const replacements = {
    'sorry': 'I understand',
    'apologize': 'I recognize',
    'i don\'t know': 'here\'s what I can suggest',
    'maybe': 'consider',
    'perhaps': 'think about',
    'i think': 'from my perspective',
    'i guess': 'it seems'
  };

  // Check if the disliked phrase has a known replacement
  const lowerPhrase = dislikedPhrase.toLowerCase();
  if (replacements[lowerPhrase]) {
    return response.replace(new RegExp('\b' + dislikedPhrase + '\b', 'gi'), replacements[lowerPhrase]);
  }

  // If no specific replacement, try to rephrase the sentence
  return rephraseSentence(response, dislikedPhrase);
};

/**
 * Rephrases a sentence to remove a disliked phrase
 * @param {string} response - Original response
 * @param {string} dislikedPhrase - Phrase to remove
 * @returns {string} Rephrased response
 */
const rephraseSentence = (response, dislikedPhrase) => {
  // Split into sentences and rephrase the one containing the disliked phrase
  const sentences = response.split(/(?<=[.!?])\s+/);
  const rephrasedSentences = sentences.map(sentence => {
    if (sentence.toLowerCase().includes(dislikedPhrase.toLowerCase())) {
      // Attempt to rephrase by removing the disliked phrase and adjusting the sentence
      let newSentence = sentence.replace(new RegExp('\b' + dislikedPhrase + '\b', 'gi'), '');
      newSentence = newSentence.replace(/\s+/g, ' ').trim();

      // Capitalize first letter if needed
      if (newSentence.length > 0) {
        newSentence = newSentence.charAt(0).toUpperCase() + newSentence.slice(1);
      }

      return newSentence;
    }
    return sentence;
  });

  return rephrasedSentences.join(' ');
};

/**
 * Converts a question to a statement
 * @param {string} question - Question to convert
 * @returns {string} Converted statement
 */
const convertQuestionToStatement = (question) => {
  // Remove question mark and adjust the sentence structure
  let statement = question.replace(/\?$/, '.');

  // Convert question words to statement form if needed
  if (statement.toLowerCase().startsWith('what')) {
    statement = 'Consider what you could do about ' + statement.substring(5);
  } else if (statement.toLowerCase().startsWith('how')) {
    statement = 'Think about how you might ' + statement.substring(4);
  } else if (statement.toLowerCase().startsWith('why')) {
    statement = 'There could be several reasons why ' + statement.substring(4);
  } else if (statement.toLowerCase().startsWith('can') || statement.toLowerCase().startsWith('could')) {
    statement = 'You might be able to ' + statement.substring(statement.indexOf(' ') + 1);
  }

  return statement;
};

/**
 * Removes apologetic language from a response
 * @param {string} response - Original response
 * @returns {string} Response without apologetic language
 */
const removeApologeticLanguage = (response) => {
  // Remove apologetic phrases
  let cleanedResponse = response.replace(/\bsorry\b/gi, '');
  cleanedResponse = cleanedResponse.replace(/\bi apologize\b/gi, '');
  cleanedResponse = cleanedResponse.replace(/\bmy apologies\b/gi, '');
  cleanedResponse = cleanedResponse.replace(/\bi\'m sorry\b/gi, '');

  // Clean up extra spaces and punctuation
  cleanedResponse = cleanedResponse.replace(/\s+/g, ' ').trim();
  cleanedResponse = cleanedResponse.replace(/\s+([,.!?;:])/g, '$1');

  return cleanedResponse;
};
