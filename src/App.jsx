import React, { useState } from 'react';
import { Mic, Loader2, Volume2, AlertCircle } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { useMLWorker } from './hooks/useMLWorker';
import VADContent from './components/VADContent';
import ErrorBoundary from './ErrorBoundary';
import { AppConfig } from './config';

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
    setStatus,
    resetWorker
  } = useMLWorker();

  const [micPermissionError, setMicPermissionError] = useState(null);

  const handleStart = async () => {
    console.log("User clicked start. Transitioning to VAD content.");
    setMicPermissionError(null);
    
    // On mobile, we want to be extra careful with memory spikes
    // A small delay allows any pending work to finish
    if (AppConfig.isMobile) {
      setStatus('Preparing Social Brain...');
      setTimeout(() => {
        setHasInteracted(true);
      }, 300);
    } else {
      setHasInteracted(true);
    }
  };

  return (
    <ErrorBoundary>
      <Analytics />
      <div className="app-container" role="main" aria-label="ConvoCue Application">
        <header role="banner">
          <div className="logo-area">
            <Volume2 size={40} color="#6C5CE7" aria-hidden="true" />
            <h1>ConvoCue</h1>
          </div>
          <p className="subtitle">Real-time social validation</p>
        </header>

        {!hasInteracted ? (
          <main className="initial-screen">
            <div
              className={`status-badge ${!isReady ? 'processing' : ''}`}
              role="status"
              aria-live="polite"
            >
              {!isReady ? <Loader2 className="animate-spin" size={16} aria-hidden="true" /> : <div className="dot" aria-hidden="true" />}
              <span>{status}</span>
            </div>

            <div className="setup-card" role="region" aria-labelledby="setup-card-title">
              <div className="progress-display" role="progressbar" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100" aria-label="Model loading progress">
                <div className="progress-ring">
                  <svg viewBox="0 0 100 100" aria-hidden="true">
                    <circle className="bg" cx="50" cy="50" r="45" />
                    <circle
                      className="fg"
                      cx="50"
                      cy="50"
                      r="45"
                      style={{ strokeDashoffset: 282.7 - (282.7 * progress) / 100 }}
                    />
                  </svg>
                  <div className="progress-text" aria-live="polite">{progress}%</div>
                </div>
              </div>

              <h2 id="setup-card-title">Ready to tune in?</h2>
              <p>ConvoCue needs your microphone to analyze social cues in real-time. All processing happens locally on your device.</p>

              <button
                className={`btn-main ${!isReady ? 'disabled' : 'pulse'}`}
                onClick={handleStart}
                disabled={!isReady}
                aria-label="Enable Microphone"
                aria-describedby="setup-instruction"
              >
                <Mic size={24} aria-hidden="true" />
                <span>Enable Microphone</span>
              </button>
            </div>

            {micPermissionError && (
              <div className="error-box" role="alert" aria-live="assertive">
                <AlertCircle size={20} aria-hidden="true" />
                <p>Microphone access denied: {micPermissionError}</p>
              </div>
            )}
          </main>
        ) : (
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
            initialError={micPermissionError}
            onReset={() => {
              setHasInteracted(false);
              setMicPermissionError(null);
              resetWorker();
            }}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default App;
