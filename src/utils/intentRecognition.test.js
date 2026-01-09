import { describe, it, expect } from 'vitest';
import { detectIntent, detectIntentWithConfidence, generateIntentBasedCue } from './intentRecognition';

describe('intentRecognition', () => {
  describe('detectIntent', () => {
    it('should detect social intent', () => {
      expect(detectIntent('hello there')).toBe('social');
      expect(detectIntent('hi')).toBe('social');
      expect(detectIntent('yes I agree')).toBe('social');
    });

    it('should detect question intent', () => {
      expect(detectIntent('what do you think?')).toBe('question');
      expect(detectIntent('can you explain why?')).toBe('question');
      expect(detectIntent('how does this work?')).toBe('question');
    });

    it('should detect conflict intent', () => {
      expect(detectIntent('you are wrong')).toBe('conflict');
      expect(detectIntent('I disagree with that')).toBe('conflict');
      expect(detectIntent('stop wait hold on')).toBe('conflict');
    });

    it('should detect strategic intent', () => {
      expect(detectIntent('we need to negotiate the contract')).toBe('strategic');
      expect(detectIntent('talk to the manager')).toBe('strategic');
      expect(detectIntent('this is high priority')).toBe('strategic');
    });

    it('should detect action intent', () => {
      expect(detectIntent('we should follow up on this')).toBe('action');
      expect(detectIntent('I suggest we try something else')).toBe('action');
    });

    it('should return null for unclear intent', () => {
      expect(detectIntent('random words that mean nothing')).toBe(null);
      expect(detectIntent('')).toBe(null);
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

  describe('generateIntentBasedCue', () => {
    it('should generate appropriate cue for conflict', () => {
      const cue = generateIntentBasedCue('you are wrong');
      const conflictCues = ['De-escalate', 'Validate first', 'Soft tone', 'Find common ground', 'Listen more', 'Breathe'];
      expect(conflictCues).toContain(cue);
    });

    it('should generate appropriate cue for action', () => {
      const cue = generateIntentBasedCue('we should try this');
      const actionCues = ['Action', 'Try', 'Propose', 'Recommend', 'Plan', 'Organize', 'Next step'];
      expect(actionCues).toContain(cue);
    });

    it('should fall back to default cues when no intent detected', () => {
      const cue = generateIntentBasedCue('abc');
      const defaultCues = ['Pause', 'Think', 'Consider', 'Reflect', 'Hmm', 'Observe'];
      expect(defaultCues).toContain(cue);
    });
  });
});