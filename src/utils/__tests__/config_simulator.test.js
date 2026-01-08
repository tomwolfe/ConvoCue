/**
 * Test suite for configuration simulator utilities
 */

import { describe, test, expect } from 'vitest';
import { 
  simulateConfigImpact, 
  configSimulationScenarios, 
  calculateExpectedImpacts, 
  generateConfigRecommendation,
  validateConfigForConflicts
} from '../configSimulator';
import { CONVERSATION_CONFIG } from '../../config/conversationConfig';

describe('Configuration Simulator Features', () => {
  test('should simulate impact of changing rejection window', async () => {
    const baseConfig = { ...CONVERSATION_CONFIG };
    const paramValues = [250, 300, 350, 400];
    
    // Simple simulation callback that returns mock metrics
    const simulationCallback = async (config) => {
      return {
        turnMetrics: {
          avgStutterRate: 0.05 + (config.rejectionWindowMs - 350) * 0.0001, // Simplified model
          avgDetectionAccuracy: 0.9 - Math.abs(config.rejectionWindowMs - 350) * 0.0005
        }
      };
    };
    
    const results = await simulateConfigImpact(
      baseConfig,
      'rejectionWindowMs',
      paramValues,
      simulationCallback
    );
    
    expect(results).toHaveLength(4);
    expect(results[0]).toHaveProperty('rejectionWindowMs');
    expect(results[0]).toHaveProperty('metrics');
  });

  test('should provide predefined simulation scenarios', () => {
    const baseConfig = { ...CONVERSATION_CONFIG };
    
    const rejectionWindowValues = configSimulationScenarios.rejectionWindow(baseConfig);
    expect(rejectionWindowValues).toContain(baseConfig.rejectionWindowMs);
    expect(rejectionWindowValues).toHaveLength(5);
    
    const turnYieldValues = configSimulationScenarios.turnYieldWeighting(baseConfig);
    expect(turnYieldValues).toContain(baseConfig.turnYieldWeightingFactor);
  });

  test('should calculate expected impacts correctly', () => {
    const config = { ...CONVERSATION_CONFIG };
    
    const impacts = calculateExpectedImpacts(config, 'rejectionWindowMs', 400);
    expect(impacts.stutterRate).toBe('DECREASE');
    expect(impacts.responseTime).toBe('INCREASE');
    
    const impacts2 = calculateExpectedImpacts(config, 'turnYieldWeightingFactor', 0.3);
    expect(impacts2.turnYieldSensitivity).toBe('INCREASE');
    expect(impacts2.biasPotential).toBe('INCREASE');
  });

  test('should generate config recommendations', () => {
    const currentConfig = { ...CONVERSATION_CONFIG };
    const metrics = {
      turnMetrics: {
        avgStutterRate: 0.15 // High stutter rate
      }
    };
    
    const recommendation = generateConfigRecommendation(
      currentConfig,
      'rejectionWindowMs',
      currentConfig.rejectionWindowMs,
      400,
      metrics
    );
    
    expect(recommendation.paramName).toBe('rejectionWindowMs');
    expect(recommendation.currentValue).toBe(currentConfig.rejectionWindowMs);
    expect(recommendation.expectedImpacts.stutterRate).toBe('DECREASE');
    expect(recommendation.reasoning).toContain('High stutter rate');
  });

  test('should validate config for conflicts', () => {
    // Test with conflicting values
    const badConfig = {
      ...CONVERSATION_CONFIG,
      microPauseThresholdMs: 400, // Greater than rejectionWindowMs (350)
      turnYieldWeightingFactor: 0.6, // High value
      speakerConfidenceHigh: 0.3 // Below recommended range
    };
    
    const issues = validateConfigForConflicts(badConfig);
    
    expect(issues).toHaveLength(3);
    
    const pauseIssue = issues.find(issue => issue.parameter === 'microPauseThresholdMs');
    expect(pauseIssue.issue).toContain('should be less than rejection window');
    
    const weightingIssue = issues.find(issue => issue.parameter === 'turnYieldWeightingFactor');
    expect(weightingIssue.severity).toBe('MEDIUM');
    
    const confidenceIssue = issues.find(issue => issue.parameter === 'speakerConfidenceHigh');
    expect(confidenceIssue.issue).toContain('outside recommended range');
  });

  test('should return no issues for valid config', () => {
    const validConfig = { ...CONVERSATION_CONFIG };
    const issues = validateConfigForConflicts(validConfig);
    
    expect(issues).toHaveLength(0);
  });
});