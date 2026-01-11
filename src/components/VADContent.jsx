import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useMicVAD } from '@ricky0123/vad-react';
import { Loader2, AlertCircle, RefreshCw, Zap, ShieldAlert, Info, ThumbsUp, ThumbsDown, FileText } from 'lucide-react';
import { AppConfig } from '../config';
import { ML_STATES } from '../worker/MLStateMachine';
import { processConversationTurn } from '../conversationManager';
import PersonaSelector from './VAD/PersonaSelector';
import DisplayArea from './VAD/DisplayArea';
import ControlPanel from './VAD/ControlPanel';
import SocialSuccessScore from './SocialSuccessScore';
import ConversationSummary from './ConversationSummary';
import { getMergedPersonas } from '../utils/preferences';
import { submitSubtleModeFeedback } from '../utils/feedback';
import { trackCueDisplayed } from '../utils/engagementTracking';
import { parseSemanticTags, TAG_METADATA } from '../utils/intentUtils';
import performanceMonitor from '../utils/performance';
import TagIcon from './VAD/TagIcon';
import { recordMirroringFeedback, getSensitivitySuggestion, clearSensitivitySuggestion } from '../utils/personalization';

// Sensitivity Suggestion Notification Component
const SensitivitySuggestionNotification = ({ suggestion, onAccept, onDismiss }) => {
  if (!suggestion) return null;

  return (
    <div className="suggestion-notification" style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      backgroundColor: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      padding: '12px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      zIndex: 1000,
      maxWidth: '300px',
      fontSize: '14px'
    }}>
      <div className="notification-content">
        <div className="notification-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Info size={16} color="#3b82f6" />
            <strong>Suggestion</strong>
          </div>
          <button
            onClick={onDismiss}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: '#64748b',
              padding: '0'
            }}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
        <p style={{ margin: '8px 0', color: '#334155' }}>
          Based on your feedback, we noticed the AI's tone might not match your preferences. Would you like to try lowering the Mirroring Sensitivity?
        </p>
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <button
            onClick={onAccept}
            style={{
              flex: 1,
              padding: '6px 12px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: '1px solid #3b82f6',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            Yes, Lower It
          </button>
          <button
            onClick={onDismiss}
            style={{
              flex: 1,
              padding: '6px 12px',
              backgroundColor: '#f1f5f9',
              color: '#475569',
              border: '1px solid #cbd5e1',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
};

const GlanceWidget = ({ suggestion, emotionData, isProcessing, detectedIntent, settings, persona, sessionTone }) => {
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [mirroringFeedbackGiven, setMirroringFeedbackGiven] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const emotion = emotionData?.emotion || 'neutral';

  const [lastTrackedSuggestion, setLastTrackedSuggestion] = useState(null);

  if (suggestion && suggestion !== lastTrackedSuggestion && !isProcessing) {
    setLastTrackedSuggestion(suggestion);
    setFeedbackGiven(false);
    setMirroringFeedbackGiven(false);
  }

  useEffect(() => {
    if (suggestion && suggestion === lastTrackedSuggestion) {
      trackCueDisplayed('subtle', persona);
    }
  }, [suggestion, lastTrackedSuggestion, persona]);

  const { cleanText: displaySuggestion, tags } = useMemo(() => {
    if (!suggestion) return { cleanText: isProcessing ? 'Thinking...' : 'Listening...', tags: [] };
    return parseSemanticTags(suggestion);
  }, [suggestion, isProcessing]);

  const handleFeedback = async (type) => {
    if (feedbackGiven || !displaySuggestion || isProcessing) return;
    await submitSubtleModeFeedback(displaySuggestion, type, persona);
    setFeedbackGiven(true);
  };

  const handleMirroringFeedback = async (type) => {
    if (mirroringFeedbackGiven || !sessionTone || isProcessing) return;
    await recordMirroringFeedback(type, sessionTone, settings);
    setMirroringFeedbackGiven(true);
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
      <div className="glance-indicators" aria-live="polite">
        {/* Visual indicators for de-escalation and calming override states */}
        {sessionTone && (
          <>
            {sessionTone.shouldOverride && (
              <div
                className="glance-badge glance-badge--calming-override"
                title="Calming Override: AI is using a slow, steady, calming tone regardless of user urgency"
                aria-label="Calming Override Active"
              >
                <Zap size={14} color="#8B5CF6" />
                <span>Calming</span>
              </div>
            )}
            {sessionTone.isDeEscalating && !sessionTone.shouldOverride && (
              <div
                className="glance-badge glance-badge--de-escalation"
                title="De-escalation: AI is maintaining a steady, grounding presence"
                aria-label="De-escalation Active"
              >
                <Activity size={14} color="#10B981" />
                <span>De-escalating</span>
              </div>
            )}
          </>
        )}
        {/* Live Intent Indicator (Subtle Mode) */}
        {isProcessing && detectedIntent && TAG_METADATA[detectedIntent] &&
         settings.enabledIntents?.includes(detectedIntent) && (
          <div
            className={`glance-badge ${TAG_METADATA[detectedIntent].variant} pulse-animation live-preview-indicator`}
            title={`LIVE PREVIEW: ${TAG_METADATA[detectedIntent].description}. This is a real-time analysis - the final response may differ. Click for more info.`}
            role="status"
            aria-label={`Real-time preview: ${TAG_METADATA[detectedIntent].label}. This is preliminary - final response may differ.`}
            onClick={(e) => {
              e.stopPropagation();
              alert(`LIVE PREVIEW INDICATOR\n\nThis badge shows a real-time analysis of your input while the AI is still processing.\n\nFinal results may differ from this preview.\n\nIntent: ${TAG_METADATA[detectedIntent].label}\nDescription: ${TAG_METADATA[detectedIntent].description}`);
            }}
          >
            <TagIcon name={TAG_METADATA[detectedIntent].icon} size={14} />
            <span>{TAG_METADATA[detectedIntent].label} (Live)</span>
            <Info size={12} className="live-preview-info-icon" />
          </div>
        )}
        {tags.map(tag => (
          <div key={tag.key} className={`glance-badge ${tag.variant}`} title={tag.description} aria-label={tag.label} role="status">
            <TagIcon name={TAG_METADATA[tag.key]?.icon || tag.icon} size={14} />
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
            className={`feedback-btn feedback-btn--sm ${feedbackGiven ? 'disabled' : ''}`}
            onClick={() => handleFeedback('like')}
            disabled={feedbackGiven}
            title="Helpful cue"
          >
            <ThumbsUp size={14} />
          </button>
          <button
            className={`feedback-btn feedback-btn--sm ${feedbackGiven ? 'disabled' : ''}`}
            onClick={() => handleFeedback('dislike')}
            disabled={feedbackGiven}
            title="Not helpful"
          >
            <ThumbsDown size={14} />
          </button>

          {/* Mirroring Feedback Buttons - Only show if sessionTone is available */}
          {sessionTone && (
            <div className="mirroring-feedback-group">
              <span className="feedback-label">AI Tone:</span>
              <button
                className={`feedback-btn feedback-btn--sm ${mirroringFeedbackGiven ? 'disabled' : ''}`}
                onClick={() => handleMirroringFeedback('right')}
                disabled={mirroringFeedbackGiven}
                title="AI tone felt appropriate"
              >
                <ThumbsUp size={14} />
              </button>
              <button
                className={`feedback-btn feedback-btn--sm ${mirroringFeedbackGiven ? 'disabled' : ''}`}
                onClick={() => handleMirroringFeedback('wrong')}
                disabled={mirroringFeedbackGiven}
                title="AI tone felt inappropriate"
              >
                <ThumbsDown size={14} />
              </button>
            </div>
          )}
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

        const blue = 241;
        const green = 102;
        const red = 99;
        
        ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${barHeight / canvas.height + 0.3})`;
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
  error,
  transcript,
  suggestion,
  detectedIntent,
  emotionData,
  isProcessing,
  processingStep,
  processAudio,
  prewarmLLM,
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
  onReset,
  coachingInsights,
  lastSwitchReason,
  undoPersonaSwitch,
  retrySTTLoad,
  retryLLMLoad,
  isRetrying,
  isRetryingLLM,
  retryCount,
  maxRetries,
  sttFunctional,
  llmFunctional,
  mlState,
  workerRef,
  onFullReset,
  sessionTone,
  onUpdateSetting
}) => {
  const [availablePersonas, setAvailablePersonas] = useState(AppConfig.models.personas);
  const [sensitivitySuggestion, setSensitivitySuggestion] = useState(null);
  const [showSuggestionNotification, setShowSuggestionNotification] = useState(false);
  const [showConversationSummary, setShowConversationSummary] = useState(false);

  // Check for sensitivity suggestions on component mount and periodically
  useEffect(() => {
    const checkSensitivitySuggestion = async () => {
      const suggestion = await getSensitivitySuggestion();
      setSensitivitySuggestion(suggestion);
      setShowSuggestionNotification(!!suggestion);
    };

    checkSensitivitySuggestion();

    // Set up periodic check every 30 seconds
    const intervalId = setInterval(checkSensitivitySuggestion, 30000);

    return () => clearInterval(intervalId);
  }, []);

  const handleAcceptSuggestion = async () => {
    // Update the user's settings to reflect the suggested sensitivity
    if (sensitivitySuggestion && onUpdateSetting) {
      // Call the parent component's function to update settings
      try {
        // We'll trigger a callback to update settings in the parent component
        onUpdateSetting('mirroringSensitivity', sensitivitySuggestion.suggestedSensitivity);
      } catch (error) {
        console.error('Error applying sensitivity suggestion:', error);
      }
    }

    // Clear the suggestion and hide notification
    await clearSensitivitySuggestion();
    setShowSuggestionNotification(false);
    setSensitivitySuggestion(null);
  };

  const handleDismissSuggestion = async () => {
    // Clear the suggestion and hide notification
    await clearSensitivitySuggestion();
    setShowSuggestionNotification(false);
    setSensitivitySuggestion(null);
  };

  useEffect(() => {
    const loadPersonas = async () => {
      const merged = await getMergedPersonas();
      setAvailablePersonas(merged);
    };
    loadPersonas();
  }, []);

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
    if (prewarmLLM) prewarmLLM();
  }, [setStatus, prewarmLLM]);

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
    if (!vad || vad.loading || (vad.errored && !vadError) || mlState === ML_STATES.TEXT_ONLY_MODE) return;
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
    if (!vad || vad.loading || (vad.errored && !vadError) || mlState !== ML_STATES.READY) return;
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
        persona={persona}
        setPersona={setPersona}
        culturalContext={culturalContext}
        setCulturalContext={setCulturalContext}
        availablePersonas={availablePersonas}
        settings={settings}
        lastSwitchReason={lastSwitchReason}
        undoPersonaSwitch={undoPersonaSwitch}
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
            detectedIntent={detectedIntent}
            settings={settings}
            persona={persona}
            sessionTone={sessionTone}
          />
        )}
        
        <DisplayArea
          transcript={transcript}
          suggestion={suggestion}
          processingStep={processingStep}
          detectedIntent={detectedIntent}
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
          coachingInsights={coachingInsights}
        />
      </div>

      {!showMinimalUI && (
        <ControlPanel
          isVADMode={isVADMode}
          vadLoading={vad.loading}
          vadErrored={vad.errored}
          vadError={vadError}
          handleManualTrigger={handleManualTrigger}
          toggleVAD={toggleVAD}
          isCompactMode={isCompactMode}
          mlState={mlState}
          onShowSummary={() => setShowConversationSummary(true)}
        />
      )}

      {(vad.errored || vadError || error || !sttFunctional || !llmFunctional) && (
        <div className="error-recovery" role="alert" aria-live="assertive">
          <p>{error || vadError || (!sttFunctional ? "Speech engine is unavailable" : !llmFunctional ? "Social Brain is unavailable" : "Microphone access error")}</p>

          {/* Memory pressure specific message */}
          {status && status.includes('deferred (Low Memory)') && (
            <p className="memory-pressure-note">Try closing other browser tabs or applications to free up memory.</p>
          )}

          {/* STT Retry Button: Show if STT is not functional and we are in a state that allows recovery */}
          {!sttFunctional && retrySTTLoad && (
            <>
              <button className="btn-retry" onClick={retrySTTLoad} aria-label="Retry Speech Recognition" disabled={isRetrying}>
                {isRetrying ? <Loader2 className="animate-spin" size={18} aria-hidden="true" /> : <RefreshCw size={18} aria-hidden="true" />}
                {isRetrying ? `Retrying... (${(retryCount || 0) + 1}/${maxRetries || 3})` : 'Retry Speech Recognition'}
              </button>
              {/* Give up button appears when retry count reaches max attempts */}
              {error && error.includes('maximum retry attempts') && (
                <button className="btn-give-up" onClick={onFullReset} aria-label="Give up and reset">
                  <ShieldAlert size={18} aria-hidden="true" />
                  Give Up & Reset
                </button>
              )}
            </>
          )}

          {/* LLM Retry Button: Show if LLM is not functional and we have STT or are in text-only mode */}
          {!llmFunctional && retryLLMLoad && (
            <>
              <button className="btn-retry" onClick={retryLLMLoad} aria-label="Retry AI Model" disabled={isRetryingLLM}>
                {isRetryingLLM ? <Loader2 className="animate-spin" size={18} aria-hidden="true" /> : <RefreshCw size={18} aria-hidden="true" />}
                {isRetryingLLM ? `Retrying... (${(retryCount || 0) + 1}/${maxRetries || 3})` : 'Retry AI Model'}
              </button>
              {/* Give up button appears when retry count reaches max attempts */}
              {error && error.includes('maximum retry attempts') && (
                <button className="btn-give-up" onClick={onFullReset} aria-label="Give up and reset">
                  <ShieldAlert size={18} aria-hidden="true" />
                  Give Up & Reset
                </button>
              )}
            </>
          )}
          <button className="btn-retry" onClick={onReset} aria-label="Try again">
            <RefreshCw size={18} aria-hidden="true" />
            Try Again
          </button>
        </div>
      )}

      {/* Sensitivity Suggestion Notification */}
      <SensitivitySuggestionNotification
        suggestion={sensitivitySuggestion}
        onAccept={handleAcceptSuggestion}
        onDismiss={handleDismissSuggestion}
      />

      {/* Conversation Summary Modal */}
      {showConversationSummary && (
        <ConversationSummary
          conversationTurns={conversationTurns}
          isVisible={showConversationSummary}
          onClose={() => setShowConversationSummary(false)}
          workerRef={workerRef}
        />
      )}
    </main>
  );
};

export default VADContent;