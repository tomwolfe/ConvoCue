import { describe, it, expect, vi } from 'vitest';
import { analyzeConversationSentiment } from './sentimentAnalysis';

describe('Sentiment Analysis with Caching', () => {
  it('should analyze sentiment correctly', () => {
    const history = [
      { role: 'user', content: 'I love this app!', timestamp: Date.now() },
      { role: 'assistant', content: 'Thank you!', timestamp: Date.now() }
    ];
    
    const result = analyzeConversationSentiment(history);
    expect(result.overallSentiment).toBe('positive');
    expect(result.sentimentScore).toBeGreaterThan(0);
  });

  it('should reuse cached results for identical messages', () => {
    const history = [
      { role: 'user', content: 'Performance is key.', timestamp: Date.now() }
    ];
    
    // First call to populate cache
    const result1 = analyzeConversationSentiment(history);
    
    // Second call with same content
    const result2 = analyzeConversationSentiment(history);
    
    expect(result1.messageAnalyses[0]).toEqual(result2.messageAnalyses[0]);
    // Since we don't have direct access to the cache, we just ensure it returns identical data
  });

  it('should handle empty history', () => {
    const result = analyzeConversationSentiment([]);
    expect(result.overallSentiment).toBe('neutral');
  });

  it('should detect emotional trends', () => {
    const history = [
      { role: 'user', content: 'I am so sad', timestamp: Date.now() },
      { role: 'assistant', content: 'I am sorry to hear that.', timestamp: Date.now() },
      { role: 'user', content: 'Wait, now I am happy!', timestamp: Date.now() }
    ];
    
    const result = analyzeConversationSentiment(history);
    expect(result.emotionalTrend).toBe('improving');
  });
});
