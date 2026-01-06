import { describe, it, expect } from 'vitest';
import { sanitizeText, sanitizeAndTruncate, decodeHTMLEntities } from '../utils/sanitization';

describe('sanitization utilities', () => {
  describe('sanitizeText', () => {
    it('should escape HTML characters', () => {
      expect(sanitizeText('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
    });

    it('should escape single quotes', () => {
      expect(sanitizeText("What's on your mind?")).toBe('What&#x27;s on your mind?');
    });

    it('should escape ampersands correctly and not double-encode', () => {
      expect(sanitizeText('Fish & Chips')).toBe('Fish &amp; Chips');
      // If it was double-encoding, it would be 'What&amp;#x27;s'
      expect(sanitizeText("What's")).toBe('What&#x27;s');
    });

    it('should escape forward slashes', () => {
      expect(sanitizeText('and/or')).toBe('and&#x2F;or');
    });

    it('should handle non-string inputs', () => {
      expect(sanitizeText(null)).toBe('');
      expect(sanitizeText(undefined)).toBe('');
      expect(sanitizeText(123)).toBe('');
    });
  });

  describe('sanitizeAndTruncate', () => {
    it('should truncate and sanitize', () => {
      const longText = '<p>' + 'a'.repeat(100) + '</p>';
      const result = sanitizeAndTruncate(longText, 50);
      expect(result.length).toBeLessThanOrEqual(50 + 8); // +8 for escaped chars if any
      expect(result).toContain('&lt;p&gt;');
    });
  });

  describe('decodeHTMLEntities', () => {
    it('should decode basic entities', () => {
      expect(decodeHTMLEntities('Fish &amp; Chips')).toBe('Fish & Chips');
      expect(decodeHTMLEntities('What&#x27;s')).toBe("What's");
      expect(decodeHTMLEntities('&lt;script&gt;')).toBe('<script>');
    });

    it('should handle non-browser fallback', () => {
      const originalDocument = global.document;
      delete global.document;
      expect(decodeHTMLEntities('What&#x27;s')).toBe("What's");
      global.document = originalDocument;
    });
  });
});
