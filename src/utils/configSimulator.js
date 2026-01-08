/**
 * Configuration impact simulator for conversation system
 * Visualizes how changing one parameter affects other metrics
 */

/**
 * Simulates the impact of changing a configuration parameter
 * @param {Object} baseConfig - Base configuration
 * @param {string} paramName - Name of parameter to change
 * @param {Array<number>} paramValues - Values to test for the parameter
 * @param {Function} simulationCallback - Function that runs the simulation
 * @returns {Array<Object>} Results of the simulation
 */
export const simulateConfigImpact = async (baseConfig, paramName, paramValues, simulationCallback) => {
  const results = [];
  
  for (const value of paramValues) {
    // Create a config with the modified parameter
    const testConfig = {
      ...baseConfig,
      [paramName]: value
    };
    
    // Run the simulation with this config
    const metrics = await simulationCallback(testConfig);
    
    results.push({
      [paramName]: value,
      metrics: metrics,
      timestamp: Date.now()
    });
  }
  
  return results;
};

/**
 * Predefined simulation scenarios for common parameter changes
 */
export const configSimulationScenarios = {
  /**
   * Simulate the impact of changing rejection window
   */
  rejectionWindow: (baseConfig) => {
    return [
      baseConfig.rejectionWindowMs - 100,
      baseConfig.rejectionWindowMs - 50,
      baseConfig.rejectionWindowMs,
      baseConfig.rejectionWindowMs + 50,
      baseConfig.rejectionWindowMs + 100
    ];
  },
  
  /**
   * Simulate the impact of changing turn yield weighting factor
   */
  turnYieldWeighting: (baseConfig) => {
    return [
      0,      // No weighting (neutral)
      0.1,    // Low weighting
      0.2,    // Default weighting
      0.3,    // High weighting
      0.5     // Very high weighting
    ];
  },
  
  /**
   * Simulate the impact of changing speaker confidence thresholds
   */
  speakerConfidence: (baseConfig) => {
    return [
      0.4,    // Very low threshold
      0.5,    // Low threshold
      0.6,    // Default threshold
      0.7,    // High threshold
      0.8     // Very high threshold
    ];
  },
  
  /**
   * Simulate the impact of changing micro-pause threshold
   */
  microPauseThreshold: (baseConfig) => {
    return [
      50,   // Very short
      75,   // Short
      100,  // Default
      125,  // Long
      150   // Very long
    ];
  }
};

/**
 * Calculate expected impacts of parameter changes
 * @param {Object} config - Current configuration
 * @param {string} paramName - Parameter name that will be changed
 * @param {number} newValue - New value for the parameter
 * @returns {Object} Expected impacts
 */
export const calculateExpectedImpacts = (config, paramName, newValue) => {
  const impacts = {};
  
  switch(paramName) {
    case 'rejectionWindowMs':
      impacts.stutterRate = newValue > config.rejectionWindowMs ? 'DECREASE' : 'INCREASE';
      impacts.responseTime = newValue > config.rejectionWindowMs ? 'INCREASE' : 'DECREASE';
      impacts.turnInterruption = newValue > config.rejectionWindowMs ? 'DECREASE' : 'INCREASE';
      break;
      
    case 'turnYieldWeightingFactor':
      impacts.turnYieldSensitivity = newValue > config.turnYieldWeightingFactor ? 'INCREASE' : 'DECREASE';
      impacts.biasPotential = newValue > 0 ? 'INCREASE' : 'DECREASE';
      impacts.conversationFlow = 'MAY_VARY';
      break;
      
    case 'speakerConfidenceHigh':
      impacts.falsePositives = newValue > config.speakerConfidenceHigh ? 'DECREASE' : 'INCREASE';
      impacts.responseSensitivity = newValue > config.speakerConfidenceHigh ? 'DECREASE' : 'INCREASE';
      impacts.turnStability = newValue > config.speakerConfidenceHigh ? 'INCREASE' : 'DECREASE';
      break;
      
    case 'microPauseThresholdMs':
      impacts.microPauseHandling = newValue > config.microPauseThresholdMs ? 'MORE_PERMISSIVE' : 'LESS_PERMISSIVE';
      impacts.sentenceCorrection = newValue > config.microPauseThresholdMs ? 'IMPROVE' : 'DETERIORATE';
      impacts.turnYieldAccuracy = 'MAY_VARY';
      break;
      
    default:
      impacts.general = 'UNKNOWN';
  }
  
  return impacts;
};

/**
 * Generate configuration change recommendation
 * @param {Object} currentConfig - Current configuration
 * @param {string} paramName - Parameter to change
 * @param {number} currentValue - Current value
 * @param {number} newValue - Proposed new value
 * @param {Object} metrics - Current performance metrics
 * @returns {Object} Recommendation with reasoning
 */
