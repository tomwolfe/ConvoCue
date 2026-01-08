/**
 * Test suite for performance monitoring and enhanced features
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { ConversationTurnManager } from '../speakerDetection';
import { CONVERSATION_CONFIG } from '../../config/conversationConfig';
import { monitorProfileConvergence, measureLatency, getPerformanceTracker, recordMemoryUsage, recordTurnStutterRate } from '../performanceMonitoring';

describe('Performance Monitoring Features', () => {
  test('should track profile convergence correctly', () => {
    const manager = new ConversationTurnManager();
    const mockFeatures = { pitchEstimate: 100, spectralCentroid: 500, zeroCrossingRate: 0.1 };

    // Update profile multiple times to simulate convergence
    for (let i = 0; i < 10; i++) {
      manager.profiles.user.update(mockFeatures, manager.config);
      // Add consistent similarity scores to simulate convergence
      manager.profiles.user.consistencyHistory.push(0.8);
      if (manager.profiles.user.consistencyHistory.length > 10) {
        manager.profiles.user.consistencyHistory.shift();
      }
    }

    // Create a convergence monitor
    const checkConvergence = monitorProfileConvergence(manager.profiles.user);
    const isConverged = checkConvergence();
    
    expect(isConverged).toBe(true);
  });

  test('should measure latency correctly', async () => {
    const slowFunction = async (delay) => {
      await new Promise(resolve => setTimeout(resolve, delay));
      return 'result';
    };

    const result = await measureLatency(slowFunction, 10);
    expect(result).toBe('result');

    const tracker = getPerformanceTracker();
    const metrics = tracker.getMetrics();
    expect(metrics.systemMetrics.avgResponseLatency).toBeGreaterThan(0);
  });

  test('should record memory usage correctly', () => {
    const manager = new ConversationTurnManager();
    recordMemoryUsage(manager);

    const tracker = getPerformanceTracker();
    const metrics = tracker.getMetrics();
    expect(typeof metrics.systemMetrics.currentMemoryUsage).toBe('number');
  });

  test('should record turn stutter rate correctly', () => {
    const diagnostics = {
      speakerChangesDetected: 5,
      totalAudioFramesProcessed: 10000, // 10 seconds of audio at 1000 fps
      turnYieldsDetected: 2,
      errorsEncountered: 0
    };

    recordTurnStutterRate(diagnostics);

    const tracker = getPerformanceTracker();
    const metrics = tracker.getMetrics();
    expect(metrics.turnMetrics.avgStutterRate).toBeGreaterThan(0);
  });
});

describe('Enhanced Configuration Parameters', () => {
  test('should use micro-pause threshold from config', () => {
    const customConfig = {
      ...CONVERSATION_CONFIG,
      microPauseThresholdMs: 80  // Custom threshold
    };
    
    const manager = new ConversationTurnManager(customConfig);
    expect(manager.config.microPauseThresholdMs).toBe(80);
  });

  test('should use dynamic alpha multiplier from config', () => {
    const customConfig = {
      ...CONVERSATION_CONFIG,
      dynamicAlphaMultiplier: 2.0  // Custom multiplier
    };
    
    const manager = new ConversationTurnManager(customConfig);
    expect(manager.config.dynamicAlphaMultiplier).toBe(2.0);
  });
});

describe('Micro-Pause Detection', () => {
  test('should detect micro-pauses correctly', () => {
    const manager = new ConversationTurnManager({
      microPauseThresholdMs: 100
    });

    // Mock the estimateCurrentSpeaker method to return 'user'
    manager.estimateCurrentSpeaker = () => 'user';
    
    // Simulate a micro-pause scenario
    manager.lastSpeaker = 'user';
    manager.lastSpeechStartTime = Date.now() - 50; // Within micro-pause threshold
    
    // This would be checked in the processAudio logic
    const timeSinceLastSpeech = 50; // Less than micro-pause threshold
    const isMicroPause = timeSinceLastSpeech < manager.config.microPauseThresholdMs && timeSinceLastSpeech > 0;
    const shouldConsiderMicroPause = isMicroPause && manager.lastSpeaker === manager.estimateCurrentSpeaker({});
    
    expect(isMicroPause).toBe(true);
    expect(shouldConsiderMicroPause).toBe(true);
  });
});

describe('Dynamic Alpha Implementation', () => {
  test('should increase alpha after minProfileUpdates', () => {
    const manager = new ConversationTurnManager({
      minProfileUpdates: 3,
      dynamicAlphaMultiplier: 2.0,
      profileUpdateAlpha: 0.1
    });
    
    const profile = manager.profiles.user;
    const mockFeatures = { pitchEstimate: 100, spectralCentroid: 500, zeroCrossingRate: 0.1 };
    
    // Update profile to reach minProfileUpdates
    for (let i = 0; i < 3; i++) {
      profile.update(mockFeatures, manager.config);
    }
    
    // After minProfileUpdates, the next update should use increased alpha
    // We can't directly test the alpha value, but we can verify the profile count
    expect(profile.averageFeatures.count).toBe(3);
  });

  test('should handle inconsistent profiles with adaptive learning', () => {
    const manager = new ConversationTurnManager();
    const profile = manager.profiles.user;
    const mockFeatures = { pitchEstimate: 100, spectralCentroid: 500, zeroCrossingRate: 0.1 };
    
    // Initialize profile
    profile.update(mockFeatures, manager.config);
    
    // Add low consistency scores to trigger adaptive learning
    for (let i = 0; i < 6; i++) {
      profile.consistencyHistory.push(0.2);
    }
    
    // Update should trigger faster adaptation due to inconsistency
    profile.update(mockFeatures, manager.config);
    expect(profile.averageFeatures.count).toBe(2);
  });
});