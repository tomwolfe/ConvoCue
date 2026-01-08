/**
 * Bias monitoring utilities for the conversation system
 * Tracks potential demographic bias in turn-yielding and speaker detection
 */

/**
 * Bias metrics tracker
 */
class BiasTracker {
  constructor() {
    this.metrics = {
      // Demographic-based metrics (anonymized)
      turnYieldByDemographic: {},
      
      // Speech pattern-based metrics
      turnYieldBySpeechPattern: {
        nonNativeSpeaker: { yields: 0, total: 0 },
        speechDisfluency: { yields: 0, total: 0 },
        typicalSpeech: { yields: 0, total: 0 }
      },
      
      // Accuracy metrics by group
      detectionAccuracyByGroup: {},
      
      // Turn stuttering by demographic
      stutterRateByGroup: {}
    };
  }

  /**
   * Record turn yield event with associated characteristics
   * @param {Object} characteristics - Speaker characteristics (anonymized)
   * @param {boolean} wasYield - Whether a turn yield was detected
   */
  recordTurnYield(characteristics, wasYield) {
    // Classify speech patterns without storing personal data
    const patternType = this.classifySpeechPattern(characteristics);
    
    if (!this.metrics.turnYieldBySpeechPattern[patternType]) {
      this.metrics.turnYieldBySpeechPattern[patternType] = { yields: 0, total: 0 };
    }
    
    this.metrics.turnYieldBySpeechPattern[patternType].total++;
    if (wasYield) {
      this.metrics.turnYieldBySpeechPattern[patternType].yields++;
    }
  }

  /**
   * Classify speech patterns for bias monitoring (anonymized)
   * @param {Object} characteristics - Audio characteristics
   * @returns {string} Pattern type
   */
  classifySpeechPattern(characteristics) {
    // This is a simplified classification - in practice, this would use more sophisticated models
    // and would not store or transmit any personal identifying information
    
    // Check for indicators of non-native speech or speech disfluency
    if (characteristics.hasNonNativeIndicators) {
      return 'nonNativeSpeaker';
    } else if (characteristics.hasDisfluencyIndicators) {
      return 'speechDisfluency';
    } else {
      return 'typicalSpeech';
    }
  }

  /**
   * Get bias metrics report
   * @returns {Object} Bias metrics
   */
  getBiasReport() {
    const report = {};
    
    // Calculate yield rates by speech pattern
    for (const [pattern, data] of Object.entries(this.metrics.turnYieldBySpeechPattern)) {
      report[pattern] = {
        totalEvents: data.total,
        yieldEvents: data.yields,
        yieldRate: data.total > 0 ? data.yields / data.total : 0
      };
    }
    
    // Calculate disparity ratios
    const typicalYieldRate = report.typicalSpeech?.yieldRate || 0;
    report.disparityAnalysis = {};
    
    for (const [pattern, data] of Object.entries(report)) {
      if (pattern !== 'disparityAnalysis' && pattern !== 'typicalSpeech') {
        report.disparityAnalysis[pattern] = {
          yieldRate: data.yieldRate,
          vsTypicalRatio: typicalYieldRate > 0 ? data.yieldRate / typicalYieldRate : 'N/A',
          potentialBias: this.calculatePotentialBias(data.yieldRate, typicalYieldRate)
        };
      }
    }
    
    return report;
  }
  
  /**
   * Calculate potential bias indicator
   * @param {number} groupRate - Yield rate for specific group
   * @param {number} baselineRate - Baseline yield rate
   * @returns {string} Bias indicator
   */
  calculatePotentialBias(groupRate, baselineRate) {
    if (baselineRate === 0) return 'N/A';
    
    const ratio = groupRate / baselineRate;
    const threshold = 0.2; // 20% difference threshold
    
    if (Math.abs(ratio - 1) > threshold) {
      return ratio > 1 ? 'Over-attributed' : 'Under-attributed';
    }
    return 'Within tolerance';
  }

