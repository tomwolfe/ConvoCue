import { useEffect } from 'react';
import { eventBus } from '../utils/eventBus';

/**
 * Custom hook for subscribing to eventBus events with automatic cleanup.
 * 
 * @param {string} eventName - The name of the event to listen for.
 * @param {Function} handler - The callback function when the event is emitted.
 * @param {Array} deps - Dependency array for the effect.
 */
export const useEvent = (eventName, handler, deps = []) => {
  useEffect(() => {
    if (!eventName || typeof handler !== 'function') return;

    eventBus.on(eventName, handler);
    
    return () => {
      eventBus.off(eventName, handler);
    };
  }, [eventName, handler, ...deps]);
};
