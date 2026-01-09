/**
 * @fileoverview Unit tests for relationship coaching utilities
 */

import { describe, test, expect } from 'vitest';
import { 
  analyzeRelationshipCoaching, 
  generateRelationshipCoachingPrompt 
} from '../utils/relationshipCoaching';

describe('Relationship Coaching Utilities', () => {
  describe('analyzeRelationshipCoaching', () => {
    test('should return default values for empty input', () => {
      const result = analyzeRelationshipCoaching('');
      expect(result).toEqual({
        empathyLevel: 'neutral',
        activeListeningOpportunities: [],
        emotionalValidationNeeded: false,
        insights: [],
        copingStrategies: []
      });
    });

    test('should return default values for invalid input', () => {
      const result = analyzeRelationshipCoaching(null);
      expect(result).toEqual({
        empathyLevel: 'neutral',
        activeListeningOpportunities: [],
        emotionalValidationNeeded: false,
        insights: [],
        copingStrategies: []
      });

      const result2 = analyzeRelationshipCoaching(123);
      expect(result2).toEqual({
        empathyLevel: 'neutral',
        activeListeningOpportunities: [],
        emotionalValidationNeeded: false,
        insights: [],
        copingStrategies: []
      });
    });

    test('should detect high empathy for strong negative emotions', () => {
      const text = 'I am so sad and angry about what happened today.';
      const result = analyzeRelationshipCoaching(text, [], { emotion: 'sadness', confidence: 0.8 });
      
      expect(result.empathyLevel).toBe('high');
    });

    test('should detect medium empathy for moderate emotions', () => {
      const text = 'I feel a bit upset about this situation.';
      const result = analyzeRelationshipCoaching(text, [], { emotion: 'sadness', confidence: 0.4 });
      
      expect(result.empathyLevel).toBe('medium');
    });

    test('should detect neutral empathy for low confidence emotions', () => {
      const text = 'The weather is nice today.';
      const result = analyzeRelationshipCoaching(text, [], { emotion: 'neutral', confidence: 0.2 });
      
      expect(result.empathyLevel).toBe('neutral');
    });

    test('should identify personal sharing indicators for empathy', () => {
      const text = 'I feel like I\'m struggling with this.';
      const result = analyzeRelationshipCoaching(text);
      
      expect(result.empathyLevel).toBe('medium');
    });

    test('should identify paraphrasing opportunities for longer texts', () => {
      const text = 'This is a longer text that describes my experience with the situation that happened yesterday.';
      const result = analyzeRelationshipCoaching(text);
      
      expect(result.activeListeningOpportunities).toContainEqual(
        expect.objectContaining({ type: 'paraphrase' })
      );
    });

    test('should identify emotion reflection opportunities', () => {
      const text = 'I am feeling really excited about this!';
      const result = analyzeRelationshipCoaching(text);
      
      expect(result.activeListeningOpportunities).toContainEqual(
        expect.objectContaining({ type: 'reflect_emotion' })
      );
    });

    test('should identify validation opportunities for vulnerability expressions', () => {
      const text = 'I\'m not sure if anyone understands what I\'m going through.';
      const result = analyzeRelationshipCoaching(text);
      
      expect(result.activeListeningOpportunities).toContainEqual(
        expect.objectContaining({ type: 'validate' })
      );
    });

    test('should detect emotional validation needs for strong emotions', () => {
      const text = 'I am devastated by this news.';
      const result = analyzeRelationshipCoaching(text, [], { emotion: 'sadness', confidence: 0.7 });
      
      expect(result.emotionalValidationNeeded).toBe(true);
    });

    test('should detect emotional validation needs for vulnerability expressions', () => {
      const text = 'I feel like nobody understands me.';
      const result = analyzeRelationshipCoaching(text);
      
      expect(result.emotionalValidationNeeded).toBe(true);
    });

    test('should generate relationship insights for emotional content', () => {
      const text = 'I am feeling overwhelmed and stressed.';
      const result = analyzeRelationshipCoaching(text, [], { emotion: 'fear', confidence: 0.6 });
      
      expect(result.insights).toContainEqual(
        expect.objectContaining({ category: 'emotional_state' })
      );
    });

    test('should suggest empathetic responses for emotional content', () => {
      const text = 'I am feeling angry about the situation.';
      const result = analyzeRelationshipCoaching(text, [], { emotion: 'anger', confidence: 0.7 });
      
      expect(result.copingStrategies).toContainEqual(
        expect.objectContaining({ type: 'empathy' })
      );
    });

    test('should suggest validation responses for emotional expressions', () => {
      const text = 'I feel like I\'m not good enough.';
      const result = analyzeRelationshipCoaching(text);
      
      expect(result.copingStrategies).toContainEqual(
        expect.objectContaining({ type: 'validation' })
      );
    });

    test('should suggest exploration responses for questions', () => {
      const text = 'How do I deal with this? What should I do?';
      const result = analyzeRelationshipCoaching(text);
      
      expect(result.copingStrategies).toContainEqual(
        expect.objectContaining({ type: 'exploration' })
      );
    });

    test('should suggest supportive responses for challenges', () => {
      const text = 'I\'m having difficulty with this problem.';
      const result = analyzeRelationshipCoaching(text);
      
      expect(result.copingStrategies).toContainEqual(
        expect.objectContaining({ type: 'support' })
      );
    });

    test('should suggest affirmative responses for positive emotions', () => {
      const text = 'I am so happy about this achievement!';
      const result = analyzeRelationshipCoaching(text, [], { emotion: 'joy', confidence: 0.8 });
      
      expect(result.copingStrategies).toContainEqual(
        expect.objectContaining({ type: 'affirmation' })
      );
    });
  });

  describe('generateRelationshipCoachingPrompt', () => {
    test('should generate prompt with high empathy requirement', () => {
      const insights = {
        empathyLevel: 'high',
        activeListeningOpportunities: [],
        emotionalValidationNeeded: false,
        copingStrategies: []
      };
      
      const prompt = generateRelationshipCoachingPrompt(insights, 'relationship');
      expect(prompt).toContain('HIGH EMPATHY REQUIRED');
    });

    test('should generate prompt with medium empathy requirement', () => {
      const insights = {
        empathyLevel: 'medium',
        activeListeningOpportunities: [],
        emotionalValidationNeeded: false,
        copingStrategies: []
      };
      
      const prompt = generateRelationshipCoachingPrompt(insights, 'anxiety');
      expect(prompt).toContain('Show empathy');
    });

    test('should include active listening opportunities in prompt', () => {
      const insights = {
        empathyLevel: 'neutral',
        activeListeningOpportunities: [{ type: 'reflect_emotion', description: 'Acknowledge their happiness', priority: 'high' }],
        emotionalValidationNeeded: false,
        copingStrategies: []
      };
      
      const prompt = generateRelationshipCoachingPrompt(insights, 'relationship');
      expect(prompt).toContain('ACTIVE LISTENING OPPORTUNITY');
    });

    test('should include emotional validation in prompt', () => {
      const insights = {
        empathyLevel: 'neutral',
        activeListeningOpportunities: [],
        emotionalValidationNeeded: true,
        copingStrategies: []
      };
      
      const prompt = generateRelationshipCoachingPrompt(insights, 'anxiety');
      expect(prompt).toContain('EMOTIONAL VALIDATION NEEDED');
    });

    test('should include response type guidance in prompt', () => {
      const insights = {
        empathyLevel: 'neutral',
        activeListeningOpportunities: [],
        emotionalValidationNeeded: false,
        copingStrategies: [{
          type: 'empathy',
          technique: 'Acknowledge impact: "I can see that\'s really difficult for you"'
        }]
      };
      
      const prompt = generateRelationshipCoachingPrompt(insights, 'relationship');
      expect(prompt).toContain('RESPONSE APPROACH');
    });

    test('should include relationship-specific guidance', () => {
      const insights = {
        empathyLevel: 'neutral',
        activeListeningOpportunities: [],
        emotionalValidationNeeded: false,
        copingStrategies: []
      };
      
      const prompt = generateRelationshipCoachingPrompt(insights, 'relationship');
      expect(prompt).toContain('Focus on building connection');
    });

    test('should include ethical disclaimer for relationship persona', () => {
      const insights = {
        empathyLevel: 'neutral',
        activeListeningOpportunities: [],
        emotionalValidationNeeded: false,
        copingStrategies: []
      };
      
      const prompt = generateRelationshipCoachingPrompt(insights, 'relationship');
      expect(prompt).toContain('IMPORTANT DISCLAIMER: This is not a substitute for professional mental health services');
    });

    test('should include ethical disclaimer for anxiety persona', () => {
      const insights = {
        empathyLevel: 'neutral',
        activeListeningOpportunities: [],
        emotionalValidationNeeded: false,
        copingStrategies: []
      };
      
      const prompt = generateRelationshipCoachingPrompt(insights, 'anxiety');
      expect(prompt).toContain('IMPORTANT DISCLAIMER: This is not a substitute for professional mental health services');
    });

    test('should not include ethical disclaimer for other personas', () => {
      const insights = {
        empathyLevel: 'neutral',
        activeListeningOpportunities: [],
        emotionalValidationNeeded: false,
        copingStrategies: []
      };
      
      const prompt = generateRelationshipCoachingPrompt(insights, 'professional');
      expect(prompt).not.toContain('IMPORTANT DISCLAIMER: This is not a substitute for professional mental health services');
    });
  });
});
