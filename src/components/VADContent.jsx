import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useMicVAD } from '@ricky0123/vad-react';
import { Mic, Heart, Loader2, AlertCircle, RefreshCw, Trash2, Activity } from 'lucide-react';
import { AppConfig } from '../config';

const AudioVisualizer = ({ isActive, analyser }) => {
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
    <div className={`audio-visualizer ${isActive ? 'active' : ''}`}>
      <canvas ref={canvasRef} width="300" height="40" />
    </div>
  );
};

const VADContent = ({
  status,
  isReady,
  transcript,
  suggestion,
  isProcessing,
  processingStep,
  processAudio,
  setStatus,
  initialError,
  persona,
  setPersona,
  clearHistory,
  onReset
}) => {
  const [isVADMode, setIsVADMode] = useState(false);
  const [vadError, setVadError] = useState(initialError);
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
    if (err instanceof Error) {
      console.error("Error name:", err.name);
      console.error("Error message:", err.message);
      console.error("Error stack:", err.stack);
    }
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
      console.error("VAD entered errored state:", detail);
      // This is a legitimate case where we need to update state based on external system errors
      // The VAD system reports errors that need to be reflected in the UI state
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVadError(`VAD failed to initialize: ${detail}. Please ensure silero_vad_v5.onnx, vad.worklet.bundle.min.js, and ort-wasm-simd-threaded.wasm are in the public folder and match the required versions.`);
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
      setVadError(null); // Clear any previous errors when trying to start
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
      setVadError(null); // Clear any previous errors when trying to start
      vad.start();
      setStatus('Listening...');
    }
  };

  return (
    <main className="vad-container" role="main">
      <div
        className={`status-badge ${isProcessing || vad.loading || vad.errored || vadError ? 'processing' : ''} ${vad.errored || vadError ? 'error' : ''}`}
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
        <span>
          {(vad.errored || vadError) ? `Mic Error` : (vad.loading ? "Warming up..." : status)}
        </span>
      </div>

      <AudioVisualizer isActive={vad.listening} analyser={vad.analyser} />

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
      </div>

      <div className="display-area" role="region" aria-label="Speech processing results">
        <div className={`card transcript ${transcript ? 'visible' : ''}`} role="region" aria-labelledby="transcript-label">
          <div className="card-header">
            <label id="transcript-label">You said</label>
            {transcript && <button className="btn-icon" onClick={handleClear} aria-label="Clear transcript" title="Clear transcript"><Trash2 size={14} /></button>}
          </div>
          <p id="transcript-content">{transcript || "Waiting for speech..."}</p>
        </div>

        <div className={`card suggestion ${suggestion ? 'visible' : ''}`} role="region" aria-labelledby="suggestion-label">
          <label id="suggestion-label">Social Cue</label>
          <p id="suggestion-content">{suggestion || (processingStep === 'thinking' ? "AI Brain is pondering..." : "Waiting for cues...")}</p>
          {processingStep === 'thinking' && !suggestion && (
             <div className="thinking-dots" aria-label="Processing, please wait" role="status">
               <span>.</span><span>.</span><span>.</span>
             </div>
          )}
        </div>
      </div>

      <div className="controls" role="group" aria-label="Control buttons">
        <button
          className={`btn-control pulse-btn ${vad.listening && !isVADMode ? 'active' : ''}`}
          onClick={handleManualTrigger}
          disabled={!isReady || isVADMode || vad.loading || (vad.errored && !vadError)}
          title="Manual Trigger"
          aria-label="Manual speech trigger"
          aria-describedby="pulse-description"
        >
          <div className="icon-circle" aria-hidden="true">
            <Mic size={28} />
          </div>
          <span>Pulse</span>
        </button>
        <div id="pulse-description" className="sr-only">Manually trigger speech recognition</div>

        <button
          className={`btn-control heartbeat-btn ${isVADMode ? 'active' : ''}`}
          onClick={toggleVAD}
          disabled={!isReady || vad.loading || (vad.errored && !vadError)}
          title="Continuous Mode"
          aria-label="Continuous speech detection"
          aria-describedby="heartbeat-description"
        >
          <div className="icon-circle" aria-hidden="true">
            <Heart size={28} fill={isVADMode ? "white" : "none"} />
          </div>
          <span>Heartbeat</span>
        </button>
        <div id="heartbeat-description" className="sr-only">Enable continuous speech detection</div>
      </div>

      {(vad.errored || vadError) && (
        <div className="error-recovery" role="alert" aria-live="assertive">
          <p>{vadError || "Microphone access or VAD initialization error"}</p>
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