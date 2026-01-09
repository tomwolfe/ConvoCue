import React, { useMemo, useState, useEffect } from 'react';
import { 
  Trash2, Copy, Check, RefreshCw, ThumbsUp, ThumbsDown, 
  Flag, User, Users, AlertTriangle, Zap, Target, 
  MessageCircle, Heart, X, ChevronLeft, ChevronRight, Info 
} from 'lucide-react';
import { AppConfig } from '../../config';
import { CoachingConfig } from '../../config/coachingConfig';
import { submitFeedback } from '../../utils/feedback';
import { overrideSpeakerForTurn } from '../../conversationManager';
import { parseSemanticTags } from '../../utils/intentRecognition';
import { secureLocalStorageGet, secureLocalStorageSet } from '../../utils/encryption';

const TagIcon = ({ name, size = 14 }) => {
  switch (name) {
    case 'AlertTriangle': return <AlertTriangle size={size} />;
    case 'Zap': return <Zap size={size} />;
    case 'Target': return <Target size={size} />;
    case 'MessageCircle': return <MessageCircle size={size} />;
    case 'Heart': return <Heart size={size} />;
    default: return null;
  }
};

const DisplayArea = ({
  transcript,
  suggestion,
  processingStep,
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
  const [currentCopingIndex, setCurrentCopingIndex] = useState(0);
  const [dismissedInsights, setDismissedInsights] = useState(new Set());
  const [showInfo, setShowInfo] = useState(false);
  const [isStorageLoaded, setIsStorageLoaded] = useState(false);

  // Determine if feedback should be enabled based on settings
  const isPersonalizationEnabled = settings.enablePersonalization !== false && !settings.privacyMode;

  // Load dismissed insights from persistence
  useEffect(() => {
    const loadDismissed = async () => {
      const saved = await secureLocalStorageGet('dismissed_coaching_insights', []);
      setDismissedInsights(new Set(saved));
      setIsStorageLoaded(true);
    };
    loadDismissed();
  }, []);

  // Reset indices when persona or insights change
  useEffect(() => {
    setCurrentInsightIndex(0);
    setCurrentCopingIndex(0);
  }, [persona, coachingInsights]);

  // Extract all relevant insights based on persona and config
  const allInsights = useMemo(() => {
    if (!coachingInsights) return [];
    
    const config = CoachingConfig[persona] || CoachingConfig.default;
    const rawInsights = config.insightPath(coachingInsights) || [];
    
    return rawInsights.map(insight => ({
      ...insight,
      config
    }));
  }, [coachingInsights, persona]);

  // Filter out dismissed insights and get current one
  const visibleInsights = useMemo(() => 
    allInsights.filter((_, idx) => !dismissedInsights.has(`${persona}-${idx}`)),
  [allInsights, dismissedInsights, persona]);

  const activeInsight = visibleInsights[currentInsightIndex] || null;

  const handleDismiss = () => {
    const originalIndex = allInsights.indexOf(activeInsight);
    setDismissedInsights(prev => {
      const id = `${persona}-${originalIndex}`;
      const next = new Set(prev).add(id);
      secureLocalStorageSet('dismissed_coaching_insights', Array.from(next));
      return next;
    });
    if (currentInsightIndex >= visibleInsights.length - 1 && currentInsightIndex > 0) {
      setCurrentInsightIndex(prev => prev - 1);
    }
    setCurrentCopingIndex(0);
  };

  const handleNextInsight = (e) => {
    e.stopPropagation();
    setCurrentInsightIndex(prev => (prev + 1) % visibleInsights.length);
    setCurrentCopingIndex(0);
  };

  const handlePrevInsight = (e) => {
    e.stopPropagation();
    setCurrentInsightIndex(prev => (prev - 1 + visibleInsights.length) % visibleInsights.length);
    setCurrentCopingIndex(0);
  };

  const handleNextCoping = (e, total) => {
    e.stopPropagation();
    setCurrentCopingIndex(prev => (prev + 1) % total);
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
      {activeInsight && !showMinimalUI && isStorageLoaded && (
        <div 
          className={`card insight-card ${activeInsight.config.className} ${activeInsight.config.pattern} ${isCompactMode ? 'compact-insight' : ''}`} 
          role="complementary"
          aria-label={activeInsight.config.ariaLabel}
        >
          <div className="card-header">
            <div className="flex items-center gap-2">
              {activeInsight.config.icon}
              <label>{activeInsight.config.title}</label>
              {visibleInsights.length > 1 && (
                <div className="insight-navigation" role="group" aria-label="Insight navigation">
                  <button className="insight-action-btn" onClick={handlePrevInsight} aria-label="Previous insight">
                    <ChevronLeft size={12} />
                  </button>
                  <div className="flex gap-1">
                    {visibleInsights.map((_, idx) => (
                      <div key={idx} className={`nav-dot ${idx === currentInsightIndex ? 'active' : ''}`} />
                    ))}
                  </div>
                  <button className="insight-action-btn" onClick={handleNextInsight} aria-label="Next insight">
                    <ChevronRight size={12} />
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="insight-badge">{activeInsight.category || 'Focus'}</span>
              <button 
                className="insight-action-btn dismiss-btn" 
                onClick={handleDismiss}
                title="Dismiss insight"
                aria-label="Dismiss insight"
              >
                <X size={14} />
              </button>
            </div>
          </div>
          
          <p className="insight-text">
            {showInfo ? `Logic: Based on ${activeInsight.category} pattern with ${activeInsight.priority} priority.` : activeInsight.insight}
          </p>
          
          <div className="insight-footer">
            <div className="coping-wrapper">
              {(() => {
                const strategies = activeInsight.config.copingPath(coachingInsights);
                if (!strategies || strategies.length === 0) return null;
                const strategy = strategies[currentCopingIndex] || strategies[0];
                return (
                  <div className="coping-strategy">
                    <Zap size={14} />
                    <span>Tip: {strategy.technique || strategy.insight || 'Try this strategy'}</span>
                    {strategies.length > 1 && (
                      <button 
                        className="insight-action-btn" 
                        onClick={(e) => handleNextCoping(e, strategies.length)}
                        title="Next tip"
                        aria-label="Next tip"
                      >
                        <RefreshCw size={12} />
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
            
            <div className="insight-actions">
              <button 
                className={`insight-action-btn ${showInfo ? 'active' : ''}`}
                onClick={() => setShowInfo(!showInfo)}
                title="Why am I seeing this?"
              >
                <Info size={14} />
              </button>
              {isPersonalizationEnabled && (
                <>
                  <button 
                    className="insight-action-btn"
                    onClick={() => submitFeedback(activeInsight.insight, 'like', `insight-${persona}`, culturalContext)}
                    title="Helpful"
                  >
                    <ThumbsUp size={14} />
                  </button>
                  <button 
                    className="insight-action-btn"
                    onClick={() => submitFeedback(activeInsight.insight, 'dislike', `insight-${persona}`, culturalContext)}
                    title="Not helpful"
                  >
                    <ThumbsDown size={14} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className={`card suggestion ${suggestion || processingStep === 'thinking' ? 'visible' : ''} ${processingStep === 'thinking' ? 'thinking' : ''} ${isCompactMode ? 'compact-suggestion' : ''} ${showMinimalUI ? 'minimal-suggestion' : ''}`} role="region" aria-labelledby="suggestion-label">
        <div className="card-header">
          {!showMinimalUI && (
            <div className="flex items-center gap-2">
              <label id="suggestion-label">{AppConfig.models.personas[persona]?.label || 'Coaching Cue'}</label>
              <div className="glance-indicators">
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
                className="btn-icon"
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
                className="btn-icon"
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
                  className="btn-icon feedback-btn"
                  onClick={() => submitFeedback(suggestion, 'like', persona, culturalContext, transcript, transcript)}
                  title="Helpful"
                >
                  <ThumbsUp size={16} />
                </button>
                <button
                  className="btn-icon feedback-btn"
                  onClick={() => submitFeedback(suggestion, 'dislike', persona, culturalContext, transcript, transcript)}
                  title="Not helpful"
                >
                  <ThumbsDown size={16} />
                </button>
            </div>
          )}
        </div>
      </div>

      {!showMinimalUI && !isCompactMode && (
        <div className={`card transcript ${transcript || conversationTurns.length > 0 ? 'visible' : ''}`} role="region" aria-labelledby="transcript-label">
          <div className="card-header">
            <label id="transcript-label">Recent Context</label>
            <button className="btn-icon" onClick={handleClear} title="Clear Context">
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
