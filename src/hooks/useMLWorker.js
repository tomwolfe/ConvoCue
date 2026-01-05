import { useState, useEffect, useRef, useCallback } from 'react';

export const useMLWorker = () => {
  const [status, setStatus] = useState('Initializing Models...');
  const [isReady, setIsReady] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const worker = useRef(null);

  useEffect(() => {
    worker.current = new Worker(new URL('../worker.js', import.meta.url), {
      type: 'module'
    });

    worker.current.onmessage = (e) => {
      const { type, text, status: workerStatus, error } = e.data;
      
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
            worker.current.postMessage({ type: 'llm', text });
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
          console.error(error);
          setStatus('Error: ' + error);
          setIsProcessing(false);
          break;
        default:
          break;
      }
    };

    worker.current.postMessage({ type: 'load' });

    return () => {
      if (worker.current) {
        worker.current.terminate();
      }
    };
  }, []);

  const processAudio = useCallback((audioBuffer) => {
    if (!isReady || isProcessing) return;
    setIsProcessing(true);
    setStatus('Transcribing...');
    worker.current.postMessage({ type: 'stt', audio: audioBuffer });
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
