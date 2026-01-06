import React, { useState } from 'react';
import { Mic, Loader2, Volume2 } from 'lucide-react';
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
        <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', marginTop: '2rem' }}>
          <div className={`status-badge ${!isReady ? 'processing' : ''}`}>
            {!isReady ? <Loader2 className="animate-spin" size={16} /> : <div className="dot" />}
            <span>{status}</span>
          </div>
          {!isReady && (
            <div className="progress-container">
              <div className="progress-bar" style={{ width: `${progress}%` }} />
            </div>
          )}
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
            Click to enable microphone access and start the social cue analyzer.
          </p>
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
