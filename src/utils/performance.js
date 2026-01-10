/**
 * @fileoverview Performance monitoring utilities for audio processing
 */

/**
 * Performance monitor for tracking processing efficiency
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      audioProcessingTime: [],
      speakerDetectionTime: [],
      sentimentAnalysisTime: [],
      llmProcessingTime: [],
      vadLatency: [],
      memoryUsage: []
    };
    this.startTime = null;
  }

  /**
   * Record a direct value for a metric
   * @param {string} operation - Name of the metric
   * @param {number} value - Value to record
   */
  recordValue(operation, value) {
    if (!this.metrics[operation]) {
      this.metrics[operation] = [];
    }
    this.metrics[operation].push(value);
    if (this.metrics[operation].length > 100) {
      this.metrics[operation] = this.metrics[operation].slice(-100);
    }
  }

  /**
   * Start timing a specific operation
   * @param {string} _operation - Name of the operation to time
   */
  startTiming(_operation) {
    this.startTime = performance.now();
  }

  /**
   * End timing and record the metric
   * @param {string} operation - Name of the operation that was timed
   */
  endTiming(operation) {
    if (!this.startTime) return 0;
    
    const elapsed = performance.now() - this.startTime;
    this.startTime = null;
    
    if (!this.metrics[operation]) {
      this.metrics[operation] = [];
    }
    
    this.metrics[operation].push(elapsed);
    
    // Keep only the last 100 measurements to prevent memory bloat
    if (this.metrics[operation].length > 100) {
      this.metrics[operation] = this.metrics[operation].slice(-100);
    }
    
    return elapsed;
  }

  /**
   * Get average time for an operation
   * @param {string} operation - Name of the operation
   * @returns {number} Average time in milliseconds
   */
  getAverageTime(operation) {
    if (!this.metrics[operation] || this.metrics[operation].length === 0) {
      return 0;
    }
    
    const sum = this.metrics[operation].reduce((acc, val) => acc + val, 0);
    return sum / this.metrics[operation].length;
  }

  /**
   * Check if device appears to be low-spec
   * @returns {boolean} True if device appears to be low-spec
   */
  isLowSpecDevice() {
    // Check for low-spec devices based on hardware capabilities
    const cores = navigator.hardwareConcurrency || 2;
    const memory = navigator.deviceMemory || 4; // In GB
    
    // Consider device low-spec if it has <= 2 cores or <= 4GB RAM
    return cores <= 2 || memory <= 4;
  }

  /**
   * Get performance recommendation based on current metrics
   * @returns {string} Performance recommendation
   */
  getRecommendation() {
    const avgAudioTime = this.getAverageTime('audioProcessingTime');
    const avgSpeakerTime = this.getAverageTime('speakerDetectionTime');
    
    if (avgAudioTime > 100 || avgSpeakerTime > 100) {
      return 'performance_warning';
    }
    
    if (this.isLowSpecDevice()) {
      return 'low_spec_device';
    }
    
    return 'optimal';
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.metrics = {
      audioProcessingTime: [],
      speakerDetectionTime: [],
      sentimentAnalysisTime: [],
      llmProcessingTime: [],
      memoryUsage: []
    };
  }
}

// Create a singleton instance
const performanceMonitor = new PerformanceMonitor();

export default performanceMonitor;

/**
 * Utility function to wrap async operations with performance monitoring
 * @param {Function} fn - Async function to wrap
 * @param {string} operationName - Name of the operation
 * @returns {Promise} Result of the wrapped function
 */
export const withPerformanceTracking = async (fn, operationName) => {
  performanceMonitor.startTiming(operationName);
  try {
    const result = await fn();
    performanceMonitor.endTiming(operationName);
    return result;
  } catch (error) {
    performanceMonitor.endTiming(operationName);
    throw error;
  }
};