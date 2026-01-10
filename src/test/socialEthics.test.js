import { describe, it, expect } from 'vitest';
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

    it('should allow discussion when context is a question about the topic', () => {
      const suggestion = 'What is the negative effect of gaslighting?';
      const context = 'User is asking a question about the impact of gaslighting?';
      const result = validateSocialSuggestion(suggestion, context);
      expect(result).toBe(suggestion);
    });

    it('should block harmful pattern when context is not clearly a discussion', () => {
      const suggestion = 'You should manipulate them.';
      const context = 'Generic help';
      const result = validateSocialSuggestion(suggestion, context);
      expect(result).toContain('I can\'t suggest that');
    });

    it('should block the first harmful pattern found when multiple exist', () => {
      const suggestion = 'You should manipulate and gaslight them.';
      const result = validateSocialSuggestion(suggestion);
      expect(result).toContain('I can\'t suggest that because it could be harmful. Instead, try: Try expressing your needs directly and respectfully instead.');
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

    it('should transform dismissive patterns when emotion is fear', () => {
      const dismissive = "Stop worrying about it.";
      const result = promoteEmpathy(dismissive, 'fear');
      expect(result).toContain('asking what would make them feel safer');
    });

    it('should transform dismissive patterns when emotion is frustration', () => {
      const dismissive = "You're overreacting to this.";
      const result = promoteEmpathy(dismissive, 'frustration');
      expect(result).toContain('I can see this is really upsetting you');
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
