import { useReducer, useEffect, useRef, useCallback } from 'react';
import { enhanceResponse } from '../utils/responseEnhancement';
import { useConversation } from './useConversation';
import { useAppPreferences } from './useAppPreferences';
import { getCommunicationProfileSummary } from '../utils/personalization';
import { provideHapticFeedback } from '../utils/haptics';

const initialState = {
  status: 'Initializing Models...',
  progress: 0,
  isReady: false,
  transcript: '',
  suggestion: '',
  emotionData: null,
  isProcessing: false,
  processingStep: 'none',
  error: null,
  persona: 'anxiety',
  culturalContext: 'general'
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
    case 'SET_PERSONA':
      return { ...state, persona: action.persona };
    case 'SET_CULTURAL_CONTEXT':
      return { ...state, culturalContext: action.culturalContext };
    case 'RESET_PROCESSING':
      return { ...state, isProcessing: false, processingStep: 'none', status: 'Ready' };
    case 'SET_ERROR':
      return { ...state, error: action.error, status: `Model Error: ${action.error}`, isProcessing: false, isReady: false };
    case 'CLEAR_INTERACTION':
      return { ...state, transcript: '', suggestion: '' };
    default:
      return state;
  }
}

export const useMLWorker = () => {
  const [state, dispatch] = useReducer(workerReducer, initialState);
  const { 
    history, 
    conversationTurns, 
    conversationSentiment, 
    lastMessageTime,
    addMessage, 
    setSentiment, 
    updateLastMessageTime, 
    clearHistory 
  } = useConversation();

  const {
    settings,
    prefsCache,
    updatePersona,
    updateCulturalContext
  } = useAppPreferences(dispatch);
  
  const worker = useRef(null);
  const stateRef = useRef(state);
  const historyRef = useRef(history);
  const lastMessageTimeRef = useRef(lastMessageTime);

  useEffect(() => {
    stateRef.current = state;
    historyRef.current = history;
    lastMessageTimeRef.current = lastMessageTime;
  }, [state, history, lastMessageTime]);

  const initWorker = useCallback(() => {
    if (worker.current) {
      worker.current.terminate();
    }

    try {
      const newWorker = new Worker(new URL('../worker.js', import.meta.url), { type: 'module' });
      worker.current = newWorker;

      newWorker.onmessage = async (event) => {
        try {
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

              // aggregation Logic
              const isShort = cleanText.split(' ').length < 3;
              const timeSinceLast = Date.now() - (lastMessageTimeRef.current || 0);

              dispatch({ type: 'STT_RESULT', text: cleanText });

              // Trigger LLM if:
              if (!isShort || timeSinceLast > 5000 || cleanText.includes('?')) {
                  const communicationProfile = settings.enablePersonalization !== false && !settings.privacyMode
                      ? await getCommunicationProfileSummary()
                      : "";

                  newWorker.postMessage({
                      type: 'llm',
                      text: cleanText,
                      history: historyRef.current,
                      persona: stateRef.current.persona,
                      culturalContext: stateRef.current.culturalContext,
                      communicationProfile,
                      metadata,
                      preferences: prefsCache.current,
                      settings: settings,
                      taskId: `llm-${Date.now()}`
                  });
                  updateLastMessageTime();

                  const speakerRole = metadata?.turnInfo?.turn?.speaker || 'user';
                  addMessage(speakerRole, cleanText);
              } else {
                  const speakerRole = metadata?.turnInfo?.turn?.speaker || 'user';
                  addMessage(speakerRole, cleanText);
                  dispatch({ type: 'RESET_PROCESSING' });
              }
              break;
            }
            case 'llm_chunk':
              dispatch({ type: 'LLM_CHUNK', text });
              break;
            case 'llm_result': {
              const enhanced = await enhanceResponse(
                text, 
                stateRef.current.persona, 
                emotionData, 
                stateRef.current.transcript, 
                historyRef.current
              );
              dispatch({ type: 'LLM_RESULT', text: enhanced, emotionData });
              
              if (event.data.conversationSentiment) {
                setSentiment(event.data.conversationSentiment);
              }

              if (enhanced) {
                addMessage('assistant', enhanced);
              }
              provideHapticFeedback(enhanced);
              break;
            }
            case 'error':
              dispatch({ type: 'SET_ERROR', error: event.data.error });
              break;
          }
        } catch (err) {
          console.error("Error in worker message handler:", err);
          dispatch({ type: 'SET_ERROR', error: 'Main thread processing failed' });
        }
      };

      newWorker.postMessage({ type: 'load' });
    } catch {
      dispatch({ type: 'SET_ERROR', error: 'Worker creation failed' });
    }
  }, [settings, addMessage, setSentiment, updateLastMessageTime, prefsCache]);

  useEffect(() => {
    return () => {
      if (worker.current) {
        worker.current.terminate();
      }
    };
  }, []);

  useEffect(() => {
    initWorker();
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

    const communicationProfile = settings.enablePersonalization !== false && !settings.privacyMode
        ? await getCommunicationProfileSummary()
        : "";

    worker.current.postMessage({
      type: 'llm',
      text: state.transcript,
      history: history,
      persona: state.persona,
      culturalContext: state.culturalContext,
      communicationProfile,
      preferences: preferences,
      settings: settings,
      taskId: `refresh-${Date.now()}`
    });
  }, [state.transcript, state.isProcessing, history, state.persona, state.culturalContext, settings, prefsCache]);

  return {
    ...state,
    history,
    conversationTurns,
    conversationSentiment,
    processAudio,
    refreshSuggestion,
    prewarmLLM: () => worker.current?.postMessage({ type: 'prewarm_llm' }),
    setTranscript: (text) => dispatch({ type: 'SET_TRANSCRIPT', text }),
    setSuggestion: (text) => dispatch({ type: 'SET_SUGGESTION', text }),
    setStatus: (status) => dispatch({ type: 'SET_STATUS', status }),
    setPersona: updatePersona,
    setCulturalContext: updateCulturalContext,
    clearHistory: () => {
      clearHistory();
      dispatch({ type: 'CLEAR_INTERACTION' });
    },
    resetWorker: initWorker,
    settings: settings
  };
};