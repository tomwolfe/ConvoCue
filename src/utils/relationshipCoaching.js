/**
 * @fileoverview Advanced relationship coaching and emotional intelligence utilities
 */

import { analyzeEmotion } from './emotion';
import { analyzeConversationSentiment } from './sentimentAnalysis';

// Cache for relationship coaching analysis results
const analysisCache = new Map();

// Generate a cache key based on text and conversation history
const generateCacheKey = (text, conversationHistory, emotionData) => {
  const historyKey = conversationHistory ? JSON.stringify(conversationHistory.map(h => h.content || h)) : '';
  const emotionKey = emotionData ? JSON.stringify(emotionData) : '';
  return `${text.substring(0, 50)}-${historyKey.substring(0, 100)}-${emotionKey.substring(0, 50)}`;
};

/**
 * Enhanced relationship coaching analysis with caching
 * @param {string} text - The text to analyze
 * @param {Array} conversationHistory - Array of conversation messages
 * @param {Object} emotionData - Pre-analyzed emotion data
 * @returns {Object} Relationship coaching insights
 */
export const analyzeRelationshipCoaching = (text, conversationHistory = [], emotionData = null) => {
  if (!text || typeof text !== 'string') {
    return {
      empathyLevel: 'neutral',
      activeListeningOpportunities: [],
      emotionalValidationNeeded: false,
      relationshipInsights: [],
      suggestedResponseTypes: []
    };
  }

  // Generate cache key
  const cacheKey = generateCacheKey(text, conversationHistory, emotionData);

  // Check if result is already cached
  if (analysisCache.has(cacheKey)) {
    return analysisCache.get(cacheKey);
  }

  // Analyze emotions if not provided
  const emotionAnalysis = emotionData || analyzeEmotion(text);

  // Analyze conversation context
  const conversationContext = analyzeConversationContext(conversationHistory, text);

  // Identify empathy opportunities
  const empathyLevel = assessEmpathyLevel(text, emotionAnalysis, conversationContext);

  // Identify active listening opportunities
  const activeListeningOpportunities = identifyActiveListeningOpportunities(text, conversationContext);

  // Check for emotional validation needs
  const emotionalValidationNeeded = checkEmotionalValidationNeeds(text, emotionAnalysis);

  // Generate relationship insights
  const relationshipInsights = generateRelationshipInsights(text, emotionAnalysis, conversationContext);

  // Suggest response types
  const suggestedResponseTypes = suggestResponseTypes(text, emotionAnalysis, conversationContext);

  const result = {
    empathyLevel,
    activeListeningOpportunities,
    emotionalValidationNeeded,
    relationshipInsights,
    suggestedResponseTypes
  };

  // Cache the result (limit cache size to prevent memory issues)
  if (analysisCache.size >= 50) {
    const firstKey = analysisCache.keys().next().value;
    analysisCache.delete(firstKey);
  }
  analysisCache.set(cacheKey, result);

  return result;
};

/**
 * Assess the empathy level needed in the response
 * @param {string} text - Input text
 * @param {Object} emotionAnalysis - Emotion analysis result
 * @param {Object} conversationContext - Conversation context
 * @returns {string} Empathy level ('high', 'medium', 'low', 'neutral')
 */
const assessEmpathyLevel = (text, emotionAnalysis, conversationContext) => {
  const { emotion, confidence } = emotionAnalysis;
  
  // High empathy needed for strong negative emotions
  if (['sadness', 'fear', 'anger', 'disgust'].includes(emotion) && confidence > 0.6) {
    return 'high';
  }

  // Medium empathy for moderate emotions or when someone shares personal info
  if (emotion !== 'neutral' && confidence > 0.3) {
    return 'medium';
  }

  // Check for personal sharing indicators
  const personalSharingIndicators = [
    'I feel', 'I think', 'I believe', 'my experience', 'personally', 
    'I\'m struggling', 'I\'m having trouble', 'I need', 'I want'
  ];
  
  if (personalSharingIndicators.some(indicator => text.toLowerCase().includes(indicator.toLowerCase()))) {
    return 'medium';
  }

  return 'neutral';
};

/**
 * Identify active listening opportunities
 * @param {string} text - Input text
 * @param {Object} conversationContext - Conversation context
 * @returns {Array} Active listening opportunities
 */
