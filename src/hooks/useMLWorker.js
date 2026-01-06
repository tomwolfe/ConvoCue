/**
 * @typedef {import('../types/index').MLWorkerType} MLWorkerType
 * @typedef {import('../types/index').AudioMetadata} AudioMetadata
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { AppConfig } from '../config';
import { manageConversationHistory } from '../utils/conversation';
import { enhanceResponse } from '../utils/responseEnhancement';
import { sanitizeAndTruncate } from '../utils/sanitization';
import {
  getPreferences,  savePreferences,
  getSelectedCulturalContext,
  setSelectedCulturalContext as saveCulturalContext,
  getUserPreferences,
  getDislikedPhrases
} from '../utils/preferences';

/**
 * Custom hook for managing ML worker operations
 * @returns {MLWorkerType} ML worker state and methods
 */
export const useMLWorker = () => {
  const [status, setStatus] = useState('Initializing Models...');
  const [progress, setProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [emotionData, setEmotionData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('none'); 
  const [history, setHistory] = useState([]);
  
  const [persona, setPersona] = useState(() => {
    const prefs = getPreferences();
    return prefs.preferredPersona || 'anxiety';
  });

  const [culturalContext, setCulturalContext] = useState(() => {
    return getSelectedCulturalContext();
  });
  
  const worker = useRef(null);
  const historyRef = useRef([]);
  const personaRef = useRef(persona);
  const culturalContextRef = useRef(culturalContext);
  const transcriptRef = useRef(transcript);

  // Sync refs with state
  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    personaRef.current = persona;
  }, [persona]);

  useEffect(() => {
    culturalContextRef.current = culturalContext;
  }, [culturalContext]);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

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
            break;
          case 'stt_result': {
            const { metadata } = e.data;
            if (!text || text.trim().length === 0) {
              setIsProcessing(false);
              setProcessingStep('none');
              setStatus('Ready');
              break;
            }

            const sanitizedTranscript = text.trim().substring(0, AppConfig.system.maxTranscriptLength);
            setTranscript(sanitizedTranscript);
            transcriptRef.current = sanitizedTranscript;

            if (sanitizedTranscript.trim().length > 1) {
              setStatus('Analyzing social cue...');
              setProcessingStep('thinking');
              setSuggestion(''); 
              
              const currentHistory = [...historyRef.current, { role: 'user', content: sanitizedTranscript }];
              const nextHistory = manageConversationHistory(currentHistory, AppConfig.system.maxHistoryLength || 6);

              setHistory(nextHistory);

                          newWorker.postMessage({
                            type: 'llm',
                            text: sanitizedTranscript,
                            persona: personaRef.current,
                            culturalContext: culturalContextRef.current,
                            history: nextHistory,
                            metadata,
                            preferences: getUserPreferences(),
                            taskId: `llm-${Date.now()}`
                          });
                          } else {
                            setIsProcessing(false);
                            setStatus('Ready');
                          }
                          break;
                        }
                          const rawSuggestion = text ? text.trim() : '';
                          const emotion = e.data.emotionData || null;
                          setEmotionData(emotion);
              
                          const enhancedSuggestion = enhanceResponse(
                            rawSuggestion, 
                            personaRef.current, 
                            emotion, 
                            transcriptRef.current, 
                            getUserPreferences(), 
                            getDislikedPhrases()
                          );
                          
                          // Sanitize final output for rendering
                          const sanitizedSuggestion = sanitizeAndTruncate(enhancedSuggestion, AppConfig.system.maxSuggestionLength);
                          setSuggestion(sanitizedSuggestion);
            setIsProcessing(false);
            setProcessingStep('none');
            setStatus('Ready');

            if (enhancedSuggestion) {
              setHistory(prev => {
                const updatedHistory = [...prev, { role: 'assistant', content: enhancedSuggestion }];
                return manageConversationHistory(updatedHistory, AppConfig.system.maxHistoryLength || 6);
              });
            }

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
            break;
          case 'error':
            console.error("Worker Logic Error:", error);
            setStatus(`Model Error: ${error}`);
            setIsProcessing(false);
            setProcessingStep('none');
            setIsReady(false); 
            break;
          case 'cleanup_complete':
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
          setIsReady(false);
        }, 0);
      };

      newWorker.postMessage({ type: 'load', taskId: 'initial-load' });
    } catch (err) {
      console.error("Failed to create worker:", err);
      setTimeout(() => {
        setStatus('Could not create background worker');
      }, 0);
    }
  }, []); // Removed persona, culturalContext, transcript dependencies

  const cleanupWorker = useCallback(() => {
    if (worker.current) {
      worker.current.postMessage({ type: 'cleanup', taskId: `cleanup-${Date.now()}` });
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

    if (!audioBuffer) {
      setStatus('Invalid audio input');
      return;
    }

    setIsProcessing(true);
    setProcessingStep('transcribing');
    setStatus('Transcribing...');

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
        persona,
        culturalContext,
        history: historyRef.current,
        preferences: getUserPreferences(),
        taskId: `llm-refresh-${Date.now()}`
      });
    }
  }, [transcript, isProcessing, persona, culturalContext]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setTranscript('');
    setSuggestion('');
  }, []);

  const updatedSetPersona = useCallback((newPersona) => {
    setPersona(newPersona);
    savePreferences({ preferredPersona: newPersona });
  }, []);

  const setCulturalContextFromUI = useCallback((newCulturalContext) => {
    setCulturalContext(newCulturalContext);
    saveCulturalContext(newCulturalContext);
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