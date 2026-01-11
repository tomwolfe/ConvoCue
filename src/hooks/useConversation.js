import { useReducer, useEffect, useCallback } from 'react';
import { AppConfig } from '../config';
import { manageConversationHistory, optimizeConversationHistory, isMemoryLimitApproaching, aggressiveMemoryManagement } from '../utils/conversation';
import { getConversationHistory as getGlobalHistory } from '../conversationManager';
import { EVENTS } from '../utils/eventBus';
import { useEvent } from './useEvent';

const initialState = {
  history: [],
  conversationTurns: [],
  conversationSentiment: null,
  lastMessageTime: 0
};

function conversationReducer(state, action) {
  switch (action.type) {
    case 'SET_HISTORY':
      return { ...state, history: action.history };
    case 'ADD_TO_HISTORY': {
      const updatedHistory = [...state.history, action.message];

      // Check if memory limit is approaching and use optimized management if needed
      if (isMemoryLimitApproaching(updatedHistory)) {
        // Use more aggressive memory management for constrained environments
        if (AppConfig.system.lowMemoryMode()) {
          return { ...state, history: aggressiveMemoryManagement(updatedHistory, {
            maxLength: AppConfig.system.maxHistoryLength,
            maxTokens: AppConfig.system.maxTokenCount || 4000,
            compressOlderThanMinutes: 5,
            enableCompression: true
          })};
        } else {
          return { ...state, history: optimizeConversationHistory(updatedHistory, AppConfig.system.maxHistoryLength, 5) };
        }
      }

      return { ...state, history: manageConversationHistory(updatedHistory, AppConfig.system.maxHistoryLength) };
    }
    case 'SET_CONVERSATION_TURNS':
      return { ...state, conversationTurns: action.turns };
    case 'SET_CONVERSATION_SENTIMENT':
      return { ...state, conversationSentiment: action.sentiment };
    case 'SET_LAST_MESSAGE_TIME':
      return { ...state, lastMessageTime: action.time };
    case 'CLEAR_HISTORY':
      return { ...state, history: [], conversationTurns: [], conversationSentiment: null };
    default:
      return state;
  }
}

/**
 * Custom hook for managing conversation state.
 * 
 * HYBRID STATE MODEL:
 * This hook maintains local reactive state that is synchronized with the 
 * `conversationManager` singleton. 
 * 
 * - Source of Truth for Turns: The `conversationManager` (singleton).
 * - Source of Truth for UI: This hook's local state, which updates via 
 *   `convocue:conversation_updated` events emitted by the manager.
 * 
 * This design prevents unnecessary re-renders of the entire app when the 
 * manager processes audio, while ensuring that components only re-render
 * when a meaningful conversation update (like a new turn) occurs.
 * 
 * Use this hook in components that need to react to conversation changes.
 * 
 * @returns {Object} Conversation state and management functions.
 */
export const useConversation = () => {
  const [state, dispatch] = useReducer(conversationReducer, initialState);

  useEffect(() => {
    // Initialize from global manager
    const currentTurns = getGlobalHistory();
    if (currentTurns && currentTurns.length > 0) {
      dispatch({ type: 'SET_CONVERSATION_TURNS', turns: currentTurns });
    }
  }, []);

  const handleConversationUpdate = useCallback((data) => {
    if (data && data.turns) {
      dispatch({ type: 'SET_CONVERSATION_TURNS', turns: data.turns });
    }
  }, []);

  useEvent(EVENTS.CONVERSATION_UPDATED, handleConversationUpdate);

  const addMessage = useCallback((role, content) => {
    dispatch({ type: 'ADD_TO_HISTORY', message: { role, content } });
  }, []);

  const setSentiment = useCallback((sentiment) => {
    dispatch({ type: 'SET_CONVERSATION_SENTIMENT', sentiment });
  }, []);

  const updateLastMessageTime = useCallback(() => {
    dispatch({ type: 'SET_LAST_MESSAGE_TIME', time: Date.now() });
  }, []);

  const clearHistory = useCallback(() => {
    dispatch({ type: 'CLEAR_HISTORY' });
  }, []);

  return {
    ...state,
    addMessage,
    setSentiment,
    updateLastMessageTime,
    clearHistory,
    dispatch // For advanced cases
  };
};
