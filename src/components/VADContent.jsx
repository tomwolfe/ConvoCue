import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useMicVAD } from '@ricky0123/vad-react';
import { Mic, Heart, Loader2, AlertCircle, RefreshCw, Trash2, Activity, Copy, Check, ThumbsUp, ThumbsDown, Flag, Zap, Info, ShieldAlert } from 'lucide-react';
import { AppConfig } from '../config';
import { submitFeedback } from '../utils/feedback';
import { sanitizeAndTruncate } from '../utils/sanitization';

const GlanceWidget = ({ suggestion, emotionData, isProcessing }) => {
  const emotion = emotionData?.emotion || 'neutral';
  const hasActionItem = suggestion?.includes('[Action Item]');
  const hasConflict = suggestion?.includes('[Diplomatic]');
  const isHighStakes = suggestion?.includes('[Strategic]');

  // Clean and sanitize the suggestion for glance display
  const displaySuggestion = suggestion
    ? sanitizeAndTruncate(suggestion.replace(/\[.*?\]/g, '').trim())
    : isProcessing ? 'Thinking...' : 'Listening...';

  return (
    <div className={`glance-widget ${emotion}`} role="region" aria-label="Glance Feedback">
      <p className="glance-suggestion">{displaySuggestion}</p>
      <div className="glance-indicators">
        {hasActionItem && (
          <div className="glance-badge action">
            <Zap size={14} /> <span>Action</span>
          </div>
        )}
        {hasConflict && (
          <div className="glance-badge conflict">
            <ShieldAlert size={14} /> <span>Conflict</span>
          </div>
        )}
        {isHighStakes && (
          <div className="glance-badge strategic">
            <Info size={14} /> <span>Strategic</span>
          </div>
        )}
      </div>
    </div>
  );
};

