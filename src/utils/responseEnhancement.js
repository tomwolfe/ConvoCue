/**
 * Response enhancement utilities
 */

/**
 * Gets appropriate emotional acknowledgment based on detected emotion
 * @param {string} emotion - Detected emotion
 * @returns {string} Appropriate acknowledgment
 */
export const getEmotionalAcknowledgment = (emotion) => {
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
 * Adjusts a response based on user preferences and feedback patterns
 * @param {string} response - Original response to adjust
 * @param {string} persona - Current persona being used
 * @param {object} emotionData - Emotional analysis data
 * @param {object} preferences - User preferences
 * @returns {string} Adjusted response
 */
export const adjustResponseForUser = (response, persona, emotionData, preferences = {}) => {
  const { preferredLength = 'medium', preferredTone = 'balanced' } = preferences;
  
  // Adjust length based on user preference
  let adjustedResponse = response;
  
  if (preferredLength === 'short' && response.length > 50) {
    // Truncate to first sentence if too long
    const sentences = response.split(/(?<=[.!?])\s+/);
    if (sentences.length > 1) {
      adjustedResponse = sentences[0];
    } else if (response.length > 60) {
      // If it's one long sentence, truncate to ~60 chars
      adjustedResponse = response.substring(0, 60).trim() + '...';
    }
  } else if (preferredLength === 'long' && response.length < 40) {
    // Expand short responses with follow-up if user prefers longer responses
    if (persona === 'anxiety') {
      adjustedResponse += " I'm here to listen and help if you'd like to share more.";
    } else if (persona === 'relationship') {
      adjustedResponse += " What are your thoughts on this? I'm interested to hear more.";
    }
  }
  
  // Adjust tone based on user preference
  if (preferredTone === 'formal' && persona !== 'professional') {
    // Make more formal if user prefers it
    adjustedResponse = adjustedResponse
      .replace(/\b(i|we|you|they)\b/g, (match) => match.charAt(0).toUpperCase() + match.slice(1))
      .replace(/\bim\b/gi, 'I am')
      .replace(/\bcant\b/gi, 'cannot')
      .replace(/\bwont\b/gi, 'will not');
  } else if (preferredTone === 'casual' && persona === 'professional') {
    // Make more casual if user prefers it
    adjustedResponse = adjustedResponse
      .replace(/\bI am\b/gi, 'I\'m')
      .replace(/\bcannot\b/gi, 'can\'t')
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
 * Enhances a response based on user preferences, emotional context, and feedback patterns
 * @param {string} response - Original response to enhance
 * @param {string} persona - Current persona being used
 * @param {object} emotionData - Optional emotional analysis data
 * @param {string} input - Optional original user transcript for deeper context
 * @param {object} preferences - User preferences
 * @param {Array} dislikedPhrases - Array of disliked phrases
 * @returns {string} Enhanced response
 */
export const enhanceResponse = (response, persona, emotionData = null, input = '', preferences = {}, dislikedPhrases = []) => {
  if (!response) return response;

  let enhancedResponse = response;

  // Apply professional insights for relevant personas
  if ((persona === 'professional' || persona === 'meeting') && input) {
    enhancedResponse = applyProfessionalInsights(enhancedResponse, input);
  }

  // Adjust based on user preferences
  enhancedResponse = adjustResponseForUser(enhancedResponse, persona, emotionData, preferences);

  // Check for disliked phrases
  const lowerResponse = enhancedResponse.toLowerCase();
  if (dislikedPhrases.some(phrase => lowerResponse.includes(phrase.toLowerCase()))) {
    console.log("Response contains disliked phrases:", enhancedResponse);
  }

  return enhancedResponse;
};
