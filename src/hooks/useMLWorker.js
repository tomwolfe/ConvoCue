import { useReducer, useEffect, useRef, useCallback, useState } from 'react';
import { AppConfig } from '../config';
import { manageConversationHistory, optimizeConversationHistory, isMemoryLimitApproaching, aggressiveMemoryManagement } from '../utils/conversation';
import { enhanceResponse, getUserPreferences } from '../utils/responseEnhancement';
import { ConversationTurnManager } from '../utils/speakerDetection';
import { secureLocalStorageGet } from '../utils/encryption';

const initialState = {
  status: 'Initializing Models...',
  progress: 0,
  isReady: false,
  transcript: '',
  suggestion: '',
  emotionData: null,
  conversationSentiment: null,
  isProcessing: false,
  processingStep: 'none',
  history: [],
  conversationTurns: [],
  error: null,
  persona: 'anxiety',
  culturalContext: 'general',
  lastMessageTime: 0
};

function workerReducer(state, action) {
  switch (action.type) {
    case 'SET_STATUS':
      return { ...state, status: action.status, progress: action.progress ?? state.progress };
    case 'SET_READY':
      return { ...state, isReady: true, status: 'Ready', progress: 100 };
    case 'START_STT':
      return { ...state, isProcessing: true, processingStep: 'transcribing', status: 'Transcribing...' };
    case 'STT_RESULT':
      return { ...state, transcript: action.text, status: 'Analyzing social cue...', processingStep: 'thinking', suggestion: '' };
    case 'SET_TRANSCRIPT':
      return { ...state, transcript: action.text };
    case 'SET_SUGGESTION':
      return { ...state, suggestion: action.text };
    case 'LLM_CHUNK':
      return { ...state, suggestion: state.suggestion + action.text };
    case 'LLM_RESULT':
      return { 
        ...state, 
        suggestion: action.text, 
        emotionData: action.emotionData || state.emotionData,
        isProcessing: false, 
        processingStep: 'none', 
        status: 'Ready' 
      };
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
    case 'UPDATE_CONVERSATION_TURNS':
      return { ...state, conversationTurns: action.turns, history: action.history };
    case 'SET_CONVERSATION_SENTIMENT':
      return { ...state, conversationSentiment: action.sentiment };
    case 'SET_PERSONA':
      return { ...state, persona: action.persona };
    case 'SET_CULTURAL_CONTEXT':
      return { ...state, culturalContext: action.culturalContext };
    case 'SET_LAST_MESSAGE_TIME':
      return { ...state, lastMessageTime: action.time };
    case 'RESET_PROCESSING':
      return { ...state, isProcessing: false, processingStep: 'none', status: 'Ready' };
    case 'SET_ERROR':
      return { ...state, error: action.error, status: `Model Error: ${action.error}`, isProcessing: false, isReady: false };
    case 'CLEAR_HISTORY':
      return { ...state, history: [], conversationTurns: [], transcript: '', suggestion: '' };
    default:
      return state;
  }
}

const getStoredPreferences = () => {
  try {
    const prefs = localStorage.getItem('convocue_preferences');
    return prefs ? JSON.parse(prefs) : {};
  } catch (e) {
    return {};
  }
};

