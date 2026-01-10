import { describe, it, expect } from 'vitest';
import { 
  estimateConversationSize, 
  trimConversationHistory, 
  isMemoryLimitApproaching,
  monitorAndOptimizeHistory
} from './performanceMonitoring';

describe('performanceMonitoring', () => {
  describe('estimateConversationSize', () => {
    it('should calculate size correctly', () => {
      const history = [
        { role: 'user', content: 'hello' },
        { role: 'assistant', content: 'hi' }
      ];
      // user (4) + hello (5) + assistant (9) + hi (2) = 20 chars
      // 20 chars / 4 (ratio) = 5 tokens
      expect(estimateConversationSize(history)).toBe(5);
    });

    it('should return 0 for empty history', () => {
      expect(estimateConversationSize([])).toBe(0);
      expect(estimateConversationSize(null)).toBe(0);
    });
  });

  describe('trimConversationHistory', () => {
    it('should not trim if under limit', () => {
      const history = Array(10).fill({ role: 'user', content: 'test' });
      const trimmed = trimConversationHistory(history, 20);
      expect(trimmed.length).toBe(10);
    });

    it('should trim to maxLength while preserving head and tail', () => {
      const history = Array.from({ length: 100 }, (_, i) => ({ role: 'user', content: `turn ${i}` }));
      const maxLength = 20;
      const trimmed = trimConversationHistory(history, maxLength);
      
      expect(trimmed.length).toBe(maxLength);
      // Head (20% of 20 = 4)
      expect(trimmed[0].content).toBe('turn 0');
      expect(trimmed[3].content).toBe('turn 3');
      // Tail (80% of 20 = 16)
      expect(trimmed[maxLength - 1].content).toBe('turn 99');
      expect(trimmed[4].content).toBe('turn 84'); // 100 - 16 = 84
    });
  });

  describe('isMemoryLimitApproaching', () => {
    it('should return true when over threshold', () => {
      const history = Array(200).fill({ role: 'user', content: 'a'.repeat(600) });
      expect(isMemoryLimitApproaching(history)).toBe(true);
    });

    it('should return false when under threshold', () => {
      const history = [{ role: 'user', content: 'hi' }];
      expect(isMemoryLimitApproaching(history)).toBe(false);
    });
  });

  describe('monitorAndOptimizeHistory', () => {
    it('should trim history if it exceeds threshold', () => {
      const history = Array(150).fill({ role: 'user', content: 'test' });
      const optimized = monitorAndOptimizeHistory(history);
      expect(optimized.length).toBeLessThan(150);
      expect(optimized.length).toBe(50); // Default maxLength in trimConversationHistory
    });
  });
});
