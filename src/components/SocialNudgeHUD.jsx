import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useMLWorker } from '../hooks/useMLWorker';
import { provideIntentHaptics } from '../utils/haptics';
import { trackSystemEvent } from '../utils/systemAnalytics';
import styles from './SocialNudgeHUD.module.css';

/**
 * Pareto Feature #1: Social Nudge HUD (Refined)
 * Provides real-time visual and haptic cues based on conversation flow.
 * Refinements: CSS Modules, Soft Glow for positive states, Haptic failure tracking.
 */
const SocialNudgeHUD = () => {
  const { engagement, detectedIntent, isProcessing, settings } = useMLWorker();
  
  // State for tracking dismissals
  const [dismissedId, setDismissedId] = useState(null);
  const [prevNudgeId, setPrevNudgeId] = useState(null);

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

    // Rule 4: Balanced Flow (Positive State)
    if (talkRatio > 0.3 && talkRatio < 0.5) {
      return { color: '#00e676', label: 'Great Flow', intensity: 0, id: 'SUCCESS' };
    }

    return { color: '#2979ff', label: 'Engage More', intensity: 0, id: 'SUGGESTION' };
  }, [engagement, detectedIntent]);

  // Adjust state when nudge changes - React pattern for adjusting state based on props/memoized values
  if (nudge.id !== prevNudgeId) {
    setPrevNudgeId(nudge.id);
    // Auto-reset dismissal when a NEW high-intensity nudge appears
    if (nudge.intensity > 0) {
      setDismissedId(null);
    }
  }

  // Trigger Haptics on Nudge Change
  React.useEffect(() => {
    // Only trigger haptics for "warning" or "action" nudges to avoid fatigue
    if (settings?.hapticsEnabled !== false && nudge.intensity > 0 && nudge.id !== dismissedId) {
      try {
        provideIntentHaptics(nudge.id);
      } catch (error) {
        console.warn('Haptic feedback failed:', error);
        trackSystemEvent('haptics_failure', { 
          nudgeId: nudge.id, 
          error: error.message,
          intensity: nudge.intensity 
        });
      }
    }
    // We only want to trigger haptics when the nudge ID changes or dismissal is reset
  }, [nudge.id, nudge.intensity, settings?.hapticsEnabled, dismissedId]);

  if (dismissedId === nudge.id) return null;
  if (!isProcessing && (!engagement || engagement.totalTurns === 0)) return null;

  // Determine animation class
  const animationClass = nudge.intensity > 1 
    ? styles.pulseActive 
    : (nudge.id === 'SUCCESS' ? styles.softGlowActive : '');

  return (
    <div className={styles.nudgeHudContainer} style={{ borderLeft: `8px solid ${nudge.color}` }}>
      <div className={styles.nudgeContent}>
        <span className={styles.nudgeLabel}>{nudge.label}</span>
        {engagement && engagement.totalTurns > 0 && (
          <span className={styles.nudgeSubtext}>Talk Ratio: {Math.round(engagement.talkRatio * 100)}%</span>
        )}
      </div>
      <div className={styles.nudgeActions}>
        <div className={styles.nudgeIndicatorMini}>
          <div 
            className={`${styles.nudgePulse} ${animationClass}`} 
            style={{ backgroundColor: nudge.color }} 
          />
        </div>
        <button 
          className={styles.nudgeDismissBtn} 
          onClick={() => setDismissedId(nudge.id)}
          aria-label="Dismiss nudge"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default SocialNudgeHUD;
