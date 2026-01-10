/**
 * @fileoverview Engagement and abandonment tracking for ConvoCue
 */
import { secureLocalStorageGet, secureLocalStorageSet } from './encryption';

/**
 * Tracks a cue being displayed to the user
 * @param {string} cueType - 'suggestion' or 'subtle'
 * @param {string} persona - Current persona
 */
export const trackCueDisplayed = async (cueType, persona) => {
  try {
    const stats = await secureLocalStorageGet('convocue_engagement_stats', {
      totalCues: 0,
      interactions: 0,
      byType: {
        suggestion: { total: 0, interactions: 0 },
        subtle: { total: 0, interactions: 0 }
      },
      byPersona: {}
    });

    stats.totalCues++;
    if (!stats.byType[cueType]) {
      stats.byType[cueType] = { total: 0, interactions: 0 };
    }
    stats.byType[cueType].total++;

    if (!stats.byPersona[persona]) {
      stats.byPersona[persona] = { total: 0, interactions: 0 };
    }
    stats.byPersona[persona].total++;

    await secureLocalStorageSet('convocue_engagement_stats', stats);
  } catch (e) {
    console.error('Failed to track cue display:', e);
  }
};

/**
 * Tracks an interaction with a cue (feedback given)
 * @param {string} cueType - 'suggestion' or 'subtle'
 * @param {string} persona - Current persona
 */
export const trackInteraction = async (cueType, persona) => {
  try {
    const stats = await secureLocalStorageGet('convocue_engagement_stats', {
      totalCues: 0,
      interactions: 0,
      byType: {
        suggestion: { total: 0, interactions: 0 },
        subtle: { total: 0, interactions: 0 }
      },
      byPersona: {}
    });

    stats.interactions++;
    if (stats.byType[cueType]) {
      stats.byType[cueType].interactions++;
    }
    
    if (stats.byPersona[persona]) {
      stats.byPersona[persona].interactions++;
    }

    await secureLocalStorageSet('convocue_engagement_stats', stats);
  } catch (e) {
    console.error('Failed to track interaction:', e);
  }
};

/**
 * Calculates the current abandonment rate
 * @returns {Promise<Object>} Engagement metrics including abandonment rate
 */
export const calculateEngagementMetrics = async () => {
  try {
    const stats = await secureLocalStorageGet('convocue_engagement_stats', {
      totalCues: 0,
      interactions: 0,
      byType: {
        suggestion: { total: 0, interactions: 0 },
        subtle: { total: 0, interactions: 0 }
      }
    });

    if (stats.totalCues === 0) {
      return { abandonmentRate: 0, totalCues: 0, interactions: 0 };
    }

    const abandonmentRate = 1 - (stats.interactions / stats.totalCues);
    
    // Calculate by type
    const suggestionAbandonment = stats.byType.suggestion.total > 0 
      ? 1 - (stats.byType.suggestion.interactions / stats.byType.suggestion.total)
      : 0;
      
    const subtleAbandonment = stats.byType.subtle.total > 0
      ? 1 - (stats.byType.subtle.interactions / stats.byType.subtle.total)
      : 0;

    return {
      abandonmentRate,
      totalCues: stats.totalCues,
      interactions: stats.interactions,
      byType: {
        suggestion: suggestionAbandonment,
        subtle: subtleAbandonment
      }
    };
  } catch (e) {
    console.error('Failed to calculate metrics:', e);
    return { abandonmentRate: 0, totalCues: 0, interactions: 0 };
  }
};

/**
 * Logs a session completion for abandonment tracking
 */
export const logSessionCompletion = async () => {
  // Logic to track sessions that were actually useful
  const timestamp = Date.now();
  await secureLocalStorageSet('convocue_last_session_completion', timestamp);
};
