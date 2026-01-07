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
        className={`btn-control pulse-btn ${!isVADMode ? 'active' : ''} ${isCompactMode ? 'compact' : ''}`}
        onClick={handleManualTrigger}
        disabled={!isReady || isVADMode || vadLoading || (vadErrored && !vadError)}
        title="Manual Trigger"
      >
        <div className="icon-circle">
          <Mic size={isCompactMode ? 20 : 28} />
        </div>
        {!isCompactMode && <span>Pulse</span>}
      </button>

      <button
        className={`btn-control heartbeat-btn ${isVADMode ? 'active' : ''} ${isCompactMode ? 'compact' : ''}`}
        onClick={toggleVAD}
        disabled={(!isReady && !isVADMode) || vadLoading || (vadErrored && !vadError)}
        title="Continuous Mode"
      >
        <div className="icon-circle">
          <Heart size={isCompactMode ? 20 : 28} fill={isVADMode ? "white" : "none"} />
        </div>
        {!isCompactMode && <span>Heartbeat</span>}
      </button>
    </div>
  );
};

export default ControlPanel;
