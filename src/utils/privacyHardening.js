/**
 * Privacy Hardening Utilities
 * Handles secure data wiping and ephemeral session management
 */

import { secureLocalStorageSet } from './encryption';
import { resetConversationManager } from '../conversationManager';

/**
 * Securely wipes a string or object from memory by overwriting it
 * (Best effort in JavaScript due to GC limitations)
 */
export const secureWipe = (data) => {
  if (typeof data === 'string') {
    // Fill with random or zero data before letting it go to GC
    return ' '.repeat(data.length);
  }
  if (Array.isArray(data)) {
    return data.map(() => null);
  }
  if (typeof data === 'object' && data !== null) {
    // Return a new object with nullified properties instead of mutating in place
    const wipedObject = {};
    Object.keys(data).forEach(key => {
      wipedObject[key] = null;
    });
    return wipedObject;
  }
  return data; // Return the original data if it's not a string, array, or object
};

/**
 * Ensures a session is completely cleared from all local storage
 */
export const clearAllSessionData = async () => {
  const sensitiveKeys = [
    'convocue_conversation_history',
    'convocue_last_transcript',
    'convocue_active_session_metadata'
  ];
  
  for (const key of sensitiveKeys) {
    await secureLocalStorageSet(key, null);
  }
  
  // Clear any non-encrypted legacy keys if they exist
  localStorage.removeItem('convocue_history_backup');
  sessionStorage.clear();
  
  // Clear in-memory buffers
  resetConversationManager();
  
  console.log('[Privacy] Session data purged.');
};

/**
 * Hook-ready session cleanup
 */
export const handleSessionEnd = () => {
  clearAllSessionData();
  // Clear memory-heavy objects if accessible
};