const AudioVisualizer = ({ isActive, analyser, isCompactMode }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    if (!isActive || !analyser || !canvasRef.current) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height;

        const blue = 231;
        const green = 92;
        const red = 108;
        
        ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${barHeight / canvas.height + 0.2})`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, analyser]);

  return (
    <div className={`audio-visualizer ${isActive ? 'active' : ''} ${isCompactMode ? 'compact' : ''}`}>
      <canvas ref={canvasRef} width={isCompactMode ? "150" : "300"} height={isCompactMode ? "20" : "40"} />
    </div>
  );
};

const VADContent = ({
  status,
  isReady,
  transcript,
  suggestion,
  emotionData,
  isProcessing,
  processingStep,
  processAudio,
  refreshSuggestion,
  setStatus,
  initialError,
  persona,
  setPersona,
  culturalContext,
  setCulturalContext,
  clearHistory,
  isCompactMode,
  isSubtleMode,
  onReset
}) => {
  const [isVADMode, setIsVADMode] = useState(false);
  const [vadError, setVadError] = useState(initialError);
  const [copied, setCopied] = useState(false);
  const vadErrorSetRef = useRef(!!initialError);

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
    clearHistory();
    if (!isProcessing) setStatus('Ready');
  };

  const handleCopy = () => {
    if (suggestion) {
      navigator.clipboard.writeText(suggestion);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRefresh = () => {
    if (transcript && !isProcessing && refreshSuggestion) {
      refreshSuggestion();
    }
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
    console.error("VAD Error Details:", err);
    setVadError(err?.message || String(err));
  }, []);

  const onVADReady = useCallback(() => {
    console.log("VAD is ready and loaded");
    setVadError(null);
  }, []);

  const onSpeechStart = useCallback(() => {
    console.log("Speech started detection");
    setStatus('Listening...');
  }, [setStatus]);

  // VAD Implementation
  const vad = useMicVAD({
    startOnLoad: false,
    onSpeechStart,
    onSpeechEnd,
    onVADReady,
    onError,
    workletURL: AppConfig.vad.workletURL,
    modelURL: AppConfig.vad.modelURL,
    model: AppConfig.vad.model,
    onnxWASMPaths: AppConfig.vad.onnxWASMPaths,
    positiveSpeechThreshold: AppConfig.vad.positiveSpeechThreshold,
    negativeSpeechThreshold: AppConfig.vad.negativeSpeechThreshold,
    minSpeechFrames: AppConfig.vad.minSpeechFrames,
  });

  useEffect(() => {
    if (vad.errored && !vadErrorSetRef.current) {
      const detail = vad.error || "Unknown VAD initialization error";
      // This is a legitimate case where we need to update state based on external system errors
      // The VAD system reports errors that need to be reflected in the UI state
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVadError(`VAD failed to initialize: ${detail}`);
      vadErrorSetRef.current = true;
    }
  }, [vad.errored, vad.error]);

  useEffect(() => {
    vadRef.current = vad;
  }, [vad]);

  const toggleVAD = () => {
    if (!vad || vad.loading || (vad.errored && !vadError)) return;
    if (isVADMode) {
      vad.pause();
      setIsVADMode(false);
      setStatus('Ready');
    } else {
      handleClear();
      setVadError(null);
      vad.start();
      setIsVADMode(true);
      setStatus('Heartbeat Active');
    }
  };

  const handleManualTrigger = () => {
    if (!vad || vad.loading || (vad.errored && !vadError)) return;
    if (vad.listening && !isVADMode) {
      vad.pause();
      setStatus('Ready');
    } else {
      handleClear();
      setVadError(null);
      vad.start();
      setStatus('Listening...');
    }
  };

  // Determine if we should show minimal UI based on subtle mode and active listening
  const showMinimalUI = isSubtleMode && (vad.listening || isProcessing);

  return (
    <main className={`vad-container ${isCompactMode ? 'compact-layout' : ''} ${showMinimalUI ? 'minimal-ui' : ''}`} role="main">
      <div
        className={`status-badge ${isProcessing || vad.loading || vad.errored || vadError ? 'processing' : ''} ${vad.errored || vadError ? 'error' : ''} ${showMinimalUI ? 'minimal' : ''}`}
        role="status"
        aria-live="polite"
      >
        {isProcessing || (vad.loading && !vad.errored && !vadError) ? (
          <Loader2 className="animate-spin" size={16} aria-hidden="true" />
        ) : (vad.errored || vadError) ? (
          <AlertCircle size={16} aria-hidden="true" />
        ) : (
          <div className="dot" aria-hidden="true" />
        )}
        {!showMinimalUI && (
          <span>
            {(vad.errored || vadError) ? `Mic Error` : (vad.loading ? "Warming up..." : status)}
          </span>
        )}
      </div>

      <AudioVisualizer isActive={vad.listening} analyser={vad.analyser} isCompactMode={isCompactMode} />

      {!showMinimalUI && !isCompactMode && (
        <div className="persona-selector" role="group" aria-label="Select conversation mode">
          <div className="persona-grid">
            {Object.values(AppConfig.models.personas).map((p) => (
              <button
                key={p.id}
                className={`persona-btn ${persona === p.id ? 'active' : ''}`}
                onClick={() => setPersona(p.id)}
                aria-pressed={persona === p.id}
              >
                <span className="persona-label">{p.label}</span>
                <span className="persona-desc">{p.description}</span>
              </button>
            ))}
          </div>

          {persona === 'crosscultural' && (
            <div className="cultural-context-selector" role="group" aria-label="Select cultural context">
              <label htmlFor="cultural-context">Cultural Context:</label>
              <select
                id="cultural-context"
                className="cultural-context-dropdown"
                value={culturalContext || 'general'}
                onChange={(e) => setCulturalContext(e.target.value)}
              >
                <option value="general">General Cultural Awareness</option>
                <option value="east_asian">East Asian (High-context)</option>
                <option value="western">Western (Low-context)</option>
                <option value="middle_eastern">Middle Eastern</option>
                <option value="latin_american">Latin American</option>
                <option value="formal_business">Formal Business Setting</option>
              </select>
            </div>
          )}
        </div>
      )}

      <div className="display-area" role="region" aria-label="Speech processing results">
        {isSubtleMode && (
          <GlanceWidget 
            suggestion={suggestion} 
            emotionData={emotionData} 
            isProcessing={isProcessing} 
          />
        )}
        {!showMinimalUI && !isCompactMode && (
          <div className={`card transcript ${transcript ? 'visible' : ''}`} role="region" aria-labelledby="transcript-label">
            <div className="card-header">
              <label id="transcript-label">Context</label>
              <button className="btn-icon" onClick={handleClear} title="Clear Context">
                <Trash2 size={14} />
              </button>
            </div>
            <p id="transcript-content">{transcript ? sanitizeAndTruncate(transcript, 300) : "Waiting for speech..."}</p>
          </div>
        )}

        <div className={`card suggestion ${suggestion || processingStep === 'thinking' ? 'visible' : ''} ${isCompactMode ? 'compact-suggestion' : ''} ${showMinimalUI ? 'minimal-suggestion' : ''}`} role="region" aria-labelledby="suggestion-label">
          <div className="card-header">
            {!showMinimalUI && <label id="suggestion-label">{AppConfig.models.personas[persona]?.label || 'Cue'}</label>}
            {!showMinimalUI && suggestion && (
              <div className="card-actions">
                <button
                  className="btn-icon"
                  onClick={() => {
                    handleCopy();
                    // Submit positive feedback when suggestion is copied
                    submitFeedback(suggestion, 'like', persona, culturalContext, transcript);
                  }}
                  title="Copy to clipboard"
                >
                  {copied ? <Check size={14} color="#4CAF50" /> : <Copy size={14} />}
                </button>
                <button
                  className="btn-icon"
                  onClick={handleRefresh}
                  title="New suggestion"
                >
                  <RefreshCw size={14} />
                </button>
                <div className="feedback-buttons">
                  <button
                    className="btn-icon feedback-btn"
                    onClick={() => submitFeedback(suggestion, 'like', persona, culturalContext, transcript)}
                    title="Like this suggestion"
                    aria-label="Like this suggestion"
                  >
                    <ThumbsUp size={14} />
                  </button>
                  <button
                    className="btn-icon feedback-btn"
                    onClick={() => submitFeedback(suggestion, 'dislike', persona, culturalContext, transcript)}
                    title="Dislike this suggestion"
                    aria-label="Dislike this suggestion"
                  >
                    <ThumbsDown size={14} />
                  </button>
                  <button
                    className="btn-icon feedback-btn"
                    onClick={() => submitFeedback(suggestion, 'report', persona, culturalContext, transcript)}
                    title="Report inappropriate content"
                    aria-label="Report inappropriate content"
                  >
                    <Flag size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
          <p id="suggestion-content" className={isCompactMode ? 'compact-text' : ''}>
            {suggestion ? sanitizeAndTruncate(suggestion, 300) : (processingStep === 'thinking' ? "Thinking..." : "Listening for cues...")}
          </p>
        </div>
      </div>

      {!showMinimalUI && (
        <div className="controls" role="group" aria-label="Control buttons">
          <button
            className={`btn-control pulse-btn ${vad.listening && !isVADMode ? 'active' : ''} ${isCompactMode ? 'compact' : ''}`}
            onClick={handleManualTrigger}
            disabled={!isReady || isVADMode || vad.loading || (vad.errored && !vadError)}
            title="Manual Trigger"
            aria-label="Manual speech trigger"
          >
            <div className="icon-circle" aria-hidden="true">
              <Mic size={isCompactMode ? 20 : 28} />
            </div>
            {!isCompactMode && <span>Pulse</span>}
          </button>

          <button
            className={`btn-control heartbeat-btn ${isVADMode ? 'active' : ''} ${isCompactMode ? 'compact' : ''}`}
            onClick={toggleVAD}
            disabled={!isReady || vad.loading || (vad.errored && !vadError)}
            title="Continuous Mode"
            aria-label="Continuous speech detection"
          >
            <div className="icon-circle" aria-hidden="true">
              <Heart size={isCompactMode ? 20 : 28} fill={isVADMode ? "white" : "none"} />
            </div>
            {!isCompactMode && <span>Heartbeat</span>}
          </button>
        </div>
      )}

      {(vad.errored || vadError) && (
        <div className="error-recovery" role="alert" aria-live="assertive">
          <p>{vadError || "Microphone access error"}</p>
          <button className="btn-retry" onClick={onReset} aria-label="Try again">
            <RefreshCw size={18} aria-hidden="true" />
            Try Again
          </button>
        </div>
      )}
    </main>
  );
};

export default VADContent;