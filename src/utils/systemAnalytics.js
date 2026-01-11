/**
 * System Analytics Utility
 * Tracks non-fatal system events, errors, and performance metrics.
 */

import { secureLocalStorageGet, secureLocalStorageSet } from './encryption';

const SYSTEM_EVENTS_KEY = 'convocue_system_events';
const MAX_EVENTS = 200;

/**
 * Tracks a system-level event
 * @param {string} eventType - Type of event (e.g., 'haptics_failure', 'wasm_load_retry')
 * @param {Object} details - Event details
 */
export const trackSystemEvent = async (eventType, details = {}) => {
  try {
    const events = await secureLocalStorageGet(SYSTEM_EVENTS_KEY, []);
    
    const newEvent = {
      eventType,
      ...details,
      timestamp: Date.now(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
    };
    
    // Add to start of array and limit size
    const updatedEvents = [newEvent, ...events].slice(0, MAX_EVENTS);
    
    await secureLocalStorageSet(SYSTEM_EVENTS_KEY, updatedEvents);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SystemAnalytics] Tracked: ${eventType}`, details);
    }
  } catch (error) {
    // Fail silently but log to console
    console.error('Failed to track system event:', error);
  }
};

/**
 * Retrieves system event history
 * @returns {Promise<Array>}
 */
export const getSystemEvents = async () => {
  return await secureLocalStorageGet(SYSTEM_EVENTS_KEY, []);
};

/**
 * Clears system event history
 */
export const clearSystemEvents = async () => {
  await secureLocalStorageSet(SYSTEM_EVENTS_KEY, []);
};
