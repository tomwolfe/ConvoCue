import React, { useState, useEffect } from 'react';
import { Mic, Loader2, Volume2, AlertCircle, Activity, ThumbsUp, ThumbsDown, BookOpen, Settings as SettingsIcon, Layout as LayoutIcon, ChevronDown, EyeOff, Type, ShieldAlert, Zap, Info } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { useMLWorker } from './hooks/useMLWorker';
import VADContent from './components/VADContent';
import Tutorial from './components/Tutorial';
import PersonaCustomization from './components/PersonaCustomization';
import PrivacyConsent from './components/PrivacyConsent';
import AppSettings from './components/Settings';
import ErrorBoundary from './ErrorBoundary';
import { AppConfig } from './config';
import { checkAssets } from './utils/diagnostics';
import { secureLocalStorageGet, secureLocalStorageSet } from './utils/encryption';
import { handleSessionEnd } from './utils/privacyHardening';

import './App.css';

import { getMergedPersonas } from './utils/preferences';

const App = () => {
  const [hasInteracted, setHasInteracted] = useState(false);
  const [assetError, setAssetError] = useState(null);
  const [isDyslexicFriendly, setIsDyslexicFriendly] = useState(false);
  const [isCompactMode, setIsCompactMode] = useState(false);
  const [isSubtleMode, setIsSubtleMode] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showPersonaCustomization, setShowPersonaCustomization] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [availablePersonas, setAvailablePersonas] = useState(AppConfig.models.personas);

  useEffect(() => {
    // Session cleanup on mount/unmount
    window.addEventListener('beforeunload', handleSessionEnd);
    return () => {
      window.removeEventListener('beforeunload', handleSessionEnd);
      handleSessionEnd();
    };
  }, []);

  useEffect(() => {
    const loadPersonas = async () => {
      const merged = await getMergedPersonas();
      setAvailablePersonas(merged);
    };
    loadPersonas();
  }, [showPersonaCustomization]);

  useEffect(() => {
    const checkTutorial = async () => {
      const seen = await secureLocalStorageGet('convocue_tutorial_seen');
      if (!seen) setShowTutorial(true);
    };
    checkTutorial();
  }, []);
  const {
    status,
    progress,
    isReady,
    isLowMemory,
    mlState,
    error,
    transcript,
    suggestion,
    detectedIntent,
    emotionData,
    coachingInsights,
    isProcessing,
    processingStep,
    processAudio,
    prewarmLLM,
    refreshSuggestion,
    retrySTTLoad,
    retryLLMLoad,
    isRetrying,
    isRetryingLLM,
    setTranscript,
    setSuggestion,
    setStatus,
    resetWorker,
    conversationTurns,
    persona,
    setPersona,
    culturalContext,
    setCulturalContext,
    clearHistory,
    settings,
    lastSwitchReason,
    undoPersonaSwitch
  } = useMLWorker();

  const [micPermissionError, setMicPermissionError] = useState(null);

  useEffect(() => {
    if (isDyslexicFriendly) {
      document.body.classList.add('dyslexic-mode');
    } else {
      document.body.classList.remove('dyslexic-mode');
    }
  }, [isDyslexicFriendly]);

  useEffect(() => {
    if (isCompactMode) {
      document.body.classList.add('compact-mode');
    } else {
      document.body.classList.remove('compact-mode');
    }
  }, [isCompactMode]);

  useEffect(() => {
    if (isSubtleMode) {
      document.body.classList.add('subtle-mode');
    } else {
      document.body.classList.remove('subtle-mode');
    }
  }, [isSubtleMode]);

  useEffect(() => {
    const runDiagnostics = async () => {
      const result = await checkAssets();
      if (!result.allOk) {
        console.error("Missing assets:", result.missing);
        setAssetError(`Critical assets missing: ${result.missing.map(m => m.url.split('/').pop()).join(', ')}`);
      }
    };
    runDiagnostics();
  }, []);

  const handleStart = async () => {
    console.log("User clicked start. Transitioning to VAD content.");
    setMicPermissionError(null);

    // Pre-warm LLM as soon as user shows intent to use the app
    prewarmLLM();

    // On mobile, we want to be extra careful with memory spikes
    // A small delay allows any pending work to finish
    if (AppConfig.isMobile) {
      setStatus('Optimizing Social Brain...');
      setTimeout(() => {
        setHasInteracted(true);
      }, 300);
    } else {
      setHasInteracted(true);
    }
  };

  const handleTutorialComplete = async () => {
    setShowTutorial(false);
    await secureLocalStorageSet('convocue_tutorial_seen', 'true');
  };

  const showTutorialHandler = () => {
    setShowTutorial(true);
  };

  const handleSavePersona = async (newPersona) => {
    try {
      // Load existing custom personas from localStorage
      const customPersonas = await secureLocalStorageGet('convocue_custom_personas', {});

      // Add/update the persona
      customPersonas[newPersona.id] = {
        id: newPersona.id,
        label: newPersona.label,
        description: newPersona.description,
        prompt: newPersona.prompt
      };

      // Save back to localStorage
      await secureLocalStorageSet('convocue_custom_personas', customPersonas);

      // Show success message
      alert(`Persona "${newPersona.label}" saved successfully!`);
      setShowPersonaCustomization(false);
    } catch (error) {
      console.error('Error saving persona:', error);
      alert('Error saving persona. Please try again.');
    }
  };

  const handleDeletePersona = async (personaId) => {
    try {
      // Load existing custom personas from localStorage
      const customPersonas = await secureLocalStorageGet('convocue_custom_personas', {});

      // Remove the persona
      delete customPersonas[personaId];

      // Save back to localStorage
      await secureLocalStorageSet('convocue_custom_personas', customPersonas);

      alert(`Persona deleted successfully!`);
    } catch (error) {
      console.error('Error deleting persona:', error);
      alert('Error deleting persona. Please try again.');
    }
  };

  const handlePrivacyConsent = () => {
    // Callback function when privacy consent is given
    console.log("Privacy consent given or acknowledged");
  };

  // Full reset function for when STT errors persist
  const handleFullReset = () => {
    // Reset the entire worker to clear all error states
    resetWorker();
  };

  return (
    <ErrorBoundary>
      {settings && !settings.privacyMode && settings.showAnalytics && <Analytics />}
      <PrivacyConsent onConsentGiven={handlePrivacyConsent} />
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
            personas={availablePersonas}
            onSavePersona={handleSavePersona}
            onDeletePersona={handleDeletePersona}
            currentPersona={persona}
            setCurrentPersona={setPersona}
          />
        )}
        {showSettings && (
          <AppSettings
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
          />
        )}
        <header role="banner" className={hasInteracted ? 'compact' : ''}>
          <div className="header-top">
            <div className="logo-area">
              <Volume2 size={hasInteracted ? 20 : 32} color="var(--primary)" aria-hidden="true" />
              <h1>ConvoCue</h1>
            </div>
            <div className="header-actions">
              {hasInteracted && (
                <div className="quick-toggles" role="toolbar" aria-label="Quick View Toggles">
                  <button
                    onClick={() => setIsCompactMode(!isCompactMode)}
                    className={`btn-toggle-icon ${isCompactMode ? 'active' : ''}`}
                    title={isCompactMode ? "Switch to Standard View" : "Switch to Minimal UI"}
                    aria-label="Toggle Minimal UI"
                    aria-pressed={isCompactMode}
                  >
                    <Activity size={18} />
                  </button>
                  <button
                    onClick={() => setIsSubtleMode(!isSubtleMode)}
                    className={`btn-toggle-icon ${isSubtleMode ? 'active' : ''}`}
                    title={isSubtleMode ? "Switch to Standard Mode" : "Reduce Visual Density"}
                    aria-label="Toggle Subtle Mode"
                    aria-pressed={isSubtleMode}
                  >
                    <EyeOff size={18} />
                  </button>
                  <button
                    onClick={() => setIsDyslexicFriendly(!isDyslexicFriendly)}
                    className={`btn-toggle-icon ${isDyslexicFriendly ? 'active' : ''}`}
                    title="Toggle Dyslexic Friendly Font"
                    aria-label="Toggle Dyslexic Font"
                    aria-pressed={isDyslexicFriendly}
                  >
                    <Type size={18} />
                  </button>
                </div>
              )}
              <div className="view-menu-container">
                <button
                  className={`btn-settings ${showViewMenu ? 'active' : ''}`}
                  onClick={() => setShowViewMenu(!showViewMenu)}
                  aria-label="More View Options"
                  title="More View Options"
                  aria-haspopup="menu"
                  aria-expanded={showViewMenu}
                >
                  <LayoutIcon size={18} />
                </button>
                {showViewMenu && (
                  <div className="view-menu" role="menu" aria-label="View Options Menu">
                    <button
                      onClick={() => { showTutorialHandler(); setShowViewMenu(false); }}
                      className="menu-item"
                      role="menuitem"
                    >
                      <BookOpen size={16} /> Show Tutorial
                    </button>
                  </div>
                )}
              </div>
              <button
                className="btn-settings"
                onClick={() => setShowSettings(true)}
                aria-label="Settings"
                title="Settings"
              >
                <SettingsIcon size={18} />
              </button>
            </div>
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

                {/* Enhanced loading information */}
                <div className="loading-details">
                  <p className="loading-step">{status}</p>

                  {/* Progressive Loading Stages */}
                  <div className="loading-stage-indicator" aria-label="Loading stages">
                    <div className="loading-stage">
                      <div className={`stage-dot ${status.includes('Speech Engine') ? 'active' : status.includes('Ready') || status.includes('Social Brain') || status.includes('background') ? 'completed' : ''}`} />
                      <span className={`stage-label ${status.includes('Speech Engine') ? 'active' : status.includes('Ready') || status.includes('Social Brain') || status.includes('background') ? 'completed' : ''}`}>Speech Engine</span>
                    </div>
                    <div className="loading-stage">
                      <div className={`stage-dot ${status.includes('Social Brain') ? 'active' : status.includes('Ready') || status.includes('background') ? 'completed' : ''}`} />
                      <span className={`stage-label ${status.includes('Social Brain') ? 'active' : status.includes('Ready') || status.includes('background') ? 'completed' : ''}`}>Social Brain</span>
                    </div>
                  </div>

                  <div className="loading-hint" role="note" aria-label="Loading tip">
                    <Info size={14} className="hint-icon" aria-hidden="true" />
                    <p>Tip: ConvoCue runs entirely on your device for privacy. Initial setup may take a moment.</p>
                  </div>
                </div>
              </div>

              <h2 id="setup-card-title">Ready to tune in?</h2>
              <p>ConvoCue analyzes social cues in real-time. All processing happens locally on your device.</p>

              <div className="persona-preview" aria-label={`Current persona: ${availablePersonas[persona]?.label || persona}`}>
                <span className="label">Current Persona:</span>
                <span className="persona-tag">{availablePersonas[persona]?.label || persona}</span>
              </div>

              <button
                className={`btn-main ${!isReady ? 'disabled' : 'pulse'}`}
                onClick={handleStart}
                disabled={!isReady}
                aria-label={isReady ? "Start ConvoCue" : "Initializing ConvoCue"}
                aria-describedby="setup-instruction"
              >
                {isReady ? <Mic size={24} aria-hidden="true" /> : <Loader2 className="animate-spin" size={24} aria-hidden="true" />}
                <span>{isReady ? "Start ConvoCue" : "Initializing..."}</span>
              </button>

              {/* Added quick tips section */}
              <div className="setup-tips" role="complementary" aria-labelledby="setup-tips-title">
                <h3 id="setup-tips-title">What to expect:</h3>
                <ul aria-label="ConvoCue features and capabilities" aria-labelledby="setup-tips-title">
                  <li aria-label="Real-time conversation suggestions"><Zap size={16} aria-hidden="true" /> Real-time conversation suggestions</li>
                  <li aria-label="100% on-device privacy"><ShieldAlert size={16} aria-hidden="true" /> 100% on-device privacy</li>
                  <li aria-label="Adaptive to your communication style"><Activity size={16} aria-hidden="true" /> Learns your preferred response length over time</li>
                </ul>
              </div>

              {/* Loading optimization message */}
              {!isReady && (
                <div className="loading-optimization-message" role="status" aria-live="polite">
                  <p>Optimizing for your device... This may take 1-2 minutes on first use</p>
                </div>
              )}
            </div>

            {isLowMemory && (
              <div className="warning-box" role="alert">
                <ShieldAlert size={20} aria-hidden="true" />
                <p>Low memory detected. AI features may be limited or slower. Try closing other tabs to improve performance.</p>
              </div>
            )}

            {micPermissionError && (
              <div className="error-box" role="alert" aria-live="assertive">
                <AlertCircle size={20} aria-hidden="true" />
                <p>Microphone access denied: {micPermissionError}</p>
              </div>
            )}

            {assetError && (
              <div className="error-box" role="alert" aria-live="assertive">
                <AlertCircle size={20} aria-hidden="true" />
                <p>{assetError}. Please ensure all required files are in the public directory.</p>
              </div>
            )}
          </main>
        ) : (
          <VADContent
            status={status}
            isReady={isReady}
            error={error}
            transcript={transcript}
            suggestion={suggestion}
            detectedIntent={detectedIntent}
            emotionData={emotionData}
            isProcessing={isProcessing}
            processingStep={processingStep}
            processAudio={processAudio}
            prewarmLLM={prewarmLLM}
            refreshSuggestion={refreshSuggestion}
            setTranscript={setTranscript}
            setSuggestion={setSuggestion}
            setStatus={setStatus}
            initialError={micPermissionError}
            conversationTurns={conversationTurns}
            persona={persona}
            setPersona={setPersona}
            culturalContext={culturalContext}
            setCulturalContext={setCulturalContext}
            clearHistory={clearHistory}
            isCompactMode={isCompactMode}
            isSubtleMode={isSubtleMode}
            settings={settings}
            coachingInsights={coachingInsights}
            lastSwitchReason={lastSwitchReason}
            undoPersonaSwitch={undoPersonaSwitch}
            retrySTTLoad={retrySTTLoad}
            retryLLMLoad={retryLLMLoad}
            isRetrying={isRetrying}
            isRetryingLLM={isRetryingLLM}
            mlState={mlState}
            onReset={() => {
              setHasInteracted(false);
              setMicPermissionError(null);
              resetWorker();
            }}
            onFullReset={handleFullReset}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default App;
