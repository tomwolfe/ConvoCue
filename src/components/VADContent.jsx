import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useMicVAD } from '@ricky0123/vad-react';
import { Loader2, AlertCircle, RefreshCw, Zap, ShieldAlert, Info } from 'lucide-react';
import { AppConfig } from '../config';
import { processConversationTurn } from '../conversationManager';
import PersonaSelector from './VAD/PersonaSelector';
import DisplayArea from './VAD/DisplayArea';
import ControlPanel from './VAD/ControlPanel';
import SocialSuccessScore from './SocialSuccessScore';
import { secureLocalStorageGet } from '../utils/encryption';

const GlanceWidget = ({ suggestion, emotionData, isProcessing }) => {
  const emotion = emotionData?.emotion || 'neutral';
  const hasActionItem = suggestion?.includes('[Action Item]');
  const hasConflict = suggestion?.includes('[Diplomatic]');
  const isHighStakes = suggestion?.includes('[Strategic]');

  // Clean the suggestion for glance display
  const displaySuggestion = suggestion
    ? suggestion.replace(/\[.*?\]/g, '').trim()
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
  error,
  transcript,
  suggestion,
  emotionData,
  isProcessing,
  processingStep,
  processAudio,
  refreshSuggestion,
  setTranscript,
  setSuggestion,
  setStatus,
  initialError,
  conversationTurns,
  persona,
  setPersona,
  culturalContext,
  setCulturalContext,
  clearHistory,
  isCompactMode,
  isSubtleMode,
  settings,
  onReset
}) => {
  const [isVADMode, setIsVADMode] = useState(false);
  const [vadError, setVadError] = useState(initialError);
  const [copied, setCopied] = useState(false);
  const vadErrorSetRef = useRef(!!initialError);

  const isVADModeRef = useRef(isVADMode);
  const processAudioRef = useRef(processAudio);

  useEffect(() => { isVADModeRef.current = isVADMode; }, [isVADMode]);
  useEffect(() => { processAudioRef.current = processAudio; }, [processAudio]);

  const vadRef = useRef(null);

  const handleClear = () => {
    clearHistory();
    setTranscript('');
    setSuggestion('');
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

  // Add haptic feedback for subtle mode when suggestions are available
  useEffect(() => {
    if (isSubtleMode && suggestion && !isProcessing) {
      // Provide subtle haptic feedback when a suggestion is ready
      if (navigator.vibrate) {
        // Short, subtle vibration pattern
        navigator.vibrate([10]); // 10ms vibration
      }
    }
  }, [suggestion, isProcessing, isSubtleMode]);

  const onSpeechEnd = useCallback((audio) => {
    if (!isVADModeRef.current && vadRef.current) vadRef.current.pause();
    if (processAudioRef.current) {
      // Process the audio through conversation turn manager before sending to worker
      const audioArray = audio instanceof Float32Array ? audio : new Float32Array(Object.values(audio));
      processConversationTurn(audioArray, ''); // Empty string for now, text will come from STT
      processAudioRef.current(audio);
    }
  }, []);

  const onError = useCallback((err) => {
    console.error("VAD Error:", err);
    setVadError(err?.message || String(err));
  }, []);

  const onVADReady = useCallback(() => {
    setVadError(null);
  }, []);

  const onSpeechStart = useCallback(() => {
    setStatus('Listening...');
  }, [setStatus]);

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
      setVadError(prevError => {
        if (!prevError) {
          vadErrorSetRef.current = true;
          return `VAD failed to initialize: ${detail}`;
        }
        return prevError;
      });
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
            {(vad.errored || vadError) ? `Mic Error` : 
             (vad.loading ? "Warming up..." : 
              (processingStep === 'transcribing' ? "Listening to you..." :
               (processingStep === 'thinking' ? "Thinking of a cue..." : status)))}
          </span>
        )}
      </div>

      <AudioVisualizer isActive={vad.listening} analyser={vad.analyser} isCompactMode={isCompactMode} />

      {!showMinimalUI && !isCompactMode && (
        <PersonaSelector 
          persona={persona} 
          setPersona={setPersona} 
          culturalContext={culturalContext} 
          setCulturalContext={setCulturalContext} 
        />
      )}

      <SocialSuccessScore
        conversationTurns={conversationTurns}
        settings={settings}
      />

      <div className="display-area" role="region" aria-label="Results">
        {isSubtleMode && (
          <GlanceWidget 
            suggestion={suggestion} 
            emotionData={emotionData} 
            isProcessing={isProcessing} 
          />
        )}
        
        <DisplayArea
          transcript={transcript}
          suggestion={suggestion}
          processingStep={processingStep}
          isProcessing={isProcessing}
          handleClear={handleClear}
          handleCopy={handleCopy}
          handleRefresh={handleRefresh}
          copied={copied}
          isCompactMode={isCompactMode}
          showMinimalUI={showMinimalUI}
          persona={persona}
          culturalContext={culturalContext}
          conversationTurns={conversationTurns}
          settings={settings}
        />
      </div>

      {!showMinimalUI && (
        <ControlPanel 
          isReady={isReady}
          isVADMode={isVADMode}
          vadLoading={vad.loading}
          vadErrored={vad.errored}
          vadError={vadError}
          handleManualTrigger={handleManualTrigger}
          toggleVAD={toggleVAD}
          isCompactMode={isCompactMode}
        />
      )}

      {(vad.errored || vadError || error) && (
        <div className="error-recovery" role="alert" aria-live="assertive">
          <p>{error || vadError || "Microphone access error"}</p>
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