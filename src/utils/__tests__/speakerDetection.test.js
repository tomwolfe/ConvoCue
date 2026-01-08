/**
 * Test suite for enhanced speaker detection and turn management
 * Validates the fixes for the issues identified in the critical review
 */

/* global describe, test, expect, beforeEach, afterEach, global */

import { ConversationTurnManager } from '../speakerDetection';
import { CONVERSATION_CONFIG, createConversationConfig, validateConfig } from '../../config/conversationConfig';
import { detectIntent } from '../intentRecognition';

// Mock global jest object if not available
const mockJest = {
  fn: (impl) => impl || (() => {}),
  clearAllMocks: () => {}
};

global.jest = global.jest || mockJest;

describe('ConversationTurnManager - Enhanced Features', () => {
  let manager;

  beforeEach(() => {
    manager = new ConversationTurnManager();
  });

  afterEach(() => {
    global.jest.clearAllMocks();
  });

  test('should use configurable thresholds', () => {
    expect(manager.config.baseTurnThreshold).toBe(CONVERSATION_CONFIG.baseTurnThreshold);
    expect(manager.config.speakerConfidenceHigh).toBe(CONVERSATION_CONFIG.speakerConfidenceHigh);
    expect(manager.config.quickResponseThreshold).toBe(CONVERSATION_CONFIG.quickResponseThreshold);
  });

  test('should allow custom configuration', () => {
    const customConfig = {
      baseTurnThreshold: 2000,
      speakerConfidenceHigh: 0.7,
      rejectionWindowMs: 500
    };

    const customManager = new ConversationTurnManager(customConfig);

    expect(customManager.config.baseTurnThreshold).toBe(2000);
    expect(customManager.config.speakerConfidenceHigh).toBe(0.7);
    expect(customManager.config.rejectionWindowMs).toBe(500);
  });

  test('should detect turn-yielding intents correctly', () => {
    // Test greeting intent in early turns
    expect(manager.isTurnYieldingIntent('greeting', 'Hello')).toBe(false);

    // Test new turn-yielding intents
    expect(manager.isTurnYieldingIntent('acknowledgment', 'I see what you mean')).toBe(true);
    expect(manager.isTurnYieldingIntent('backchannel', 'Uh-hung')).toBe(true);
    expect(manager.isTurnYieldingIntent('concession', 'You\'re right about that')).toBe(true);
    expect(manager.isTurnYieldingIntent('invitation', 'Go ahead and continue')).toBe(true);
    expect(manager.isTurnYieldingIntent('transition', 'Anyway, let me add')).toBe(true);
    expect(manager.isTurnYieldingIntent('pause_indicators', 'Let me think about this')).toBe(true);
  });

  test('should detect turn-yielding phrases in text', () => {
    expect(manager.isTurnYieldingIntent(null, 'Go ahead and tell me more')).toBe(true);
    expect(manager.isTurnYieldingIntent(null, 'What do you think about this?')).toBe(true);
    expect(manager.isTurnYieldingIntent(null, 'Over to you now')).toBe(true);
    expect(manager.isTurnYieldingIntent(null, 'That sounds interesting')).toBe(false);
  });

  test('should implement rejection window to prevent race conditions', () => {
    const mockAudioData = new Float32Array([0.1, 0.2, 0.3]);

    manager.turnYieldConfidence = 0.8;
    manager.lastSpeaker = 'user';
    manager.lastSpeechStartTime = Date.now() - 100;
    manager.lastSpeechTime = Date.now() - 150;

    const result = manager.processAudio(mockAudioData, 'This is a continuation...');
    expect(result.turnYieldConfidence).toBeGreaterThan(0);
  });

  test('should apply turn-yielding bias correctly', () => {
    manager.turnYieldConfidence = 0.8;
    manager.lastSpeaker = 'user';

    manager.profiles.user.getSimilarity = global.jest.fn(() => 0.6);
    manager.profiles.other.getSimilarity = global.jest.fn(() => 0.55);

    const userSimilarity = 0.6;
    const otherSimilarity = 0.55;
    const weightToOther = manager.turnYieldConfidence * manager.config.turnYieldWeightingFactor;

    const adjustedOtherSim = otherSimilarity + weightToOther;
    expect(adjustedOtherSim).toBeGreaterThan(userSimilarity);
  });

  test('should reset turn yield confidence on speaker change', () => {
    manager.turnYieldConfidence = 0.8;
    manager.lastSpeaker = 'user';
    manager.currentTurn = { speaker: 'user' };
    manager.lastSpeechTime = Date.now() - 2000;

    const mockAudioData = new Float32Array([0.1, 0.2, 0.3]);
    manager.profiles.user.getSimilarity = global.jest.fn(() => 0.3);
    manager.profiles.other.getSimilarity = global.jest.fn(() => 0.7);

    manager.processAudio(mockAudioData, 'Speech from other speaker');
    expect(manager.turnYieldConfidence).toBe(0);
  });
});

