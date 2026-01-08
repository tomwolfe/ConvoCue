import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useMicVAD } from '@ricky0123/vad-react';
import { Loader2, AlertCircle, RefreshCw, Zap, ShieldAlert, Info, ThumbsUp, ThumbsDown } from 'lucide-react';
import { AppConfig } from '../config';
import { processConversationTurn } from '../conversationManager';
import PersonaSelector from './VAD/PersonaSelector';
import DisplayArea from './VAD/DisplayArea';
import ControlPanel from './VAD/ControlPanel';
import SocialSuccessScore from './SocialSuccessScore';
import { getMergedPersonas } from '../utils/preferences';
import { submitSubtleModeFeedback } from '../utils/feedback';
import { parseSemanticTags } from '../utils/intentRecognition';
import performanceMonitor from '../utils/performance';

const GlanceWidget = ({ suggestion, emotionData, isProcessing }) => {
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const emotion = emotionData?.emotion || 'neutral';

  const { cleanText: displaySuggestion, tags } = React.useMemo(() => {
    if (!suggestion) return { cleanText: isProcessing ? 'Thinking...' : 'Listening...', tags: [] };
    return parseSemanticTags(suggestion);
  }, [suggestion, isProcessing]);

  const hasActionItem = tags.some(t => t.key === 'action');
  const hasConflict = tags.some(t => t.key === 'conflict');
  const isStrategic = tags.some(t => t.key === 'strategic');
  const isLanguageTip = tags.some(t => t.key === 'language');
  const isSocialTip = tags.some(t => t.key === 'social');
  const hasEmpathy = tags.some(t => t.key === 'empathy');

  const handleFeedback = async (type) => {
    if (feedbackGiven || !displaySuggestion || isProcessing) return;
    await submitSubtleModeFeedback(displaySuggestion, type);
    setFeedbackGiven(true);
  };

  // Define tooltip descriptions for common subtle cues
  const getTooltipForCue = (suggestionText) => {
    if (!suggestionText) return '';

    const cue = suggestionText.trim().toLowerCase();
    const cueMap = {
      'pause': 'Take a moment before responding',
      'think': 'Consider your response carefully',
      'consider': 'Reflect on the context',
      'reflect': 'Contemplate the implications',
      'hmm': 'Express thoughtful consideration',
      'smile': 'Show warmth and friendliness',
      'wave': 'Greet with a friendly gesture',
      'nod': 'Show agreement or acknowledgment',
      'ask': 'Pose a question to engage',
      'clarify': 'Seek more information',
      'follow up': 'Continue the conversation',
      'probe': 'Explore the topic deeper',
      'inquire': 'Make an inquiry politely',
      'reassess': 'Evaluate the situation again',
      'doubt': 'Express healthy skepticism',
      'right': 'Acknowledge agreement',
      'exactly': 'Confirm strong agreement',
      'true': 'Affirm the statement',
      'wait': 'Allow time before responding',
      'try': 'Suggest an experiment or attempt',
      'suggest': 'Offer a recommendation',
      'experiment': 'Try a different approach',
      'maybe': 'Express possibility tentatively',
      'propose': 'Present an idea for consideration',
      'great': 'Express positive acknowledgment',
      'good': 'Show approval',
      'nice': 'Give a positive assessment',
      'keep going': 'Encourage continuation',
      'well done': 'Praise accomplishment',
      'i hear': 'Acknowledge understanding',
      'understand': 'Show comprehension',
      'feel': 'Recognize emotions',
      'acknowledge': 'Recognize and accept',
      'valid': 'Confirm legitimacy of feelings',
      'next': 'Transition to the next topic',
      'change': 'Shift the subject or approach',
      'switch': 'Alter the focus',
      'move on': 'Proceed to another topic',
      'continue': 'Maintain the current direction',
      'explain': 'Provide clarification',
      'elaborate': 'Add more detail',
      'expand': 'Develop further',
      'detail': 'Provide specifics',
      'calm': 'Maintain composure',
      'breathe': 'Take a breath to relax',
      'relax': 'Ease tension',
      'focus': 'Direct attention',
      'center': 'Find balance',
      'unsure': 'Express uncertainty respectfully',
      'thoughtful': 'Show careful consideration',
      'lean in': 'Physically engage more',
      'eye contact': 'Maintain connection through gaze',
      'volume': 'Adjust how loudly you speak',
      'slow down': 'Reduce your speaking pace',
      'silence': 'Allow for moments of quiet',
      'mirror': 'Subtly match their body language',
      'de-escalate': 'Reduce tension in the interaction',
      'validate': 'Acknowledge their perspective',
      'common ground': 'Identify shared interests',
      'neutral': 'Maintain a balanced stance',
      'ponder': 'Think deeply about it',
      'wonder': 'Express curiosity',
      'pivot': 'Transition to a related point',
      'bridge': 'Connect different ideas'
    };

    // Check if the cue matches any known cues
    for (const [key, description] of Object.entries(cueMap)) {
      if (cue.includes(key)) {
        return description;
      }
    }

    return 'Subtle communication cue';
  };

  const tooltipText = getTooltipForCue(displaySuggestion);

  // Determine explanation based on tags in the original suggestion
  const getExplanation = () => {
    const activeTag = tags[0];
    if (activeTag) return activeTag.description;

    // If no specific tag, provide a general explanation
    return `This cue was generated based on the current conversation context and your selected persona. It's designed to guide your communication subtly.`;
  };

  return (
    <div
      className={`glance-widget ${emotion} new-cue`}
      role="region"
      aria-label="Glance Feedback"
      onMouseEnter={() => setShowExplanation(true)}
      onMouseLeave={() => setShowExplanation(false)}
      onFocus={() => setShowExplanation(true)}
      onBlur={() => setShowExplanation(false)}
    >
      <p className="glance-suggestion" title={tooltipText}>{displaySuggestion}</p>
      <div className="glance-indicators">
        {tags.map(tag => (
          <div key={tag.key} className={`glance-badge ${tag.variant}`} title={tag.description} aria-label={tag.label} role="status">
            {tag.key === 'conflict' ? <ShieldAlert size={14} aria-hidden="true" /> : <Zap size={14} aria-hidden="true" />}
            <span>{tag.label}</span>
          </div>
        ))}
        {/* Explanation tooltip */}
        {showExplanation && !isProcessing && displaySuggestion !== 'Listening...' && (
          <div className="glance-explanation-tooltip">
            <div className="explanation-content">
              <Info size={14} className="explanation-icon" />
              <div className="explanation-text">
                <strong>Why this cue?</strong>
                <p>{getExplanation()}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {!isProcessing && displaySuggestion !== 'Listening...' && (
        <div className="glance-feedback-actions">
          <button
            className={`feedback-btn ${feedbackGiven ? 'disabled' : ''}`}
            onClick={() => handleFeedback('like')}
            disabled={feedbackGiven}
            title="Helpful cue"
          >
            <ThumbsUp size={12} />
          </button>
          <button
            className={`feedback-btn ${feedbackGiven ? 'disabled' : ''}`}
            onClick={() => handleFeedback('dislike')}
            disabled={feedbackGiven}
            title="Not helpful"
          >
            <ThumbsDown size={12} />
          </button>
        </div>
      )}
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
  const [availablePersonas, setAvailablePersonas] = useState(AppConfig.models.personas);

  useEffect(() => {
    const loadPersonas = async () => {
      const merged = await getMergedPersonas();
      setAvailablePersonas(merged);
    };
    loadPersonas();
  }, []);

  const [activePersona, setActivePersona] = useState(persona);
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
    const startTime = performance.now();
    try {
      if (!isVADModeRef.current && vadRef.current) vadRef.current.pause();
      if (processAudioRef.current) {
        // Create a copy of the audio data for local processing (speaker detection)
        const audioArray = audio instanceof Float32Array ? audio : new Float32Array(Object.values(audio));
        const audioCopy = new Float32Array(audioArray);
        
        // Process the audio through conversation turn manager
        processConversationTurn(audioCopy, ''); 
        
        // Send original audio to worker
        processAudioRef.current(audio);

        // Record latency
        const latency = performance.now() - startTime;
        performanceMonitor.recordValue('vadLatency', latency);
      }
    } catch (err) {
      console.error("Error in onSpeechEnd processing:", err);
      setStatus('Processing Error');
    }
  }, [setStatus]);

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

      {settings?.showDiagnostics && (
        <div className="vad-diagnostics">
          <span>VAD Latency: {performanceMonitor.getAverageTime('vadLatency').toFixed(1)}ms</span>
        </div>
      )}

      <AudioVisualizer isActive={vad.listening} analyser={vad.analyser} isCompactMode={isCompactMode} />

      {!showMinimalUI && !isCompactMode && (
      <PersonaSelector 
        persona={activePersona} 
        setPersona={(p) => {
          setActivePersona(p);
          setPersona(p);
        }}
        culturalContext={culturalContext}
        setCulturalContext={setCulturalContext}
        availablePersonas={availablePersonas}
      />
      )}

      <SocialSuccessScore
        conversationTurns={conversationTurns}
        settings={settings}
      />

      <div className="display-area" role="region" aria-label="Results">
        {isSubtleMode && (
          <GlanceWidget 
            key={suggestion || 'empty'}
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