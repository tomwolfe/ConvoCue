import React from 'react';
import { Mic, Heart } from 'lucide-react';
import { ML_STATES } from '../../worker/MLStateMachine';

const ControlPanel = ({
  isReady,
  isVADMode,
  vadLoading,
  vadErrored,
  vadError,
  handleManualTrigger,
  toggleVAD,
  isCompactMode,
  mlState
}) => {
  // Determine button states for better UX
  const isPartialFunctionality = mlState === ML_STATES.TEXT_ONLY_MODE;
  const manualBtnDisabled = !isReady || isVADMode || vadLoading || (vadErrored && !vadError) || isPartialFunctionality;
  const continuousBtnDisabled = (!isReady && !isVADMode) || vadLoading || (vadErrored && !vadError) || isPartialFunctionality;

  return (
    <div className="controls" role="group" aria-label="Control buttons">
      <button
        className={`btn-control pulse ${!isVADMode ? 'active' : ''} ${isCompactMode ? 'compact' : ''} ${manualBtnDisabled ? 'disabled' : ''}`}
        onClick={handleManualTrigger}
        disabled={manualBtnDisabled}
        title={isPartialFunctionality ? "Voice input unavailable in text-only mode" : "Manual Mode: Tap to analyze specific moments"}
        aria-pressed={!isVADMode}
        aria-disabled={manualBtnDisabled}
      >
        <div className="icon-circle">
          <Mic size={isCompactMode ? 20 : 28} />
        </div>
        {!isCompactMode && <span>Manual</span>}
      </button>

      <button
        className={`btn-control heartbeat-btn ${isVADMode ? 'active' : ''} ${isCompactMode ? 'compact' : ''} ${continuousBtnDisabled ? 'disabled' : ''}`}
        onClick={toggleVAD}
        disabled={continuousBtnDisabled}
        title={isPartialFunctionality ? "Voice input unavailable in text-only mode" : "Continuous Mode: AI listens and updates in real-time"}
        aria-pressed={isVADMode}
        aria-disabled={continuousBtnDisabled}
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
