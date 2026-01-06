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
      worker.current = new Worker(new URL('../worker.js', import.meta.url), {
        type: 'module'
      });

      worker.current.onmessage = (e) => {
        const { type, text, status: workerStatus, progress: workerProgress, error } = e.data;
        
        switch (type) {
          case 'status':
            setStatus(workerStatus);
            if (workerProgress !== undefined) {
              setProgress(workerProgress);
            }
            break;
          case 'ready':
            setIsReady(true);
            setProgress(100);
            setStatus('Ready');
            break;
          case 'stt_result':
            if (!text || text.trim().length === 0) {
              console.log("Empty transcription, resetting...");
              setIsProcessing(false);
              setStatus('Ready (Try speaking again)');
              break;
            }
            console.log("Transcription received:", text);
            setTranscript(text);
            if (text.trim().length > 2) {
              setStatus('Thinking...');
              worker.current.postMessage({ 
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
            if (navigator.vibrate) {
              navigator.vibrate(20);
            }
            break;
          case 'error':
            console.error("Worker Error:", error);
            setStatus('Error: ' + error);
            setIsProcessing(false);
            break;
          default:
            break;
        }
      };

      worker.current.onerror = (e) => {
        console.error("Worker Script Error:", e);
        setStatus('Worker Failed to Load');
      };

      worker.current.postMessage({ type: 'load', taskId: 'initial-load' });
    } catch (err) {
      console.error("Failed to create worker:", err);
      setTimeout(() => setStatus('Worker Creation Failed'), 0);
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
