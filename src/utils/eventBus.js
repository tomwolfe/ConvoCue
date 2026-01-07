import mitt from 'mitt';

/**
 * Centralized Event Bus for ConvoCue
 * Replaces global window.dispatchEvent to avoid namespace collisions
 */
export const eventBus = mitt();

// Event names constants to prevent typos
export const EVENTS = {
  CONVERSATION_UPDATED: 'convocue:conversation_updated',
  PREFERENCES_CHANGED: 'convocue:preferences_changed',
  SETTINGS_CHANGED: 'convocue:settings_changed',
  FEEDBACK_SUBMITTED: 'convocue:feedback_submitted',
  SUBTLE_FEEDBACK_SUBMITTED: 'convocue:subtle_feedback_submitted',
  PERFORMANCE_ALERT: 'convocue:performance_alert'
};
