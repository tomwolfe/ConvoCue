/**
 * Response enhancement utilities using user feedback data
 */

/**
 * Gets user's preferred response patterns based on feedback history
 * @returns {object} Preferred response characteristics
 */
export const getUserPreferences = () => {
  try {
    const feedbackHistory = JSON.parse(localStorage.getItem('convocue_feedback') || '[]');
    
    if (feedbackHistory.length === 0) {
      return {
        preferredLength: 'medium', // 'short', 'medium', 'long'
        preferredTone: 'balanced', // 'formal', 'casual', 'balanced'
        preferredStyle: 'adaptive' // 'directive', 'supportive', 'adaptive'
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

    return {
      preferredLength,
      preferredTone,
      preferredStyle: 'adaptive'
    };
  } catch (e) {
    console.error('Failed to determine user preferences:', e);
    return {
      preferredLength: 'medium',
      preferredTone: 'balanced',
      preferredStyle: 'adaptive'
    };
  }
};

/**
 * Adjusts a response based on user preferences and feedback patterns
 * @param {string} response - Original response to adjust
 * @param {string} persona - Current persona being used
 * @param {object} emotionData - Emotional analysis data
 * @returns {string} Adjusted response
 */
export const adjustResponseForUser = (response, persona, emotionData) => {
  const preferences = getUserPreferences();
  
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
 * Gets commonly disliked phrases to avoid in suggestions
 * @returns {Array} Array of phrases that received negative feedback
 */
export const getDislikedPhrases = () => {
  try {
    const feedbackHistory = JSON.parse(localStorage.getItem('convocue_feedback') || '[]');

    // Get all suggestions that received dislike feedback
    const dislikedSuggestions = feedbackHistory
      .filter(f => f.feedbackType === 'dislike')
      .map(f => f.suggestion.toLowerCase());

    // Extract common phrases or patterns from disliked suggestions
    const phraseCounts = {};

    dislikedSuggestions.forEach(suggestion => {
      const words = suggestion.split(/\s+/);
      words.forEach(word => {
        if (word.length > 3) { // Ignore short words
          phraseCounts[word] = (phraseCounts[word] || 0) + 1;
        }
      });
    });

    // Return phrases that appear frequently in disliked suggestions
    return Object.entries(phraseCounts)
      .filter(([phrase, count]) => count >= 2) // At least 2 dislikes
      .map(([phrase]) => phrase);
  } catch (e) {
    console.error('Failed to get disliked phrases:', e);
    return [];
  }
};

/**
 * Checks if a response contains disliked phrases
 * @param {string} response - Response to check
 * @returns {boolean} True if response contains disliked phrases
 */
export const hasDislikedPhrases = (response) => {
  const dislikedPhrases = getDislikedPhrases();
  const lowerResponse = response.toLowerCase();

  return dislikedPhrases.some(phrase => lowerResponse.includes(phrase));
};

/**
 * Enhances a response based on user preferences, emotional context, and feedback patterns
 * @param {string} response - Original response to enhance
 * @param {string} persona - Current persona being used
 * @param {object} emotionData - Optional emotional analysis data
 * @returns {string} Enhanced response
 */
export const enhanceResponse = (response, persona, emotionData = null) => {
  if (!response) return response;

  const preferences = getUserPreferences();
  let enhancedResponse = response;

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

  // Check for disliked phrases and try to avoid them
  if (hasDislikedPhrases(enhancedResponse)) {
    // For now, just log that we detected disliked phrases
    // In a more advanced implementation, we could try to rephrase
    console.log("Response contains disliked phrases:", enhancedResponse);
  }

  return enhancedResponse;
};