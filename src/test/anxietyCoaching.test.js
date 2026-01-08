/**
 * @fileoverview Unit tests for anxiety coaching utilities
 */

import { 
  analyzeAnxietyCoaching, 
  generateAnxietyCoachingPrompt 
} from '../utils/anxietyCoaching';

describe('Anxiety Coaching Utilities', () => {
  describe('analyzeAnxietyCoaching', () => {
    test('should return default values for empty input', () => {
      const result = analyzeAnxietyCoaching('');
      expect(result).toEqual({
        anxietyLevel: 'low',
        anxietyTriggers: [],
        copingStrategies: [],
        reassuranceNeeded: false,
        anxietySpecificInsights: []
      });
    });

    test('should return default values for invalid input', () => {
      const result = analyzeAnxietyCoaching(null);
      expect(result).toEqual({
        anxietyLevel: 'low',
        anxietyTriggers: [],
        copingStrategies: [],
        reassuranceNeeded: false,
        anxietySpecificInsights: []
      });

      const result2 = analyzeAnxietyCoaching(123);
      expect(result2).toEqual({
        anxietyLevel: 'low',
        anxietyTriggers: [],
        copingStrategies: [],
        reassuranceNeeded: false,
        anxietySpecificInsights: []
      });
    });

    test('should detect high anxiety for strong anxiety-related emotions', () => {
      const text = 'I am so scared and worried about what might happen.';
      const result = analyzeAnxietyCoaching(text, [], { emotion: 'fear', confidence: 0.8 });
      
      expect(result.anxietyLevel).toBe('high');
    });

    test('should detect medium anxiety for anxiety-related language', () => {
      const text = 'I feel nervous about this upcoming event.';
      const result = analyzeAnxietyCoaching(text);
      
      expect(result.anxietyLevel).toBe('medium');
    });

    test('should detect anxiety triggers for future-oriented worry', () => {
      const text = 'What if everything goes wrong tomorrow?';
      const result = analyzeAnxietyCoaching(text);
      
      expect(result.anxietyTriggers).toContainEqual(
        expect.objectContaining({ type: 'future_worry' })
      );
    });

    test('should detect anxiety triggers for perfectionism', () => {
      const text = 'I have to be perfect or else I\'m a failure.';
      const result = analyzeAnxietyCoaching(text);
      
      expect(result.anxietyTriggers).toContainEqual(
        expect.objectContaining({ type: 'perfectionism' })
      );
    });

    test('should detect anxiety triggers for social anxiety', () => {
      const text = 'People will judge me if I mess up.';
      const result = analyzeAnxietyCoaching(text);
      
      expect(result.anxietyTriggers).toContainEqual(
        expect.objectContaining({ type: 'social_anxiety' })
      );
    });

    test('should suggest breathing exercises for high anxiety', () => {
      const text = 'I am panicking and feeling overwhelmed.';
      const result = analyzeAnxietyCoaching(text, [], { emotion: 'fear', confidence: 0.8 });
      
      expect(result.copingStrategies).toContainEqual(
        expect.objectContaining({ type: 'breathing' })
      );
    });

    test('should suggest grounding techniques for overwhelm', () => {
      const text = 'I feel like I can\'t handle all of this.';
      const result = analyzeAnxietyCoaching(text);
      
      expect(result.copingStrategies).toContainEqual(
        expect.objectContaining({ type: 'grounding' })
      );
    });

    test('should suggest cognitive restructuring for catastrophic thinking', () => {
      const text = 'What if this is a complete disaster?';
      const result = analyzeAnxietyCoaching(text);
      
      expect(result.copingStrategies).toContainEqual(
        expect.objectContaining({ type: 'cognitive_restructuring' })
      );
    });

    test('should detect reassurance needs for uncertainty expressions', () => {
      const text = 'Am I overreacting? Is this normal?';
      const result = analyzeAnxietyCoaching(text);
      
      expect(result.reassuranceNeeded).toBe(true);
    });

    test('should generate anxiety-specific insights for emotional content', () => {
      const text = 'I am feeling anxious and scared.';
      const result = analyzeAnxietyCoaching(text, [], { emotion: 'fear', confidence: 0.6 });
      
      expect(result.anxietySpecificInsights).toContainEqual(
        expect.objectContaining({ category: 'anxiety_level' })
      );
    });
  });

  describe('generateAnxietyCoachingPrompt', () => {
    test('should generate prompt with high anxiety requirement', () => {
      const insights = {
        anxietyLevel: 'high',
        anxietyTriggers: [],
        reassuranceNeeded: false,
        copingStrategies: []
      };
      
      const prompt = generateAnxietyCoachingPrompt(insights);
      expect(prompt).toContain('HIGH ANXIETY PRESENT');
    });

    test('should generate prompt with medium anxiety requirement', () => {
      const insights = {
        anxietyLevel: 'medium',
        anxietyTriggers: [],
        reassuranceNeeded: false,
        copingStrategies: []
      };
      
      const prompt = generateAnxietyCoachingPrompt(insights);
      expect(prompt).toContain('Moderate anxiety detected');
    });

    test('should include anxiety trigger considerations in prompt', () => {
      const insights = {
        anxietyLevel: 'low',
        anxietyTriggers: [{ type: 'future_worry', description: 'Future-oriented worry detected', priority: 'high' }],
        reassuranceNeeded: false,
        copingStrategies: []
      };
      
      const prompt = generateAnxietyCoachingPrompt(insights);
      expect(prompt).toContain('ANXIETY TRIGGER');
    });

    test('should include reassurance in prompt', () => {
      const insights = {
        anxietyLevel: 'low',
        anxietyTriggers: [],
        reassuranceNeeded: true,
        copingStrategies: []
      };
      
      const prompt = generateAnxietyCoachingPrompt(insights);
      expect(prompt).toContain('REASSURANCE NEEDED');
    });

    test('should include coping strategy guidance in prompt', () => {
      const insights = {
        anxietyLevel: 'low',
        anxietyTriggers: [],
        reassuranceNeeded: false,
        copingStrategies: [{
          type: 'breathing',
          description: 'Suggest breathing exercises',
          technique: '4-7-8 breathing: inhale for 4, hold for 7, exhale for 8'
        }]
      };
      
      const prompt = generateAnxietyCoachingPrompt(insights);
      expect(prompt).toContain('COPING APPROACH');
    });

    test('should always include ethical disclaimer', () => {
      const insights = {
        anxietyLevel: 'low',
        anxietyTriggers: [],
        reassuranceNeeded: false,
        copingStrategies: []
      };
      
      const prompt = generateAnxietyCoachingPrompt(insights);
      expect(prompt).toContain('IMPORTANT DISCLAIMER: This is not a substitute for professional mental health services');
    });
  });
});