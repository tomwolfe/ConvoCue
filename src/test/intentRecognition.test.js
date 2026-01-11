import { describe, it, expect } from 'vitest';
import { 
  detectIntent, 
  detectMultipleIntents, 
  calculateSimilarity,
  detectIntentWithContext
} from '../utils/intentRecognition';

describe('Intent Recognition System', () => {
  describe('detectIntent', () => {
    it('should detect greeting intent', () => {
      expect(detectIntent('Hello there!')).toBe('social');
    });

    it('should detect question intent', () => {
      expect(detectIntent('What is your name?')).toBe('question');
    });

    it('should detect conflict intent', () => {
      expect(detectIntent('I disagree with you.')).toBe('conflict');
    });
  });

  describe('detectMultipleIntents', () => {
    it('should detect multiple intents in a complex sentence', () => {
      const intents = detectMultipleIntents('Hello, I have a question about the budget.', 0.3);
      const labels = intents.map(i => i.intent);
      expect(labels).toContain('social');
      expect(labels).toContain('question');
    });

    it('should rank intents by confidence', () => {
      const intents = detectMultipleIntents('I disagree, but I understand your point.');
      expect(intents[0].confidence).toBeGreaterThanOrEqual(intents[1].confidence);
    });
  });

  describe('calculateSimilarity', () => {
    it('should return 1.0 for identical strings', () => {
      expect(calculateSimilarity('hello', 'hello')).toBe(1.0);
    });

    it('should return 0.0 for completely different strings', () => {
      expect(calculateSimilarity('abc', 'xyz')).toBe(0.0);
    });

    it('should handle synonyms', () => {
      // 'hi' and 'hello' are usually in synonym maps if implemented
      const score = calculateSimilarity('hi', 'hello');
      expect(score).toBeGreaterThan(0.35);
    });
  });

  describe('detectIntentWithContext', () => {
    it('should disambiguate "sorry" based on context', () => {
      const resultEmpathy = detectIntentWithContext('I am sorry to hear that');
      expect(resultEmpathy.intent).toBe('empathy');

      const resultConflict = detectIntentWithContext('I am sorry but you are wrong');
      expect(resultConflict.intent).toBe('conflict');
    });

    it('should use conversation history for context', () => {
      const history = [{ role: 'user', content: 'Let us talk about the budget proposal.' }];
      const result = detectIntentWithContext('Maybe we can change it', history);
      expect(result.intent).toBe('strategic');
    });
  });
});