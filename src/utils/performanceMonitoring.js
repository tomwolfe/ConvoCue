/**
 * Performance monitoring utilities for the conversation system
 * Tracks key metrics for production observability
 */

/**
 * Performance metrics tracker
 */
class PerformanceTracker {
  constructor() {
    this.metrics = {
      // Profile-related metrics
      profileConvergenceTimes: [], // Time for profiles to become reliable
      confidenceDriftRates: [],    // Rate of confidence score changes over time
      profileUpdateCount: 0,
      
      // Turn-related metrics
      turnDetectionAccuracy: [],
      turnStutterRates: [],
      turnYieldDetectionRates: [],
      
      // System performance
      responseLatencies: [],
      memoryUsageHistory: [],
      errorRates: [],
      
      // Conversational metrics
      conversationFlowScores: [],
      speakerSwitchFrequency: []
    };
    
    this.sessionStartTime = Date.now();
  }

  /**
   * Record profile convergence time
   * @param {number} timeMs - Time in milliseconds for profile to converge
   */
  recordProfileConvergence(timeMs) {
    this.metrics.profileConvergenceTimes.push(timeMs);
  }

  /**
   * Record confidence drift rate
   * @param {number} driftRate - Rate of confidence score change
   */
  recordConfidenceDrift(driftRate) {
    this.metrics.confidenceDriftRates.push(driftRate);
  }

  /**
   * Record turn detection accuracy
   * @param {number} accuracy - Accuracy score (0-1)
   */
  recordTurnDetectionAccuracy(accuracy) {
    this.metrics.turnDetectionAccuracy.push(accuracy);
  }

  /**
   * Record turn stutter rate
   * @param {number} stutterRate - Rate of unwanted turn switches
   */
  recordTurnStutterRate(stutterRate) {
    this.metrics.turnStutterRates.push(stutterRate);
  }

  /**
   * Record response latency
   * @param {number} latencyMs - Latency in milliseconds
   */
  recordResponseLatency(latencyMs) {
    this.metrics.responseLatencies.push(latencyMs);
  }

  /**
   * Record memory usage
   * @param {number} memoryMB - Memory usage in MB
   */
  recordMemoryUsage(memoryMB) {
    this.metrics.memoryUsageHistory.push({
      timestamp: Date.now(),
      memoryMB
    });
  }

  /**
   * Record error occurrence
   */
  recordError() {
    this.metrics.errorRates.push({
      timestamp: Date.now(),
      error: true
    });
  }

  /**
   * Record conversation flow score
   * @param {number} score - Flow quality score (0-1)
   */
  recordConversationFlow(score) {
    this.metrics.conversationFlowScores.push(score);
  }

  /**
   * Get aggregated performance metrics
   * @returns {Object} Aggregated metrics
   */
  getMetrics() {
    const now = Date.now();
    const sessionDuration = now - this.sessionStartTime;
    
    // Calculate averages and statistics
    const calculateAverage = (arr) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const calculateStdDev = (arr) => {
      if (arr.length === 0) return 0;
      const avg = calculateAverage(arr);
      const squareDiffs = arr.map(value => {
        const diff = value - avg;
        const sqrDiff = diff * diff;
        return sqrDiff;
      });
      return Math.sqrt(calculateAverage(squareDiffs));
    };

    return {
      sessionDuration,
      profileMetrics: {
        avgConvergenceTime: calculateAverage(this.metrics.profileConvergenceTimes),
        stdDevConvergenceTime: calculateStdDev(this.metrics.profileConvergenceTimes),
        avgConfidenceDrift: calculateAverage(this.metrics.confidenceDriftRates),
        profileUpdateCount: this.metrics.profileUpdateCount
      },
      turnMetrics: {
        avgDetectionAccuracy: calculateAverage(this.metrics.turnDetectionAccuracy),
        avgStutterRate: calculateAverage(this.metrics.turnStutterRates),
        avgYieldDetectionRate: calculateAverage(this.metrics.turnYieldDetectionRates)
      },
      systemMetrics: {
        avgResponseLatency: calculateAverage(this.metrics.responseLatencies),
        stdDevResponseLatency: calculateStdDev(this.metrics.responseLatencies),
        currentMemoryUsage: this.metrics.memoryUsageHistory.length > 0 
          ? this.metrics.memoryUsageHistory[this.metrics.memoryUsageHistory.length - 1].memoryMB 
          : 0,
        errorRate: this.metrics.errorRates.length / (sessionDuration / 1000) // errors per second
      },
      conversationMetrics: {
        avgFlowScore: calculateAverage(this.metrics.conversationFlowScores),
        avgSwitchFrequency: calculateAverage(this.metrics.speakerSwitchFrequency)
      }
    };
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.metrics = {
      profileConvergenceTimes: [],
      confidenceDriftRates: [],
      profileUpdateCount: 0,
      turnDetectionAccuracy: [],
      turnStutterRates: [],
      turnYieldDetectionRates: [],
      responseLatencies: [],
      memoryUsageHistory: [],
      errorRates: [],
      conversationFlowScores: [],
      speakerSwitchFrequency: []
    };
    this.sessionStartTime = Date.now();
  }
}

