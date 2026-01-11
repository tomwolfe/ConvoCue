import { useReducer, useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { AppConfig } from '../config';
import { generateUniqueId } from '../utils/idGenerator';
import { enhanceResponse } from '../utils/responseEnhancement';
import { useConversation } from './useConversation';
import { useAppPreferences } from './useAppPreferences';
import { getCommunicationProfileSummary, getMirroringBaselines, updateMirroringBaselines } from '../utils/personalization';
import { provideHapticFeedback, provideIntentHaptics } from '../utils/haptics';
import { detectIntentHighPerformance } from '../utils/intentRecognition';
import { getInsightCategoryScores } from '../utils/feedback';
import performanceMonitor from '../utils/performance';
import { calculateEngagement } from '../utils/engagement';
import { usePerformanceMonitor } from './usePerformanceMonitor';
import { usePersonaOrchestration } from './usePersonaOrchestration';
import { ML_STATES } from '../worker/MLStateMachine';

const initialState = {
  status: 'Initializing Models...', 
  progress: 0,
  isReady: false,
  isLowMemory: false,
  mlState: ML_STATES.UNINITIALIZED, // Track the ML state machine state
  sttFunctional: false,
  llmFunctional: false,
  retryCount: 0,
  maxRetries: 3,
  transcript: '',
  suggestion: '',
  detectedIntent: null,
  emotionData: null,
  coachingInsights: null,
  isProcessing: false,
  processingStep: 'none',
  error: null,
  persona: 'anxiety', // Default to 'anxiety' (Social Anxiety) as mentioned in tutorial
  culturalContext: 'general',
  sessionTone: null
};
// ... rest of the file ...

function workerReducer(state, action) {
  switch (action.type) {
    case 'RESET_STATE':
      return { 
        ...initialState, 
        persona: state.persona, 
        culturalContext: state.culturalContext 
      };
    case 'SET_STATUS':
      return { 
        ...state, 
        status: action.status, 
        progress: action.progress ?? state.progress,
        isLowMemory: action.isLowMemory ?? state.isLowMemory
      };
    case 'SET_SESSION_TONE':
      return { ...state, sessionTone: action.sessionTone };
    case 'SET_READY':
      return { 
        ...state, 
        isReady: true, 
        status: 'Ready', 
        progress: 100,
        // Sync with existing mlState if it's already a 'ready' state
        mlState: (state.mlState === ML_STATES.READY || 
                 state.mlState === ML_STATES.TEXT_ONLY_MODE || 
                 state.mlState === ML_STATES.STT_READY) 
          ? state.mlState 
          : ML_STATES.READY
      };
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
      return { 
        ...state, 
        isProcessing: false, 
        processingStep: 'none', 
        status: 'Ready'
      };
    case 'SET_ERROR':
      return { 
        ...state, 
        error: action.error, 
        status: action.error ? `Model Error: ${action.error}` : state.status, 
        isProcessing: false, 
        isReady: action.error ? false : state.isReady 
      };
    case 'SET_ML_STATE':
      return { 
        ...state, 
        mlState: action.mlState,
        sttFunctional: action.sttFunctional ?? state.sttFunctional,
        llmFunctional: action.llmFunctional ?? state.llmFunctional,
        retryCount: action.retryCount ?? state.retryCount,
        maxRetries: action.maxRetries ?? state.maxRetries
      };
    case 'CLEAR_INTERACTION':
      return { ...state, transcript: '', suggestion: '' };
    default:
      return state;
  }
}

export const useMLWorker = () => {  const [state, dispatch] = useReducer(workerReducer, initialState);
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
  
  const engagement = useMemo(() => 
    calculateEngagement(conversationTurns, { isGroupMode: settings.isGroupMode }), 
    [conversationTurns, settings.isGroupMode]
  );
  
  // Track retry UI states
  const [isRetrying, setIsRetryingState] = useState(false);
  const [isRetryingLLM, setIsRetryingLLMState] = useState(false);
  
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
      // Explicitly reset the React state before re-initializing the worker
      dispatch({ type: 'RESET_STATE' });
      setIsRetryingState(false);
      setIsRetryingLLMState(false);

      // Send terminate message to properly clean up the worker
      worker.current.postMessage({ type: 'terminate' });
      worker.current.terminate();
    }

    try {
      const newWorker = new Worker(new URL('../worker.js', import.meta.url), { type: 'module' });
      worker.current = newWorker;

      newWorker.onmessage = async (event) => {
        try {
          const { type, text, status, progress, metadata, emotionData, isLowMemory, isFallbackFailed, mlState, mlStateData } = event.data;

          // Update ML state if provided (prefer mlStateData if available)
          if (mlStateData) {
            dispatch({ 
              type: 'SET_ML_STATE', 
              mlState: mlStateData.state,
              sttFunctional: mlStateData.context.sttFunctional,
              llmFunctional: mlStateData.context.llmFunctional,
              retryCount: mlStateData.context.retryCount,
              maxRetries: mlStateData.context.maxRetries
            });
          } else if (mlState) {
            dispatch({ type: 'SET_ML_STATE', mlState });
          }

          switch (type) {
            case 'status':
              dispatch({ type: 'SET_STATUS', status, progress, isLowMemory });
              // Reset retry state when we get a success status
              if (status && (status.includes('Speech Engine loaded successfully') || status.includes('Ready'))) {
                setIsRetryingState(false);
              }
              if (status && status.includes('Social Brain loaded successfully')) {
                setIsRetryingLLMState(false);
              }
              break;
            case 'ready':
              dispatch({ type: 'SET_READY' });
              // If we have a status message in the ready event, update it
              if (status) {
                dispatch({ type: 'SET_STATUS', status });
              }
              setIsRetryingState(false);
              setIsRetryingLLMState(false);
              break;
            case 'mirroring_status':
              dispatch({ type: 'SET_SESSION_TONE', sessionTone: event.data.sessionTone });
              break;
            case 'stt_result': {
              if (!text?.trim()) {
                dispatch({ type: 'RESET_PROCESSING' });
                break;
              }
              const cleanText = text.trim();

              // Clear old session tone for the new turn
              dispatch({ type: 'SET_SESSION_TONE', sessionTone: null });

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

              // Update Mirroring Baselines
              const { rms, duration } = metadata || {};
              const wordCount = cleanText.split(/\s+/).filter(w => w.length > 0).length;
              const pace = duration > 0 ? wordCount / duration : 0;
              
              if (pace > 0) {
                await updateMirroringBaselines(pace, rms || 0);
              }
              
              const mirroringBaselines = await getMirroringBaselines();

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
                      mirroringBaselines, // Pass dynamic baselines
                      preferences: prefsCache.current,
                      settings: settingsRef.current,
                      taskId: generateUniqueId('llm')
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
                setIsRetryingState(false);
                setIsRetryingLLMState(false);
              } else if (event.data.error && event.data.error.includes('Speech recognition')) {
                // Handle STT-specific errors gracefully
                console.warn("STT error, continuing with reduced functionality:", event.data.error);
                dispatch({ type: 'SET_STATUS', status: 'Speech recognition unavailable - running in text-only mode' });
                setIsRetryingState(false);
              } else {
                dispatch({ type: 'SET_ERROR', error: event.data.error });
                setIsRetryingState(false);
                setIsRetryingLLMState(false);
              }
              break;
            case 'cleanup_complete':
              // Worker cleanup completed, terminate the worker reference
              if (worker.current) {
                worker.current.terminate();
                worker.current = null;
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

      // Handle worker errors
      newWorker.onerror = (error) => {
        console.error("Worker error:", error);
        dispatch({ type: 'SET_ERROR', error: `Worker error: ${error.message}` });
      };

      newWorker.postMessage({ type: 'load' });
    } catch (error) {
      console.error("Worker creation failed:", error);
      dispatch({ type: 'SET_ERROR', error: `Worker creation failed: ${error.message || 'Unknown error'}` });
    }
  }, [addMessage, setSentiment, updateLastMessageTime, prefsCache]); // Optimized: No 'settings' dependency to avoid worker reload on UI changes

  useEffect(() => {
    return () => {
      if (worker.current) {
        // Send terminate message to properly clean up the worker
        worker.current.postMessage({ type: 'terminate' });
        worker.current.terminate();
      }
    };
  }, []);

  const isInitialized = useRef(false);

  useEffect(() => {
    // IMPORTANT: The Web Worker initialization must happen exactly once on mount
    // or when explicitly reset. We use initWorker() which contains internal
    // cleanup logic (terminating old workers).
    //
    // The 'react-hooks/set-state-in-effect' warning is bypassed here
    // because initializing the worker and its associated state is a fundamental
    // lifecycle requirement for this application. We've ensured that initWorker
    // is stable (via useCallback) and its dependencies are also stable,
    // preventing infinite loops.
    if (!isInitialized.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      initWorker();
      isInitialized.current = true;
    }
  }, [initWorker]);

  const processAudio = useCallback((audioBuffer) => {
    // Check if we're in a state where audio processing is possible
    if (!state.isReady || state.isProcessing || !worker.current) {
      // Instead of setting status independently, rely on the state machine state
      // The UI should reflect the state machine state directly
      return;
    }
    dispatch({ type: 'START_STT' });
    worker.current.postMessage({
      type: 'stt',
      audio: audioBuffer,
      settings: settingsRef.current
    }, [audioBuffer.buffer]);
  }, [state.isReady, state.isProcessing]);

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

    const mirroringBaselines = await getMirroringBaselines();

    worker.current.postMessage({
      type: 'llm',
      text: state.transcript,
      history: history,
      persona: state.persona,
      culturalContext: state.culturalContext,
      communicationProfile,
      mirroringBaselines,
      preferences: preferences,
      settings: settingsRef.current,
      taskId: generateUniqueId('refresh')
    });
  }, [state.transcript, state.isProcessing, history, state.persona, state.culturalContext, prefsCache]); // Optimized: No 'settings' dependency

  const retrySTTLoad = useCallback(() => {
    if (!worker.current) return;

    // Check if we've exceeded the maximum retry attempts from state
    if (stateRef.current.retryCount >= stateRef.current.maxRetries) {
      dispatch({
        type: 'SET_STATUS',
        status: `Maximum retry attempts (${stateRef.current.maxRetries}) reached. Speech recognition unavailable.`
      });
      dispatch({
        type: 'SET_ERROR',
        error: `Speech recognition unavailable after ${stateRef.current.maxRetries} attempts. Please refresh the page or check your connection.`
      });
      return;
    }

    // Set retrying state
    setIsRetryingState(true);

    // Reset error state before attempting to reload
    dispatch({ type: 'SET_STATUS', status: `Retrying to load Speech Engine... (${stateRef.current.retryCount + 1}/${stateRef.current.maxRetries})` });
    dispatch({ type: 'SET_ERROR', error: null });

    // Send a message to the worker to attempt reloading STT
    worker.current.postMessage({
      type: 'retry_stt_load',
      taskId: generateUniqueId('retry')
    });
  }, [dispatch]);

  const retryLLMLoad = useCallback(() => {
    if (!worker.current) return;

    // Check if we've exceeded the maximum retry attempts from state
    if (stateRef.current.retryCount >= stateRef.current.maxRetries) {
      dispatch({
        type: 'SET_STATUS',
        status: `Maximum retry attempts (${stateRef.current.maxRetries}) reached. AI model unavailable.`
      });
      dispatch({
        type: 'SET_ERROR',
        error: `AI model unavailable after ${stateRef.current.maxRetries} attempts. Please refresh the page or check your connection.`
      });
      return;
    }

    // Set retrying state
    setIsRetryingLLMState(true);

    // Reset error state before attempting to reload
    dispatch({ type: 'SET_STATUS', status: `Retrying to load Social Brain... (${stateRef.current.retryCount + 1}/${stateRef.current.maxRetries})` });
    dispatch({ type: 'SET_ERROR', error: null });

    // Send a message to the worker to attempt reloading LLM
    worker.current.postMessage({
      type: 'retry_llm_load',
      taskId: generateUniqueId('retry-llm')
    });
  }, [dispatch]);

  return {
    ...state,
    history,
    conversationTurns,
    conversationSentiment,
    engagement,
    processAudio,
    refreshSuggestion,
    retrySTTLoad, // Add the retry function to the returned object
    retryLLMLoad, // Add the LLM retry function to the returned object
    isRetrying, // Add the STT retrying state to the returned object
    isRetryingLLM, // Add the LLM retrying state to the returned object
    sttFunctional: state.sttFunctional,
    llmFunctional: state.llmFunctional,
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