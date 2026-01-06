import { useState, useEffect, useRef, useCallback } from 'react';

export const useMLWorker = () => {
  const [status, setStatus] = useState('Initializing Models...');
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
        const { type, text, status: workerStatus, error } = e.data;
        console.log("Worker message:", type, workerStatus || text || error);
        
        switch (type) {
          case 'status':
            setStatus(workerStatus);
            break;
          case 'ready':
            setIsReady(true);
            setStatus('Ready');
            break;
          case 'stt_result':
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
      setStatus('Worker Creation Failed');
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
    worker.current.postMessage({ 
      type: 'stt', 
      audio: audioBuffer,
      taskId: `stt-${Date.now()}` 
    });
  }, [isReady, isProcessing]);

  return {
    status,
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
