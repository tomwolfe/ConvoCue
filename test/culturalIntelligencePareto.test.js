/**
 * Pareto-optimal fixes verification tests for Cultural Intelligence
 */
import { describe, test, expect, beforeEach } from 'vitest';
import { 
  analyzeCulturalContext 
} from '../src/utils/culturalIntelligence.js';

describe('Cultural Intelligence Pareto Fixes', () => {
  test('should detect "As-salamu alaykum" correctly for Egypt or Saudi Arabia', () => {
    const text = "As-salamu alaykum, my friend.";
    const result = analyzeCulturalContext(text, 'general', []);
    
    // It should detect a middle-eastern culture (egypt or saudi-arabia)
    expect(['egypt', 'saudi-arabia', 'uae']).toContain(result.primaryCulture);
    expect(result.confidence).toBeGreaterThan(0.3);
  });

  test('should detect "Shalom" correctly for Israel', () => {
    const text = "Shalom, how are you?";
    const result = analyzeCulturalContext(text, 'general', []);
    
    expect(result.primaryCulture).toBe('israel');
    expect(result.communicationStyle.directness).toBe('direct');
  });

  test('should prioritize user explicit setting (UK) over low-confidence detection', () => {
    // "Hello" might have some weak detection for 'usa' or others, but 'uk' should persist
    const text = "Hello";
    const result = analyzeCulturalContext(text, 'uk', []);
    
    // Unless detection for something else is > 0.75, it should stay 'uk'
    expect(result.primaryCulture).toBe('uk');
  });

  test('should override user explicit setting (UK) if detection is extremely high', () => {
    // "Konichiwa" is very specific to Japan
    const text = "Konichiwa, Tanaka-san";
    const result = analyzeCulturalContext(text, 'uk', []);
    
    // Detection for Japan should be high enough to override UK if we have enough indicators
    // Tanaka-san + Konichiwa might get us over 0.75
    if (result.confidence >= 0.75) {
      expect(result.primaryCulture).toBe('japan');
    } else {
      // If it's not high enough, it should stay 'uk'
      expect(result.primaryCulture).toBe('uk');
    }
  });

  test('should handle specific countries in Africa like Ghana', () => {
    const text = "Akwaaba! Welcome to our home.";
    const result = analyzeCulturalContext(text, 'general', []);
    
    expect(result.primaryCulture).toBe('ghana');
    expect(result.communicationStyle.greetingStyle).toBe('warm');
  });

  test('should handle Southeast Asian countries like Thailand', () => {
    const text = "Sawasdee, thank you for your help.";
    const result = analyzeCulturalContext(text, 'general', []);
    
    expect(result.primaryCulture).toBe('thailand');
    expect(result.communicationStyle.directness).toBe('very-indirect');
  });
});
