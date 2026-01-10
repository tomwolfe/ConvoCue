/**
 * Ethics Analytics Utility
 * Tracks safety guardrail triggers and empathy promotions for future refinement.
 */

import { secureLocalStorageGet, secureLocalStorageSet } from './encryption';

const ETHICS_EVENTS_KEY = 'convocue_ethics_events';
const MAX_EVENTS = 100;

/**
 * Tracks an ethics-related event
 * @param {string} eventType - Type of event (e.g., 'harmful_pattern_blocked')
 * @param {Object} details - Event details
 */
export const trackEthicsEvent = async (eventType, details = {}) => {
  try {
    const events = await secureLocalStorageGet(ETHICS_EVENTS_KEY, []);
    
    const newEvent = {
      eventType,
      ...details,
      timestamp: Date.now(),
    };
    
    // Add to start of array and limit size
    const updatedEvents = [newEvent, ...events].slice(0, MAX_EVENTS);
    
    await secureLocalStorageSet(ETHICS_EVENTS_KEY, updatedEvents);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[EthicsAnalytics] Tracked: ${eventType}`, details);
    }
  } catch (error) {
    console.error('Failed to track ethics event:', error);
  }
};

/**
 * Retrieves ethics event history
 * @returns {Promise<Array>}
 */
export const getEthicsEvents = async () => {
  return await secureLocalStorageGet(ETHICS_EVENTS_KEY, []);
};

/**
 * Clears ethics event history
 */
export const clearEthicsEvents = async () => {
  await secureLocalStorageSet(ETHICS_EVENTS_KEY, []);
};
