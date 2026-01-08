/**
 * Validation tests for intent recognition and speaker profile reliability
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { detectIntent } from '../intentRecognition';
import { ConversationTurnManager } from '../speakerDetection';
import { CONVERSATION_CONFIG } from '../../config/conversationConfig';

describe('Intent Recognition Nuance Validation', () => {
  test('should distinguish between acknowledgment and agreement', () => {
    // Acknowledgment phrases
    expect(detectIntent('I see what you mean')).toBe('acknowledgment');
    expect(detectIntent('Makes sense')).toBe('acknowledgment');
    expect(detectIntent('Exactly')).toBe('acknowledgment'); // Moved to acknowledgment in our refactor
    expect(detectIntent('Point taken')).toBe('acknowledgment');
    expect(detectIntent('Noted')).toBe('acknowledgment');

    // Agreement phrases
    expect(detectIntent('Yes, absolutely')).toBe('agreement');
    expect(detectIntent('I agree with you')).toBe('agreement');
    expect(detectIntent('Definitely')).toBe('agreement');
    expect(detectIntent('Sounds good')).toBe('agreement');
  });

  test('should distinguish between backchannel and pause indicators', () => {
    expect(detectIntent('uh-huh')).toBe('backchannel');
    expect(detectIntent('mm-hmm')).toBe('backchannel');
    expect(detectIntent('hmm')).toBe('pause_indicators');
    expect(detectIntent('let me think')).toBe('pause_indicators');
  });

  test('should correctly identify turn-yielding phrases', () => {
    const manager = new ConversationTurnManager();
    expect(manager.isTurnYieldingIntent('acknowledgment', 'Right, got it')).toBe(true);
    expect(manager.isTurnYieldingIntent('invitation', 'Go ahead')).toBe(true);
    expect(manager.isTurnYieldingIntent('transition', 'Anyway...')).toBe(true);
    expect(manager.isTurnYieldingIntent('concession', 'You have a point')).toBe(true);
  });
});

describe('Speaker Profile Reliability (minProfileUpdates)', () => {
  let manager;
  const mockFeatures = { pitchEstimate: 100, spectralCentroid: 500, zeroCrossingRate: 0.1 };

  beforeEach(() => {
    manager = new ConversationTurnManager({
      minProfileUpdates: 3 // Set low for testing
    });
  });

  test('should return 0.5 similarity if profile has insufficient updates', () => {
    // Update once
    manager.profiles.user.update(mockFeatures, manager.config);
    expect(manager.profiles.user.averageFeatures.count).toBe(1);

    // Similarity should be neutral 0.5 regardless of actual features
    const similarity = manager.profiles.user.getSimilarity(mockFeatures, manager.config);
    expect(similarity).toBe(0.5);
  });

  test('should return real similarity after reaching minProfileUpdates', () => {
    // Update 3 times (the minimum)
    manager.profiles.user.update(mockFeatures, manager.config);
    manager.profiles.user.update(mockFeatures, manager.config);
    manager.profiles.user.update(mockFeatures, manager.config);
    expect(manager.profiles.user.averageFeatures.count).toBe(3);

    // Now similarity should be high because features match
    const similarity = manager.profiles.user.getSimilarity(mockFeatures, manager.config);
    expect(similarity).toBeGreaterThan(0.9);
  });
});
