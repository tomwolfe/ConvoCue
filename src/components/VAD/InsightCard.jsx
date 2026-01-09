import React from 'react';
import { ChevronLeft, ChevronRight, X, Info, Zap, ThumbsUp, ThumbsDown, RefreshCw } from 'lucide-react';

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

const CopingTip = ({ strategies, currentCopingIndex, onNextCoping }) => {
  if (!strategies || strategies.length === 0) return null;
  const strategy = strategies[currentCopingIndex] || strategies[0];

  return (
    <div className="coping-strategy">
      <Zap size={14} />
      <span>Tip: {strategy.technique || strategy.insight || 'Try this strategy'}</span>
      {strategies.length > 1 && (
        <button 
          className="insight-action-btn" 
          onClick={(e) => onNextCoping(e, strategies.length)}
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
  showInfo,
  onToggleInfo,
  onPrevInsight,
  onNextInsight,
  onDismiss,
  onNextCoping,
  onFeedback,
  isPersonalizationEnabled
}) => {
  if (!activeInsight) return null;

  const strategies = activeInsight.config.copingPath(coachingInsights);

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
          <InsightNavigation 
            visibleInsights={visibleInsights} 
            currentInsightIndex={currentInsightIndex} 
            onPrev={onPrevInsight} 
            onNext={onNextInsight} 
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="insight-badge">{activeInsight.category || 'Focus'}</span>
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
        {showInfo ? `Logic: Based on ${activeInsight.category} pattern with ${activeInsight.priority} priority.` : activeInsight.insight}
      </p>
      
      <div className="insight-footer">
        <div className="coping-wrapper">
          <CopingTip 
            strategies={strategies} 
            currentCopingIndex={currentCopingIndex} 
            onNextCoping={onNextCoping} 
          />
        </div>
        
        <div className="insight-actions">
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
                onClick={() => onFeedback(activeInsight.category, 'like')}
                title="Helpful"
              >
                <ThumbsUp size={14} />
              </button>
              <button 
                className="insight-action-btn"
                onClick={() => onFeedback(activeInsight.category, 'dislike')}
                title="Not helpful"
              >
                <ThumbsDown size={14} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InsightCard;
