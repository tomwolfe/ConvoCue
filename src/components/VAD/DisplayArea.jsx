import React, { useMemo } from 'react';
import { Trash2, Copy, Check, RefreshCw, ThumbsUp, ThumbsDown, Flag, User, Users, AlertTriangle, Zap, Target, MessageCircle, Heart } from 'lucide-react';
import { AppConfig } from '../../config';
import { submitFeedback } from '../../utils/feedback';
import { overrideSpeakerForTurn } from '../../conversationManager';
import { parseSemanticTags } from '../../utils/intentRecognition';

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
  settings = {}
}) => {
  // Determine if feedback should be enabled based on settings
  const isPersonalizationEnabled = settings.enablePersonalization !== false && !settings.privacyMode;

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