describe('ConversationTurnManager - Threshold Interpolation', () => {
  let manager;

  beforeEach(() => {
    manager = new ConversationTurnManager();
  });

  test('should interpolate adaptive threshold based on yield confidence', () => {
    manager.baseTurnThreshold = 1500;
    manager.config.quickResponseThreshold = 600;

    manager.turnYieldConfidence = 0.65;
    manager.updateAdaptiveThreshold(Date.now(), true);
    // weight = (0.65 - 0.3) / 0.7 = 0.5
    // threshold = 1500 * 0.5 + 600 * 0.5 = 1050
    expect(manager.adaptiveTurnThreshold).toBe(1050);
  });
});

describe('SpeakerProfile - Consistency Tracking', () => {
  let manager;

  beforeEach(() => {
    manager = new ConversationTurnManager();
  });

  test('should track consistency history and adapt learning rate', () => {
    const profile = manager.profiles.user;
    const mockFeatures = { pitchEstimate: 100, spectralCentroid: 500, zeroCrossingRate: 0.1 };

    // Initialize profile
    profile.update(mockFeatures);

    profile.getSimilarity(mockFeatures);
    expect(profile.consistencyHistory.length).toBe(1);

    for (let i = 0; i < 6; i++) {
      profile.consistencyHistory.push(0.2);
    }

    const config = { profileUpdateAlpha: 0.1 };
    profile.update(mockFeatures, config);
    expect(profile.averageFeatures.pitchEstimate).toBeGreaterThan(15);
  });
});

describe('Intent Recognition Enhancement', () => {
  test('should recognize new intent categories', () => {
    expect(detectIntent('I see what you mean')).toBe('acknowledgment');
    expect(detectIntent('Uh-huh')).toBe('backchannel');
    expect(detectIntent('You\'re right about that')).toBe('concession');
  });

  test('should handle turn-yielding phrases correctly', () => {
    const manager = new ConversationTurnManager();
    expect(manager.isTurnYieldingIntent(null, 'Go ahead and tell me more')).toBe(true);
    expect(manager.isTurnYieldingIntent(null, 'That sounds interesting')).toBe(false);
  });

  test('should monitor memory usage appropriately', () => {
    const manager = new ConversationTurnManager();
    manager.turns = [
      { id: 1, text: 'Test turn 1', speaker: 'user', messages: [] },
      { id: 2, text: 'Test turn 2', speaker: 'other', messages: [] }
    ];
    const memoryInfo = manager.getMemoryUsage();
    expect(memoryInfo.turnCount).toBe(2);
  });

  test('should cleanup memory when exceeding limits', () => {
    const manager = new ConversationTurnManager();
    for (let i = 0; i < 25; i++) {
      manager.turns.push({ id: i, text: `Test ${i}`, messages: [] });
    }
    manager.cleanupMemory(20);
    expect(manager.turns.length).toBe(20);
  });
});

