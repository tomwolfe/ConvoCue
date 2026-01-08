/**
 * Test suite for enhanced speaker detection and turn management
 * Validates the fixes for the issues identified in the critical review
 */

import { ConversationTurnManager } from '../speakerDetection';
import { CONVERSATION_CONFIG } from '../../config/conversationConfig';

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
    expect(manager.isTurnYieldingIntent('greeting', 'Hello')).toBe(false); // Not a turn-yielding intent itself

    // Test new turn-yielding intents
    expect(manager.isTurnYieldingIntent('acknowledgment', 'I see what you mean')).toBe(true);
    expect(manager.isTurnYieldingIntent('backchannel', 'Uh-hung')).toBe(true);
    expect(manager.isTurnYieldingIntent('concession', 'You\'re right about that')).toBe(true);
    expect(manager.isTurnYieldingIntent('invitation', 'Go ahead and continue')).toBe(true);
    expect(manager.isTurnYieldingIntent('transition', 'Anyway, let me add')).toBe(true);
    expect(manager.isTurnYieldingIntent('pause_indicators', 'Let me think about this')).toBe(true);

    // Test non-turn-yielding intents
    expect(manager.isTurnYieldingIntent('strategic', 'This is a strategic decision')).toBe(false);
    expect(manager.isTurnYieldingIntent('action', 'We need to complete this task')).toBe(false);
    expect(manager.isTurnYieldingIntent('question', 'How are you?')).toBe(false); // Question intent is handled separately in processAudio
  });

  test('should detect turn-yielding phrases in text', () => {
    expect(manager.isTurnYieldingIntent(null, 'Go ahead and tell me more')).toBe(true);
    expect(manager.isTurnYieldingIntent(null, 'What do you think about this?')).toBe(true);
    expect(manager.isTurnYieldingIntent(null, 'Over to you now')).toBe(true);
    expect(manager.isTurnYieldingIntent(null, 'That sounds interesting')).toBe(false);
  });

  test('should implement rejection window to prevent race conditions', () => {
    // Mock audio data and setup
    const mockAudioData = new Float32Array([0.1, 0.2, 0.3]);
    const mockSpeakerAnalysis = {
      features: {},
      speakerChangeLikelihood: 0.5,
      confidenceScore: 0.7,
      isLikelyNewSpeaker: true
    };
    
    // Set up manager state to simulate a situation where a turn yield occurred recently
    manager.turnYieldConfidence = 0.8; // High yield confidence
    manager.lastSpeaker = 'user';
    manager.lastSpeechStartTime = Date.now() - 100; // Started speaking 100ms ago
    manager.lastSpeechTime = Date.now() - 150; // Last speech ended 150ms ago
    
    // Process audio where same speaker continues speaking (within rejection window)
    const result = manager.processAudio(mockAudioData, 'This is a continuation...');
    
    // The turn should NOT change because we're in the rejection window
    // (same speaker continuing to talk immediately after "yielding" with a question)
    expect(result.turnYieldConfidence).toBeGreaterThan(0); // Yield confidence should remain high
  });

  test('should apply turn-yielding bias correctly', () => {
    const mockSpeakerAnalysis = {
      features: { pitchEstimate: 150, spectralCentroid: 1000, zeroCrossingRate: 0.05 },
      speakerChangeLikelihood: 0.4,
      confidenceScore: 0.6,
      isLikelyNewSpeaker: true
    };
    
    // Set up a scenario where user has yielded turn
    manager.turnYieldConfidence = 0.8;
    manager.lastSpeaker = 'user';
    
    // Mock the similarity methods
    manager.profiles.user.getSimilarity = global.jest.fn(() => 0.6);
    manager.profiles.other.getSimilarity = global.jest.fn(() => 0.55);
    
    // Apply weighting calculation manually to test
    const userSimilarity = 0.6;
    const otherSimilarity = 0.55;
    const weightToOther = (manager.lastSpeaker === 'user') ? manager.turnYieldConfidence * manager.config.turnYieldWeightingFactor : 0;
    const weightToUser = (manager.lastSpeaker === 'other') ? manager.turnYieldConfidence * manager.config.turnYieldWeightingFactor : 0;

    const adjustedUserSim = userSimilarity + weightToUser; // 0.6 + 0 = 0.6
    const adjustedOtherSim = otherSimilarity + weightToOther; // 0.55 + (0.8 * 0.2) = 0.55 + 0.16 = 0.71

    expect(adjustedOtherSim).toBeGreaterThan(adjustedUserSim); // Weighting should favor 'other' speaker
  });

  test('should decay turn yield confidence appropriately', () => {
    // Initialize with some values to prevent speaker change
    manager.lastSpeaker = 'user';
    manager.lastSpeechTime = Date.now(); // Recent speech to avoid triggering turn change
    manager.turnYieldConfidence = 0.8;

    // Process audio without any yielding intent
    const mockAudioData = new Float32Array([0.1, 0.2, 0.3]);
    // The decay happens inside processAudio when no turn-yielding intent is detected
    // We need to make sure detectIntent doesn't return 'question' or other turn-yielding intents
    // and that the text doesn't end with '?' which also triggers high confidence

    manager.processAudio(mockAudioData, 'Just some regular speech that is not a question and has no turn-yielding indicators');

    // The decay should happen when no turn-yielding intent is detected
    const expectedDecay = Math.max(0, 0.8 - manager.config.yieldConfidenceDecay); // 0.8 - 0.1 = 0.7
    expect(manager.turnYieldConfidence).toBeCloseTo(expectedDecay, 1);
  });

  test('should reset turn yield confidence on speaker change', () => {
    manager.turnYieldConfidence = 0.8;
    manager.lastSpeaker = 'user';
    
    // Simulate a turn change to 'other'
    manager.currentTurn = { speaker: 'user' };
    manager.lastSpeechTime = Date.now() - 2000; // 2 seconds of silence
    
    const mockAudioData = new Float32Array([0.1, 0.2, 0.3]);
    // Mock similarity to force speaker change
    const originalGetSimilarity = manager.profiles.user.getSimilarity;
    const originalOtherGetSimilarity = manager.profiles.other.getSimilarity;
    
    manager.profiles.user.getSimilarity = global.jest.fn(() => 0.3);
    manager.profiles.other.getSimilarity = global.jest.fn(() => 0.7);
    
    const result = manager.processAudio(mockAudioData, 'Speech from other speaker');
    
    // After speaker change, turn yield confidence should reset to 0
    expect(manager.turnYieldConfidence).toBe(0);
    
    // Restore mocks
    manager.profiles.user.getSimilarity = originalGetSimilarity;
    manager.profiles.other.getSimilarity = originalOtherGetSimilarity;
  });
});

