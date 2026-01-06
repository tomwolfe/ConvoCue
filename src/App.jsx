import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useMicVAD } from '@ricky0123/vad-react';
import { Mic, Heart, Loader2, Volume2, AlertCircle, RefreshCw } from 'lucide-react';
import { useMLWorker } from './hooks/useMLWorker';

import './App.css';

const App = () => {
  const [hasInteracted, setHasInteracted] = useState(false);
  const {
    status,
    isReady,
    transcript,
    suggestion,
    isProcessing,
    processAudio,
    setTranscript,
    setSuggestion,
    setStatus
  } = useMLWorker();

  const handleStart = () => {
    setHasInteracted(true);
  };

  if (!hasInteracted) {
    return (
      <div className="app-container">
        <header>
          <div className="logo-area">
            <Volume2 size={40} color="#6C5CE7" />
            <h1>ConvoCue</h1>
          </div>
          <p className="subtitle">Real-time social validation</p>
        </header>
        <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', marginTop: '2rem' }}>
          <div className={`status-badge ${!isReady ? 'processing' : ''}`}>
            {!isReady ? <Loader2 className="animate-spin" size={16} /> : <div className="dot" />}
            <span>{status}</span>
          </div>
          <button 
            className="btn-pulse active" 
            onClick={handleStart}
            style={{ width: '220px', height: '220px', borderRadius: '50%', flexDirection: 'column' }}
            disabled={!isReady}
          >
            <div className="icon-circle" style={{ width: '80px', height: '80px' }}>
              <Mic size={40} />
            </div>
            <span style={{ fontSize: '1.1rem' }}>Initialize Microphone</span>
          </button>
          <p style={{ textAlign: 'center', opacity: 0.6, maxWidth: '300px' }}>
            Click to enable microphone access and start the social social cue analyzer.
          </p>
        </main>
      </div>
    );
  }

  return (
    <VADContent 
      status={status}
      isReady={isReady}
      transcript={transcript}
      suggestion={suggestion}
      isProcessing={isProcessing}
      processAudio={processAudio}
      setTranscript={setTranscript}
      setSuggestion={setSuggestion}
      setStatus={setStatus}
    />
  );
};

const VADContent = ({ 
  status, 
  isReady, 
  transcript, 
  suggestion, 
  isProcessing, 
  processAudio, 
  setTranscript, 
  setSuggestion, 
  setStatus 
}) => {
  const [isVADMode, setIsVADMode] = useState(false);
  const [vadError, setVadError] = useState(null);
  
  const isVADModeRef = useRef(isVADMode);
  useEffect(() => {
    isVADModeRef.current = isVADMode;
  }, [isVADMode]);

  const processAudioRef = useRef(processAudio);
  useEffect(() => {
    processAudioRef.current = processAudio;
  }, [processAudio]);

  const vadRef = useRef(null);

  // Define stable callbacks for VAD
  const onSpeechEnd = useCallback((audio) => {
    console.log("Speech ended, processing audio...");
    if (!isVADModeRef.current && vadRef.current) {
      vadRef.current.pause();
    }
    if (processAudioRef.current) {
      processAudioRef.current(audio);
    }
  }, []);

  const onError = useCallback((err) => {
    console.error("VAD Error Detail:", err);
    setVadError(err?.message || String(err) || "Unknown microphone error");
  }, []);

  const onVADReady = useCallback(() => {
    console.log("VAD is ready");
    setVadError(null);
  }, []);

  const onSpeechStart = useCallback(() => {
    console.log("Speech detected...");
    setStatus('Detected Speech...');
  }, [setStatus]);

  // VAD Implementation
  const vad = useMicVAD({
    startOnLoad: false,
    onSpeechStart,
    onSpeechEnd,
    onVADReady,
    onError,
    // Use local paths with cache-busting/absolute reference for Vite
    workletURL: "/vad.worklet.bundle.min.js",
    modelURL: "/silero_vad.onnx",
    positiveSpeechThreshold: 0.5,
    negativeSpeechThreshold: 0.35,
    minSpeechFrames: 3,
  });

  // Keep the ref updated for use in callbacks
  useEffect(() => {
    vadRef.current = vad;
  }, [vad]);

  // Supplemental error checking
  useEffect(() => {
    if (vad.errored && !vadError) {
      setVadError("Microphone access failed or was denied. Please check your browser settings.");
    }
  }, [vad.errored, vadError]);

  const toggleVAD = () => {
    if (!vad || vad.loading || vad.errored) return;
    if (isVADMode) {
      vad.pause();
      setIsVADMode(false);
      setStatus('Ready');
    } else {
      setSuggestion('');
      setTranscript('');
      vad.start();
      setIsVADMode(true);
      setStatus('Heartbeat Listening...');
    }
  };

  const handleManualTrigger = () => {
    if (!vad || vad.loading || vad.errored) return;
    if (vad.listening && !isVADMode) {
      vad.pause();
      setStatus('Ready');
    } else {
      setSuggestion('');
      setTranscript('');
      vad.start();
      setStatus('Listening...');
    }
  };

  return (
    <div className="app-container">
      <header>
        <div className="logo-area">
          <Volume2 size={40} color="#6C5CE7" />
          <h1>ConvoCue</h1>
        </div>
        <p className="subtitle">Real-time social validation</p>
      </header>

      <main>
        <div className={`status-badge ${isProcessing || vad.loading || vad.errored ? 'processing' : ''} ${vad.errored ? 'error' : ''}`}>
          {isProcessing || (vad.loading && !vad.errored) ? (
            <Loader2 className="animate-spin" size={16} />
          ) : vad.errored ? (
            <AlertCircle size={16} color="#FF7675" />
          ) : (
            <div className="dot" />
          )}
          <span>
            {vad.errored ? `Mic Error: ${vadError || "Check permissions"}` : (vad.loading ? "VAD Loading..." : status)}
          </span>
        </div>

        <div className="display-area">
          <div className={`card transcript ${transcript ? 'visible' : ''}`}>
            <label>Detected Speech</label>
            <p>{transcript || "Waiting for speech..."}</p>
          </div>
          
          <div className={`card suggestion ${suggestion ? 'visible' : ''}`}>
            <label>Social Cue</label>
            <p>{suggestion || "Analysis will appear here."}</p>
          </div>
        </div>

        <div className="controls">
          <button 
            className={`btn-pulse ${vad.listening && !isVADMode ? 'active' : ''}`}
            onClick={handleManualTrigger}
            disabled={!isReady || isVADMode || vad.loading || vad.errored}
          >
            <div className="icon-circle">
              <Mic size={28} />
            </div>
            <span>Pulse-to-Listen</span>
          </button>

          <button 
            className={`btn-heartbeat ${isVADMode ? 'active' : ''}`}
            onClick={toggleVAD}
            disabled={!isReady || vad.loading || vad.errored}
          >
            <div className="icon-circle">
              <Heart size={28} fill={isVADMode ? "white" : "none"} />
            </div>
            <span>Heartbeat Mode</span>
          </button>
        </div>
        
        {vad.errored && (
          <button 
            className="btn-retry"
            onClick={() => window.location.reload()}
            style={{ 
              marginTop: '2rem', 
              padding: '1rem 2rem', 
              borderRadius: '16px', 
              background: '#FF7675', 
              color: 'white', 
              border: 'none', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: 'bold',
              width: '100%'
            }}
          >
            <RefreshCw size={20} />
            Retry Microphone Access
          </button>
        )}
      </main>
    </div>
  );
};

export default App;
