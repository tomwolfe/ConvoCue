import { describe, it, expect, vi } from 'vitest';
import { validateSocialSuggestion, promoteEmpathy } from '../utils/socialEthics';

describe('Social Ethics Guardrail', () => {
  describe('validateSocialSuggestion', () => {
    it('should return the suggestion if it is safe', () => {
      const suggestion = 'Try to listen more and ask open-ended questions.';
      expect(validateSocialSuggestion(suggestion)).toBe(suggestion);
    });

    it('should block harmful patterns', () => {
      const harmful = 'You should manipulate them into agreeing with you.';
      const result = validateSocialSuggestion(harmful);
      expect(result).toBe('Suggestion removed for safety.');
    });

    it('should block manipulative tactics', () => {
      const manipulative = 'Try to make them feel guilty about their choice.';
      const result = validateSocialSuggestion(manipulative);
      expect(result).toBe('Suggestion removed: potentially manipulative.');
    });

    it('should return null/empty if input is null/empty', () => {
      expect(validateSocialSuggestion('')).toBe('');
      expect(validateSocialSuggestion(null)).toBe(null);
    });
  });

  describe('promoteEmpathy', () => {
    it('should add a nudge for dismissive patterns when emotion is sadness', () => {
      const dismissive = "Just get over it.";
      const result = promoteEmpathy(dismissive, 'sadness');
      expect(result).toContain('Try to acknowledge their feelings first.');
    });

    it('should not modify non-dismissive patterns', () => {
      const supportive = "I understand why you feel that way.";
      const result = promoteEmpathy(supportive, 'sadness');
      expect(result).toBe(supportive);
    });

    it('should not modify dismissive patterns if emotion is neutral', () => {
      const dismissive = "Just get over it.";
      const result = promoteEmpathy(dismissive, 'neutral');
      expect(result).toBe(dismissive);
    });
  });
});
