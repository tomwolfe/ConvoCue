import { describe, it, expect } from 'vitest';
import { calculateEngagement } from './engagement';

describe('calculateEngagement', () => {
  it('returns default values for empty turns', () => {
    const metrics = calculateEngagement([]);
    expect(metrics.talkRatio).toBe(0);
    expect(metrics.totalTurns).toBe(0);
  });

  it('calculates talk ratio accurately with mixed turn lengths', () => {
    const turns = [
      { role: 'user', content: 'This is a long sentence by the user to dominate the conversation.', timestamp: Date.now() },
      { role: 'assistant', content: 'OK.', timestamp: Date.now() + 1000 }
    ];
    
    const metrics = calculateEngagement(turns);
    
    // turnRatio = 1/2 = 0.5
    // wordRatio = 12 / (12 + 1) = 0.923
    // talkRatio = (0.5 + 0.923) / 2 = 0.71
    expect(metrics.turnRatio).toBe(0.5);
    expect(metrics.wordRatio).toBeGreaterThan(0.9);
    expect(metrics.talkRatio).toBeGreaterThan(0.7);
  });

  it('detects balanced flow', () => {
    const turns = [
      { role: 'user', content: 'Hello how are you?', timestamp: Date.now() },
      { role: 'other', content: 'I am fine, thanks for asking!', timestamp: Date.now() + 1000 }
    ];
    
    const metrics = calculateEngagement(turns);
    expect(metrics.turnRatio).toBe(0.5);
    // 4 words vs 6 words. wordRatio = 0.4. (0.5 + 0.4) / 2 = 0.45
    expect(metrics.talkRatio).toBe(0.45);
  });

  it('calculates pace correctly', () => {
    const now = Date.now();
    const turns = [
      { role: 'user', content: 'One two three four five', timestamp: now },
      { role: 'other', content: 'Six seven eight nine ten', timestamp: now + 60000 } // 1 minute later
    ];
    
    const metrics = calculateEngagement(turns);
    // 10 words over 1 minute = 10 wpm
    expect(metrics.pace).toBe(10);
  });

  it('adjusts talk ratio in group mode', () => {
    const turns = [
      { role: 'user', content: 'Balanced turn.', timestamp: Date.now() },
      { role: 'other', content: 'Another balanced turn.', timestamp: Date.now() + 1000 }
    ];
    
    const normalMetrics = calculateEngagement(turns, { isGroupMode: false });
    const groupMetrics = calculateEngagement(turns, { isGroupMode: true });
    
    // In group mode, talkRatio should be boosted to detect "dominating" behavior earlier
    expect(groupMetrics.talkRatio).toBe(normalMetrics.talkRatio * 1.5);
    expect(groupMetrics.isGroupMode).toBe(true);
  });
});
