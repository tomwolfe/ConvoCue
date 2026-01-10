/**
 * Generates a unique ID using a combination of timestamp and random values
 * to avoid collisions even in high-frequency scenarios
 */
export const generateUniqueId = (prefix = '') => {
  // Use high-resolution timestamp (microsecond precision if available)
  const now = typeof performance !== 'undefined' && performance.now ? 
    Math.floor(performance.now() * 1000) : Date.now();
  
  // Add a random component to reduce collision probability
  const randomComponent = Math.floor(Math.random() * 1000000);
  
  // Combine timestamp and random component
  const uniqueId = `${now}${randomComponent.toString().padStart(6, '0')}`;
  
  return prefix ? `${prefix}-${uniqueId}` : uniqueId;
};

/**
 * Alternative UUID v4 generator for maximum uniqueness guarantee
 */
export const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    // Use browser's built-in UUID generator if available
    return crypto.randomUUID();
  }
  
  // Fallback implementation for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};