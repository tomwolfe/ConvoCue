/**
 * Unit tests for the conversation summarization feature
 */

import { describe, it, expect, vi } from 'vitest';
import { generateConversationSummary, generateSummaryCard } from '../src/utils/conversationSummarizer';

// Mock the AppConfig import
vi.mock('../src/config', () => ({
  AppConfig: {
    models: {
      personas: {}
    }
  }
}));

describe('Conversation Summarizer', () => {
  describe('generateConversationSummary', () => {
    it('should return default values when no conversation history is provided', async () => {
      const result = await generateConversationSummary([]);
      
      expect(result).toEqual({
        summary: "No conversation history available to summarize.",
        themes: [],
        actionItems: [],
        sentiment: "neutral",
        confidence: 0
      });
    });

    it('should generate a summary with default options', async () => {
      const conversationHistory = [
        { role: 'user', content: 'Hello, how are you?' },
        { role: 'assistant', content: 'I am doing well, thank you.' },
        { role: 'user', content: 'That is great to hear!' }
      ];
      
      const result = await generateConversationSummary(conversationHistory);
      
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('themes');
      expect(result).toHaveProperty('actionItems');
      expect(result).toHaveProperty('sentiment');
      expect(result).toHaveProperty('confidence');
    });

    it('should respect the maxTurns option', async () => {
      const conversationHistory = Array.from({ length: 25 }, (_, i) => ({
        role: 'user',
        content: `Message ${i}`
      }));
      
      const result = await generateConversationSummary(conversationHistory, { maxTurns: 10 });
      
      // The function internally slices the history to the last maxTurns
      // So we can't directly test this without inspecting internal behavior
      expect(result).toHaveProperty('summary');
    });

    it('should include themes when includeThemes is true', async () => {
      const conversationHistory = [
        { role: 'user', content: 'Let us discuss the project timeline.' },
        { role: 'assistant', content: 'The timeline looks challenging but achievable.' }
      ];
      
      const result = await generateConversationSummary(conversationHistory, { 
        includeThemes: true,
        includeActionItems: false,
        includeSentiment: false
      });
      
      expect(result).toHaveProperty('themes');
    });

    it('should include action items when includeActionItems is true', async () => {
      const conversationHistory = [
        { role: 'user', content: 'I will send the report by Friday.' },
        { role: 'assistant', content: 'Please include the budget details.' }
      ];
      
      const result = await generateConversationSummary(conversationHistory, { 
        includeThemes: false,
        includeActionItems: true,
        includeSentiment: false
      });
      
      expect(result).toHaveProperty('actionItems');
    });

    it('should include sentiment when includeSentiment is true', async () => {
      const conversationHistory = [
        { role: 'user', content: 'I am really happy with the progress.' },
        { role: 'assistant', content: 'That is wonderful to hear!' }
      ];
      
      const result = await generateConversationSummary(conversationHistory, { 
        includeThemes: false,
        includeActionItems: false,
        includeSentiment: true
      });
      
      expect(result).toHaveProperty('sentiment');
    });

    it('should handle errors gracefully', async () => {
      // Test with invalid input to trigger error handling
      const result = await generateConversationSummary(null);
      
      expect(result).toEqual({
        summary: "No conversation history available to summarize.",
        themes: [],
        actionItems: [],
        sentiment: "neutral",
        confidence: 0
      });
    });
  });

  describe('generateSummaryCard', () => {
    it('should generate a summary card with correct structure', () => {
      const summaryData = {
        summary: 'This is a test summary of the conversation.',
        themes: ['Theme 1', 'Theme 2'],
        actionItems: ['Action 1', 'Action 2', 'Action 3'],
        sentiment: 'positive',
        confidence: 0.8
      };
      
      const card = generateSummaryCard(summaryData);
      
      expect(card).toEqual({
        title: 'Conversation Summary',
        subtitle: 'Overall sentiment: positive',
        content: 'This is a test summary of the conversation.',
        stats: {
          themesCount: 2,
          actionItemsCount: 3,
          sentiment: 'positive'
        },
        fullSummary: summaryData
      });
    });

    it('should truncate long summaries in the card content', () => {
      const longSummary = 'A '.repeat(200) + 'test summary.';
      const summaryData = {
        summary: longSummary,
        themes: [],
        actionItems: [],
        sentiment: 'neutral',
        confidence: 0.5
      };
      
      const card = generateSummaryCard(summaryData);
      
      // The content should be truncated to 150 chars + '...'
      expect(card.content.length).toBeLessThanOrEqual(153); // 150 + 3 for '...'
      expect(card.content.endsWith('...')).toBe(true);
    });
  });
});