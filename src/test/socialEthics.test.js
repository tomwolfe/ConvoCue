import { describe, it, expect, vi } from 'vitest';
import { validateSocialSuggestion, promoteEmpathy } from '../utils/socialEthics';

describe('Social Ethics Guardrail', () => {
  describe('validateSocialSuggestion', () => {
    it('should return the suggestion if it is safe', () => {
      const suggestion = 'Try to listen more and ask open-ended questions.';
      expect(validateSocialSuggestion(suggestion)).toBe(suggestion);
    });

    it('should block harmful patterns and provide educational feedback', () => {
      const harmful = 'You should manipulate them into agreeing with you.';
      const result = validateSocialSuggestion(harmful);
      expect(result).toContain('I can\'t suggest that because it could be harmful. Instead, try:');
    });

    it('should block manipulative tactics and provide educational feedback', () => {
      const manipulative = 'Try to make them feel guilty about their choice.';
      const result = validateSocialSuggestion(manipulative);
      expect(result).toContain('I can\'t suggest that because it could be harmful. Instead, try:');
    });

    it('should allow discussion about harmful topics in appropriate context', () => {
      const suggestion = 'How can I avoid manipulating them into agreeing with me?';
      const context = 'Discussing how to have healthy conversations';
      const result = validateSocialSuggestion(suggestion, context);
      expect(result).toBe(suggestion); // Should be allowed in discussion context
    });

    it('should return null/empty if input is null/empty', () => {
      expect(validateSocialSuggestion('')).toBe('');
      expect(validateSocialSuggestion(null)).toBe(null);
    });
  });

  describe('promoteEmpathy', () => {
    it('should transform dismissive patterns when emotion is sadness', () => {
      const dismissive = "Just get over it.";
      const result = promoteEmpathy(dismissive, 'sadness');
      expect(result).toContain('acknowledge how deeply they\'re feeling this sadness');
    });

    it('should transform dismissive patterns when emotion is anger', () => {
      const dismissive = "Just calm down.";
      const result = promoteEmpathy(dismissive, 'anger');
      expect(result).toContain('acknowledging their feelings first');
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
