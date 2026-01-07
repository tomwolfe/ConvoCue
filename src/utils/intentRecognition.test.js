import { describe, it, expect } from 'vitest';
import { detectIntent, detectIntentWithConfidence, generateIntentBasedCue } from './intentRecognition';

describe('intentRecognition', () => {
  describe('detectIntent', () => {
    it('should detect greeting intent', () => {
      expect(detectIntent('hello there')).toBe('greeting');
      expect(detectIntent('hi')).toBe('greeting');
      expect(detectIntent('good morning')).toBe('greeting');
    });

    it('should detect question intent', () => {
      expect(detectIntent('what do you think?')).toBe('question');
      expect(detectIntent('can you explain why?')).toBe('question');
      expect(detectIntent('how does this work?')).toBe('question');
    });

    it('should detect agreement intent', () => {
      expect(detectIntent('yes I agree')).toBe('agreement');
      expect(detectIntent('exactly right')).toBe('agreement');
      expect(detectIntent('absolutely')).toBe('agreement');
    });

    it('should detect conflict intent', () => {
      expect(detectIntent('you are wrong')).toBe('conflict');
      expect(detectIntent('I disagree with that')).toBe('conflict');
      expect(detectIntent('this is a big problem')).toBe('conflict');
    });

    it('should detect strategic intent', () => {
      expect(detectIntent('we need to negotiate the contract')).toBe('strategic');
      expect(detectIntent('talk to the manager')).toBe('strategic');
      expect(detectIntent('this is high priority')).toBe('strategic');
    });

    it('should return null for unclear intent', () => {
      expect(detectIntent('random words that mean nothing')).toBe(null);
      expect(detectIntent('')).toBe(null);
    });
  });

  describe('detectIntentWithConfidence', () => {
    it('should return confidence score', () => {
      const result = detectIntentWithConfidence('hello');
      expect(result.intent).toBe('greeting');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should have lower confidence for partial matches', () => {
      const result = detectIntentWithConfidence('morning');
      expect(result.intent).toBe('greeting');
      expect(result.confidence).toBeLessThan(0.7);
    });
  });

  describe('generateIntentBasedCue', () => {
    it('should generate appropriate cue for conflict', () => {
      const cue = generateIntentBasedCue('I hate this');
      const conflictCues = ['De-escalate', 'Validate first', 'Soft tone', 'Find common ground', 'Listen more', 'Neutral stance', 'Breathe'];
      expect(conflictCues).toContain(cue);
    });

    it('should generate appropriate cue for question', () => {
      const cue = generateIntentBasedCue('how are you?');
      const questionCues = ['Ask', 'Clarify', 'Follow up', 'Probe', 'Inquire', 'Investigate', 'Query'];
      expect(questionCues).toContain(cue);
    });

    it('should fall back to default cues when no intent detected', () => {
      const cue = generateIntentBasedCue('abc');
      const defaultCues = ['Pause', 'Think', 'Consider', 'Reflect', 'Hmm', 'Observe'];
      expect(defaultCues).toContain(cue);
    });
  });
});
