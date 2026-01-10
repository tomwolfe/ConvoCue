import { useReducer, useEffect, useRef, useCallback } from 'react';
import { AppConfig } from '../config';
import { enhanceResponse } from '../utils/responseEnhancement';
import { useConversation } from './useConversation';
import { useAppPreferences } from './useAppPreferences';
import { getCommunicationProfileSummary } from '../utils/personalization';
import { provideHapticFeedback, provideIntentHaptics } from '../utils/haptics';
import { detectIntentHighPerformance } from '../utils/intentRecognition';
import { getInsightCategoryScores } from '../utils/feedback';
import performanceMonitor from '../utils/performance';
import { usePerformanceMonitor } from './usePerformanceMonitor';
import { usePersonaOrchestration } from './usePersonaOrchestration';

const initialState = {
  status: 'Initializing Models...',
  progress: 0,
  isReady: false,
  isLowMemory: false,
  transcript: '',
  suggestion: '',
  detectedIntent: null,
  emotionData: null,
  coachingInsights: null,
  isProcessing: false,
  processingStep: 'none',
  error: null,
  persona: 'anxiety', // Default to 'anxiety' (Social Anxiety) as mentioned in tutorial
  culturalContext: 'general'
};
// ... rest of the file ...

function workerReducer(state, action) {
  switch (action.type) {
    case 'SET_STATUS':
      return { 
        ...state, 
        status: action.status, 
        progress: action.progress ?? state.progress,
        isLowMemory: action.isLowMemory ?? state.isLowMemory
      };
    case 'SET_READY':
      return { ...state, isReady: true, status: 'Ready', progress: 100 };
    case 'START_STT':
      return { ...state, isProcessing: true, processingStep: 'transcribing', status: 'Transcribing...' };
    case 'STT_RESULT':
      return { 
        ...state, 
        transcript: action.text, 
        detectedIntent: action.intent,
        status: 'Analyzing social cue...', 
        processingStep: 'thinking', 
        suggestion: '' 
      };
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
        detectedIntent: null,
        emotionData: action.emotionData || state.emotionData,
        coachingInsights: action.coachingInsights || state.coachingInsights,
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
  const settingsRef = useRef(settings);
  const stateRef = useRef(state);
  const historyRef = useRef(history);
  const lastMessageTimeRef = useRef(lastMessageTime);
  const lastHapticTimeRef = useRef(0);
  const lastHapticIntentRef = useRef(null);
  const lastIntentSwitchTimeRef = useRef(0);
  const stickyIntentRef = useRef({ intent: null, timestamp: 0 });

  const prewarmSystemPrompt = useCallback(async () => {
    if (!worker.current || !stateRef.current.isReady) return;

    const communicationProfile = settingsRef.current.enablePersonalization !== false && !settingsRef.current.privacyMode
      ? await getCommunicationProfileSummary()
      : "";

    worker.current.postMessage({
      type: 'prewarm_system_prompt',
      persona: stateRef.current.persona,
      culturalContext: stateRef.current.culturalContext,
      preferences: prefsCache.current,
      communicationProfile,
      settings: settingsRef.current
    });
  }, [prefsCache]);

  const { performOrchestration, handleManualPersonaChange, undoPersonaSwitch, lastSwitchReason } = usePersonaOrchestration(
    state.persona,
    settings,
    historyRef,
    dispatch
  );

  const performOrchestrationRef = useRef(performOrchestration);
  useEffect(() => {
    performOrchestrationRef.current = performOrchestration;
  }, [performOrchestration]);

  usePerformanceMonitor(worker);

  // Performance Optimization: Decoupling Settings from Worker Lifecycle
  useEffect(() => {
    stateRef.current = state;
    historyRef.current = history;
    lastMessageTimeRef.current = lastMessageTime;
    
    if (JSON.stringify(settingsRef.current) !== JSON.stringify(settings)) {
      settingsRef.current = settings;
      prewarmSystemPrompt();
    }
  }, [state, history, lastMessageTime, settings, prewarmSystemPrompt]);

  // Pre-warm system prompt on persona or cultural context change
  useEffect(() => {
    prewarmSystemPrompt();
  }, [state.persona, state.culturalContext, prewarmSystemPrompt]);

  const initWorker = useCallback(() => {
    if (worker.current) {
      worker.current.terminate();
    }

    try {
      const newWorker = new Worker(new URL('../worker.js', import.meta.url), { type: 'module' });
      worker.current = newWorker;

      newWorker.onmessage = async (event) => {
        try {
          const { type, text, status, progress, metadata, emotionData, isLowMemory, isFallbackFailed } = event.data;

          switch (type) {
            case 'status':
              dispatch({ type: 'SET_STATUS', status, progress, isLowMemory });
              // Reset retry counter when we get a success status related to STT
              if (status && (status.includes('Speech Engine loaded successfully') || status.includes('Ready'))) {
                retryCountRef.current = 0; // Reset retry counter on success
                setIsRetryingState(false); // Reset retrying state
              }
              break;
            case 'ready':
              dispatch({ type: 'SET_READY' });
              // If we have a status message in the ready event, update it
              if (status) {
                dispatch({ type: 'SET_STATUS', status });
              }
              // Reset retry counter when worker is ready
              retryCountRef.current = 0;
              setIsRetryingState(false); // Reset retrying state
              break;
            case 'stt_result': {
              if (!text?.trim()) {
                dispatch({ type: 'RESET_PROCESSING' });
                break;
              }
              const cleanText = text.trim();

              // Immediate Intent Recognition for subtle feedback
              let intent = null;
              if (!stateRef.current.isLowMemory) {
                // Use high-performance detection for real-time processing
                const confidenceThreshold = settingsRef.current.intentDetection?.confidenceThreshold ?? 0.5;
                const { intent: rawIntent, confidence } = detectIntentHighPerformance(cleanText, confidenceThreshold);
                intent = rawIntent;

                // Sticky Intent Logic: Keep the badge visible for configurable duration
                // to prevent flickering, and debounce switches between different intents
                const now = Date.now();
                const currentSticky = stickyIntentRef.current.intent;

                const debounceWindow = settingsRef.current.intentDetection?.debounceWindowMs ?? 800;
                const stickyDuration = settingsRef.current.intentDetection?.stickyDurationMs ?? 2000;

                if (intent && confidence > confidenceThreshold) {
                  // Only switch to a DIFFERENT intent if enough time has passed (debounce)
                  if (!currentSticky || intent === currentSticky || (now - lastIntentSwitchTimeRef.current > debounceWindow)) {
                    if (intent !== currentSticky) {
                      lastIntentSwitchTimeRef.current = now;
                    }
                    stickyIntentRef.current = { intent, timestamp: now };
                  } else {
                    // Keep the old intent for now to avoid rapid switching
                    intent = currentSticky;
                  }
                } else if (currentSticky && (now - stickyIntentRef.current.timestamp < stickyDuration)) {
                  intent = currentSticky;
                } else {
                  stickyIntentRef.current = { intent: null, timestamp: 0 };
                }

                if (rawIntent && confidence > confidenceThreshold) {
                  const cooldown = rawIntent === lastHapticIntentRef.current ? 3000 : 1000;

                  if (now - lastHapticTimeRef.current > cooldown) {
                    // Trigger immediate haptics based on intent before LLM finishes
                    provideIntentHaptics(rawIntent);
                    lastHapticTimeRef.current = now;
                    lastHapticIntentRef.current = rawIntent;
                    
                    // Instant Cue for UI
                    const instantCueMap = {
                      'question': 'Ask for clarification...',
                      'agreement': 'Show agreement...',
                      'conflict': 'De-escalate carefully...',
                      'empathy': 'Validate their feeling...',
                      'professional': 'Stay objective...',
                      'action_item': 'Note the task...'
                    };
                    const instantCue = instantCueMap[rawIntent];
                    if (instantCue) {
                      dispatch({ type: 'SET_SUGGESTION', text: `[Analyzing] ${instantCue}` });
                    }
                  }
                }
              }

              // Aggregation Logic: Improved to be more inclusive of meaningful short phrases
              const words = cleanText.split(' ');
              const isShort = words.length < 3;
              const hasMeaningfulCue = /^(yes|no|agree|exactly|right|thanks|thank you|sorry|hello|hi|hey|bye|goodbye|what|why|how|who|where|when|okay|alright|i see|sure|true|cool|wow|oh|really|correct)/i.test(cleanText);

              const timeSinceLast = Date.now() - (lastMessageTimeRef.current || 0);

              dispatch({ type: 'STT_RESULT', text: cleanText, intent });

              // Trigger LLM if:
              // 1. Not too short OR
              // 2. Contains a meaningful conversational cue (even if short) OR
              // 3. It's been a while since the last message OR
              // 4. It's a question
              if (!isShort || hasMeaningfulCue || timeSinceLast > 5000 || cleanText.includes('?')) {
                  // Auto-Persona Orchestration
                  const activePersona = performOrchestrationRef.current(cleanText);

                  const communicationProfile = settingsRef.current.enablePersonalization !== false && !settingsRef.current.privacyMode
                      ? await getCommunicationProfileSummary()
                      : "";

                  const insightCategoryScores = settingsRef.current.enablePersonalization !== false && !settingsRef.current.privacyMode
                      ? await getInsightCategoryScores()
                      : {};

                  newWorker.postMessage({
                      type: 'llm',
                      text: cleanText,
                      history: historyRef.current,
                      persona: activePersona,
                      culturalContext: stateRef.current.culturalContext,
                      communicationProfile,
                      insightCategoryScores,
                      metadata,
                      preferences: prefsCache.current,
                      settings: settingsRef.current,
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
              // Calculate Suggestion Latency (SL)
              if (lastMessageTimeRef.current) {
                const sl = Date.now() - lastMessageTimeRef.current;
                performanceMonitor.recordValue('suggestionLatency', sl);
              }

              stickyIntentRef.current = { intent: null, timestamp: 0 };
              const enhanced = await enhanceResponse(
                text,
                stateRef.current.persona,
                emotionData,
                stateRef.current.transcript,
                historyRef.current
              );
              dispatch({
                type: 'LLM_RESULT',
                text: enhanced,
                emotionData,
                coachingInsights: event.data.coachingInsights
              });

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
              // Check if this is a fallback failure that we can handle gracefully
              if (isFallbackFailed) {
                // For fallback failures, we can still continue with reduced functionality
                console.warn("Model fallback failed, continuing with reduced functionality:", event.data.error);
                dispatch({ type: 'SET_STATUS', status: 'Running in reduced functionality mode' });
                retryCountRef.current = 0; // Reset retry counter on fallback success
                setIsRetryingState(false); // Reset retrying state
              } else if (event.data.error && event.data.error.includes('Speech recognition')) {
                // Handle STT-specific errors gracefully
                console.warn("STT error, continuing with reduced functionality:", event.data.error);
                dispatch({ type: 'SET_STATUS', status: 'Speech recognition unavailable - running in text-only mode' });
                setIsRetryingState(false); // Reset retrying state on STT error
              } else {
                dispatch({ type: 'SET_ERROR', error: event.data.error });
                setIsRetryingState(false); // Reset retrying state on general error
              }
              break;
          }
        } catch (err) {
          console.error("Error in worker message handler:", err);
          // Provide more specific error information
          let errorMessage = 'Main thread processing failed';
          if (err.message) {
            errorMessage += `: ${err.message}`;
          }
          if (err.stack) {
            console.error("Stack trace:", err.stack);
          }
          dispatch({ type: 'SET_ERROR', error: errorMessage });
        }
      };

      newWorker.postMessage({ type: 'load' });
    } catch {
      dispatch({ type: 'SET_ERROR', error: 'Worker creation failed' });
    }
  }, [addMessage, setSentiment, updateLastMessageTime, prefsCache]); // Optimized: No 'settings' dependency to avoid worker reload on UI changes

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
    if (!state.isReady || state.isProcessing || !worker.current) {
      // If STT is not available due to previous error, show appropriate status
      if (!state.isReady && state.error && state.error.includes('Speech recognition')) {
        dispatch({ type: 'SET_STATUS', status: 'Speech recognition unavailable - running in text-only mode' });
      }
      return;
    }
    dispatch({ type: 'START_STT' });
    worker.current.postMessage({
      type: 'stt',
      audio: audioBuffer,
      settings: settingsRef.current
    }, [audioBuffer.buffer]);
  }, [state.isReady, state.isProcessing, state.error]);

  const refreshSuggestion = useCallback(async () => {
    if (!state.transcript || state.isProcessing || !worker.current) return;
    dispatch({ type: 'SET_STATUS', status: 'Refreshing cue...' });

    let preferences = prefsCache.current;
    if (settingsRef.current.enablePersonalization === false || settingsRef.current.privacyMode) {
        preferences = {
          preferredLength: 'medium',
          preferredTone: 'balanced',
          preferredStyle: 'adaptive',
          responsePatterns: [],
          avoidPatterns: []
        };
    }

    const communicationProfile = settingsRef.current.enablePersonalization !== false && !settingsRef.current.privacyMode
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
      settings: settingsRef.current,
      taskId: `refresh-${Date.now()}`
    });
  }, [state.transcript, state.isProcessing, history, state.persona, state.culturalContext, prefsCache]); // Optimized: No 'settings' dependency

  // Track retry attempts to prevent infinite retries
  const retryCountRef = useRef(0);
  const maxRetryAttempts = 3; // Maximum number of retry attempts
  const [isRetrying, setIsRetryingState] = useState(false);

  const retrySTTLoad = useCallback(() => {
    if (!worker.current) return;

    // Check if we've exceeded the maximum retry attempts
    if (retryCountRef.current >= maxRetryAttempts) {
      dispatch({
        type: 'SET_STATUS',
        status: `Maximum retry attempts (${maxRetryAttempts}) reached. Speech recognition unavailable.`
      });
      dispatch({
        type: 'SET_ERROR',
        error: `Speech recognition unavailable after ${maxRetryAttempts} attempts. Please refresh the page or check your connection.`
      });
      return;
    }

    // Increment retry count
    retryCountRef.current += 1;

    // Set retrying state
    setIsRetryingState(true);

    // Reset error state before attempting to reload
    dispatch({ type: 'SET_STATUS', status: `Retrying to load Speech Engine... (${retryCountRef.current}/${maxRetryAttempts})` });
    dispatch({ type: 'SET_ERROR', error: null });

    // Send a message to the worker to attempt reloading STT
    worker.current.postMessage({
      type: 'retry_stt_load',
      taskId: `retry-${Date.now()}`
    });
  }, [dispatch, maxRetryAttempts, setIsRetryingState]);

  return {
    ...state,
    history,
    conversationTurns,
    conversationSentiment,
    processAudio,
    refreshSuggestion,
    retrySTTLoad, // Add the retry function to the returned object
    isRetrying, // Add the retrying state to the returned object
    prewarmLLM: () => {
      if (!worker.current) return;
      worker.current.postMessage({ type: 'prewarm_llm' });

      // Also pre-warm the system prompt immediately if we're ready
      if (stateRef.current.isReady) {
        prewarmSystemPrompt();
      }
    },
    setTranscript: (text) => dispatch({ type: 'SET_TRANSCRIPT', text }),
    setSuggestion: (text) => dispatch({ type: 'SET_SUGGESTION', text }),
    setStatus: (status) => dispatch({ type: 'SET_STATUS', status }),
    setPersona: (persona) => {
      handleManualPersonaChange(persona);
      updatePersona(persona);
    },
    setCulturalContext: updateCulturalContext,
    clearHistory: () => {
      clearHistory();
      dispatch({ type: 'CLEAR_INTERACTION' });
    },
    resetWorker: initWorker,
    settings: settings,
    lastSwitchReason,
    undoPersonaSwitch
  };
};