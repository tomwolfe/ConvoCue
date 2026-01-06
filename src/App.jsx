import React, { useState, useEffect } from 'react';
import { Mic, Loader2, Volume2, AlertCircle, Activity, BookOpen, Settings } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { useMLWorker } from './hooks/useMLWorker';
import VADContent from './components/VADContent';
import Tutorial from './components/Tutorial';
import PersonaCustomization from './components/PersonaCustomization';
import ErrorBoundary from './ErrorBoundary';
import { AppConfig } from './config';
import { checkAssets } from './utils/diagnostics';
import { sanitizeAndTruncate, decodeHTMLEntities } from './utils/sanitization';
import { logError, validateInput } from './utils/errorHandling';
import {
  hasSeenTutorial,
  setTutorialSeen,
  saveCustomPersona,
  deleteCustomPersona as removeCustomPersona,
  getCustomPersonas
} from './utils/preferences';

import './App.css';

const App = () => {
  const [hasInteracted, setHasInteracted] = useState(false);
  const [assetError, setAssetError] = useState(null);
  const [isDyslexicFriendly, setIsDyslexicFriendly] = useState(false);
  const [isCompactMode, setIsCompactMode] = useState(false);
  const [isSubtleMode, setIsSubtleMode] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showPersonaCustomization, setShowPersonaCustomization] = useState(false);
  
  const {
    status,
    progress,
    isReady,
    transcript,
    suggestion,
    emotionData,
    isProcessing,
    processingStep,
    processAudio,
    prewarmLLM,
    refreshSuggestion,
    setTranscript,
    setSuggestion,
    setStatus,
    resetWorker,
    history,
    persona,
    setPersona,
    culturalContext,
    setCulturalContext,
    clearHistory
  } = useMLWorker();

  const [micPermissionError, setMicPermissionError] = useState(null);

  useEffect(() => {
    document.body.classList.toggle('dyslexic-mode', isDyslexicFriendly);
  }, [isDyslexicFriendly]);

  useEffect(() => {
    document.body.classList.toggle('compact-mode', isCompactMode);
  }, [isCompactMode]);

  useEffect(() => {
    document.body.classList.toggle('subtle-mode', isSubtleMode);
  }, [isSubtleMode]);

  useEffect(() => {
    if (!hasSeenTutorial()) {
      setShowTutorial(true);
    }

    const runDiagnostics = async () => {
      const result = await checkAssets();
      if (!result.allOk) {
        setAssetError(`Critical assets missing: ${result.missing.map(m => m.url.split('/').pop()).join(', ')}`);
      }
    };
    runDiagnostics();
  }, []);

  const handleStart = async () => {
    setMicPermissionError(null);
    prewarmLLM();

    if (AppConfig.isMobile) {
      setStatus('Preparing Social Brain...');
      setTimeout(() => setHasInteracted(true), 300);
    } else {
      setHasInteracted(true);
    }
  };

  const handleTutorialComplete = () => {
    setShowTutorial(false);
    setTutorialSeen();
  };

  const handleSavePersona = (newPersona) => {
    saveCustomPersona(newPersona);
    alert(`Persona "${newPersona.label}" saved successfully!`);
    setShowPersonaCustomization(false);
  };

  const handleDeletePersona = (personaId) => {
    removeCustomPersona(personaId);
    alert(`Persona deleted successfully!`);
  };

  return (
    <ErrorBoundary>
      <Analytics />
      <div className={`app-container ${isCompactMode ? 'compact-view' : ''}`} role="main" aria-label="ConvoCue Application">
        {showTutorial && (
          <Tutorial
            onComplete={handleTutorialComplete}
            isCompactMode={isCompactMode}
          />
        )}
        {showPersonaCustomization && (
          <PersonaCustomization
            isOpen={showPersonaCustomization}
            onClose={() => setShowPersonaCustomization(false)}
            personas={AppConfig.models.personas}
            onSavePersona={handleSavePersona}
            onDeletePersona={handleDeletePersona}
            currentPersona={persona}
            setCurrentPersona={setPersona}
          />
        )}
        <header role="banner" className={hasInteracted ? 'compact' : ''}>
          <div className="header-top">
            <div className="logo-area">
              <Volume2 size={hasInteracted ? 24 : 40} color="#6C5CE7" aria-hidden="true" />
              <h1>ConvoCue</h1>
            </div>
            <div className="header-actions">
              <button
                className={`btn-settings ${isCompactMode ? 'active' : ''}`}
                onClick={() => setIsCompactMode(!isCompactMode)}
                aria-label="Toggle Compact Mode"
                title="Toggle Compact Mode"
              >
                <Activity size={18} />
              </button>
              <button
                className={`btn-settings ${isSubtleMode ? 'active' : ''}`}
                onClick={() => setIsSubtleMode(!isSubtleMode)}
                aria-label="Toggle Subtle Mode"
                title="Toggle Subtle Mode"
              >
                <span className="subtle-icon">✨</span>
              </button>
              <button
                className="btn-settings"
                onClick={() => setShowTutorial(true)}
                aria-label="Show Tutorial"
                title="Show Tutorial"
              >
                <BookOpen size={18} />
              </button>
              <button
                className="btn-settings"
                onClick={() => setShowPersonaCustomization(true)}
                aria-label="Customize Personas"
                title="Customize Personas"
              >
                <Settings size={18} />
              </button>
              <button
                className={`btn-settings ${isDyslexicFriendly ? 'active' : ''}`}
                onClick={() => setIsDyslexicFriendly(!isDyslexicFriendly)}
                aria-label="Toggle Dyslexic Friendly Font"
                title="Toggle Dyslexic Friendly Font"
              >
                Abc
              </button>
            </div>
          </div>
          <p className="subtitle">Real-time social validation</p>
        </header>

        {!hasInteracted ? (
          <main className="initial-screen">
            <div className={`status-badge ${!isReady ? 'processing' : ''}`} role="status" aria-live="polite">
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
              >
                <Mic size={24} aria-hidden="true" />
                <span>Enable Microphone</span>
              </button>
            </div>

            {micPermissionError && (
              <div className="error-box" role="alert" aria-live="assertive">
                <AlertCircle size={20} aria-hidden="true" />
                <p>Microphone access denied: {decodeHTMLEntities(sanitizeAndTruncate(micPermissionError, 200))}</p>
              </div>
            )}

            {assetError && (
              <div className="error-box" role="alert" aria-live="assertive">
                <AlertCircle size={20} aria-hidden="true" />
                <p>{decodeHTMLEntities(sanitizeAndTruncate(assetError, 300))}. Please ensure all required files are in the public directory.</p>
              </div>
            )}
          </main>
        ) : (
          <VADContent
            status={status}
            isReady={isReady}
            transcript={transcript}
            suggestion={suggestion}
            emotionData={emotionData}
            isProcessing={isProcessing}
            processingStep={processingStep}
            processAudio={processAudio}
            refreshSuggestion={refreshSuggestion}
            setTranscript={setTranscript}
            setSuggestion={setSuggestion}
            setStatus={setStatus}
            initialError={micPermissionError}
            history={history}
            persona={persona}
            setPersona={setPersona}
            culturalContext={culturalContext}
            setCulturalContext={setCulturalContext}
            clearHistory={clearHistory}
            isCompactMode={isCompactMode}
            isSubtleMode={isSubtleMode}
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