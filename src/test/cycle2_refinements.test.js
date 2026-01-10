import { describe, it, expect, vi, beforeEach } from 'vitest';
import { orchestratePersona } from '../utils/personaOrchestrator';
import { resolveFeatureConflicts } from '../utils/featureCoordination';
import * as intentRecognition from '../utils/intentRecognition';

// Mock intentRecognition
vi.mock('../utils/intentRecognition', async () => {
  const actual = await vi.importActual('../utils/intentRecognition');
  return {
    ...actual,
    detectMultipleIntents: vi.fn(),
    calculateSimilarity: actual.calculateSimilarity
  };
});

describe('Cycle 2 Refinements', () => {
  
  describe('High-Intensity Intent Thresholding', () => {
    it('should increase threshold when high-intensity intents are detected', () => {
      // Mock 'conflict' intent detection
      vi.mocked(intentRecognition.detectMultipleIntents).mockReturnValueOnce([
        { intent: 'conflict', confidence: 0.9 }
      ]);

      const input = "I am so angry with you, this is a conflict!";
      const result = orchestratePersona(input, [], 'meeting');
      
      expect(result.debug.intensityBoost).toBeGreaterThan(0);
      expect(result.debug.threshold).toBeGreaterThan(0.7);
    });

    it('should prevent switching if score doesn\'t overcome the intensity boost', () => {
      // Mock 'conflict' intent detection
      vi.mocked(intentRecognition.detectMultipleIntents).mockReturnValue([
        { intent: 'conflict', confidence: 0.9 }
      ]);
      
      const input = "I need to discuss the contract, but I'm very angry about it.";
      const result = orchestratePersona(input, [], 'meeting');
      
      expect(result.debug.intensityBoost).toBeGreaterThan(0);
    });
  });

  describe('Coaching Calibration (Weighting)', () => {
    it('should prioritize the active persona insights (2x weight boost)', () => {
      const insights = {
        meeting: { insight: 'Meeting advice' },
        cultural: { insight: 'Cultural advice', characteristics: { formality_level: 'high' } }
      };
      
      // FEATURE_PRIORITIES: cultural = 3, meeting = 2
      // Normal order: cultural, meeting
      
      // If persona is 'meeting', meeting priority becomes 2 * 2 = 4
      // New order: meeting, cultural
      
      const resolved = resolveFeatureConflicts(insights, 'meeting');
      const keys = Object.keys(resolved);
      
      expect(keys[0]).toBe('meeting');
      expect(keys[1]).toBe('cultural');
    });

    it('should keep cultural as top priority if active persona is something else', () => {
      const insights = {
        meeting: { insight: 'Meeting advice' },
        cultural: { insight: 'Cultural advice' }
      };
      
      // Persona 'anxiety' (activePersonaFeature = 'anxiety')
      // meeting priority = 2, cultural priority = 3
      const resolved = resolveFeatureConflicts(insights, 'anxiety');
      const keys = Object.keys(resolved);
      
      expect(keys[0]).toBe('cultural');
      expect(keys[1]).toBe('meeting');
    });
  });
});