const identifyActiveListeningOpportunities = (text, conversationContext) => {
  const opportunities = [];

  // Paraphrasing opportunity
  if (text.length > 20) {
    opportunities.push({
      type: 'paraphrase',
      description: 'Paraphrase their main point to show understanding',
      priority: 'medium'
    });
  }

  // Reflection opportunity
  if (text && text.match(/(happy|sad|angry|frustrated|excited|worried|anxious|scared|nervous|confused|tired|stressed|overwhelmed|thrilled|disappointed|concerned|grateful|appreciative)/gi)) {
    const emotionRegex = /(happy|sad|angry|frustrated|excited|worried|anxious|scared|nervous|confused|tired|stressed|overwhelmed|thrilled|disappointed|concerned|grateful|appreciative)/gi;
    const emotionMatches = text.match(emotionRegex);

    if (emotionMatches) {
      opportunities.push({
        type: 'reflect_emotion',
        description: `Acknowledge their ${emotionMatches[0]} feelings`,
        priority: 'high'
      });
    }
  }

  // Clarification opportunity
  const questionWords = ['what', 'how', 'when', 'where', 'why', 'who'];
  if (questionWords.some(qw => text.toLowerCase().includes(qw))) {
    opportunities.push({
      type: 'seek_clarification',
      description: 'Ask for more details to better understand their perspective',
      priority: 'medium'
    });
  }

  // Validation opportunity
  const vulnerabilityIndicators = [
    'I\'m not sure', 'maybe', 'perhaps', 'I guess', 'sort of', 'kind of',
    'I feel like nobody understands', 'nobody gets it', 'I\'m alone in this'
  ];
  
  if (vulnerabilityIndicators.some(indicator => text.toLowerCase().includes(indicator.toLowerCase()))) {
    opportunities.push({
      type: 'validate',
      description: 'Validate their experience and normalize their feelings',
      priority: 'high'
    });
  }

  return opportunities;
};

/**
 * Check if emotional validation is needed
 * @param {string} text - Input text
 * @param {Object} emotionAnalysis - Emotion analysis
 * @returns {boolean} Whether emotional validation is needed
 */
const checkEmotionalValidationNeeds = (text, emotionAnalysis) => {
  const { emotion, confidence } = emotionAnalysis;
  
  // High need for validation with strong emotions
  if (['sadness', 'fear', 'anger', 'disgust'].includes(emotion) && confidence > 0.5) {
    return true;
  }

  // Check for vulnerability expressions
  const vulnerabilityExpressions = [
    'I feel like', 'I\'m struggling', 'I don\'t know', 'I\'m confused', 
    'I need help', 'I\'m not sure', 'I feel', 'I think maybe'
  ];
  
  return vulnerabilityExpressions.some(expr => text.toLowerCase().includes(expr.toLowerCase()));
};

/**
 * Generate relationship insights
 * @param {string} text - Input text
 * @param {Object} emotionAnalysis - Emotion analysis
 * @param {Object} conversationContext - Conversation context
 * @returns {Array} Relationship insights
 */
const generateRelationshipInsights = (text, emotionAnalysis, conversationContext) => {
  const insights = [];
  const { emotion, confidence } = emotionAnalysis;

  // Insight about emotional state
  if (emotion !== 'neutral' && confidence > 0.4) {
    insights.push({
      category: 'emotional_state',
      insight: `The other person appears to be feeling ${emotion}. Acknowledging this emotion can strengthen your connection.`,
      priority: 'high'
    });
  }

  // Insight about communication style
  if (text.length > 50) {
    insights.push({
      category: 'communication_style',
      insight: 'They\'re sharing quite a bit of information. Active listening and reflection will be key here.',
      priority: 'medium'
    });
  }

  // Insight about relationship dynamics
  if (conversationContext.previousSpeakerWasDifferent) {
    insights.push({
      category: 'relationship_dynamics',
      insight: 'This appears to be your turn to respond after the other person spoke. Consider reflecting on what they said before adding your perspective.',
      priority: 'medium'
    });
  }

  // Insight about timing
  if (conversationContext.longResponseExpected) {
    insights.push({
      category: 'timing',
      insight: 'They seem to be looking for a thoughtful response. Take your time to craft something meaningful.',
      priority: 'medium'
    });
  }

  return insights;
};

/**
 * Suggest response types based on context
 * @param {string} text - Input text
 * @param {Object} emotionAnalysis - Emotion analysis
 * @param {Object} conversationContext - Conversation context
 * @returns {Array} Suggested response types
 */
