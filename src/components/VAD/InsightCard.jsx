import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X, Info, Zap, ThumbsUp, ThumbsDown, RefreshCw, MoreHorizontal } from 'lucide-react';
import CoachingDisclaimer from './CoachingDisclaimer';

const InsightNavigation = ({ visibleInsights, currentInsightIndex, onPrev, onNext }) => {
  if (visibleInsights.length <= 1) return null;

  return (
    <div className="insight-navigation" role="group" aria-label="Insight navigation">
      <button className="insight-action-btn" onClick={onPrev} aria-label="Previous insight">
        <ChevronLeft size={12} />
      </button>
      <div className="flex gap-1">
        {visibleInsights.map((_, idx) => (
          <div key={idx} className={`nav-dot ${idx === currentInsightIndex ? 'active' : ''}`} />
        ))}
      </div>
      <button className="insight-action-btn" onClick={onNext} aria-label="Next insight">
        <ChevronRight size={12} />
      </button>
    </div>
  );
};

const CopingTip = ({ strategies, currentCopingIndex, onNextCoping, insightId }) => {
  if (!strategies || strategies.length === 0) return null;
  const strategy = strategies[currentCopingIndex] || strategies[0];

  return (
    <div className="coping-strategy">
      <Zap size={14} />
      <span>Tip: {strategy.technique || strategy.insight || 'Try this strategy'}</span>
      {strategies.length > 1 && (
        <button
          className="insight-action-btn"
          onClick={(e) => onNextCoping(e, strategies.length, insightId)}
          title="Next tip"
          aria-label="Next tip"
        >
          <RefreshCw size={12} />
        </button>
      )}
    </div>
  );
};

const InsightCard = ({
  activeInsight,
  visibleInsights,
  currentInsightIndex,
  currentCopingIndex,
  coachingInsights,
  isCompactMode,
  showSubtleCoaching,
  showInfo,
  onToggleInfo,
  onPrevInsight,
  onNextInsight,
  onDismiss,
  onNextCoping,
  onFeedback,
  isPersonalizationEnabled,
  insightId
}) => {
  const [showSubtleActions, setShowSubtleActions] = useState(false);

  if (!activeInsight) return null;

  const strategies = activeInsight.config.copingPath(coachingInsights);

  const handleFeedback = (type) => {
    onFeedback(activeInsight.category, type);
    setShowSubtleActions(false);
  };

  return (
    <div 
      className={`card insight-card ${activeInsight.config.className} ${activeInsight.config.pattern} ${isCompactMode ? 'compact-insight' : ''}`} 
      role="complementary"
      aria-label={activeInsight.config.ariaLabel}
    >
      <div className="card-header">
        <div className="flex items-center gap-2">
          {activeInsight.config.icon}
          <label>{activeInsight.config.title}</label>
          {!showSubtleCoaching && (
            <InsightNavigation 
              visibleInsights={visibleInsights} 
              currentInsightIndex={currentInsightIndex} 
              onPrev={onPrevInsight} 
              onNext={onNextInsight} 
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          {!showSubtleCoaching && <span className="insight-badge">{activeInsight.category || 'Focus'}</span>}
          <button 
            className="insight-action-btn dismiss-btn" 
            onClick={onDismiss}
            title="Dismiss insight"
            aria-label="Dismiss insight"
          >
            <X size={14} />
          </button>
        </div>
      </div>
      
      <p className="insight-text">
        {(showInfo && !showSubtleCoaching) ? `Logic: Based on ${activeInsight.category} pattern with ${activeInsight.priority} priority.` : activeInsight.insight}
      </p>
      
      <div className="insight-footer">
        <div className="coping-wrapper">
          <CopingTip
            strategies={strategies}
            currentCopingIndex={currentCopingIndex}
            onNextCoping={onNextCoping}
            insightId={insightId}
          />
        </div>

        <div className="insight-actions">
          {showSubtleCoaching ? (
            <div className="subtle-actions-container">
              {showSubtleActions ? (
                <div className="flex gap-1 animate-in fade-in slide-in-from-right-2 duration-200">
                  <button
                    className="insight-action-btn"
                    onClick={() => handleFeedback('very_helpful')}
                    title="Very helpful"
                  >
                    <ThumbsUp size={12} />
                  </button>
                  <button
                    className="insight-action-btn"
                    onClick={() => handleFeedback('somewhat_helpful')}
                    title="Somewhat helpful"
                  >
                    <span className="feedback-icon">👍</span>
                  </button>
                  <button
                    className="insight-action-btn"
                    onClick={() => handleFeedback('not_helpful')}
                    title="Not helpful"
                  >
                    <ThumbsDown size={12} />
                  </button>
                  <button 
                    className="insight-action-btn"
                    onClick={() => setShowSubtleActions(false)}
                    title="Cancel"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                isPersonalizationEnabled && (
                  <button 
                    className="insight-action-btn subtle-trigger"
                    onClick={() => setShowSubtleActions(true)}
                    title="Adjust Coaching"
                    aria-label="Adjust Coaching"
                  >
                    <MoreHorizontal size={14} />
                  </button>
                )
              )}
            </div>
          ) : (
            <>
              <button 
                className={`insight-action-btn ${showInfo ? 'active' : ''}`}
                onClick={onToggleInfo}
                title="Why am I seeing this?"
              >
                <Info size={14} />
              </button>
              {isPersonalizationEnabled && (
                <>
                  <button
                    className="insight-action-btn"
                    onClick={() => handleFeedback('very_helpful')}
                    title="Very helpful"
                  >
                    <ThumbsUp size={14} />
                  </button>
                  <button
                    className="insight-action-btn"
                    onClick={() => handleFeedback('somewhat_helpful')}
                    title="Somewhat helpful"
                  >
                    <span className="feedback-icon">👍</span>
                  </button>
                  <button
                    className="insight-action-btn"
                    onClick={() => handleFeedback('not_helpful')}
                    title="Not helpful"
                  >
                    <ThumbsDown size={14} />
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
      
      <CoachingDisclaimer compact={isCompactMode} />
    </div>
  );
};

export default InsightCard;