export const generateConfigRecommendation = (currentConfig, paramName, currentValue, newValue, metrics) => {
  const recommendation = {
    paramName,
    currentValue,
    newValue,
    changeDirection: newValue > currentValue ? 'INCREASE' : newValue < currentValue ? 'DECREASE' : 'NO_CHANGE',
    expectedImpacts: calculateExpectedImpacts(currentConfig, paramName, newValue),
    confidence: 'MEDIUM' // Would be calculated based on more data in real implementation
  };
  
  // Add specific recommendations based on parameter type
  switch(paramName) {
    case 'rejectionWindowMs':
      if (metrics?.turnMetrics?.avgStutterRate > 0.1) { // High stutter rate
        recommendation.confidence = 'HIGH';
        recommendation.reasoning = `High stutter rate (${(metrics.turnMetrics.avgStutterRate).toFixed(3)}) suggests rejection window may be too short. Consider increasing from ${currentValue}ms to ${newValue}ms.`;
      } else if (metrics?.turnMetrics?.avgStutterRate < 0.02) { // Very low stutter rate
        recommendation.confidence = 'MEDIUM';
        recommendation.reasoning = `Low stutter rate suggests rejection window could potentially be shortened for more responsive interaction.`;
      }
      break;
      
    case 'turnYieldWeightingFactor':
      recommendation.reasoning = `Weighting factor of ${newValue} introduces bias toward yielding to other speaker. Monitor for potential demographic bias.`;
      recommendation.biasMonitoringRequired = true;
      break;
      
    case 'speakerConfidenceHigh':
      if (metrics?.turnMetrics?.avgStutterRate > 0.1) {
        recommendation.confidence = 'HIGH';
        recommendation.reasoning = `High stutter rate suggests speaker confidence threshold may be too low, causing false speaker changes.`;
      }
      break;
  }
  
  return recommendation;
};

/**
 * Visualize configuration parameter relationships
 * @param {Object} config - Configuration object
 * @returns {Object} Parameter relationship graph
 */
export const visualizeParameterRelationships = (config) => {
  // Define relationships between parameters
  const relationships = [
    {
      from: 'rejectionWindowMs',
      to: 'speakerConfidenceHigh',
      type: 'inversely_proportional',
      strength: 0.7,
      description: 'Longer rejection windows may allow for lower confidence thresholds'
    },
    {
      from: 'turnYieldWeightingFactor',
      to: 'speakerConfidenceHigh', 
      type: 'compensatory',
      strength: 0.5,
      description: 'Higher weighting may require higher confidence to prevent false yields'
    },
    {
      from: 'microPauseThresholdMs',
      to: 'rejectionWindowMs',
      type: 'complementary',
      strength: 0.6,
      description: 'Micro-pause threshold should be less than rejection window'
    }
  ];
  
  return {
    nodes: Object.keys(config).filter(key => typeof config[key] === 'number'),
    relationships: relationships,
    suggestions: relationships.map(rel => {
      return {
        ...rel,
        recommendation: `Adjust ${rel.to} when changing ${rel.from}`
      };
    })
  };
};

/**
 * Validate configuration for parameter conflicts
 * @param {Object} config - Configuration to validate
 * @returns {Array<Object>} Validation issues
 */
export const validateConfigForConflicts = (config) => {
  const issues = [];
  
  // Check for parameter conflicts
  if (config.microPauseThresholdMs >= config.rejectionWindowMs) {
    issues.push({
      severity: 'HIGH',
      parameter: 'microPauseThresholdMs',
      issue: 'Micro-pause threshold should be less than rejection window',
      currentValue: config.microPauseThresholdMs,
      recommendation: `Set microPauseThresholdMs < rejectionWindowMs (${config.rejectionWindowMs}ms)`
    });
  }
  
  if (config.turnYieldWeightingFactor > 0.5) {
    issues.push({
      severity: 'MEDIUM',
      parameter: 'turnYieldWeightingFactor',
      issue: 'High weighting factor may introduce significant bias',
      currentValue: config.turnYieldWeightingFactor,
      recommendation: 'Consider values between 0.1-0.3 to minimize bias'
    });
  }
  
  if (config.speakerConfidenceHigh < 0.4 || config.speakerConfidenceHigh > 0.8) {
    issues.push({
      severity: 'MEDIUM',
      parameter: 'speakerConfidenceHigh',
      issue: 'Confidence threshold outside recommended range',
      currentValue: config.speakerConfidenceHigh,
      recommendation: 'Use values between 0.4-0.8 for optimal performance'
    });
  }
  
  return issues;
};