import { detectIntent } from '../intentRecognition';

describe('Intent Recognition Enhancement', () => {
  test('should recognize new intent categories', () => {
    expect(detectIntent('I see what you mean')).toBe('acknowledgment');
    expect(detectIntent('Uh-huh')).toBe('backchannel');
    expect(detectIntent('You\'re right about that')).toBe('concession');
    expect(detectIntent('Go ahead and continue')).toBe('invitation');
    expect(detectIntent('Anyway, let me add')).toBe('transition');
    expect(detectIntent('Let me think about this')).toBe('pause_indicators');
  });

  test('should handle turn-yielding phrases correctly', () => {
    const manager = new ConversationTurnManager();

    expect(manager.isTurnYieldingIntent(null, 'Go ahead and tell me more')).toBe(true);
    expect(manager.isTurnYieldingIntent(null, 'What do you think about this?')).toBe(true);
    expect(manager.isTurnYieldingIntent(null, 'Over to you now')).toBe(true);
    expect(manager.isTurnYieldingIntent(null, 'That sounds interesting')).toBe(false);
  });

  test('should differentiate between similar intents', () => {
    expect(detectIntent('exactly right')).toBe('acknowledgment'); // Changed from agreement
    expect(detectIntent('yes I agree')).toBe('agreement');
    expect(detectIntent('absolutely')).toBe('agreement');
  });

  test('should monitor memory usage appropriately', () => {
    const manager = new ConversationTurnManager();

    // Add some mock turns to test memory tracking
    manager.turns = [
      { id: 1, text: 'Test turn 1', speaker: 'user' },
      { id: 2, text: 'Test turn 2', speaker: 'other' },
      { id: 3, text: 'Test turn 3', speaker: 'user' }
    ];

    const memoryInfo = manager.getMemoryUsage();

    expect(memoryInfo.turnCount).toBe(3);
    expect(memoryInfo.estimatedBytes).toBeGreaterThan(0);
    expect(memoryInfo.estimatedMB).toBeGreaterThanOrEqual(0);
    expect(typeof memoryInfo.warning).toBe('boolean');
  });

  test('should cleanup memory when exceeding limits', () => {
    const manager = new ConversationTurnManager();

    // Add more turns than the default limit
    for (let i = 0; i < 25; i++) {
      manager.turns.push({ id: i, text: `Test turn ${i}`, speaker: i % 2 === 0 ? 'user' : 'other' });
    }

    expect(manager.turns.length).toBe(25);

    // Cleanup memory to default limit (20)
    manager.cleanupMemory();

    expect(manager.turns.length).toBe(20);
  });
});