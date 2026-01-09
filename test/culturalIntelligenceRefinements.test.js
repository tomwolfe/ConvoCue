/**
 * New tests for Advanced Cultural Intelligence refinements
 */
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { 
  analyzeCulturalContext 
} from '../src/utils/culturalIntelligence.js';
import { 
  submitCulturalFeedback,
  getUserCulturalBiasAdjustments
} from '../src/utils/culturalFeedback.js';

describe('Cultural Intelligence Refinements', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  test('should detect country-specific overrides (Japan)', () => {
    // 'konichiwa' should trigger 'japan' culture which has 'very-indirect' override
    const text = "Konichiwa, I was wondering if it might be possible to look at the draft.";
    const result = analyzeCulturalContext(text, 'general', []);
    
    expect(result.primaryCulture).toBe('japan');
    expect(result.communicationStyle.directness).toBe('very-indirect');
  });

  test('should adapt to user bias feedback', () => {
    // Simulate user consistently disliking 'directness' recommendations
    submitCulturalFeedback('id1', 'Be direct', 'negative', 'nordic', '', 'directness');
    submitCulturalFeedback('id2', 'Be clear', 'negative', 'nordic', '', 'directness');
    submitCulturalFeedback('id3', 'Speak up', 'negative', 'nordic', '', 'directness');

    const adjustments = getUserCulturalBiasAdjustments();
    expect(adjustments.directness).toBe(-0.3);

    // Now analyze context for a direct culture (nordic)
    // It should STILL detect nordic, but maybe we should check if recommendations are filtered
    const text = "Hi, can you fix this?";
    const result = analyzeCulturalContext(text, 'nordic', []);
    
    // In our implementation, (0.5 + adjustment) > 0.3
    // 0.5 - 0.3 = 0.2, which is NOT > 0.3. So 'directness' recommendations should be filtered out.
    const directnessRecs = result.recommendations.filter(r => r.category === 'directness');
    expect(directnessRecs.length).toBe(0);
  });

  test('should detect enhanced situational context', () => {
    const text = "We need to negotiate the price of the contract for everyone on the team.";
    const result = analyzeCulturalContext(text, 'general', []);
    
    expect(result.situationalContext.interactionGoal).toBe('negotiation');
    expect(result.situationalContext.isPublicSetting).toBe(true);
  });
});
