/**
 * @fileoverview Encryption utilities for secure data storage using Web Crypto API
 * Implements privacy-first approach with client-side encryption for all persistent user data
 */

// Key for encryption - in a real app, this should be derived from a user secret
// For this prototype, we'll use a fixed but more secure approach than btoa
const ENCRYPTION_KEY_ID = 'convocue_storage_key';

/**
 * Privacy & Security Enhancement:
 * Enforces Web Crypto API availability to prevent insecure fallbacks.
 * This ensures that all data remains encrypted with industry-standard algorithms
 * and prevents a false sense of security in unsupported environments.
 */

/**
 * Checks if Web Crypto API is available
 * This function is essential for maintaining security guarantees by preventing insecure fallbacks
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
 * Gets or generates an encryption key
 * @returns {Promise<CryptoKey>}
 */
async function getEncryptionKey() {
  // Check if we're in a Node.js environment or if crypto is not available
  if (!isCryptoAvailable()) {
    throw new Error('Web Crypto API not available. Secure storage is not supported in this environment.');
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
    // If crypto is not available, throw an error instead of falling back insecurely
    if (!isCryptoAvailable()) {
      throw new Error('Web Crypto API not available. Cannot securely encrypt data.');
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

    // If crypto is not available, throw an error instead of falling back insecurely
    if (!isCryptoAvailable()) {
      throw new Error('Web Crypto API not available. Cannot securely decrypt data.');
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
