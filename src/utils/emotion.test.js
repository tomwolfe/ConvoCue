import { describe, it, expect } from 'vitest';
import { analyzeEmotion } from './emotion';

describe('Emotion Analysis Utilities', () => {
  it('should detect joy emotion in positive text', () => {
    const result = analyzeEmotion('I am so happy and excited about this amazing day!');
    expect(result.emotion).toBe('joy');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should detect sadness emotion in negative text', () => {
    const result = analyzeEmotion('I feel so sad and depressed today');
    expect(result.emotion).toBe('sadness');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should detect anger emotion in angry text', () => {
    const result = analyzeEmotion('I am really angry and furious about this situation');
    expect(result.emotion).toBe('anger');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should detect fear emotion in fearful text', () => {
    const result = analyzeEmotion('I am scared and afraid of what might happen');
    expect(result.emotion).toBe('fear');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should detect surprise emotion in surprising text', () => {
    const result = analyzeEmotion('I am shocked and surprised by this incredible news');
    expect(result.emotion).toBe('surprise');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should detect disgust emotion in disgusted text', () => {
    const result = analyzeEmotion('I am disgusted and revolted by this');
    expect(result.emotion).toBe('disgust');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should return neutral for text without emotional words', () => {
    const result = analyzeEmotion('The weather is sunny today');
    expect(result.emotion).toBe('neutral');
    expect(result.confidence).toBe(0);
  });

  it('should return neutral for empty text', () => {
    const result = analyzeEmotion('');
    expect(result.emotion).toBe('neutral');
    expect(result.confidence).toBe(0);
  });

  it('should return neutral for non-string input', () => {
    const result = analyzeEmotion(null);
    expect(result.emotion).toBe('neutral');
    expect(result.confidence).toBe(0);
  });

  it('should handle negation words correctly', () => {
    const result = analyzeEmotion('I am not happy');
    expect(result.emotion).toBe('neutral'); // Should not detect joy due to negation
  });

  it('should handle mixed emotions and return dominant one', () => {
    const result = analyzeEmotion('I am happy but also scared');
    // Should detect the stronger emotion or first detected emotion
    expect(['joy', 'fear']).toContain(result.emotion);
    expect(result.confidence).toBeGreaterThan(0);
  });
});