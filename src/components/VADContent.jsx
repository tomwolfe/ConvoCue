import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useMicVAD } from '@ricky0123/vad-react';
import { Mic, Heart, Loader2, AlertCircle, RefreshCw, Trash2 } from 'lucide-react';

const VADContent = ({
  status,
  isReady,
  transcript,
  suggestion,
  isProcessing,
  processAudio,
  setTranscript,
  setSuggestion,
  setStatus,
  initialError,
  onReset
}) => {
  const [isVADMode, setIsVADMode] = useState(false);
  const [vadError, setVadError] = useState(initialError);

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
    setTranscript('');
    setSuggestion('');
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
    workletURL: "/vad.worklet.bundle.min.js",
    modelURL: "/silero_vad_v5.onnx", 
    model: "v5",
    onnxWASMPaths: {
      "ort-wasm-simd-threaded.wasm": "/ort-wasm-simd-threaded.wasm",
      "ort-wasm-simd-threaded.mjs": "/ort-wasm-simd-threaded.mjs",
      "ort-wasm-simd-threaded.jsep.wasm": "/ort-wasm-simd-threaded.jsep.wasm",
      "ort-wasm-simd-threaded.jsep.mjs": "/ort-wasm-simd-threaded.jsep.mjs",
    },
    positiveSpeechThreshold: 0.55,
    negativeSpeechThreshold: 0.35,
    minSpeechFrames: 4,
  });

  // Handle initial error if it's a microphone permission error
  useEffect(() => {
    if (initialError) {
      console.log("Setting VAD error from initialError:", initialError);
      setVadError(initialError);
    }
  }, [initialError]);

  useEffect(() => {
    if (vad.errored && !vadError) {
      const detail = vad.error || "Unknown VAD initialization error";
      console.error("VAD entered errored state:", detail);
      setVadError(`VAD failed to initialize: ${detail}. Please ensure silero_vad_v5.onnx, vad.worklet.bundle.min.js, and ort-wasm-simd-threaded.wasm are in the public folder and match the required versions.`);
    }
  }, [vad.errored, vadError, vad.error]);

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
    <main className="vad-container">
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

      <div className="display-area">
        <div className={`card transcript ${transcript ? 'visible' : ''}`} aria-label="Transcript">
          <div className="card-header">
            <label>You said</label>
            {transcript && <button className="btn-icon" onClick={handleClear} aria-label="Clear transcript"><Trash2 size={14} /></button>}
          </div>
          <p>{transcript || "Waiting for speech..."}</p>
        </div>

        <div className={`card suggestion ${suggestion ? 'visible' : ''}`} aria-label="Social Cue Suggestion">
          <label>Social Cue</label>
          <p>{suggestion || "AI Brain is pondering..."}</p>
          {isProcessing && !suggestion && (
             <div className="thinking-dots" aria-label="Processing">
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
        >
          <div className="icon-circle" aria-hidden="true">
            <Mic size={28} />
          </div>
          <span>Pulse</span>
        </button>

        <button
          className={`btn-control heartbeat-btn ${isVADMode ? 'active' : ''}`}
          onClick={toggleVAD}
          disabled={!isReady || vad.loading || (vad.errored && !vadError)}
          title="Continuous Mode"
          aria-label="Continuous speech detection"
        >
          <div className="icon-circle" aria-hidden="true">
            <Heart size={28} fill={isVADMode ? "white" : "none"} />
          </div>
          <span>Heartbeat</span>
        </button>
      </div>

      {(vad.errored || vadError) && (
        <div className="error-recovery" role="alert">
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
