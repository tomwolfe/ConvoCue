import React, { useState } from 'react';
import { useMicVAD } from '@ricky0123/vad-react';
import { Mic, Heart, Loader2, Volume2 } from 'lucide-react';
import { useMLWorker } from './hooks/useMLWorker';

import './App.css';

const App = () => {
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

  const [isVADMode, setIsVADMode] = useState(false);

  // VAD Implementation
  const vad = useMicVAD({
    startOnLoad: false,
    onSpeechEnd: (audio) => {
      processAudio(audio);
    },
    workletURL: "/vad.worklet.bundle.min.js",
    modelURL: "/silero_vad.onnx",
  });

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
        <div className={`status-badge ${isProcessing ? 'processing' : ''}`}>
          {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <div className="dot" />}
          <span>{status}</span>
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
            disabled={!isReady || isVADMode}
          >
            <div className="icon-circle">
              <Mic size={28} />
            </div>
            <span>Pulse-to-Listen</span>
          </button>

          <button 
            className={`btn-heartbeat ${isVADMode ? 'active' : ''}`}
            onClick={toggleVAD}
            disabled={!isReady}
          >
            <div className="icon-circle">
              <Heart size={28} fill={isVADMode ? "white" : "none"} />
            </div>
            <span>Heartbeat Mode</span>
          </button>
        </div>
      </main>
    </div>
  );
};

export default App;
