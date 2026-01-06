import { useState, useEffect, useRef, useCallback } from 'react';

export const useMLWorker = () => {
  const [status, setStatus] = useState('Initializing Models...');
  const [progress, setProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const worker = useRef(null);

  useEffect(() => {
    console.log("Initializing worker...");
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
          case 'stt_result':
            if (!text || text.trim().length === 0) {
              console.log("Empty transcription, resetting...");
              setIsProcessing(false);
              setStatus('Ready');
              break;
            }
            console.log("Transcription received:", text);
            setTranscript(text);
            if (text.trim().length > 1) {
              setStatus('Analyzing social cue...');
              newWorker.postMessage({
                type: 'llm',
                text,
                taskId: `llm-${Date.now()}`
              });
            } else {
              setIsProcessing(false);
              setStatus('Ready');
            }
            break;
          case 'llm_result':
            setSuggestion(text);
            setIsProcessing(false);
            setStatus('Ready');
            // Haptic feedback if available
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate(20);
            }
            break;
          case 'error':
            console.error("Worker Logic Error:", error);
            setStatus(`Model Error: ${error}`);
            setIsProcessing(false);
            setIsReady(false); // Mark as not ready if critical error
            break;
          default:
            console.warn("Unknown worker message type:", type);
            break;
        }
      };

      newWorker.onerror = (e) => {
        console.error("Worker Script Error:", e);
        // Use setTimeout to avoid calling setState synchronously in effect
        setTimeout(() => {
          setStatus('Worker failed to initialize. Try refreshing.');
          setIsProcessing(false);
        }, 0);
      };

      newWorker.postMessage({ type: 'load', taskId: 'initial-load' });
    } catch (err) {
      console.error("Failed to create worker:", err);
      // Use setTimeout to avoid calling setState synchronously in effect
      setTimeout(() => {
        setStatus('Could not create background worker');
      }, 0);
    }

    return () => {
      if (worker.current) {
        worker.current.terminate();
      }
    };
  }, []);

  const processAudio = useCallback((audioBuffer) => {
    if (!isReady || isProcessing || !worker.current) return;
    setIsProcessing(true);
    setStatus('Transcribing...');
    
    // Use Transferables for zero-copy transfer of the audio buffer
    worker.current.postMessage({ 
      type: 'stt', 
      audio: audioBuffer,
      taskId: `stt-${Date.now()}` 
    }, [audioBuffer.buffer]);
  }, [isReady, isProcessing]);

  return {
    status,
    progress,
    isReady,
    transcript,
    suggestion,
    isProcessing,
    processAudio,
    setTranscript,
    setSuggestion,
    setStatus
  };
};
