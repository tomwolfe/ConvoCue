import { detectIntent, detectIntentWithConfidence, detectIntentWithContext, detectIntentHighPerformance, detectMultipleIntents, TAG_METADATA } from './intentRecognition';
import { ALL_INTENTS } from '../constants/intents';

describe('intentRecognition', () => {
  describe('detectIntent', () => {
    it('should detect social intent', () => {
      expect(detectIntent('hello there')).toBe('social');
      expect(detectIntent('hi')).toBe('social');
      expect(detectIntent('yes I agree')).toBe('social');
    });

    it('should detect question intent', () => {
      expect(detectIntent('what do you think?')).toBe('question');
      expect(detectIntent('how does this work?')).toBe('question');
    });

    it('should detect conflict intent', () => {
      expect(detectIntent('you are wrong')).toBe('conflict');
      expect(detectIntent('I disagree with that')).toBe('conflict');
      expect(detectIntent('stop wait hold on')).toBe('conflict');
    });

    it('should detect strategic intent', () => {
      expect(detectIntent('this is a strategic decision')).toBe('strategic');
      expect(detectIntent('we need to negotiate')).toBe('strategic');
      expect(detectIntent('this is high priority')).toBe('strategic');
    });

    it('should detect action intent', () => {
      expect(detectIntent('we should follow up on this')).toBe('action');
      expect(detectIntent('I suggest we try something else')).toBe('action');
    });

    it('should return null for unclear intent', () => {
      expect(detectIntent('random words that mean nothing')).toBe(null);
      expect(detectIntent('')).toBe(null);
      expect(detectIntent(undefined)).toBe(null);
    });
  });

  describe('detectIntentWithConfidence', () => {
    it('should return confidence score', () => {
      const result = detectIntentWithConfidence('hello');
      expect(result.intent).toBe('social');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect action intent with high confidence', () => {
      const result = detectIntentWithConfidence('I suggest we try something else');
      expect(result.intent).toBe('action');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should detect question intent for clarifying questions', () => {
      const result = detectIntentWithConfidence('Can you clarify what you mean?');
      expect(result.intent).toBe('question');
    });

    it('should optimize similarity checks by limiting tokens', () => {
      // Very long input should not crash and should still detect intent if in first 10 tokens
      const longInput = "hello " + "word ".repeat(100);
      const result = detectIntentWithConfidence(longInput);
      expect(result.intent).toBe('social');
    });
  });

  describe('detectIntentWithContext', () => {
    it('should handle "I\'m sorry" disambiguation', () => {
      // Test empathy context
      const empathyResult = detectIntentWithContext("I'm sorry to hear about your loss", []);
      expect(empathyResult.intent).toBe('empathy');
      
      // Test conflict context
      const conflictResult = detectIntentWithContext("I'm sorry but that won't work", []);
      expect(conflictResult.intent).toBe('conflict');
    });

    it('should consider conversation history', () => {
      const history = [{ content: "How are you doing?" }];
      const response = detectIntentWithContext("I'm doing well", history);
      // This should potentially be recognized as a response to a question
      expect(response.intent).toBeDefined();
    });
  });

  describe('detectIntentHighPerformance', () => {
    it('should detect intents with high performance', () => {
      const result = detectIntentHighPerformance('hello');
      expect(result.intent).toBe('social');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should handle empty input', () => {
      const result = detectIntentHighPerformance('');
      expect(result.intent).toBe('general'); // Should return default when no intent detected
      expect(result.confidence).toBe(0);
    });

    it('should handle very long input', () => {
      const longInput = "This is a very long input " + "with many words ".repeat(50);
      const result = detectIntentHighPerformance(longInput);
      // Intent should always be a string for backward compatibility
      expect(typeof result.intent).toBe('string');
      expect(typeof result.confidence).toBe('number');
    });
  });

  describe('detectMultipleIntents', () => {
    it('should detect multiple intents above threshold', () => {
      const results = detectMultipleIntents("Hello, can you explain this strategic action?", 0.3);

      const intents = results.map(r => r.intent);
      expect(intents).toContain('social');
      expect(intents).toContain('question');
      expect(intents).toContain('strategic'); // contract triggers strategic
    });

    it('should return empty array for undefined input', () => {
      expect(detectMultipleIntents(undefined)).toEqual([]);
    });

    it('should detect empathy intent', () => {
      const input = "I am so sorry to hear about that, it must be very hard.";
      const results = detectMultipleIntents(input, 0.3);
      const intents = results.map(r => r.intent);
      expect(intents).toContain('empathy');
    });
  });

  describe('TAG_METADATA and ALL_INTENTS synchronization', () => {
    it('should ensure TAG_METADATA keys match ALL_INTENTS array', () => {
      const tagMetadataKeys = Object.keys(TAG_METADATA).sort();
      const allIntentsSorted = [...ALL_INTENTS].sort();

      expect(tagMetadataKeys).toEqual(allIntentsSorted);
    });
  });
});