// Singleton instance
const performanceTracker = new PerformanceTracker();

/**
 * Monitors profile convergence and records metrics
 * @param {Object} profile - Speaker profile being monitored
 * @param {Function} callback - Callback when profile is considered converged
 */
export const monitorProfileConvergence = (profile, callback) => {
  const startTime = Date.now();
  
  // Check if profile has sufficient updates and consistency
  const checkConvergence = () => {
    if (profile.averageFeatures.count >= 5) { // Using same min as minProfileUpdates
      const recentConsistency = profile.consistencyHistory.slice(-5);
      if (recentConsistency.length >= 5) {
        const avgConsistency = recentConsistency.reduce((a, b) => a + b, 0) / recentConsistency.length;
        if (avgConsistency > 0.7) { // Considered converged if consistent
          const convergenceTime = Date.now() - startTime;
          performanceTracker.recordProfileConvergence(convergenceTime);
          if (callback) callback(convergenceTime);
          return true;
        }
      }
    }
    return false;
  };

  // Return a function that can be called periodically to check convergence
  return checkConvergence;
};

/**
 * Measures response latency for a function call
 * @param {Function} fn - Function to measure
 * @param {...any} args - Arguments to pass to the function
 * @returns {Promise} Promise that resolves with the function result
 */
export const measureLatency = async (fn, ...args) => {
  const startTime = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
  try {
    const result = await fn(...args);
    const endTime = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    const latency = endTime - startTime;
    performanceTracker.recordResponseLatency(latency);
    return result;
  } catch (error) {
    performanceTracker.recordError();
    throw error;
  }
};

/**
 * Monitors conversation flow quality
 * @param {Object} turnManager - ConversationTurnManager instance
 * @returns {number} Flow quality score (0-1)
 */
export const monitorConversationFlow = (turnManager) => {
  const diagnostics = turnManager.getDiagnostics();
  
  // Calculate flow score based on various factors
  // Higher score means better flow (less stuttering, more natural turn-taking)
  const stutterRate = diagnostics.speakerChangesDetected / Math.max(1, diagnostics.totalAudioFramesProcessed / 1000);
  const yieldRate = diagnostics.turnYieldsDetected / Math.max(1, diagnostics.totalAudioFramesProcessed / 1000);
  
  // Normalize rates to 0-1 scale (assuming reasonable upper bounds)
  const normalizedStutter = Math.max(0, 1 - (stutterRate / 0.1)); // Assume 0.1 as max acceptable stutter rate
  const normalizedYield = Math.min(1, yieldRate / 0.05); // Assume 0.05 as ideal yield rate
  
  // Weight the components (stuttering has higher negative impact)
  const flowScore = (normalizedStutter * 0.7) + (normalizedYield * 0.3);
  
  performanceTracker.recordConversationFlow(flowScore);
  return flowScore;
};

/**
 * Gets the global performance tracker instance
 * @returns {PerformanceTracker} Performance tracker instance
 */
export const getPerformanceTracker = () => {
  return performanceTracker;
};

/**
 * Records memory usage from conversation manager
 * @param {Object} turnManager - ConversationTurnManager instance
 */
export const recordMemoryUsage = (turnManager) => {
  const memoryInfo = turnManager.getMemoryUsage();
  performanceTracker.recordMemoryUsage(memoryInfo.estimatedMB);
};

/**
 * Records turn stutter rate based on diagnostics
 * @param {Object} diagnostics - Diagnostics from turn manager
 */
export const recordTurnStutterRate = (diagnostics) => {
  // Calculate stutter rate as ratio of speaker changes to time
  const stutterRate = diagnostics.speakerChangesDetected / Math.max(1, diagnostics.totalAudioFramesProcessed / 1000);
  performanceTracker.recordTurnStutterRate(stutterRate);
};