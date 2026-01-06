import React, { useState, useRef, useEffect } from 'react';
import { useMicVAD } from '@ricky0123/vad-react';
import { Mic, Heart, Loader2, Volume2 } from 'lucide-react';
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
            onClick={() => setHasInteracted(true)}
            style={{ width: '220px', height: '220px', borderRadius: '50%', flexDirecton: 'column' }}
            disabled={!isReady}
          >
            <div className="icon-circle" style={{ width: '80px', height: '80px' }}>
              <Mic size={40} />
            </div>
            <span style={{ fontSize: '1.1rem' }}>Initialize Microphone</span>
          </button>
          <p style={{ textAlign: 'center', opacity: 0.6, maxWidth: '300px' }}>
            To comply with browser security, please click to enable microphone and social analysis.
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
  const isVADModeRef = useRef(isVADMode);
  
  useEffect(() => {
    isVADModeRef.current = isVADMode;
  }, [isVADMode]);

  const processAudioRef = useRef(processAudio);
  useEffect(() => {
    processAudioRef.current = processAudio;
  }, [processAudio]);

  const [vadError, setVadError] = useState(null);
  const vadRef = useRef(null);

  const vadOptions = React.useMemo(() => ({
    startOnLoad: false,
    onSpeechStart: () => {
      console.log("Speech detected...");
      setStatus('Detected Speech...');
    },
    onSpeechEnd: (audio) => {
      console.log("Speech ended, processing audio...");
      if (!isVADModeRef.current && vadRef.current) {
        vadRef.current.pause();
      }
      if (processAudioRef.current) {
        processAudioRef.current(audio);
      }
    },
    onVADReady: () => {
      console.log("VAD is ready");
      setVadError(null);
    },
    onError: (err) => {
      console.error("VAD Error:", err);
      setVadError(err.message || String(err));
    },
    workletURL: "https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.30/dist/vad.worklet.bundle.min.js",
    modelURL: "https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.30/dist/silero_vad.onnx",
    positiveSpeechThreshold: 0.5,
    negativeSpeechThreshold: 0.35,
    minSpeechFrames: 3,
  }), [setStatus]);

  const vad = useMicVAD(vadOptions);

  useEffect(() => {
    vadRef.current = vad;
  }, [vad]);

  const toggleVAD = () => {
    if (!vad) return;
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
    if (!vad) return;
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
        <div className={`status-badge ${isProcessing || vad.loading || vad.errored ? 'processing' : ''}`}>
          {isProcessing || (vad.loading && !vad.errored) ? <Loader2 className="animate-spin" size={16} /> : <div className="dot" />}
          <span>
            {vad.errored ? `Mic Error: ${vadError}` : (vad.loading ? "VAD Loading..." : status)}
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
            disabled={!isReady || isVADMode || vad.loading}
          >
            <div className="icon-circle">
              <Mic size={28} />
            </div>
            <span>Pulse-to-Listen</span>
          </button>

          <button 
            className={`btn-heartbeat ${isVADMode ? 'active' : ''}`}
            onClick={toggleVAD}
            disabled={!isReady || vad.loading}
          >
            <div className="icon-circle">
              <Heart size={28} fill={isVADMode ? "white" : "none"} />
            </div>
            <span>Heartbeat Mode</span>
          </button>
        </div>
        
        {vad.errored && (
          <button 
            onClick={() => window.location.reload()}
            style={{ marginTop: '2rem', padding: '0.5rem 1rem', borderRadius: '8px', background: '#FF7675', color: 'white', border: 'none', cursor: 'pointer' }}
          >
            Retry initialization
          </button>
        )}
      </main>
    </div>
  );
};

export default App;