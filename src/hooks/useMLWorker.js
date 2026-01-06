import { useState, useEffect, useRef, useCallback } from 'react';
import { AppConfig } from '../config';
import { manageConversationHistory } from '../utils/conversation';
import { enhanceResponse } from '../utils/responseEnhancement';

export const useMLWorker = () => {
  const [status, setStatus] = useState('Initializing Models...');
  const [progress, setProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [emotionData, setEmotionData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('none'); // 'none', 'transcribing', 'thinking'
  const [history, setHistory] = useState([]);
  const [persona, setPersona] = useState(() => {
    // Initialize with user's preferred persona from local storage
    try {
      const savedPreferences = localStorage.getItem('convocue_preferences');
      if (savedPreferences) {
        const preferences = JSON.parse(savedPreferences);
        return preferences.preferredPersona || 'anxiety';
      }
    } catch (e) {
      console.error('Error loading preferred persona:', e);
    }
    return 'anxiety';
  });

  const [culturalContext, setCulturalContext] = useState(() => {
    // Initialize with user's preferred cultural context from local storage
    // Check if localStorage is available (not available in test environments)
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('selectedCulturalContext') || 'general';
    }
    return 'general';
  });
  
  const worker = useRef(null);
  const historyRef = useRef([]);

  // Sync historyRef with history state
  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  const initWorker = useCallback(() => {
    console.log("Initializing worker...");
    if (worker.current) {
      worker.current.terminate();
    }

    try {
      const newWorker = new Worker(new URL('../worker.js', import.meta.url), {
        type: 'module'
      });
      worker.current = newWorker;

      newWorker.onmessage = (e) => {
        const { type, text, status: workerStatus, progress: workerProgress, error } = e.data;
        console.log(`Worker message received: ${type}`, { status: workerStatus, progress: workerProgress, error });

        switch (type) {
          case 'status':
            setStatus(workerStatus);
            if (workerProgress !== undefined) {
              setProgress(Math.round(workerProgress));
            }
            break;
          case 'ready':
            setIsReady(true);
            setProgress(100);
            setStatus('Ready');
            console.log("Worker signaled ready. Models are loaded.");
            break;
          case 'stt_result': {
            const { metadata } = e.data;
            if (!text || text.trim().length === 0) {
              console.log("Empty transcription, resetting...");
              setIsProcessing(false);
              setProcessingStep('none');
              setStatus('Ready');
              break;
            }

            // Validate and sanitize transcription
            const sanitizedTranscript = text.trim().substring(0, AppConfig.system.maxTranscriptLength);
            setTranscript(sanitizedTranscript);

            console.log("Transcription received:", sanitizedTranscript, "Metadata:", metadata);
            if (sanitizedTranscript.trim().length > 1) {
              setStatus('Analyzing social cue...');
              setProcessingStep('thinking');
              setSuggestion(''); // Clear suggestion before starting LLM
              
            // Use conversation management utility to maintain context with summarization
            const currentHistory = [...historyRef.current, { role: 'user', content: sanitizedTranscript }];
            const nextHistory = manageConversationHistory(currentHistory, AppConfig.system.maxHistoryLength || 6);

            setHistory(nextHistory);

            newWorker.postMessage({
              type: 'llm',
              text: sanitizedTranscript,
              persona: persona,
              culturalContext: culturalContext,
              history: nextHistory,
              metadata: metadata,
              taskId: `llm-${Date.now()}`
            });
            } else {
              setIsProcessing(false);
              setStatus('Ready');
            }
            break;
          }
          case 'llm_result': {
            // Validate and sanitize suggestion
            const sanitizedSuggestion = text ? text.trim().substring(0, AppConfig.system.maxSuggestionLength) : '';

            // Get emotion data from the message if available
            const emotion = e.data.emotionData || null;
            setEmotionData(emotion);

            // Enhance response based on user preferences and emotional context
            // Pass the current transcript to enhanceResponse for deeper context (e.g. professional insights)
            const enhancedSuggestion = enhanceResponse(sanitizedSuggestion, persona, emotion, transcript);

            setSuggestion(enhancedSuggestion);
            setIsProcessing(false);
            setProcessingStep('none');
            setStatus('Ready');

            // Add assistant turn to history using conversation management utility
            if (enhancedSuggestion) {
              setHistory(prev => {
                const updatedHistory = [...prev, { role: 'assistant', content: enhancedSuggestion }];
                return manageConversationHistory(updatedHistory, AppConfig.system.maxHistoryLength || 6);
              });
            }

            // Haptic feedback if available
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate(20);
            }
            break;
          }
          case 'llm_chunk': {
            if (text) {
              setSuggestion(prev => prev + text);
            }
            break;
          }
          case 'memory_warning':
            console.warn("Worker is running low on memory:", e.data.memoryInfo);
            // Optionally update UI to show a warning
            break;
          case 'error':
            console.error("Worker Logic Error:", error);
            setStatus(`Model Error: ${error}`);
            setIsProcessing(false);
            setProcessingStep('none');
            setIsReady(false); // Mark as not ready if critical error
            break;
          case 'cleanup_complete':
            console.log("Worker cleanup completed successfully");
            break;
          default:
            console.warn("Unknown worker message type:", type);
            break;
        }
      };

      newWorker.onerror = (e) => {
        console.error("Worker Script Error:", e);
        setTimeout(() => {
          setStatus('Worker failed to initialize. Try refreshing.');
          setIsProcessing(false);
          setIsReady(false); // Mark as not ready if worker fails
        }, 0);
      };

      newWorker.postMessage({ type: 'load', taskId: 'initial-load' });
    } catch (err) {
      console.error("Failed to create worker:", err);
      setTimeout(() => {
        setStatus('Could not create background worker');
      }, 0);
    }
  }, [persona, culturalContext]);

  // Cleanup function for worker termination
  const cleanupWorker = useCallback(() => {
    if (worker.current) {
      // Send cleanup command to worker to free model resources
      worker.current.postMessage({ type: 'cleanup', taskId: `cleanup-${Date.now()}` });

      // Wait a bit for cleanup to complete, then terminate
      setTimeout(() => {
        if (worker.current) {
          worker.current.terminate();
          worker.current = null;
        }
      }, 100);
    }
  }, []);

  useEffect(() => {
    initWorker();
    return () => {
      cleanupWorker();
    };
  }, [initWorker, cleanupWorker]);

  const processAudio = useCallback((audioBuffer) => {
    if (!isReady || isProcessing || !worker.current) return;

    // Input validation
    if (!audioBuffer) {
      console.error("processAudio: audioBuffer is null or undefined");
      setStatus('Invalid audio input');
      return;
    }

    // Additional validation for audio buffer
    if (!(audioBuffer instanceof Float32Array) &&
        !(audioBuffer.buffer instanceof ArrayBuffer) &&
        !Array.isArray(audioBuffer)) {
      console.error("processAudio: Invalid audio buffer format");
      setStatus('Invalid audio format');
      return;
    }

    setIsProcessing(true);
    setProcessingStep('transcribing');
    setStatus('Transcribing...');

    // Use Transferables for zero-copy transfer of the audio buffer
    try {
      worker.current.postMessage({
        type: 'stt',
        audio: audioBuffer,
        taskId: `stt-${Date.now()}`
      }, [audioBuffer.buffer]);
    } catch (err) {
      console.error("Error sending audio to worker:", err);
      setIsProcessing(false);
      setStatus('Processing failed');
    }
  }, [isReady, isProcessing]);

  const prewarmLLM = useCallback(() => {
    if (worker.current && isReady) {
      worker.current.postMessage({ type: 'prewarm_llm', taskId: `prewarm-${Date.now()}` });
    }
  }, [isReady]);

  const refreshSuggestion = useCallback(() => {
    if (transcript && !isProcessing && worker.current) {
      setIsProcessing(true);
      setProcessingStep('thinking');
      setSuggestion('');
      setStatus('Refreshing cue...');
      
      worker.current.postMessage({
        type: 'llm',
        text: transcript,
        persona: persona,
        culturalContext: culturalContext,
        history: historyRef.current,
        taskId: `llm-refresh-${Date.now()}`
      });
    }
  }, [transcript, isProcessing, persona, culturalContext]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setTranscript('');
    setSuggestion('');
  }, []);

  const savePersonaPreference = useCallback((newPersona) => {
    try {
      let preferences = {};
      const savedPreferences = localStorage.getItem('convocue_preferences');
      if (savedPreferences) {
        preferences = JSON.parse(savedPreferences);
      }
      preferences.preferredPersona = newPersona;
      localStorage.setItem('convocue_preferences', JSON.stringify(preferences));
    } catch (e) {
      console.error('Error saving persona preference:', e);
    }
  }, []);

  const updatedSetPersona = useCallback((newPersona) => {
    setPersona(newPersona);
    savePersonaPreference(newPersona);
  }, [savePersonaPreference]);

  const setCulturalContextFromUI = useCallback((newCulturalContext) => {
    setCulturalContext(newCulturalContext);
    localStorage.setItem('selectedCulturalContext', newCulturalContext);
  }, []);

  return {
    status,
    progress,
    isReady,
    transcript,
    suggestion,
    emotionData,
    isProcessing,
    processingStep,
    processAudio,
    prewarmLLM,
    refreshSuggestion,
    setTranscript,
    setSuggestion,
    setStatus,
    resetWorker: initWorker,
    history,
    setHistory,
    persona,
    setPersona: updatedSetPersona,
    culturalContext,
    setCulturalContext: setCulturalContextFromUI,
    clearHistory
  };
};