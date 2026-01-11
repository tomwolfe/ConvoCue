import React, { useMemo, useState } from 'react';
import { X, Info } from 'lucide-react';
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
  const { engagement, detectedIntent, isProcessing, settings, culturalContext, coachingInsights } = useMLWorker();
  
  // State for tracking dismissals and tooltips
  const [dismissedId, setDismissedId] = useState(null);
  const [prevNudgeId, setPrevNudgeId] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);

  // Use detected context if available, fallback to manual
  const effectiveCulture = useMemo(() => {
    return coachingInsights?.cultural?.primaryCulture || culturalContext || 'general';
  }, [coachingInsights, culturalContext]);

  // Logic: Pareto-optimal coaching rules (Now Culturally Aware)
  const nudge = useMemo(() => {
    return getNudgeConfig(effectiveCulture, engagement, detectedIntent);
  }, [effectiveCulture, engagement, detectedIntent]);

  // Calibration Explanation (User Education)
  const calibrationReason = useMemo(() => {
    if (effectiveCulture === 'general') return 'Using balanced defaults for general interaction.';
    return `Calibrated for ${effectiveCulture} communication style.`;
  }, [effectiveCulture]);

  // Adjust state when nudge changes - React pattern for adjusting state based on props/memoized values
  if (nudge.id !== prevNudgeId) {
    setPrevNudgeId(nudge.id);
    // Auto-reset dismissal when a NEW high-intensity nudge appears
    if (nudge.intensity > 0) {
      setDismissedId(null);
      setShowTooltip(false);
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
        }, settings?.privacyMode);
      }
    }
    // We only want to trigger haptics when the nudge ID changes or dismissal is reset
  }, [nudge.id, nudge.hapticId, nudge.intensity, settings?.hapticsEnabled, dismissedId, settings?.privacyMode]);

  if (dismissedId === nudge.id) return null;
  if (!isProcessing && (!engagement || engagement.totalTurns === 0)) return null;

  // Determine animation class
  const animationClass = nudge.intensity > 1 
    ? styles.pulseActive 
    : (nudge.id === 'SUCCESS' ? styles.softGlowActive : '');

  return (
    <div className={styles.nudgeHudWrapper}>
      <div className={styles.nudgeHudContainer} style={{ borderLeft: `8px solid ${nudge.color}` }}>
        <div className={styles.nudgeContent}>
          <span className={styles.nudgeLabel}>{nudge.label}</span>
          {engagement && engagement.totalTurns > 0 && (
            <span className={styles.nudgeSubtext}>
              {engagement.isGroupMode ? 'Group Mode' : 'Talk Ratio'}: {Math.round(engagement.talkRatio * 100)}%
            </span>
          )}
        </div>
        <div className={styles.nudgeActions}>
          <button 
            className={styles.nudgeInfoBtn}
            onClick={() => setShowTooltip(!showTooltip)}
            aria-label="Why this nudge?"
          >
            <Info size={14} />
          </button>
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
      {showTooltip && (
        <div className={styles.nudgeTooltip}>
          {calibrationReason}
        </div>
      )}
    </div>
  );
};

export default SocialNudgeHUD;
