/**
 * @fileoverview Performance monitoring utilities for intent detection
 */

import performanceMonitor from './performance';

/**
 * Intent detection performance tracker
 */
class IntentPerformanceTracker {
  constructor() {
    this.metrics = {
      intentDetectionTime: [],
      highPerformanceDetectionTime: [],
      contextDetectionTime: [],
      multipleIntentDetectionTime: [],
      similarityCalculationTime: [],
      tokenizationTime: []
    };
    
    this.detectionCounts = {
      total: 0,
      byIntent: {}
    };
    
    this.performanceMonitor = performanceMonitor;
  }

  /**
   * Records intent detection performance
   * @param {string} operation - Type of intent detection operation
   * @param {number} time - Time taken in milliseconds
   */
  recordIntentDetectionTime(operation, time) {
    if (!this.metrics[operation]) {
      this.metrics[operation] = [];
    }

    this.metrics[operation].push(time);

    // Keep only the last 50 measurements to prevent memory bloat
    if (this.metrics[operation].length > 50) {
      this.metrics[operation] = this.metrics[operation].slice(-50);
    }

    // Also record in the main performance monitor
    this.performanceMonitor.recordValue(operation, time);
  }

  /**
   * Measures performance of an intent detection function
   * @param {Function} detectionFn - The intent detection function to measure
   * @param {...any} args - Arguments to pass to the detection function
   * @returns {Promise} Result of the detection function
   */
  async measureIntentDetection(detectionFn, ...args) {
    const startTime = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    try {
      const result = await detectionFn(...args);
      const endTime = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
      const executionTime = endTime - startTime;

      // Determine which metric to record based on the function name
      let operation = 'intentDetectionTime';
      if (detectionFn.name.includes('HighPerformance')) {
        operation = 'highPerformanceDetectionTime';
      } else if (detectionFn.name.includes('Context')) {
        operation = 'contextDetectionTime';
      } else if (detectionFn.name.includes('Multiple')) {
        operation = 'multipleIntentDetectionTime';
      }

      this.recordIntentDetectionTime(operation, executionTime);

      // Track detection counts
      this.detectionCounts.total++;
      if (result && result.intent) {
        this.detectionCounts.byIntent[result.intent] =
          (this.detectionCounts.byIntent[result.intent] || 0) + 1;
      }

      return result;
    } catch (error) {
      const endTime = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
      const executionTime = endTime - startTime;

      // Record error in performance metrics
      this.recordIntentDetectionTime('intentDetectionTime', executionTime);
      throw error;
    }
  }

  /**
   * Measures tokenization performance
   * @param {Function} tokenizeFn - The tokenization function to measure
   * @param {...any} args - Arguments to pass to the tokenization function
   * @returns {any} Result of the tokenization function
   */
  measureTokenization(tokenizeFn, ...args) {
    const startTime = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    try {
      const result = tokenizeFn(...args);
      const endTime = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
      const executionTime = endTime - startTime;

      this.recordIntentDetectionTime('tokenizationTime', executionTime);
      return result;
    } catch (error) {
      const endTime = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
      const executionTime = endTime - startTime;

      this.recordIntentDetectionTime('tokenizationTime', executionTime);
      throw error;
    }
  }

  /**
   * Measures similarity calculation performance
   * @param {Function} similarityFn - The similarity function to measure
   * @param {...any} args - Arguments to pass to the similarity function
   * @returns {any} Result of the similarity function
   */
  measureSimilarityCalculation(similarityFn, ...args) {
    const startTime = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    try {
      const result = similarityFn(...args);
      const endTime = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
      const executionTime = endTime - startTime;

      this.recordIntentDetectionTime('similarityCalculationTime', executionTime);
      return result;
    } catch (error) {
      const endTime = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
      const executionTime = endTime - startTime;

      this.recordIntentDetectionTime('similarityCalculationTime', executionTime);
      throw error;
    }
  }

  /**
   * Gets average time for a specific intent detection operation
   * @param {string} operation - Name of the operation
   * @returns {number} Average time in milliseconds
   */
  getAverageIntentDetectionTime(operation) {
    if (!this.metrics[operation] || this.metrics[operation].length === 0) {
      return 0;
    }

    const sum = this.metrics[operation].reduce((acc, val) => acc + val, 0);
    return sum / this.metrics[operation].length;
  }

