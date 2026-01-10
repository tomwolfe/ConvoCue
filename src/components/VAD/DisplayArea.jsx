import React, { useMemo, useState, useEffect, useRef } from 'react';
import { 
  Trash2, Copy, Check, RefreshCw, ThumbsUp, ThumbsDown, 
  Flag, User, Users, AlertTriangle, Zap, Target, 
  MessageCircle, Heart, X, ChevronLeft, ChevronRight, Info 
} from 'lucide-react';
import { AppConfig } from '../../config';
import { CoachingConfig } from '../../config/coaching';
import { submitFeedback, submitInsightFeedback, getInsightCategoryScores } from '../../utils/feedback';
import { trackCueDisplayed } from '../../utils/engagementTracking';
import { overrideSpeakerForTurn } from '../../conversationManager';
import { parseSemanticTags, TAG_METADATA } from '../../utils/intentRecognition';
import { secureLocalStorageGet, secureLocalStorageSet } from '../../utils/encryption';
import InsightCard from './InsightCard';
import CoachingDisclaimer from './CoachingDisclaimer';
import TagIcon from './TagIcon';

const DisplayArea = ({
  transcript,
  suggestion,
  processingStep,
  detectedIntent,
  handleClear,
  handleCopy,
  handleRefresh,
  copied,
  isCompactMode,
  showMinimalUI,
  persona,
  culturalContext,
  conversationTurns = [],
  settings = {},
  coachingInsights = null
}) => {
  // Local state for insight interaction
  const [currentInsightIndex, setCurrentInsightIndex] = useState(0);
  const [dismissedInsights, setDismissedInsights] = useState(new Set());
  const [categoryScores, setCategoryScores] = useState({});
  const [copingIndices, setCopingIndices] = useState({}); // Changed to map { [insightId]: copingIndex }
  const [showInfo, setShowInfo] = useState(false);
  const [isStorageLoaded, setIsStorageLoaded] = useState(false);
  const [isAllCaughtUpDismissed, setIsAllCaughtUpDismissed] = useState(false);

  const lastTrackedSuggestion = useRef(null);

  // Track when a full suggestion is displayed
  useEffect(() => {
    if (suggestion && suggestion !== lastTrackedSuggestion.current && processingStep === 'none') {
      trackCueDisplayed('suggestion', persona);
      lastTrackedSuggestion.current = suggestion;
    }
  }, [suggestion, processingStep, persona]);

  // Determine if feedback should be enabled based on settings
  const isPersonalizationEnabled = settings.enablePersonalization !== false && !settings.privacyMode;

  // Load dismissed insights and personalization data from persistence
  useEffect(() => {
    const loadData = async () => {
      const [savedDismissed, savedScores, savedCopingIndices, allCaughtUpDismissed] = await Promise.all([
        secureLocalStorageGet('dismissed_coaching_insights', []),
        getInsightCategoryScores(),
        secureLocalStorageGet('coaching_coping_indices', {}),
        secureLocalStorageGet('all_caught_up_dismissed', false)
      ]);

      // Handle backward compatibility: if savedCopingIndices is in old format (persona-based),
      // convert it to new format (insightId-based) by creating a mapping
      let processedCopingIndices = savedCopingIndices;
      if (savedCopingIndices && typeof savedCopingIndices === 'object') {
        // Check if it's in old format (has persona keys like 'anxiety', 'professional', etc.)
        const personaKeys = ['anxiety', 'relationship', 'professional', 'meeting', 'default'];
        const hasOldFormat = personaKeys.some(key => key in savedCopingIndices);

        if (hasOldFormat) {
          // We can't perfectly convert old format to new without knowing the insight IDs,
          // so we'll just use the old values as defaults for new format
          console.warn('Detected old format coping indices, will be migrated to new format as user interacts with insights');
        }
      }

      setDismissedInsights(new Set(savedDismissed));
      setCategoryScores(savedScores);
      setCopingIndices(processedCopingIndices);
      setIsAllCaughtUpDismissed(allCaughtUpDismissed);
      setIsStorageLoaded(true);
    };
    loadData();
  }, []);

  const [prevPersona, setPrevPersona] = useState(persona);
  const [prevCoachingInsights, setPrevCoachingInsights] = useState(coachingInsights);
  if (persona !== prevPersona || coachingInsights !== prevCoachingInsights) {
    setPrevPersona(persona);
    setPrevCoachingInsights(coachingInsights);
    setCurrentInsightIndex(0);
    setIsAllCaughtUpDismissed(false);
    secureLocalStorageSet('all_caught_up_dismissed', false);
  }

  // Extract all relevant insights based on persona and config
  const allInsights = useMemo(() => {
    if (!coachingInsights) return [];

    const config = CoachingConfig[persona] || CoachingConfig.default;
    const rawInsights = config.insightPath(coachingInsights) || [];

    if (!rawInsights.length) return [];

    // Map with config and sort by category feedback scores
    const mapped = rawInsights.map((insight, index) => ({
      ...insight,
      config,
      id: `${persona}-${index}-${insight.category || 'default'}` // Generate unique ID for each insight
    }));

    // Only sort if we have multiple insights to prioritize
    if (mapped.length > 1) {
      mapped.sort((a, b) => {
        const scoreA = categoryScores[a.category] || 0;
        const scoreB = categoryScores[b.category] || 0;
        return scoreB - scoreA; // Descending order: highest score first
      });
    }

    return mapped;
  }, [coachingInsights, persona, categoryScores]);

  // Filter out dismissed insights and get current one
  const visibleInsights = useMemo(() =>
    allInsights.filter(insight => !dismissedInsights.has(insight.id)),
  [allInsights, dismissedInsights]);

  const activeInsight = visibleInsights[currentInsightIndex] || null;
  const allInsightsDismissed = isStorageLoaded && allInsights.length > 0 && visibleInsights.length === 0 && !isAllCaughtUpDismissed;

  const handleDismiss = () => {
    setDismissedInsights(prev => {
      const id = activeInsight.id;
      const next = new Set(prev).add(id);
      secureLocalStorageSet('dismissed_coaching_insights', Array.from(next));
      return next;
    });
    if (currentInsightIndex >= visibleInsights.length - 1 && currentInsightIndex > 0) {
      setCurrentInsightIndex(prev => prev - 1);
    }
  };

  const handleDismissAllCaughtUp = () => {
    setIsAllCaughtUpDismissed(true);
    secureLocalStorageSet('all_caught_up_dismissed', true);
  };

  const handleNextInsight = (e) => {
    e.stopPropagation();
    setCurrentInsightIndex(prev => (prev + 1) % visibleInsights.length);
  };

  const handlePrevInsight = (e) => {
    e.stopPropagation();
    setCurrentInsightIndex(prev => (prev - 1 + visibleInsights.length) % visibleInsights.length);
  };

  const handleNextCoping = (e, total, insightId) => {
    e.stopPropagation();
    const currentInsightCopingIndex = copingIndices[insightId] || 0;
    const nextIndex = (currentInsightCopingIndex + 1) % total;

    // Update the specific insight's coping index
    const nextCopingIndices = { ...copingIndices, [insightId]: nextIndex };
    setCopingIndices(nextCopingIndices);

    // Persist coping index progress
    secureLocalStorageSet('coaching_coping_indices', nextCopingIndices);
  };

  const handleInsightFeedback = async (category, type, reason = null) => {
    if (!isPersonalizationEnabled) return;
    
    // Submit to persistent storage
    const updatedScores = await submitInsightFeedback(category, type, reason);
    
    // Update local state for immediate re-sorting if insights refresh
    setCategoryScores(updatedScores);
    
    // Also call generic feedback for general analytics
    submitFeedback(activeInsight.insight, type, `insight-${persona}${reason ? '-' + reason : ''}`, culturalContext);
  };

  // Parse semantic tags for visual indicators
  const { cleanText, tags } = useMemo(() => parseSemanticTags(suggestion), [suggestion]);

  // Format conversation turns for display
  const formattedConversation = conversationTurns.slice(-5).map((turn, index) => (
    <div key={index} className={`conversation-turn ${turn.role}`} aria-label={`${turn.role === 'user' ? 'You' : 'Other speaker'}: ${turn.content}`}>
      <div className="speaker-identity" title={turn.role === 'user' ? 'You' : 'Other Speaker'}>
        <div className={`speaker-avatar ${turn.role}`}>
          {turn.role === 'user' ? <User size={16} /> : <Users size={16} />}
        </div>
        <span className="speaker-name">
          {turn.role === 'user' ? 'You' : 'Other'}
        </span>
      </div>
      <span className="turn-text">{turn.content}</span>
      {/* Manual speaker override controls - only show if not in privacy mode */}
      {!settings.privacyMode && (
        <div className="speaker-controls">
          <button
            className={`speaker-toggle ${turn.role === 'user' ? 'active' : ''}`}
            onClick={() => overrideSpeakerForTurn(turn.id, 'user')}
            title="Mark as user"
            aria-label="Mark as user"
          >
            <User size={12} />
          </button>
          <button
            className={`speaker-toggle ${turn.role === 'other' ? 'active' : ''}`}
            onClick={() => overrideSpeakerForTurn(turn.id, 'other')}
            title="Mark as other"
            aria-label="Mark as other"
          >
            <Users size={12} />
          </button>
        </div>
      )}
    </div>
  ));

  return (
    <div className="display-area" role="region" aria-label="Speech processing results">
      <div className={`card suggestion ${suggestion || processingStep === 'thinking' ? 'visible' : ''} ${processingStep === 'thinking' ? 'thinking' : ''} ${isCompactMode ? 'compact-suggestion' : ''} ${showMinimalUI ? 'minimal-suggestion' : ''}`} role="region" aria-labelledby="suggestion-label">
        <div className="card-header">
          {!showMinimalUI && (
            <div className="flex items-center gap-2">
              <label id="suggestion-label">{AppConfig.models.personas[persona]?.label || 'Coaching Cue'}</label>
              <div className="glance-indicators" aria-live="polite">
                {/* Live Intent Indicator (Immediate feedback before LLM) */}
                {processingStep === 'thinking' && detectedIntent && TAG_METADATA[detectedIntent] &&
                 settings.enabledIntents?.includes(detectedIntent) && (
                  <span
                    className={`glance-badge ${TAG_METADATA[detectedIntent].variant} pulse-animation live-preview-indicator`}
                    title={`LIVE PREVIEW: ${TAG_METADATA[detectedIntent].description}. This is a real-time analysis - the final response may differ. Click for more info.`}
                    role="status"
                    aria-label={`Real-time preview: ${TAG_METADATA[detectedIntent].label}. This is preliminary - final response may differ.`}
                    onClick={(e) => {
                      e.stopPropagation();
                      alert(`LIVE PREVIEW INDICATOR\n\nThis badge shows a real-time analysis of your input while the AI is still processing.\n\nFinal results may differ from this preview.\n\nIntent: ${TAG_METADATA[detectedIntent].label}\nDescription: ${TAG_METADATA[detectedIntent].description}`);
                    }}
                  >
                    <TagIcon name={TAG_METADATA[detectedIntent].icon} size={10} />
                    {TAG_METADATA[detectedIntent].label} (Live)
                    <Info size={10} className="live-preview-info-icon" />
                  </span>
                )}
                {tags.map((tag) => (
                  <span key={tag.key} className={`glance-badge ${tag.variant}`} title={tag.description}>
                    <TagIcon name={tag.icon} size={10} />
                    {tag.label}
                  </span>
                ))}
              </div>
            </div>
          )}
          {!showMinimalUI && suggestion && (
            <div className="card-actions">
              <button
                className="btn-action-sm"
                onClick={() => {
                  handleCopy();
                  if (isPersonalizationEnabled) {
                    submitFeedback(suggestion, 'like', persona, culturalContext, transcript, transcript);
                  }
                }}
                title="Copy to clipboard"
              >
                {copied ? <Check size={14} color="var(--accent)" /> : <Copy size={14} />}
              </button>
              <button
                className="btn-action-sm"
                onClick={handleRefresh}
                title="New suggestion"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          )}
        </div>
        <div id="suggestion-content-wrapper">
          <p id="suggestion-content" className={isCompactMode ? 'compact-text' : ''}>
            {cleanText || (processingStep === 'thinking' ? "Thinking..." : "Listening for social cues...")}
          </p>
          {!showMinimalUI && suggestion && isPersonalizationEnabled && (
            <div className="suggestion-feedback">
               <button
                  className="feedback-btn"
                  onClick={() => submitFeedback(suggestion, 'like', persona, culturalContext, transcript, transcript)}
                  title="This cue was helpful"
                >
                  <ThumbsUp size={14} />
                </button>
                <button
                  className="feedback-btn"
                  onClick={() => submitFeedback(suggestion, 'dislike', persona, culturalContext, transcript, transcript)}
                  title="This cue was not helpful"
                >
                  <ThumbsDown size={14} />
                </button>
            </div>
          )}
        </div>
      </div>

      {settings.showCoachingInsights !== false && !showMinimalUI && (
        <>
          {!isStorageLoaded && <div className="insight-skeleton" aria-hidden="true" />}
          
          {isStorageLoaded && activeInsight && (
            <InsightCard
              activeInsight={activeInsight}
              visibleInsights={visibleInsights}
              currentInsightIndex={currentInsightIndex}
              currentCopingIndex={copingIndices[activeInsight.id] || 0}
              coachingInsights={coachingInsights}
              isCompactMode={isCompactMode}
              showSubtleCoaching={settings.showSubtleCoaching}
              showInfo={showInfo}
              onToggleInfo={() => setShowInfo(!showInfo)}
              onPrevInsight={handlePrevInsight}
              onNextInsight={handleNextInsight}
              onDismiss={handleDismiss}
              onNextCoping={handleNextCoping}
              onFeedback={handleInsightFeedback}
              isPersonalizationEnabled={isPersonalizationEnabled}
              insightId={activeInsight.id}
            />
          )}

          {allInsightsDismissed && (
            <div className="card insight-card default-insight compact-insight" role="status">
              <div className="card-header">
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-500" />
                  <label>All Caught Up</label>
                </div>
                <button 
                  className="btn-close-sm" 
                  onClick={handleDismissAllCaughtUp}
                  title="Hide message"
                  aria-label="Hide message"
                >
                  <X size={14} />
                </button>
              </div>
              <p className="insight-text">
                You've dismissed all current coaching insights. New, personalized tips will appear based on your next conversation. 
                Try sharing more about your day or a specific challenge to get tailored advice.
              </p>
              <CoachingDisclaimer compact={isCompactMode} />
            </div>
          )}
        </>
      )}

      {!showMinimalUI && !isCompactMode && (
        <div className={`card transcript ${transcript || conversationTurns.length > 0 ? 'visible' : ''}`} role="region" aria-labelledby="transcript-label">
          <div className="card-header">
            <label id="transcript-label">Recent Context</label>
            <button className="btn-action-sm" onClick={handleClear} title="Clear Context">
              <Trash2 size={14} />
            </button>
          </div>
          <div id="transcript-content">
            {conversationTurns.length > 0 ? (
              formattedConversation
            ) : (
              <p>{transcript || "Waiting for speech..."}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DisplayArea;
