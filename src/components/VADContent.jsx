import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useMicVAD } from '@ricky0123/vad-react';
import { Mic, Heart, Loader2, AlertCircle, RefreshCw, Trash2 } from 'lucide-react';

const VADContent = ({ 
  status, 
  progress,
  isReady, 
  transcript, 
  suggestion, 
  isProcessing, 
  processAudio, 
  setTranscript, 
  setSuggestion, 
  setStatus,
  initialError
}) => {
  const [isVADMode, setIsVADMode] = useState(false);
  const [vadError, setVadError] = useState(initialError);
  
  // Use refs to avoid stale closures in VAD callbacks without re-triggering useMicVAD
  const isVADModeRef = useRef(isVADMode);
  const processAudioRef = useRef(processAudio);
  
  useEffect(() => {
    isVADModeRef.current = isVADMode;
  }, [isVADMode]);

  useEffect(() => {
    processAudioRef.current = processAudio;
  }, [processAudio]);

  const vadRef = useRef(null);

  const handleClear = () => {
    setTranscript('');
    setSuggestion('');
    if (!isProcessing) setStatus('Ready');
  };

  // Define stable callbacks for VAD
  const onSpeechEnd = useCallback((audio) => {
    console.log("Speech ended");
    if (!isVADModeRef.current && vadRef.current) {
      vadRef.current.pause();
    }
    if (processAudioRef.current) {
      processAudioRef.current(audio);
    }
  }, []);

  const onError = useCallback((err) => {
    console.error("VAD Error:", err);
    setVadError(err?.message || String(err));
  }, []);

  const onVADReady = useCallback(() => {
    setVadError(null);
  }, []);

  const onSpeechStart = useCallback(() => {
    setStatus('Listening...');
  }, [setStatus]);

  // VAD Implementation
  const vad = useMicVAD({
    startOnLoad: false,
    onSpeechStart,
    onSpeechEnd,
    onVADReady,
    onError,
    workletURL: "/vad.worklet.bundle.min.js",
    modelURL: "/silero_vad.onnx",
    positiveSpeechThreshold: 0.55,
    negativeSpeechThreshold: 0.35,
    minSpeechFrames: 4,
  });

  useEffect(() => {
    vadRef.current = vad;
  }, [vad]);

  const toggleVAD = () => {
    if (!vad || vad.loading || vad.errored) return;
    if (isVADMode) {
      vad.pause();
      setIsVADMode(false);
      setStatus('Ready');
    } else {
      handleClear();
      vad.start();
      setIsVADMode(true);
      setStatus('Heartbeat Active');
    }
  };

  const handleManualTrigger = () => {
    if (!vad || vad.loading || vad.errored) return;
    if (vad.listening && !isVADMode) {
      vad.pause();
      setStatus('Ready');
    } else {
      handleClear();
      vad.start();
      setStatus('Listening...');
    }
  };

  return (
    <main className="vad-container">
      <div className={`status-badge ${isProcessing || vad.loading || vad.errored || vadError ? 'processing' : ''} ${vad.errored || vadError ? 'error' : ''}`}>
        {isProcessing || (vad.loading && !vad.errored && !vadError) ? (
          <Loader2 className="animate-spin" size={16} />
        ) : (vad.errored || vadError) ? (
          <AlertCircle size={16} />
        ) : (
          <div className="dot" />
        )}
        <span>
          {(vad.errored || vadError) ? `Mic Error` : (vad.loading ? "Warming up..." : status)}
        </span>
      </div>

      <div className="display-area">
        <div className={`card transcript ${transcript ? 'visible' : ''}`}>
          <div className="card-header">
            <label>You said</label>
            {transcript && <button className="btn-icon" onClick={handleClear}><Trash2 size={14} /></button>}
          </div>
          <p>{transcript || "Waiting for speech..."}</p>
        </div>
        
        <div className={`card suggestion ${suggestion ? 'visible' : ''}`}>
          <label>Social Cue</label>
          <p>{suggestion || "AI Brain is pondering..."}</p>
          {isProcessing && !suggestion && (
             <div className="thinking-dots">
               <span>.</span><span>.</span><span>.</span>
             </div>
          )}
        </div>
      </div>

      <div className="controls">
        <button 
          className={`btn-control pulse-btn ${vad.listening && !isVADMode ? 'active' : ''}`}
          onClick={handleManualTrigger}
          disabled={!isReady || isVADMode || vad.loading || vad.errored || !!vadError}
          title="Manual Trigger"
        >
          <div className="icon-circle">
            <Mic size={28} />
          </div>
          <span>Pulse</span>
        </button>

        <button 
          className={`btn-control heartbeat-btn ${isVADMode ? 'active' : ''}`}
          onClick={toggleVAD}
          disabled={!isReady || vad.loading || vad.errored || !!vadError}
          title="Continuous Mode"
        >
          <div className="icon-circle">
            <Heart size={28} fill={isVADMode ? "white" : "none"} />
          </div>
          <span>Heartbeat</span>
        </button>
      </div>
      
      {(vad.errored || vadError) && (
        <div className="error-recovery">
          <p>{vadError || "Microphone access error"}</p>
          <button className="btn-retry" onClick={() => window.location.reload()}>
            <RefreshCw size={18} />
            Try Again
          </button>
        </div>
      )}
    </main>
  );
};

export default VADContent;