  /**
   * Reset bias metrics
   */
  reset() {
    this.metrics = {
      turnYieldByDemographic: {},
      turnYieldBySpeechPattern: {
        nonNativeSpeaker: { yields: 0, total: 0 },
        speechDisfluency: { yields: 0, total: 0 },
        typicalSpeech: { yields: 0, total: 0 }
      },
      detectionAccuracyByGroup: {},
      stutterRateByGroup: {}
    };
  }
}

// Singleton instance
const biasTracker = new BiasTracker();

/**
 * Analyze audio characteristics for potential bias indicators
 * @param {Object} audioFeatures - Audio features from speaker detection
 * @param {boolean} wasYield - Whether a turn yield was detected
 * @param {Object} config - Configuration with turn-yielding parameters
 * @returns {Object} Bias analysis results
 */
export const analyzeTurnYieldBias = (audioFeatures, wasYield, config) => {
  // Create anonymized characteristics object
  const characteristics = {
    hasNonNativeIndicators: hasNonNativeSpeechIndicators(audioFeatures),
    hasDisfluencyIndicators: hasSpeechDisfluencyIndicators(audioFeatures),
    pitchEstimate: audioFeatures.pitchEstimate,
    spectralCentroid: audioFeatures.spectralCentroid,
    zeroCrossingRate: audioFeatures.zeroCrossingRate
  };
  
  // Record the event for bias monitoring
  biasTracker.recordTurnYield(characteristics, wasYield);
  
  // Calculate if this represents a potential bias event
  const isPotentialBias = isPotentialBiasEvent(characteristics, config);
  
  return {
    characteristics,
    wasYield,
    isPotentialBias,
    biasMetrics: biasTracker.getBiasReport()
  };
};

/**
 * Check if audio features indicate non-native speech patterns
 * @param {Object} features - Audio features
 * @returns {boolean} True if non-native indicators detected
 */
const hasNonNativeSpeechIndicators = (features) => {
  // This is a simplified check - real implementation would use more sophisticated models
  // Look for patterns that might indicate non-native speech (without identifying specific languages)
  const pitchVariation = Math.abs(features.pitchEstimate - 120); // Assuming 120Hz as baseline
  const spectralCharacteristics = features.spectralCentroid > 2000; // Higher frequencies may indicate certain accents
  
  // These are general indicators and not specific to any demographic
  return pitchVariation > 50 || spectralCharacteristics;
};

/**
 * Check if audio features indicate speech disfluency
 * @param {Object} features - Audio features
 * @returns {boolean} True if disfluency indicators detected
 */
const hasSpeechDisfluencyIndicators = (features) => {
  // Check for patterns that might indicate speech disfluency
  // This is a simplified check and would need more sophisticated analysis in practice
  const zeroCrossingRate = features.zeroCrossingRate;
  
  // Very high or very low zero crossing rates might indicate disfluency
  return zeroCrossingRate > 0.5 || zeroCrossingRate < 0.01;
};

/**
 * Determine if a turn yield event represents a potential bias
 * @param {Object} characteristics - Anonymized characteristics
 * @param {Object} config - Configuration parameters
 * @returns {boolean} True if potential bias detected
 */
const isPotentialBiasEvent = (characteristics, config) => {
  // A potential bias event might occur when:
  // 1. System yields turn to other speaker for non-native speakers at higher rate
  // 2. System misattributes speech patterns as yielding when they're not
  
  // Check if this is a non-native or disfluent speaker that was marked as yielding
  return (characteristics.hasNonNativeIndicators || characteristics.hasDisfluencyIndicators) && 
         config.turnYieldWeightingFactor > 0;
};

/**
 * Get the global bias tracker instance
 * @returns {BiasTracker} Bias tracker instance
 */
export const getBiasTracker = () => {
  return biasTracker;
};

/**
 * Generate bias audit report
 * @returns {Object} Comprehensive bias audit report
 */
export const generateBiasAuditReport = () => {
  return biasTracker.getBiasReport();
};