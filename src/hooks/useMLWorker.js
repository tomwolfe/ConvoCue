import { useReducer, useEffect, useRef, useCallback } from 'react';
import { AppConfig } from '../config';
import { manageConversationHistory, optimizeConversationHistory, isMemoryLimitApproaching } from '../utils/conversation';
import { enhanceResponse, getUserPreferences } from '../utils/responseEnhancement';
import { ConversationTurnManager } from '../utils/speakerDetection';

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
        return { ...state, history: optimizeConversationHistory(updatedHistory, AppConfig.system.maxHistoryLength, 5) };
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

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const initWorker = useCallback(() => {
    if (worker.current) worker.current.terminate();

    try {
      const newWorker = new Worker(new URL('../worker.js', import.meta.url), { type: 'module' });
      worker.current = newWorker;

      newWorker.onmessage = async (e) => {
        const { type, text, status, progress, error, metadata, emotionData } = e.data;

        switch (type) {
          case 'status':
            dispatch({ type: 'SET_STATUS', status, progress });
            break;
          case 'ready':
            dispatch({ type: 'SET_READY' });
            break;
          case 'stt_result':
            if (!text?.trim()) {
              dispatch({ type: 'RESET_PROCESSING' });
              break;
            }
            const cleanText = text.trim();

            // "Banter Mode" / Aggregation Logic
            // If the transcript is very short and we aren't already waiting on a long one,
            // maybe we should wait for more context.
            const isShort = cleanText.split(' ').length < 3;
            const lastMessageTime = stateRef.current.lastMessageTime || 0;
            const timeSinceLast = Date.now() - lastMessageTime;

            dispatch({ type: 'STT_RESULT', text: cleanText });

            // Check performance metrics and potentially adjust processing
            if (metadata?.performance) {
              const { audioProcessingTime, speakerDetectionTime } = metadata.performance;

              // Log performance metrics for monitoring
              if (audioProcessingTime > 200 || speakerDetectionTime > 150) {
                console.warn('Performance warning:', { audioProcessingTime, speakerDetectionTime });
                // Could implement fallback logic here for slow devices
              }
            }

            // Trigger LLM if:
            // 1. It's not too short
            // 2. OR it's been a while since the last interaction (> 5s)
            // 3. OR the transcript ends with a question mark
            if (!isShort || timeSinceLast > 5000 || cleanText.includes('?')) {
                const prefs = await getUserPreferences();
                newWorker.postMessage({
                    type: 'llm',
                    text: cleanText,
                    history: stateRef.current.history,
                    persona: stateRef.current.persona,
                    culturalContext: stateRef.current.culturalContext,
                    metadata,
                    preferences: prefs,
                    taskId: `llm-${Date.now()}`
                });
                dispatch({ type: 'SET_LAST_MESSAGE_TIME', time: Date.now() });

                // Determine speaker role from metadata if available
                const speakerRole = metadata?.turnInfo?.turn?.speaker || 'user';
                dispatch({ type: 'ADD_TO_HISTORY', message: { role: speakerRole, content: cleanText } });
            } else {
                console.log("Banter detected, skipping LLM trigger for now:", cleanText);

                // Determine speaker role from metadata if available
                const speakerRole = metadata?.turnInfo?.turn?.speaker || 'user';
                dispatch({ type: 'ADD_TO_HISTORY', message: { role: speakerRole, content: cleanText } });
                dispatch({ type: 'SET_READY' }); // Go back to ready state but keep the transcript
            }
            break;
          case 'llm_chunk':
            dispatch({ type: 'LLM_CHUNK', text });
            break;
          case 'llm_result':
            const enhanced = await enhanceResponse(text, stateRef.current.persona, emotionData, stateRef.current.transcript, stateRef.current.history);
            dispatch({ type: 'LLM_RESULT', text: enhanced, emotionData });
            if (e.data.conversationSentiment) {
              dispatch({ type: 'SET_CONVERSATION_SENTIMENT', sentiment: e.data.conversationSentiment });
            }

            // Handle performance metrics from the worker
            if (e.data.metadata?.performance) {
              const { llmProcessingTime, sentimentAnalysisTime } = e.data.metadata.performance;

              // Log performance metrics for monitoring
              if (llmProcessingTime > 5000 || sentimentAnalysisTime > 1000) {
                console.warn('LLM Performance warning:', { llmProcessingTime, sentimentAnalysisTime });
                // Could implement fallback logic here for slow devices
              }
            }

            if (enhanced) {
              dispatch({ type: 'ADD_TO_HISTORY', message: { role: 'assistant', content: enhanced } });
            }
            if (navigator.vibrate) navigator.vibrate(20);
            break;
          case 'error':
            dispatch({ type: 'SET_ERROR', error });
            break;
        }
      };

      newWorker.postMessage({ type: 'load' });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', error: 'Worker creation failed' });
    }
  }, []);

  useEffect(() => {
    initWorker();
    return () => worker.current?.terminate();
  }, [initWorker]);

  const processAudio = useCallback((audioBuffer) => {
    if (!state.isReady || state.isProcessing || !worker.current) return;
    dispatch({ type: 'START_STT' });
    worker.current.postMessage({ type: 'stt', audio: audioBuffer }, [audioBuffer.buffer]);
  }, [state.isReady, state.isProcessing]);

  const refreshSuggestion = useCallback(async () => {
    if (!state.transcript || state.isProcessing || !worker.current) return;
    dispatch({ type: 'SET_STATUS', status: 'Refreshing cue...' });
    const prefs = await getUserPreferences();
    worker.current.postMessage({
      type: 'llm',
      text: state.transcript,
      history: state.history,
      persona: state.persona,
      culturalContext: state.culturalContext,
      preferences: prefs,
      taskId: `refresh-${Date.now()}`
    });
  }, [state.transcript, state.isProcessing, state.history, state.persona, state.culturalContext]);

  const setPersona = useCallback((persona) => {
    try {
      const prefs = getStoredPreferences();
      prefs.preferredPersona = persona;
      localStorage.setItem('convocue_preferences', JSON.stringify(prefs));
    } catch (e) {}
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
    resetWorker: initWorker
  };
};