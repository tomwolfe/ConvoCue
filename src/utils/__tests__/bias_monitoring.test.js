/**
 * Test suite for bias monitoring utilities
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { analyzeTurnYieldBias, getBiasTracker, generateBiasAuditReport } from '../biasMonitoring';

describe('Bias Monitoring Features', () => {
  beforeEach(() => {
    // Reset bias tracker before each test
    const tracker = getBiasTracker();
    tracker.reset();
  });

  test('should track turn yields by speech pattern', () => {
    const audioFeatures = {
      pitchEstimate: 150,
      spectralCentroid: 1500,
      zeroCrossingRate: 0.1
    };
    
    // Simulate a yield for typical speech
    const result1 = analyzeTurnYieldBias(audioFeatures, true, { turnYieldWeightingFactor: 0.2 });
    
    // Simulate no yield for typical speech
    const result2 = analyzeTurnYieldBias(audioFeatures, false, { turnYieldWeightingFactor: 0.2 });
    
    const report = generateBiasAuditReport();
    
    expect(report.typicalSpeech.totalEvents).toBe(2);
    expect(report.typicalSpeech.yieldEvents).toBe(1);
    expect(report.typicalSpeech.yieldRate).toBe(0.5);
  });

  test('should identify potential bias events', () => {
    // Simulate features that might indicate non-native speech
    const nonNativeFeatures = {
      pitchEstimate: 200, // Higher than baseline
      spectralCentroid: 2500, // Higher frequencies
      zeroCrossingRate: 0.15,
      hasNonNativeIndicators: true
    };
    
    const result = analyzeTurnYieldBias(nonNativeFeatures, true, { turnYieldWeightingFactor: 0.3 });
    
    expect(result.isPotentialBias).toBe(true);
    expect(result.characteristics.hasNonNativeIndicators).toBe(true);
  });

  test('should generate comprehensive bias audit report', () => {
    const audioFeatures = {
      pitchEstimate: 100,
      spectralCentroid: 500,
      zeroCrossingRate: 0.1
    };
    
    // Generate various events to populate the report
    for (let i = 0; i < 10; i++) {
      analyzeTurnYieldBias(audioFeatures, i % 3 === 0, { turnYieldWeightingFactor: 0.2 });
    }
    
    const report = generateBiasAuditReport();
    
    expect(report.typicalSpeech.totalEvents).toBe(10);
    expect(report.disparityAnalysis).toBeDefined();
  });

  test('should reset bias metrics', () => {
    const audioFeatures = {
      pitchEstimate: 120,
      spectralCentroid: 1000,
      zeroCrossingRate: 0.1
    };
    
    analyzeTurnYieldBias(audioFeatures, true, { turnYieldWeightingFactor: 0.2 });
    
    const tracker = getBiasTracker();
    expect(tracker.metrics.turnYieldBySpeechPattern.typicalSpeech.total).toBe(1);
    
    tracker.reset();
    
    expect(tracker.metrics.turnYieldBySpeechPattern.typicalSpeech.total).toBe(0);
  });
});