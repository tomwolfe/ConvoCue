import { describe, it, expect } from 'vitest';
import { summarizeConversation, manageConversationHistory } from './conversation';

describe('Conversation Utilities', () => {
  describe('summarizeConversation', () => {
    it('should return empty string for empty history', () => {
      const result = summarizeConversation([]);
      expect(result).toBe('');
    });

    it('should summarize a simple conversation', () => {
      const history = [
        { role: 'user', content: 'Hi, how are you?' },
        { role: 'assistant', content: 'I am doing well, thank you!' }
      ];
      const result = summarizeConversation(history);
      expect(result).toContain('Hi');
      expect(result).toContain('how are you');
    });

    it('should handle longer conversations', () => {
      const history = [
        { role: 'user', content: 'Hello, I am feeling anxious about my presentation.' },
        { role: 'assistant', content: 'That sounds stressful. What are you worried about?' },
        { role: 'user', content: 'I am afraid I will forget everything.' },
        { role: 'assistant', content: 'It\'s normal to feel nervous. Have you practiced?' },
        { role: 'user', content: 'Yes, I have practiced a lot.' },
        { role: 'assistant', content: 'That\'s great! You\'re well prepared.' }
      ];
      const result = summarizeConversation(history);
      expect(result).toContain('anxious');
      expect(result).toContain('presentation');
      expect(result).toContain('practiced');
    });

    it('should filter out system messages', () => {
      const history = [
        { role: 'system', content: 'System message' },
        { role: 'user', content: 'User message' },
        { role: 'assistant', content: 'Assistant message' }
      ];
      const result = summarizeConversation(history);
      expect(result).toContain('User message');
      expect(result).toContain('Assistant message');
      expect(result).not.toContain('System message');
    });
  });

  describe('manageConversationHistory', () => {
    it('should return history as is if under max length', () => {
      const history = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there' }
      ];
      const result = manageConversationHistory(history, 5);
      expect(result).toEqual(history);
    });

    it('should summarize history when over max length', () => {
      const longHistory = Array.from({ length: 10 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i + 1} content`
      }));
      
      const result = manageConversationHistory(longHistory, 4);
      expect(result.length).toBeLessThanOrEqual(5); // 1 system + 4 messages
      expect(result[0].role).toBe('system'); // Should have summary as system message
      expect(result.slice(1)).toHaveLength(4); // Remaining 4 messages
    });

    it('should handle history exactly at max length', () => {
      const history = [
        { role: 'user', content: 'Message 1' },
        { role: 'assistant', content: 'Message 2' },
        { role: 'user', content: 'Message 3' },
        { role: 'assistant', content: 'Message 4' }
      ];
      const result = manageConversationHistory(history, 4);
      expect(result).toEqual(history);
    });
  });
});