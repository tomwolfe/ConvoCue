import { AppConfig } from '../config';
import { WorkerMessenger } from '../worker/Messenger';

// Create a messenger instance for communication
const messenger = new WorkerMessenger();

/**
 * Sanitizes input text by removing potentially malicious script tags and shortening to max length.
 * @param {string} text - The text to sanitize
 * @returns {string} The sanitized text
 */
export const sanitizeText = (text) => {
    if (!text || typeof text !== 'string') {
        return '';
    }

    return text
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/vbscript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .substring(0, AppConfig.system.maxTranscriptLength);
};

/**
 * Handles progress updates from transformers.js and posts them to the main thread.
 * @param {Object} p - Progress event object from transformers.js
 * @param {string} statusPrefix - Prefix for the status message (e.g., "Loading Model")
 * @param {string} [taskId] - Optional task ID to track concurrent tasks
 */
export const throttledProgress = (p, statusPrefix, taskId) => {
    if (p.status === 'progress') {
        messenger.postMessage({ type: 'status', status: `${statusPrefix}: ${Math.round(p.progress ?? 0)}%`, progress: p.progress, taskId });
    } else if (p.status === 'initiate') {
        messenger.postMessage({ type: 'status', status: `${statusPrefix}: Initializing...`, taskId });
    } else if (p.status === 'done') {
        messenger.postMessage({ type: 'status', status: `${statusPrefix}: Ready`, taskId });
    }
};

/**
 * Validates coaching insights object to ensure it meets size and format constraints.
 * @param {Object} insights - The coaching insights object to validate
 * @returns {Object|null} Validated insights or null if invalid
 */
export const validateCoachingInsights = (insights) => {
  if (!insights) return null;

  if (typeof insights !== 'object' || Array.isArray(insights)) {
    console.warn('[Worker] Invalid coaching insights format, rejecting');
    return null;
  }

  const serialized = JSON.stringify(insights);
  if (serialized.length > (AppConfig.system.maxCoachingInsightsSize || 100000)) { 
    console.warn('[Worker] Coaching insights too large, rejecting');
    return null;
  }

  if (insights.insights && !Array.isArray(insights.insights)) {
    console.warn('[Worker] Invalid insights array format, rejecting');
    return null;
  }

      return insights;
  };
  
  /**
   * Polyfill for scheduler.yield to prevent blocking the event loop.
   * Prioritizes yielding to the main thread to keep the UI responsive.
   */
  export const yieldToMain = async () => {
      if (self.scheduler && self.scheduler.yield) {
          await self.scheduler.yield();
      } else {
          // Fallback to setTimeout for older browsers or Safari
          await new Promise(resolve => setTimeout(resolve, 0));
      }
  };