  /**
   * Gets performance statistics for intent detection
   * @returns {Object} Performance statistics
   */
  getIntentDetectionStats() {
    return {
      averageTimes: {
        intentDetection: this.getAverageIntentDetectionTime('intentDetectionTime'),
        highPerformance: this.getAverageIntentDetectionTime('highPerformanceDetectionTime'),
        contextDetection: this.getAverageIntentDetectionTime('contextDetectionTime'),
        multipleIntent: this.getAverageIntentDetectionTime('multipleIntentDetectionTime'),
        similarityCalculation: this.getAverageIntentDetectionTime('similarityCalculationTime'),
        tokenization: this.getAverageIntentDetectionTime('tokenizationTime')
      },
      detectionCounts: this.detectionCounts,
      totalDetections: this.detectionCounts.total,
      detectionRates: this.calculateDetectionRates()
    };
  }

  /**
   * Calculates detection rates for each intent type
   * @returns {Object} Detection rates by intent
   */
  calculateDetectionRates() {
    const rates = {};
    for (const [intent, count] of Object.entries(this.detectionCounts.byIntent)) {
      rates[intent] = {
        count: count,
        rate: count / this.detectionCounts.total
      };
    }
    return rates;
  }

  /**
   * Checks if intent detection performance is optimal
   * @returns {Object} Performance status and recommendations
   */
  getPerformanceStatus() {
    const avgTime = this.getAverageIntentDetectionTime('intentDetectionTime');
    const highPerfAvg = this.getAverageIntentDetectionTime('highPerformanceDetectionTime');
    
    let status = 'optimal';
    let recommendation = 'Intent detection performance is optimal';
    
    if (avgTime > 100 || highPerfAvg > 50) {
      status = 'warning';
      recommendation = 'Intent detection is taking longer than expected. Consider optimizing patterns or reducing complexity.';
    } else if (avgTime > 200 || highPerfAvg > 100) {
      status = 'poor';
      recommendation = 'Intent detection performance is poor. Significant optimization needed.';
    }
    
    return {
      status,
      recommendation,
      avgTime,
      highPerfAvg
    };
  }

  /**
   * Resets all intent detection metrics
   */
  resetMetrics() {
    this.metrics = {
      intentDetectionTime: [],
      highPerformanceDetectionTime: [],
      contextDetectionTime: [],
      multipleIntentDetectionTime: [],
      similarityCalculationTime: [],
      tokenizationTime: []
    };
    
    this.detectionCounts = {
      total: 0,
      byIntent: {}
    };
  }

  /**
   * Performs a benchmark test of intent detection performance
   * @param {Array} testInputs - Array of test inputs to benchmark
   * @returns {Object} Benchmark results
   */
  async benchmarkIntentDetection(testInputs) {
    const results = {
      totalTests: testInputs.length,
      totalTime: 0,
      averageTime: 0,
      successfulDetections: 0,
      failedDetections: 0,
      detailedResults: []
    };

    for (const input of testInputs) {
      const startTime = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
      try {
        const detectionResult = await this.measureIntentDetection(
          async () => {
            // Import the detection functions dynamically
            const { detectIntentHighPerformance } = await import('./intentRecognition');
            return detectIntentHighPerformance(input);
          }
        );

        const endTime = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
        const executionTime = endTime - startTime;

        results.totalTime += executionTime;
        results.successfulDetections++;

        results.detailedResults.push({
          input: input,
          result: detectionResult,
          time: executionTime,
          success: true
        });
      } catch (error) {
        const endTime = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
        const executionTime = endTime - startTime;

        results.totalTime += executionTime;
        results.failedDetections++;

        results.detailedResults.push({
          input: input,
          error: error.message,
          time: executionTime,
          success: false
        });
      }
    }

    results.averageTime = results.totalTime / results.totalTests;
    
    return results;
  }
}

// Create a singleton instance
const intentPerformanceTracker = new IntentPerformanceTracker();

export default intentPerformanceTracker;

/**
 * Utility function to wrap intent detection functions with performance tracking
 * @param {Function} detectionFn - Intent detection function to wrap
 * @param {...any} args - Arguments to pass to the detection function
 * @returns {Promise} Result of the wrapped function
 */
export const withIntentPerformanceTracking = async (detectionFn, ...args) => {
  return intentPerformanceTracker.measureIntentDetection(detectionFn, ...args);
};

/**
 * Utility function to benchmark intent detection performance
 * @param {Array} testInputs - Array of test inputs to benchmark
 * @returns {Promise<Object>} Benchmark results
 */
export const benchmarkIntentDetection = async (testInputs) => {
  return intentPerformanceTracker.benchmarkIntentDetection(testInputs);
};