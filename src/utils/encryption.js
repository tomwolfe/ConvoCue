/**
 * @fileoverview Encryption utilities for secure data storage using Web Crypto API
 */

// Import crypto-js for fallback in non-browser environments
import CryptoJS from 'crypto-js';

// Key for encryption - in a real app, this should be derived from a user secret
// For this prototype, we'll use a fixed but more secure approach than btoa
const ENCRYPTION_KEY_ID = 'convocue_storage_key';
const CRYPTO_JS_KEY = 'convocue_cryptojs_key';

/**
 * Checks if Web Crypto API is available
 * @returns {boolean}
 */
function isCryptoAvailable() {
  // Check if we're in a browser environment with Web Crypto API
  if (typeof window !== 'undefined' && typeof crypto !== 'undefined' && crypto.subtle) {
    // Additional checks for TextEncoder/TextDecoder
    if (typeof TextEncoder !== 'undefined' && typeof TextDecoder !== 'undefined') {
      return true;
    }
  }

  return false;
}

/**
 * Gets or generates a fallback encryption key for crypto-js
 * @returns {string}
 */
function getCryptoJSKey() {
  let key = localStorage.getItem(CRYPTO_JS_KEY);
  if (!key) {
    // Generate a random key
    key = CryptoJS.lib.WordArray.random(256/8).toString();
    localStorage.setItem(CRYPTO_JS_KEY, key);
  }
  return key;
}

/**
 * Gets or generates an encryption key
 * @returns {Promise<CryptoKey>}
 */
async function getEncryptionKey() {
  // Check if we're in a Node.js environment or if crypto is not available
  if (!isCryptoAvailable()) {
    console.warn('Web Crypto API not available. Using fallback encryption.');
    // Return a mock key for testing environments
    return null;
  }

  const storedKey = localStorage.getItem(ENCRYPTION_KEY_ID);

  if (storedKey) {
    try {
      const keyData = JSON.parse(atob(storedKey));
      return await crypto.subtle.importKey(
        'jwk',
        keyData,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
    } catch (_e) {
      console.error('Failed to import encryption key, generating new one');
    }
  }

  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  const jwk = await crypto.subtle.exportKey('jwk', key);
  localStorage.setItem(ENCRYPTION_KEY_ID, btoa(JSON.stringify(jwk)));

  return key;
}

/**
 * Encrypts data using AES-GCM
 * @param {any} data - Data to encrypt
 * @returns {Promise<string>} - Base64 encoded encrypted data
 */
export const encryptData = async (data) => {
  try {
    // If crypto is not available, use crypto-js as fallback
    if (!isCryptoAvailable()) {
      console.warn('Web Crypto API not available. Using crypto-js fallback for encryption.');
      try {
        // Use crypto-js for encryption in non-browser environments
        const key = getCryptoJSKey();
        const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
        // Return the ciphertext as is (crypto-js already handles encoding)
        return ciphertext;
      } catch (fallbackError) {
        console.error('Crypto-js encryption failed:', fallbackError);
        // As a last resort, return base64 encoded JSON (not secure)
        console.warn('Falling back to base64 encoding (not encrypted) as final fallback.');
        return btoa(JSON.stringify(data));
      }
    }

    const key = await getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(JSON.stringify(data));

    const encryptedContent = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedData
    );

    // Combine IV and encrypted content
    const combined = new Uint8Array(iv.length + encryptedContent.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedContent), iv.length);

    // Convert to base64
    return btoa(String.fromCharCode.apply(null, combined));
  } catch (e) {
    console.error('Encryption failed:', e);
    return null;
  }
};

/**
 * Decrypts data using AES-GCM
 * @param {string} encryptedDataBase64 - Base64 encoded encrypted data
 * @returns {Promise<any>} - Decrypted data
 */
export const decryptData = async (encryptedDataBase64) => {
  try {
    if (!encryptedDataBase64) return null;

    // If crypto is not available, try crypto-js decryption first, then fallback
    if (!isCryptoAvailable()) {
      try {
        // First, try to decrypt with crypto-js (most likely case when Web Crypto is unavailable)
        const key = getCryptoJSKey();
        const bytes = CryptoJS.AES.decrypt(encryptedDataBase64, key);
        const decryptedData = bytes.toString(CryptoJS.enc.Utf8);

        if (decryptedData) {
          return JSON.parse(decryptedData);
        }
      } catch (cryptoJsError) {
        console.error('Crypto-js decryption failed:', cryptoJsError);
      }

      // If crypto-js fails, try the original base64 fallback
      try {
        // For testing environments, just decode the base64 JSON
        return JSON.parse(atob(encryptedDataBase64));
      } catch (parseError) {
        console.error('Fallback decryption failed:', parseError);
        return null;
      }
    }

    const key = await getEncryptionKey();
    const combined = new Uint8Array(
      atob(encryptedDataBase64).split('').map(char => char.charCodeAt(0))
    );

    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const decryptedContent = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    return JSON.parse(new TextDecoder().decode(decryptedContent));
  } catch (e) {
    console.error('Decryption failed:', e);
    return null;
  }
};

/**
 * Securely store data in localStorage with encryption (Async)
 * 
 * @param {string} key - Storage key
 * @param {any} data - Data to store
 */
export const secureLocalStorageSet = async (key, data) => {
  const encryptedData = await encryptData(data);
  if (encryptedData) {
    localStorage.setItem(key, encryptedData);
  }
};

/**
 * Securely retrieve data from localStorage with decryption (Async)
 * 
 * @param {string} key - Storage key
 * @param {any} defaultValue - Default value if not found
 * @returns {Promise<any>} - Decrypted data
 */
export const secureLocalStorageGet = async (key, defaultValue = null) => {
  try {
    const encryptedData = localStorage.getItem(key);
    if (!encryptedData) return defaultValue;
    
    const decryptedData = await decryptData(encryptedData);
    return decryptedData !== null ? decryptedData : defaultValue;
  } catch (e) {
    console.error('Secure get failed:', e);
    return defaultValue;
  }
};
