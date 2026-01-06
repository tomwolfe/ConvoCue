/**
 * Text sanitization utilities to prevent XSS vulnerabilities
 */

/**
 * Sanitizes text content by removing potentially dangerous characters
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text
 */
export const sanitizeText = (text) => {
  if (typeof text !== 'string') {
    return '';
  }
  
  // Remove potentially dangerous characters/sequences
  // MUST replace ampersand first to avoid double-encoding
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Sanitizes and truncates text to prevent overly long content
 * @param {string} text - Text to sanitize and truncate
 * @param {number} maxLength - Maximum length (default: 500)
 * @returns {string} Sanitized and truncated text
 */
export const sanitizeAndTruncate = (text, maxLength = 500) => {
  if (typeof text !== 'string') {
    return '';
  }
  
  const truncated = text.substring(0, maxLength);
  return sanitizeText(truncated);
};

/**
 * Sanitizes HTML content by allowing only safe tags and attributes
 * @param {string} html - HTML content to sanitize
 * @returns {string} Sanitized HTML
 */
export const sanitizeHTML = (html) => {
  if (typeof html !== 'string') {
    return '';
  }
  
  // For now, we'll escape all HTML since we don't expect HTML in our text content
  return sanitizeText(html);
};

/**
 * Validates and sanitizes persona configuration
 * @param {Object} persona - Persona configuration to validate
 * @returns {Object} Sanitized persona configuration
 */
export const validatePersona = (persona) => {
  if (!persona || typeof persona !== 'object') {
    return null;
  }
  
  return {
    id: typeof persona.id === 'string' ? sanitizeText(persona.id) : '',
    label: typeof persona.label === 'string' ? sanitizeText(persona.label) : '',
    description: typeof persona.description === 'string' ? sanitizeText(persona.description) : '',
    prompt: typeof persona.prompt === 'string' ? sanitizeText(persona.prompt) : ''
  };
};

/**
 * Decodes HTML entities back to plain text
 * @param {string} text - Text with HTML entities
 * @returns {string} Decoded plain text
 */
export const decodeHTMLEntities = (text) => {
  if (typeof text !== 'string' || !text) {
    return '';
  }

  // Use the browser's DOM to decode entities
  if (typeof document !== 'undefined') {
    const textArea = document.createElement('textarea');
    textArea.innerHTML = text;
    return textArea.textContent;
  }
  
  // Fallback for non-browser environments (basic entities)
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
};