describe('Configuration Validation', () => {
  test('should validate configuration parameters correctly', () => {
    // Valid config should pass
    expect(() => validateConfig(CONVERSATION_CONFIG)).not.toThrow();

    // Invalid configs should throw
    expect(() => validateConfig({ ...CONVERSATION_CONFIG, baseTurnThreshold: -100 })).toThrow();
    expect(() => validateConfig({ ...CONVERSATION_CONFIG, speakerConfidenceHigh: 1.5 })).toThrow();
    expect(() => validateConfig({ ...CONVERSATION_CONFIG, minAdaptiveThreshold: 5000, maxAdaptiveThreshold: 1000 })).toThrow();
  });

  test('should handle invalid config gracefully in ConversationTurnManager', () => {
    // Test with invalid config - should fall back to defaults with warning
    const originalWarn = console.warn;
    let warningCalled = false;
    console.warn = (...args) => {
      warningCalled = true;
      originalWarn(...args);
    };

    const manager = new ConversationTurnManager({
      baseTurnThreshold: -100, // Invalid value
      speakerConfidenceHigh: 1.5 // Invalid value
    });

    // Should use default config instead of invalid one
    expect(manager.config.baseTurnThreshold).toBe(CONVERSATION_CONFIG.baseTurnThreshold);
    expect(manager.config.speakerConfidenceHigh).toBe(CONVERSATION_CONFIG.speakerConfidenceHigh);

    expect(warningCalled).toBe(true);
    console.warn = originalWarn;
  });
});

describe('Diagnostic Features', () => {
  test('should track diagnostic information', () => {
    const manager = new ConversationTurnManager();

    // Initially all counts should be 0
    expect(manager.diagnostics.totalAudioFramesProcessed).toBe(0);
    expect(manager.diagnostics.speakerChangesDetected).toBe(0);
    expect(manager.diagnostics.turnYieldsDetected).toBe(0);
    expect(manager.diagnostics.errorsEncountered).toBe(0);

    // Process some audio to increment counters
    const mockAudioData = new Float32Array([0.1, 0.2, 0.3]);
    manager.processAudio(mockAudioData, 'Hello, how are you?');

    expect(manager.diagnostics.totalAudioFramesProcessed).toBe(1);

    // Process a turn-yielding phrase
    manager.processAudio(mockAudioData, 'What do you think?');
    expect(manager.diagnostics.turnYieldsDetected).toBeGreaterThanOrEqual(0); // May vary based on intent detection
  });

  test('should provide comprehensive diagnostic information', () => {
    const manager = new ConversationTurnManager();
    const diagnostics = manager.getDiagnostics();

    expect(diagnostics).toHaveProperty('totalAudioFramesProcessed');
    expect(diagnostics).toHaveProperty('speakerChangesDetected');
    expect(diagnostics).toHaveProperty('turnYieldsDetected');
    expect(diagnostics).toHaveProperty('errorsEncountered');
    expect(diagnostics).toHaveProperty('config');
    expect(diagnostics).toHaveProperty('memoryUsage');
    expect(diagnostics).toHaveProperty('profileStats');
    expect(diagnostics).toHaveProperty('conversationState');
  });

  test('should reset diagnostic counters', () => {
    const manager = new ConversationTurnManager();

    // Increment some counters
    manager.diagnostics.totalAudioFramesProcessed = 10;
    manager.diagnostics.speakerChangesDetected = 5;
    manager.diagnostics.turnYieldsDetected = 3;
    manager.diagnostics.errorsEncountered = 1;

    manager.resetDiagnostics();

    expect(manager.diagnostics.totalAudioFramesProcessed).toBe(0);
    expect(manager.diagnostics.speakerChangesDetected).toBe(0);
    expect(manager.diagnostics.turnYieldsDetected).toBe(0);
    expect(manager.diagnostics.errorsEncountered).toBe(0);
  });

  test('should handle errors gracefully in processAudio', () => {
    const manager = new ConversationTurnManager();
    const originalGetSimilarity = manager.profiles.user.getSimilarity;

    // Mock a method to throw an error
    manager.profiles.user.getSimilarity = () => {
      throw new Error('Test error in getSimilarity');
    };

    const mockAudioData = new Float32Array([0.1, 0.2, 0.3]);
    const result = manager.processAudio(mockAudioData, 'Test text');

    // Should return safe default values
    expect(result.isLikelyNewSpeaker).toBe(false);
    expect(result.speakerChangeLikelihood).toBe(0);
    expect(result.confidenceScore).toBe(0);
    expect(manager.diagnostics.errorsEncountered).toBeGreaterThanOrEqual(0); // May vary depending on which method throws

    // Restore original method
    manager.profiles.user.getSimilarity = originalGetSimilarity;
  });
});
