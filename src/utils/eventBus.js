import mitt from 'mitt';

/**
 * Centralized Event Bus for ConvoCue
 * Replaces global window.dispatchEvent to avoid namespace collisions
 */
const bus = mitt();

// Add debug logging in development mode
if (import.meta.env?.DEV) {
  const originalEmit = bus.emit;
  bus.emit = (type, e) => {
    console.groupCollapsed(`%c[EventBus] ${type}`, 'color: #6c5ce7; font-weight: bold;');
    console.log('Payload:', e);
    console.log('Timestamp:', new Date().toISOString());
    console.trace('Trace:');
    console.groupEnd();
    originalEmit(type, e);
  };
}

export const eventBus = bus;

// Event names constants to prevent typos
export const EVENTS = {
  CONVERSATION_UPDATED: 'convocue:conversation_updated',
  PREFERENCES_CHANGED: 'convocue:preferences_changed',
  SETTINGS_CHANGED: 'convocue:settings_changed',
  FEEDBACK_SUBMITTED: 'convocue:feedback_submitted',
  SUBTLE_FEEDBACK_SUBMITTED: 'convocue:subtle_feedback_submitted',
  PERFORMANCE_ALERT: 'convocue:performance_alert'
};
