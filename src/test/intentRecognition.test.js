import { describe, it, expect } from 'vitest';
import { detectMultipleIntents } from '../utils/intentRecognition';

describe('intentRecognition - detectMultipleIntents', () => {
  it('should detect multiple intents when present', () => {
    const input = "Hello, I have a question about the contract";
    const results = detectMultipleIntents(input, 0.3);
    
    const intents = results.map(r => r.intent);
    expect(intents).toContain('greeting');
    expect(intents).toContain('question');
    expect(intents).toContain('strategic'); // contract triggers strategic
  });

  it('should sort results by confidence', () => {
    const input = "Yes, absolutely correct";
    const results = detectMultipleIntents(input, 0.3);
    
    expect(results.length).toBeGreaterThan(0);
    for (let i = 0; i < results.length - 1; i++) {
      expect(results[i].confidence).toBeGreaterThanOrEqual(results[i+1].confidence);
    }
  });

  it('should respect the threshold', () => {
    const input = "I am not sure what to say, can you help me learn?";
    const resultsHigh = detectMultipleIntents(input, 0.99);
    const resultsLow = detectMultipleIntents(input, 0.5);
    
    expect(resultsLow.length).toBeGreaterThan(resultsHigh.length);
  });

  it('should handle empty or null input gracefully', () => {
    expect(detectMultipleIntents(null)).toEqual([]);
    expect(detectMultipleIntents('')).toEqual([]);
    expect(detectMultipleIntents(undefined)).toEqual([]);
  });

  it('should detect emotional and empathy intents', () => {
    const input = "I am so sorry to hear about that, it must be very hard.";
    const results = detectMultipleIntents(input, 0.3);
    const intents = results.map(r => r.intent);
    expect(intents).toContain('emotion');
    expect(intents).toContain('empathy');
  });
});
