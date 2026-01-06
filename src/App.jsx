import React, { useState } from 'react';
import { Mic, Loader2, Volume2, AlertCircle } from 'lucide-react';
import { useMLWorker } from './hooks/useMLWorker';
import VADContent from './components/VADContent';

import './App.css';

const App = () => {
  const [hasInteracted, setHasInteracted] = useState(false);
  const {
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
  } = useMLWorker();

  const [micPermissionError, setMicPermissionError] = useState(null);

  const handleStart = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setHasInteracted(true);
    } catch (err) {
      console.error("Initial microphone check failed:", err);
      setMicPermissionError(err.message || String(err));
      setHasInteracted(true);
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

      {!hasInteracted ? (
        <main className="initial-screen">
          <div className={`status-badge ${!isReady ? 'processing' : ''}`}>
            {!isReady ? <Loader2 className="animate-spin" size={16} /> : <div className="dot" />}
            <span>{status}</span>
          </div>
          
          <div className="setup-card">
            <div className="progress-display">
              <div className="progress-ring">
                <svg viewBox="0 0 100 100">
                  <circle className="bg" cx="50" cy="50" r="45" />
                  <circle 
                    className="fg" 
                    cx="50" 
                    cy="50" 
                    r="45" 
                    style={{ strokeDashoffset: 282.7 - (282.7 * progress) / 100 }}
                  />
                </svg>
                <div className="progress-text">{progress}%</div>
              </div>
            </div>

            <h2>Ready to tune in?</h2>
            <p>ConvoCue needs your microphone to analyze social cues in real-time. All processing happens locally on your device.</p>

            <button 
              className={`btn-main ${!isReady ? 'disabled' : 'pulse'}`}
              onClick={handleStart}
              disabled={!isReady}
            >
              <Mic size={24} />
              <span>Enable Microphone</span>
            </button>
          </div>
          
          {micPermissionError && (
            <div className="error-box">
              <AlertCircle size={20} />
              <p>Microphone access denied: {micPermissionError}</p>
            </div>
          )}
        </main>
      ) : (
        <VADContent 
          status={status}
          progress={progress}
          isReady={isReady}
          transcript={transcript}
          suggestion={suggestion}
          isProcessing={isProcessing}
          processAudio={processAudio}
          setTranscript={setTranscript}
          setSuggestion={setSuggestion}
          setStatus={setStatus}
          initialError={micPermissionError}
        />
      )}
    </div>
  );
};

export default App;
