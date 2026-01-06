import { useState, useEffect, useRef, useCallback } from 'react';
import { AppConfig } from '../config';

export const useMLWorker = () => {
  const [status, setStatus] = useState('Initializing Models...');
  const [progress, setProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('none'); // 'none', 'transcribing', 'thinking'
  const [history, setHistory] = useState([]);
  const [persona, setPersona] = useState('social');
  
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

            console.log("Transcription received:", sanitizedTranscript);
            if (sanitizedTranscript.trim().length > 1) {
              setStatus('Analyzing social cue...');
              setProcessingStep('thinking');
              setSuggestion(''); // Clear suggestion before starting LLM
              
            // Maintain a sliding window of history to keep context relevant and within token limits
            // For a 135M model, keeping the last 5-6 turns is usually more effective than long summaries
            const currentHistory = [...historyRef.current, { role: 'user', content: sanitizedTranscript }];
            const nextHistory = currentHistory.slice(-6); // Keep last 6 messages

            setHistory(nextHistory);

            newWorker.postMessage({
              type: 'llm',
              text: sanitizedTranscript,
              persona: persona,
              history: nextHistory,
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
            setSuggestion(sanitizedSuggestion);
            setIsProcessing(false);
            setProcessingStep('none');
            setStatus('Ready');
            
            // Add assistant turn to history maintaining sliding window
            if (sanitizedSuggestion) {
              setHistory(prev => {
                const updatedHistory = [...prev, { role: 'assistant', content: sanitizedSuggestion }];
                return updatedHistory.slice(-6); // Maintain same window size
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
        }, 0);
      };

      newWorker.postMessage({ type: 'load', taskId: 'initial-load' });
    } catch (err) {
      console.error("Failed to create worker:", err);
      setTimeout(() => {
        setStatus('Could not create background worker');
      }, 0);
    }
  }, [persona]);

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

  const clearHistory = useCallback(() => {
    setHistory([]);
    setTranscript('');
    setSuggestion('');
  }, []);

  return {
    status,
    progress,
    isReady,
    transcript,
    suggestion,
    isProcessing,
    processingStep,
    processAudio,
    prewarmLLM,
    setTranscript,
    setSuggestion,
    setStatus,
    resetWorker: initWorker,
    history,
    setHistory,
    persona,
    setPersona,
    clearHistory
  };
};