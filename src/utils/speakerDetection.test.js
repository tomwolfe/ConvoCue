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
});