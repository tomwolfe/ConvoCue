import { ConversationTurnManager } from './utils/speakerDetection';
import { eventBus, EVENTS } from './utils/eventBus';

const conversationManager = new ConversationTurnManager();

/**
 * Get the singleton instance of ConversationTurnManager
 * @returns {ConversationTurnManager} The conversation manager instance
 */
export const getConversationManager = () => {
  return conversationManager;
};

/**
 * Process audio data and detect speaker
 * @param {Float32Array} audioData - The audio data to process
 * @param {string} detectedText - Optional detected text for the turn
 * @returns {Object} Turn information
 */
export const processConversationTurn = (audioData, detectedText = '') => {
  const turn = conversationManager.processAudio(audioData, detectedText);
  // Notify listeners that conversation turns have been updated
  eventBus.emit(EVENTS.CONVERSATION_UPDATED, {
    turns: conversationManager.getConversationHistory()
  });
  return turn;
};

/**
 * Get the current conversation history
 * @returns {Array} Array of conversation turns
 */
export const getConversationHistory = () => {
  return conversationManager.getConversationHistory();
};

/**
 * Reset the conversation manager
 */
export const resetConversationManager = () => {
  conversationManager.reset();
  eventBus.emit(EVENTS.CONVERSATION_UPDATED, {
    turns: []
  });
};

/**
 * Override the speaker for a specific turn
 * @param {string} turnId - The ID of the turn to override
 * @param {string} correctSpeaker - The correct speaker ('user' or 'other')
 */
export const overrideSpeakerForTurn = (turnId, correctSpeaker) => {
  const result = conversationManager.overrideSpeaker(turnId, correctSpeaker);
  eventBus.emit(EVENTS.CONVERSATION_UPDATED, {
    turns: conversationManager.getConversationHistory()
  });
  return result;
};

/**
 * Update the last speaker in the conversation
 * @param {string} speaker - The speaker to set as last speaker
 */
export const updateLastSpeaker = (speaker) => {
  const result = conversationManager.updateLastSpeaker(speaker);
  eventBus.emit(EVENTS.CONVERSATION_UPDATED, {
    turns: conversationManager.getConversationHistory()
  });
  return result;
};