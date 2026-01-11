import { getCommunicationStyleForCulture } from './culturalIntelligence';

/**
 * Calibrates nudge configuration based on cultural context.
 * 80/20 Pareto fix for cultural myopia in social coaching.
 * 
 * DESIGN CHOICE: The 'general' context defaults to a balanced Western-centric average 
 * (talkRatioThreshold = 0.6) but is designed to be overridden by detected 
 * high-context or direct communication styles.
 * 
 * @param {string} culturalContext - The detected cultural context (e.g., 'east-asian', 'usa')
 * @param {Object} engagement - Engagement metrics from calculateEngagement
 * @param {string} detectedIntent - The detected intent from ML worker
 * @returns {Object} Nudge configuration { color, label, intensity, id, talkRatio }
 */
export const getNudgeConfig = (culturalContext, engagement, detectedIntent) => {
  const style = getCommunicationStyleForCulture(culturalContext || 'general');
  
  // 1. Threshold Calibration (Pareto Optimal)
  // High-context cultures value silence and longer monologues/storytelling.
  // Low-context cultures value efficiency and balanced turn-taking.
  let talkRatioThreshold = 0.6; // Base default
  
  if (style.context === 'high-context' || style.directness === 'indirect' || style.directness === 'very-indirect') {
    talkRatioThreshold = 0.75; // More permissive of longer turns
  } else if (style.directness === 'direct' || style.directness === 'very-direct') {
    talkRatioThreshold = 0.55; // More strict about balanced flow
  }

  // 2. Label Calibration (Linguistic Nuance)
  // Direct labels can be perceived as aggressive in high-context cultures.
  const getLabel = (type) => {
    const isHighContext = style.context === 'high-context' || style.directness === 'indirect';
    
    const labels = {
      CONFLICT: isHighContext ? 'Observe the Space' : 'Pause & Listen',
      QUESTION: isHighContext ? 'Verify Meaning' : 'Clarify Intent',
      EMPATHY: isHighContext ? 'Hold Space' : 'Show Support',
      SUCCESS: isHighContext ? 'Harmonious Flow' : 'Great Flow',
      SUGGESTION: isHighContext ? 'Share Thought' : 'Engage More',
      IDLE: 'Listening...'
    };
    
    return labels[type] || labels.IDLE;
  };

  // 3. Intensity Calibration
  // Intensity 2 triggers haptics and animations.
  // High-context cultures get lower intensity for "dominating" to be less intrusive.
  const getHapticId = (type) => {
    if (style.context === 'high-context' && type === 'CONFLICT') {
      return 'SUGGESTION'; // Softer haptic for high-context conflict
    }
    return type;
  };

  const getIntensity = (type, baseIntensity) => {
    if (style.context === 'high-context' && type === 'CONFLICT') {
      return 1; // De-escalate nudge intensity
    }
    return baseIntensity;
  };

  // Logic: Pareto-optimal coaching rules (Calibrated)
  if (!engagement || engagement.totalTurns === 0) {
    return { color: '#666', label: getLabel('IDLE'), intensity: 0, id: 'IDLE', hapticId: 'IDLE' };
  }

  const { talkRatio } = engagement;
  
  // Rule 1: Dominating/Monologuing (Calibrated Threshold)
  if (talkRatio > talkRatioThreshold && engagement.totalTurns > 4) {
    return { 
      color: '#ff4b2b', 
      label: getLabel('CONFLICT'), 
      intensity: getIntensity('CONFLICT', 2), 
      id: 'CONFLICT',
      hapticId: getHapticId('CONFLICT')
    };
  }
  
  // Rule 2: Critical Intent Detected
  if (detectedIntent === 'CONFLICT' || detectedIntent === 'MISUNDERSTANDING') {
    return { 
      color: '#ffcc00', 
      label: getLabel('QUESTION'), 
      intensity: 1, 
      id: 'QUESTION',
      hapticId: getHapticId('QUESTION')
    };
  }

  // Rule 3: Empathy opportunity
  if (detectedIntent === 'EMPATHY') {
    return { 
      color: '#fce7f3', 
      label: getLabel('EMPATHY'), 
      intensity: 1, 
      id: 'EMPATHY',
      hapticId: getHapticId('EMPATHY')
    };
  }

  // Rule 4: Balanced Flow (Positive State)
  // Also calibrate the "balanced" range
  const balancedMin = talkRatioThreshold - 0.25;
  const balancedMax = talkRatioThreshold - 0.1;
  
  if (talkRatio >= balancedMin && talkRatio <= balancedMax) {
    return { 
      color: '#00e676', 
      label: getLabel('SUCCESS'), 
      intensity: 0, 
      id: 'SUCCESS',
      hapticId: getHapticId('SUCCESS')
    };
  }

  return { 
    color: '#2979ff', 
    label: getLabel('SUGGESTION'), 
    intensity: 0, 
    id: 'SUGGESTION',
    hapticId: getHapticId('SUGGESTION')
  };
};
