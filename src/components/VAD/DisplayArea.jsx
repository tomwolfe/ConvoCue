import React from 'react';
import { Trash2, Copy, Check, RefreshCw, ThumbsUp, ThumbsDown, Flag, User, Users, RotateCcw } from 'lucide-react';
import { AppConfig } from '../../config';
import { submitFeedback } from '../../utils/feedback';
import { overrideSpeakerForTurn } from '../../conversationManager';

const GlanceWidget = ({ suggestion, emotionData, isProcessing }) => {
  // ... (keeping internal for now as it's small)
};

const DisplayArea = ({
  transcript,
  suggestion,
  processingStep,
  isProcessing,
  persona,
  culturalContext,
  handleClear,
  handleCopy,
  handleRefresh,
  copied,
  isCompactMode,
  showMinimalUI,
  emotionData,
  conversationTurns = [],
  conversationSentiment = null
}) => {
  // Format conversation turns for display
  const formattedConversation = conversationTurns.slice(-5).map((turn, index) => (
    <div key={index} className={`conversation-turn ${turn.role}`} aria-label={`${turn.role === 'user' ? 'You' : 'Other speaker'}: ${turn.content}`}>
      <span className="speaker-tag">
        {turn.role === 'user' ? <User size={12} style={{ marginRight: '4px' }} /> : <Users size={12} style={{ marginRight: '4px' }} />}
        {turn.role === 'user' ? 'You:' : 'Other:'}
      </span>
      <span className="turn-text">{turn.content}</span>
      {/* Manual speaker override controls */}
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
    </div>
  ));

  return (
    <div className="display-area" role="region" aria-label="Speech processing results">
      {!showMinimalUI && !isCompactMode && (
        <div className={`card transcript ${transcript || conversationTurns.length > 0 ? 'visible' : ''}`} role="region" aria-labelledby="transcript-label">
          <div className="card-header">
            <label id="transcript-label">Conversation</label>
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

      <div className={`card suggestion ${suggestion || processingStep === 'thinking' ? 'visible' : ''} ${processingStep === 'thinking' ? 'thinking' : ''} ${isCompactMode ? 'compact-suggestion' : ''} ${showMinimalUI ? 'minimal-suggestion' : ''}`} role="region" aria-labelledby="suggestion-label">
        <div className="card-header">
          {!showMinimalUI && <label id="suggestion-label">{AppConfig.models.personas[persona]?.label || 'Cue'}</label>}
          {!showMinimalUI && suggestion && (
            <div className="card-actions">
              <button
                className="btn-icon"
                onClick={() => {
                  handleCopy();
                  submitFeedback(suggestion, 'like', persona, culturalContext, transcript, transcript);
                }}
                title="Copy to clipboard"
              >
                {copied ? <Check size={14} color="#4CAF50" /> : <Copy size={14} />}
              </button>
              <button
                className="btn-icon"
                onClick={handleRefresh}
                title="New suggestion"
              >
                <RefreshCw size={14} />
              </button>
              <div className="feedback-buttons">
                <button
                  className="btn-icon feedback-btn"
                  onClick={() => submitFeedback(suggestion, 'like', persona, culturalContext, transcript, transcript)}
                  title="Like"
                >
                  <ThumbsUp size={14} />
                </button>
                <button
                  className="btn-icon feedback-btn"
                  onClick={() => submitFeedback(suggestion, 'dislike', persona, culturalContext, transcript, transcript)}
                  title="Dislike"
                >
                  <ThumbsDown size={14} />
                </button>
                <button
                  className="btn-icon feedback-btn"
                  onClick={() => submitFeedback(suggestion, 'report', persona, culturalContext, transcript, transcript)}
                  title="Report"
                >
                  <Flag size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
        <p id="suggestion-content" className={isCompactMode ? 'compact-text' : ''}>
          {suggestion || (processingStep === 'thinking' ? "Thinking..." : "Listening for cues...")}
        </p>
      </div>
    </div>
  );
};

export default DisplayArea;
