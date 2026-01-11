import React, { useMemo, useEffect } from 'react';
import { useMLWorker } from '../hooks/useMLWorker';
import { provideIntentHaptics } from '../utils/haptics';
import './SocialNudgeHUD.css';

/**
 * Pareto Feature #1: Social Nudge HUD
 * Provides real-time visual and haptic cues based on conversation flow.
 * Maximizes impact by giving immediate, actionable feedback during live interactions.
 */
const SocialNudgeHUD = () => {
  const { engagement, detectedIntent, isProcessing, settings } = useMLWorker();

  // Logic: Pareto-optimal coaching rules
  const nudge = useMemo(() => {
    if (!engagement || engagement.totalTurns === 0) {
      return { color: '#666', label: 'Listening...', intensity: 0, id: 'IDLE' };
    }

    const { talkRatio } = engagement;
    
    // Rule 1: Dominating the conversation (> 60% talk time)
    if (talkRatio > 0.6 && engagement.totalTurns > 4) {
      return { color: '#ff4b2b', label: 'Pause & Listen', intensity: 2, id: 'CONFLICT' };
    }
    
    // Rule 2: Critical Intent Detected
    if (detectedIntent === 'CONFLICT' || detectedIntent === 'MISUNDERSTANDING') {
      return { color: '#ffcc00', label: 'Clarify Intent', intensity: 1, id: 'QUESTION' };
    }

    // Rule 3: Empathy opportunity
    if (detectedIntent === 'EMPATHY') {
      return { color: '#fce7f3', label: 'Show Support', intensity: 1, id: 'EMPATHY' };
    }

    // Rule 4: Balanced Flow
    if (talkRatio > 0.3 && talkRatio < 0.5) {
      return { color: '#00e676', label: 'Great Flow', intensity: 0, id: 'SUCCESS' };
    }

    return { color: '#2979ff', label: 'Engage More', intensity: 0, id: 'SUGGESTION' };
  }, [engagement, detectedIntent]);

  // Trigger Haptics on Nudge Change
  useEffect(() => {
    // Only trigger haptics for "warning" or "action" nudges to avoid fatigue
    if (settings?.hapticsEnabled !== false && nudge.intensity > 0) {
      provideIntentHaptics(nudge.id);
    }
  }, [nudge.id, settings?.hapticsEnabled, nudge.intensity]);

  if (!isProcessing && (!engagement || engagement.totalTurns === 0)) return null;

  return (
    <div className="nudge-hud-container" style={{ borderLeft: `8px solid ${nudge.color}` }}>
      <div className="nudge-content">
        <span className="nudge-label">{nudge.label}</span>
        {engagement && engagement.totalTurns > 0 && (
          <span className="nudge-subtext">Talk Ratio: {Math.round(engagement.talkRatio * 100)}%</span>
        )}
      </div>
      <div className="nudge-indicator-mini">
        <div 
          className="nudge-pulse" 
          style={{ 
            backgroundColor: nudge.color, 
            animation: nudge.intensity > 1 ? 'nudgePulse 1s infinite' : 'none' 
          }} 
        />
      </div>
    </div>
  );
};

export default SocialNudgeHUD;
