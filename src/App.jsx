import React, { useState } from 'react';
import { Mic, Loader2, Volume2, AlertCircle } from 'lucide-react';
import { useMLWorker } from './hooks/useMLWorker';
import VADContent from './components/VADContent';
import ErrorBoundary from './ErrorBoundary';

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
      // Explicitly request microphone access to ensure we have it
      // and to satisfy browser requirements for user gesture.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // We don't need to keep the stream here, VAD will request its own, 
      // but we need to stop this one so the light doesn't stay on unnecessarily
      stream.getTracks().forEach(track => track.stop());
      
      setHasInteracted(true);
      setMicPermissionError(null);
    } catch (err) {
      console.error("Microphone permission error:", err);
      let errorMessage = "Microphone access denied.";
      if (err.name === 'NotAllowedError') {
        errorMessage = "Microphone access was denied. Please enable it in your browser settings.";
      } else if (err.name === 'NotFoundError') {
        errorMessage = "No microphone found on your device.";
      } else {
        errorMessage = err.message || "An error occurred while accessing the microphone.";
      }
      setMicPermissionError(errorMessage);
    }
  };

  return (
    <ErrorBoundary>
      <div className="app-container" role="main" aria-label="ConvoCue Application">
        <header>
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

            <div className="setup-card">
              <div className="progress-display" role="progressbar" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100" aria-label="Model loading progress">
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
                aria-label="Enable Microphone"
              >
                <Mic size={24} aria-hidden="true" />
                <span>Enable Microphone</span>
              </button>
            </div>

            {micPermissionError && (
              <div className="error-box" role="alert">
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
            }}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default App;