export const useMLWorker = () => {
  const [state, dispatch] = useReducer(workerReducer, {
    ...initialState,
    persona: getStoredPreferences().preferredPersona || 'anxiety',
    culturalContext: localStorage.getItem('selectedCulturalContext') || 'general'
  });
  
  const worker = useRef(null);
  const stateRef = useRef(state);
  const prefsCache = useRef(null);
  const [settings, setSettings] = useState({
    enablePersonalization: true,
    enableSpeakerDetection: true,
    enableSentimentAnalysis: true,
    privacyMode: false,
    isSubtleMode: false,
    showAnalytics: true
  });

  // Pre-fetch and cache preferences and settings
  useEffect(() => {
    const fetchData = async () => {
      prefsCache.current = await getUserPreferences();
      const savedSettings = await secureLocalStorageGet('convocue_settings');
      if (savedSettings) setSettings(savedSettings);
    };
    fetchData();
    
    // Listen for events to refresh cache
    const handleRefresh = () => fetchData();
    window.addEventListener('convocue_feedback_submitted', handleRefresh);
    window.addEventListener('convocue_settings_changed', handleRefresh);
    return () => {
      window.removeEventListener('convocue_feedback_submitted', handleRefresh);
      window.removeEventListener('convocue_settings_changed', handleRefresh);
    };
  }, []);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const initWorker = useCallback(() => {
    if (worker.current) worker.current.terminate();

    try {
      const newWorker = new Worker(new URL('../worker.js', import.meta.url), { type: 'module' });
      worker.current = newWorker;

      newWorker.onmessage = async (event) => {
        const { type, text, status, progress, metadata, emotionData } = event.data;

        switch (type) {
          case 'status':
            dispatch({ type: 'SET_STATUS', status, progress });
            break;
          case 'ready':
            dispatch({ type: 'SET_READY' });
            break;
          case 'stt_result': {
            if (!text?.trim()) {
              dispatch({ type: 'RESET_PROCESSING' });
              break;
            }
            const cleanText = text.trim();

            // "Banter Mode" / Aggregation Logic
            const isShort = cleanText.split(' ').length < 3;
            const lastMessageTime = stateRef.current.lastMessageTime || 0;
            const timeSinceLast = Date.now() - lastMessageTime;

            dispatch({ type: 'STT_RESULT', text: cleanText });

            // Trigger LLM if:
            if (!isShort || timeSinceLast > 5000 || cleanText.includes('?')) {
                newWorker.postMessage({
                    type: 'llm',
                    text: cleanText,
                    history: stateRef.current.history,
                    persona: stateRef.current.persona,
                    culturalContext: stateRef.current.culturalContext,
                    metadata,
                    preferences: prefsCache.current,
                    settings: settings,
                    taskId: `llm-${Date.now()}`
                });
                dispatch({ type: 'SET_LAST_MESSAGE_TIME', time: Date.now() });

                // Determine speaker role from metadata if available
                const speakerRole = metadata?.turnInfo?.turn?.speaker || 'user';
                dispatch({ type: 'ADD_TO_HISTORY', message: { role: speakerRole, content: cleanText } });
            } else {
                const speakerRole = metadata?.turnInfo?.turn?.speaker || 'user';
                dispatch({ type: 'ADD_TO_HISTORY', message: { role: speakerRole, content: cleanText } });
                dispatch({ type: 'RESET_PROCESSING' }); 
            }
            break;
          }
          case 'llm_chunk':
            dispatch({ type: 'LLM_CHUNK', text });
            break;
          case 'llm_result': {
            const enhanced = await enhanceResponse(text, stateRef.current.persona, emotionData, stateRef.current.transcript, stateRef.current.history);
            dispatch({ type: 'LLM_RESULT', text: enhanced, emotionData });
            if (event.data.conversationSentiment) {
              dispatch({ type: 'SET_CONVERSATION_SENTIMENT', sentiment: event.data.conversationSentiment });
            }

            if (enhanced) {
              dispatch({ type: 'ADD_TO_HISTORY', message: { role: 'assistant', content: enhanced } });
            }
            if (navigator.vibrate) navigator.vibrate(20);
            break;
          }
          case 'error':
            dispatch({ type: 'SET_ERROR', error: event.data.error });
            break;
        }
      };

      newWorker.postMessage({ type: 'load' });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', error: 'Worker creation failed' });
    }
  }, [settings]);

  useEffect(() => {
    initWorker();
    return () => worker.current?.terminate();
  }, [initWorker]);

  const processAudio = useCallback((audioBuffer) => {
    if (!state.isReady || state.isProcessing || !worker.current) return;
    dispatch({ type: 'START_STT' });
    worker.current.postMessage({ 
      type: 'stt', 
      audio: audioBuffer,
      settings: settings 
    }, [audioBuffer.buffer]);
  }, [state.isReady, state.isProcessing, settings]);

  const refreshSuggestion = useCallback(async () => {
    if (!state.transcript || state.isProcessing || !worker.current) return;
    dispatch({ type: 'SET_STATUS', status: 'Refreshing cue...' });

    let preferences = prefsCache.current;
    if (settings.enablePersonalization === false || settings.privacyMode) {
        preferences = {
          preferredLength: 'medium',
          preferredTone: 'balanced',
          preferredStyle: 'adaptive',
          responsePatterns: [],
          avoidPatterns: []
        };
    }

    worker.current.postMessage({
      type: 'llm',
      text: state.transcript,
      history: state.history,
      persona: state.persona,
      culturalContext: state.culturalContext,
      preferences: preferences,
      settings: settings,
      taskId: `refresh-${Date.now()}`
    });
  }, [state.transcript, state.isProcessing, state.history, state.persona, state.culturalContext, settings]);

  const setPersona = useCallback((persona) => {
    try {
      const prefs = getStoredPreferences();
      prefs.preferredPersona = persona;
      localStorage.setItem('convocue_preferences', JSON.stringify(prefs));
    } catch (error) {
      console.error('Failed to save persona preference:', error);
    }
    dispatch({ type: 'SET_PERSONA', persona });
  }, []);

  return {
    ...state,
    processAudio,
    refreshSuggestion,
    prewarmLLM: () => worker.current?.postMessage({ type: 'prewarm_llm' }),
    setTranscript: (text) => dispatch({ type: 'SET_TRANSCRIPT', text }),
    setSuggestion: (text) => dispatch({ type: 'SET_SUGGESTION', text }),
    setStatus: (status) => dispatch({ type: 'SET_STATUS', status }),
    setPersona,
    setCulturalContext: (context) => {
      localStorage.setItem('selectedCulturalContext', context);
      dispatch({ type: 'SET_CULTURAL_CONTEXT', culturalContext: context });
    },
    clearHistory: () => dispatch({ type: 'CLEAR_HISTORY' }),
    resetWorker: initWorker,
    settings: settings
  };
};