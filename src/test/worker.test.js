import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { analyzeEmotion } from '../utils/emotion';

describe('Emotion Analysis', () => {
  beforeEach(() => {
    // Setup if needed
  });

  afterEach(() => {
    // Cleanup if needed
  });

  it('detects joy emotion correctly', () => {
    const text = 'I am so happy and excited about this amazing opportunity!';
    const result = analyzeEmotion(text);

    expect(result.emotion).toBe('joy');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('detects sadness emotion correctly', () => {
    const text = 'I feel really sad and depressed today, nothing seems to go right.';
    const result = analyzeEmotion(text);

    expect(result.emotion).toBe('sadness');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('detects anger emotion correctly', () => {
    const text = 'I am so angry and furious about this terrible situation!';
    const result = analyzeEmotion(text);

    expect(result.emotion).toBe('anger');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('returns neutral for text without strong emotions', () => {
    const text = 'The weather is okay today. I went to the store.';
    const result = analyzeEmotion(text);

    expect(result.emotion).toBe('neutral');
    expect(result.confidence).toBe(0);
  });

  it('returns neutral for empty text', () => {
    const result = analyzeEmotion('');

    expect(result.emotion).toBe('neutral');
    expect(result.confidence).toBe(0);
  });

  it('detects negated emotions correctly', () => {
    const text = 'I am not happy about this';
    const result = analyzeEmotion(text);

    expect(result.emotion).toBe('neutral'); // Should detect negation and reduce happiness
    expect(result.confidence).toBeLessThan(0.5); // Lower confidence due to negation
  });

  it('detects emotions in longer text with higher confidence', () => {
    const text = 'I am extremely happy and thrilled about this wonderful and amazing opportunity';
    const result = analyzeEmotion(text);

    expect(result.emotion).toBe('joy');
    expect(result.confidence).toBeGreaterThan(0.5); // Higher confidence due to longer text with multiple emotion words
  });

  it('detects emotions in phrases correctly', () => {
    const text = 'I feel really excited about this';
    const result = analyzeEmotion(text);

    expect(result.emotion).toBe('joy');
    expect(result.confidence).toBeGreaterThan(0);
  });
});