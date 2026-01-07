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
  return conversationManager.processAudio(audioData, detectedText);
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
};