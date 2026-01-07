/**
 * @fileoverview Conversation turn management for the main thread
 */

import { ConversationTurnManager } from './utils/speakerDetection';

// Create a global conversation manager instance
const conversationManager = new ConversationTurnManager();

/**
 * Gets the global conversation turn manager instance
 * @returns {ConversationTurnManager} The conversation turn manager
 */
export const getConversationManager = () => {
  return conversationManager;
};

/**
 * Processes audio and text to manage conversation turns
 * @param {Float32Array} audioData - Audio data from the microphone
 * @param {string} detectedText - Text from speech recognition
 * @returns {Object} Turn information
 */
export const processConversationTurn = (audioData, detectedText = '') => {
  const turn = conversationManager.processAudio(audioData, detectedText);
  // Notify listeners that conversation turns have been updated
  window.dispatchEvent(new CustomEvent('convocue_conversation_updated', { 
    detail: { turns: conversationManager.getConversationHistory() } 
  }));
  return turn;
};

/**
 * Gets the current conversation history
 * @returns {Array} Array of conversation messages with speaker information
 */
export const getConversationHistory = () => {
  return conversationManager.getConversationHistory();
};

/**
 * Resets the conversation manager
 */
export const resetConversationManager = () => {
  conversationManager.reset();
  window.dispatchEvent(new CustomEvent('convocue_conversation_updated', { 
    detail: { turns: [] } 
  }));
};

/**
 * Allows manual override of speaker attribution for a specific turn
 * @param {number} turnId - ID of the turn to modify
 * @param {string} correctSpeaker - The correct speaker ('user' or 'other')
 */
export const overrideSpeakerForTurn = (turnId, correctSpeaker) => {
  const result = conversationManager.overrideSpeaker(turnId, correctSpeaker);
  window.dispatchEvent(new CustomEvent('convocue_conversation_updated', { 
    detail: { turns: conversationManager.getConversationHistory() } 
  }));
  return result;
};

/**
 * Updates the last speaker without processing new audio
 * @param {string} speaker - The speaker to set as last speaker
 */
export const updateLastSpeaker = (speaker) => {
  const result = conversationManager.updateLastSpeaker(speaker);
  window.dispatchEvent(new CustomEvent('convocue_conversation_updated', { 
    detail: { turns: conversationManager.getConversationHistory() } 
  }));
  return result;
};