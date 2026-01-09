import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ConversationTurnManager } from './speakerDetection';
import * as intentRecognition from './intentRecognition';
import * as speakerDetection from './speakerDetection';

vi.mock('./intentRecognition', () => ({
  detectIntent: vi.fn(),
  detectIntentWithConfidence: vi.fn()
}));

describe('ConversationTurnManager', () => {
  let manager;
  const mockAudio = new Float32Array(1024);
  let now = 1000000;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    manager = new ConversationTurnManager();
    manager.lastSpeechTime = now;
    manager.lastProcessTime = now;
    
    // Default mock to keep speaker role as 'user'
    vi.spyOn(manager.profiles.user, 'getSimilarity').mockReturnValue(1.0);
    vi.spyOn(manager.profiles.other, 'getSimilarity').mockReturnValue(0.0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should decay turnYieldConfidence over time even without text', () => {
    intentRecognition.detectIntentWithConfidence.mockReturnValue({ intent: 'question', confidence: 1.0 });
    
    // User asks a question
    manager.processAudio(mockAudio, 'What is your name?');
    expect(manager.turnYieldConfidence).toBe(0.8);
    
    // Advance time by 1500ms (one half-life)
    now += 1500;
    manager.processAudio(mockAudio);
    
    // Should be around 0.4
    expect(manager.turnYieldConfidence).toBeCloseTo(0.4);
  });

  it('should be frame-rate independent', () => {
    intentRecognition.detectIntentWithConfidence.mockReturnValue({ intent: 'question', confidence: 1.0 });
    manager.processAudio(mockAudio, 'What is your name?');
    expect(manager.turnYieldConfidence).toBe(0.8);
    
    // Advance time by 1500ms in many small steps
    for (let i = 0; i < 15; i++) {
      now += 100;
      // Also update lastSpeechTime to prevent turn change timeout
      manager.lastSpeechTime = now;
      manager.processAudio(mockAudio);
    }
    
    // Should still be around 0.4, regardless of number of calls
    expect(manager.turnYieldConfidence).toBeCloseTo(0.4);
  });

  it('should use intent confidence', () => {
    intentRecognition.detectIntentWithConfidence.mockReturnValue({ intent: 'question', confidence: 0.5 });
    
    manager.processAudio(mockAudio, 'Maybe a question?');
    // 0.8 * 0.5 = 0.4
    expect(manager.turnYieldConfidence).toBe(0.4);
  });

  it('should not reset turnYieldConfidence BEFORE turn detection if it could help trigger a turn change', () => {
    // 1. Setup: User asks a question, setting high yield confidence
    intentRecognition.detectIntentWithConfidence.mockReturnValue({ intent: 'question', confidence: 1.0 });
    manager.processAudio(mockAudio, 'What is your name?');
    expect(manager.turnYieldConfidence).toBe(0.8);

    // 2. Simulate a new sound that is likely a new speaker but not confident enough on its own
    // speakerChangeConfidenceThreshold is 0.6. Our mock provides 0.5.
    // It will NEED turnYieldConfidence > 0.5 and isLikelyNewSpeaker=true and speakerConfidence > 0.3
    // which is the case here (0.8 > 0.5 && true && 0.5 > 0.3)
    now += 100;
    vi.spyOn(manager, 'analyzeSpeakerCharacteristics').mockReturnValue({
      isLikelyNewSpeaker: true,
      confidenceScore: 0.5,
      features: new Float32Array(128).fill(0.1),
      speakerChangeLikelihood: 0.5
    });

    // Make it not silent so it would have triggered the old reset
    vi.spyOn(manager, 'isSilent').mockReturnValue(false);
    
    // We expect similarity profiles to favor 'other' now to confirm speaker change
    vi.spyOn(manager.profiles.user, 'getSimilarity').mockReturnValue(0.2);
    vi.spyOn(manager.profiles.other, 'getSimilarity').mockReturnValue(0.8);

    const result = manager.processAudio(mockAudio);
    
    // With the fix, shouldStartNewTurn should be true because turnYieldConfidence was 0.8
    // and was NOT reset before the check.
    
    // In our simplified test, we check if the turn role became 'other'
    expect(result.turn.speaker).toBe('other');
    
    // And turnYieldConfidence should be reset AFTER the turn change
    expect(manager.turnYieldConfidence).toBe(0);
  });

  it('should be resilient to intent recognition errors', () => {
    intentRecognition.detectIntentWithConfidence.mockImplementation(() => {
      throw new Error('Intent detection failed');
    });
    
    // This should not throw
    expect(() => {
      manager.processAudio(mockAudio, 'What is your name?');
    }).not.toThrow();
    
    // turnYieldConfidence should remain at its default (0)
    expect(manager.turnYieldConfidence).toBe(0);
  });
});