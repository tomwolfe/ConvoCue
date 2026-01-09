import React from 'react';
import { Mic, Heart } from 'lucide-react';

const ControlPanel = ({
  isReady,
  isVADMode,
  vadLoading,
  vadErrored,
  vadError,
  handleManualTrigger,
  toggleVAD,
  isCompactMode
}) => {
  return (
    <div className="controls" role="group" aria-label="Control buttons">
      <button
        className={`btn-control pulse ${!isVADMode ? 'active' : ''} ${isCompactMode ? 'compact' : ''}`}
        onClick={handleManualTrigger}
        disabled={!isReady || isVADMode || vadLoading || (vadErrored && !vadError)}
        title="Manual Mode: Tap to analyze specific moments"
      >
        <div className="icon-circle">
          <Mic size={isCompactMode ? 20 : 28} />
        </div>
        {!isCompactMode && <span>Manual</span>}
      </button>

      <button
        className={`btn-control heartbeat-btn ${isVADMode ? 'active' : ''} ${isCompactMode ? 'compact' : ''}`}
        onClick={toggleVAD}
        disabled={(!isReady && !isVADMode) || vadLoading || (vadErrored && !vadError)}
        title="Continuous Mode: AI listens and updates in real-time"
      >
        <div className="icon-circle">
          <Heart size={isCompactMode ? 20 : 28} fill={isVADMode ? "white" : "none"} />
        </div>
        {!isCompactMode && <span>Continuous</span>}
      </button>
    </div>
  );
};

export default ControlPanel;
