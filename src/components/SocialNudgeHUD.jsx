import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useMLWorker } from '../hooks/useMLWorker';
import { provideIntentHaptics } from '../utils/haptics';
import { trackSystemEvent } from '../utils/systemAnalytics';
import { getNudgeConfig } from '../utils/culturalNudgeLogic';
import styles from './SocialNudgeHUD.module.css';

/**
 * Pareto Feature #1: Social Nudge HUD (Culturally Adaptive)
 * Provides real-time visual and haptic cues based on conversation flow,
 * calibrated by detected cultural context to avoid Western-centric bias.
 */
const SocialNudgeHUD = () => {
  const { engagement, detectedIntent, isProcessing, settings, culturalContext } = useMLWorker();
  
  // State for tracking dismissals
  const [dismissedId, setDismissedId] = useState(null);
  const [prevNudgeId, setPrevNudgeId] = useState(null);

  // Logic: Pareto-optimal coaching rules (Now Culturally Aware)
  const nudge = useMemo(() => {
    return getNudgeConfig(culturalContext, engagement, detectedIntent);
  }, [culturalContext, engagement, detectedIntent]);

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
        provideIntentHaptics(nudge.hapticId || nudge.id);
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
  }, [nudge.id, nudge.hapticId, nudge.intensity, settings?.hapticsEnabled, dismissedId]);

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
