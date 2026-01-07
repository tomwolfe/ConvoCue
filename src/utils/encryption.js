/**
 * @fileoverview Encryption utilities for secure data storage
 */

/**
 * Simple encryption/encoding for localStorage data
 * Note: This is a basic implementation for demonstration
 * In production, use proper encryption with user keys
 * 
 * @param {any} data - Data to encrypt
 * @returns {string} - Encrypted/encoded data
 */
export const encryptData = (data) => {
  try {
    // Simple encoding for now - in production use proper encryption
    const jsonString = JSON.stringify(data);
    return btoa(encodeURIComponent(jsonString));
  } catch (e) {
    console.error('Encryption failed:', e);
    return null;
  }
};

/**
 * Simple decryption/decoding for localStorage data
 * 
 * @param {string} encryptedData - Encrypted/encoded data
 * @returns {any} - Decrypted data
 */
export const decryptData = (encryptedData) => {
  try {
    if (!encryptedData) return null;
    const jsonString = decodeURIComponent(atob(encryptedData));
    return JSON.parse(jsonString);
  } catch (e) {
    console.error('Decryption failed:', e);
    return null;
  }
};

/**
 * Securely store data in localStorage with encryption
 * 
 * @param {string} key - Storage key
 * @param {any} data - Data to store
 */
export const secureLocalStorageSet = (key, data) => {
  const encryptedData = encryptData(data);
  if (encryptedData) {
    localStorage.setItem(key, encryptedData);
  }
};

/**
 * Securely retrieve data from localStorage with decryption
 * 
 * @param {string} key - Storage key
 * @param {any} defaultValue - Default value if not found
 * @returns {any} - Decrypted data
 */
export const secureLocalStorageGet = (key, defaultValue = null) => {
  try {
    const encryptedData = localStorage.getItem(key);
    if (!encryptedData) return defaultValue;
    
    const decryptedData = decryptData(encryptedData);
    return decryptedData !== null ? decryptedData : defaultValue;
  } catch (e) {
    console.error('Secure get failed:', e);
    return defaultValue;
  }
};