const suggestResponseTypes = (text, emotionAnalysis, conversationContext) => {
  const { emotion, confidence } = emotionAnalysis;
  const suggestions = [];

  // Empathetic response for emotional content
  if (['sadness', 'fear', 'anger', 'disgust'].includes(emotion) && confidence > 0.5) {
    suggestions.push({
      type: 'empathetic',
      description: 'Respond with empathy and understanding',
      examples: ['I can see that\'s really difficult for you', 'That sounds incredibly challenging']
    });
  }

  // Validation response for vulnerable sharing
  if (confidence > 0.4 && text.toLowerCase().includes('i feel')) {
    suggestions.push({
      type: 'validation',
      description: 'Validate their feelings and experiences',
      examples: ['Your feelings are completely understandable', 'It makes sense that you feel that way']
    });
  }

  // Question response for exploration
  if (text && text.match(/(what|how|why|when|where|who)/i)) {
    suggestions.push({
      type: 'exploration',
      description: 'Ask exploratory questions to deepen understanding',
      examples: ['What would be most helpful right now?', 'How do you feel about that?']
    });
  }

  // Supportive response for challenges
  if (text && (text.includes('problem') || text.includes('difficulty') || text.includes('struggle') || text.includes('challenge'))) {
    suggestions.push({
      type: 'supportive',
      description: 'Offer support without immediately trying to solve',
      examples: ['I\'m here for you', 'What do you need right now?']
    });
  }

  // Affirmative response for positive sharing
  if (emotion === 'joy' && confidence > 0.5) {
    suggestions.push({
      type: 'affirmative',
      description: 'Celebrate and affirm their positive experience',
      examples: ['That\'s wonderful!', 'I\'m so happy for you']
    });
  }

  return suggestions;
};

/**
 * Analyze conversation context
 * @param {Array} conversationHistory - Array of conversation messages
 * @param {string} currentText - Current text being analyzed
 * @returns {Object} Conversation context
 */
const analyzeConversationContext = (conversationHistory, currentText) => {
  if (!conversationHistory || conversationHistory.length === 0) {
    return {
      previousSpeakerWasDifferent: false,
      conversationStage: 'beginning',
      emotionalIntensity: 'low',
      longResponseExpected: currentText.length > 50
    };
  }

  const lastMessage = conversationHistory[conversationHistory.length - 1];
  const sentimentAnalysis = analyzeConversationSentiment(conversationHistory);
  
  return {
    previousSpeakerWasDifferent: lastMessage && lastMessage.role !== 'user',
    conversationStage: determineConversationStage(conversationHistory),
    emotionalIntensity: sentimentAnalysis.sentimentScore > 0.5 ? 'high' : 
                       sentimentAnalysis.sentimentScore < -0.5 ? 'high' : 'moderate',
    longResponseExpected: currentText.length > 50,
    overallTone: sentimentAnalysis.overallSentiment
  };
};

/**
 * Determine conversation stage
 * @param {Array} conversationHistory - Array of conversation messages
 * @returns {string} Conversation stage
 */
const determineConversationStage = (conversationHistory) => {
  if (conversationHistory.length < 3) return 'beginning';
  if (conversationHistory.length < 8) return 'developing';
  return 'established';
};

/**
 * Generate enhanced relationship coaching prompt
 * @param {Object} relationshipInsights - Relationship insights
 * @param {string} currentPersona - Current persona being used
 * @returns {string} Enhanced prompt for relationship coaching
 */
export const generateRelationshipCoachingPrompt = (relationshipInsights, currentPersona = 'relationship') => {
  const { empathyLevel, activeListeningOpportunities, emotionalValidationNeeded, suggestedResponseTypes } = relationshipInsights;

  let promptAdditions = '';

  // Add empathy considerations
  if (empathyLevel === 'high') {
    promptAdditions += 'HIGH EMPATHY REQUIRED: Prioritize acknowledging and validating the other person\'s emotional state. ';
  } else if (empathyLevel === 'medium') {
    promptAdditions += 'Show empathy by recognizing their feelings and perspective. ';
  }

  // Add active listening elements
  if (activeListeningOpportunities.length > 0) {
    const highPriorityOps = activeListeningOpportunities.filter(op => op.priority === 'high');
    if (highPriorityOps.length > 0) {
      promptAdditions += `ACTIVE LISTENING OPPORTUNITY: ${highPriorityOps[0].description}. `;
    }
  }

  // Add validation elements
  if (emotionalValidationNeeded) {
    promptAdditions += 'EMOTIONAL VALIDATION NEEDED: Acknowledge their feelings as valid and understandable. ';
  }

  // Add response type guidance
  if (suggestedResponseTypes.length > 0) {
    const primaryType = suggestedResponseTypes[0];
    if (primaryType) {
      promptAdditions += `RESPONSE APPROACH: Use a ${primaryType.type} approach. Example: ${primaryType.examples[0] || 'Be supportive and understanding.'}. `;
    }
  }

  // Specific guidance based on persona
  if (currentPersona === 'relationship') {
    promptAdditions += 'Focus on building connection, showing understanding, and using "I" statements to express your own feelings appropriately. ';
  }

  // Add ethical disclaimer for emotional support features
  if (currentPersona === 'relationship' || currentPersona === 'anxiety') {
    promptAdditions += 'IMPORTANT DISCLAIMER: This is not a substitute for professional mental health services. If someone is in crisis, encourage them to seek professional help or contact emergency services. ';
  }

  return promptAdditions.trim();
};