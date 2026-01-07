/**
 * Performance Monitoring Utilities
 * Monitors memory usage and performance metrics for large conversation histories
 */

// Performance monitoring constants
const PERFORMANCE_THRESHOLD = {
  memory: 100 * 1024 * 1024, // 100MB threshold
  conversationLength: 100,    // 100 turns threshold
  processingTime: 2000        // 2 seconds threshold
};

// Store performance metrics
let performanceMetrics = {
  memoryUsage: [],
  conversationLengths: [],
  processingTimes: [],
  timestamps: []
};

/**
 * Measure current memory usage (approximation)
 * @returns {number} Approximate memory usage in bytes
 */
export const measureMemoryUsage = () => {
  // In browser environments, we can't directly measure memory usage
  // This is a proxy measurement based on object sizes
  if (typeof performance !== 'undefined' && performance.memory) {
    return performance.memory.usedJSHeapSize;
  }
  
  // Fallback: estimate based on conversation history size
  return 0; // Browser limitation - can't reliably measure memory in most cases
};

/**
 * Estimate conversation history size
 * @param {Array} conversationHistory - Array of conversation turns
 * @returns {number} Estimated size in characters
 */
export const estimateConversationSize = (conversationHistory) => {
  if (!conversationHistory || !Array.isArray(conversationHistory)) {
    return 0;
  }
  
  return conversationHistory.reduce((total, turn) => {
    return total + (turn.content?.length || 0) + (turn.role?.length || 0);
  }, 0);
};

/**
 * Check if conversation history is approaching memory limits
 * @param {Array} conversationHistory - Array of conversation turns
 * @returns {boolean} True if approaching memory limits
 */
export const isMemoryLimitApproaching = (conversationHistory) => {
  const estimatedSize = estimateConversationSize(conversationHistory);
  return estimatedSize > PERFORMANCE_THRESHOLD.conversationLength * 500; // Rough estimate: 500 chars per turn avg
};

/**
 * Log performance metrics
 * @param {string} operation - Operation being monitored
 * @param {number} startTime - Start time of operation
 * @param {Array} conversationHistory - Current conversation history
 */
export const logPerformanceMetric = (operation, startTime, conversationHistory) => {
  const endTime = Date.now();
  const processingTime = endTime - startTime;
  
  const metric = {
    operation,
    processingTime,
    conversationLength: conversationHistory?.length || 0,
    estimatedSize: estimateConversationSize(conversationHistory),
    timestamp: new Date().toISOString()
  };
  
  // Store in metrics array (keep last 50 measurements)
  performanceMetrics.timestamps.push(metric);
  if (performanceMetrics.timestamps.length > 50) {
    performanceMetrics.timestamps.shift();
  }
  
  // Check if we're exceeding thresholds
  if (processingTime > PERFORMANCE_THRESHOLD.processingTime) {
    console.warn(`Performance warning: ${operation} took ${processingTime}ms (threshold: ${PERFORMANCE_THRESHOLD.processingTime}ms)`);
  }
  
  if (conversationHistory && conversationHistory.length > PERFORMANCE_THRESHOLD.conversationLength) {
    console.warn(`Memory warning: Conversation length is ${conversationHistory.length} (threshold: ${PERFORMANCE_THRESHOLD.conversationLength})`);
  }
};

/**
 * Get performance summary
 * @returns {object} Performance summary with recommendations
 */
export const getPerformanceSummary = () => {
  if (performanceMetrics.timestamps.length === 0) {
    return {
      status: 'no-data',
      message: 'No performance data available yet'
    };
  }
  
  const recentMetrics = performanceMetrics.timestamps.slice(-10); // Last 10 measurements
  
  const avgProcessingTime = recentMetrics.reduce((sum, m) => sum + m.processingTime, 0) / recentMetrics.length;
  const maxConversationLength = Math.max(...recentMetrics.map(m => m.conversationLength));
  const currentSize = recentMetrics[recentMetrics.length - 1]?.estimatedSize || 0;
  
  const issues = [];
  
  if (avgProcessingTime > PERFORMANCE_THRESHOLD.processingTime * 0.8) {
    issues.push(`Average processing time (${Math.round(avgProcessingTime)}ms) is approaching threshold (${PERFORMANCE_THRESHOLD.processingTime}ms)`);
  }
  
  if (maxConversationLength > PERFORMANCE_THRESHOLD.conversationLength * 0.8) {
    issues.push(`Maximum conversation length (${maxConversationLength}) is approaching threshold (${PERFORMANCE_THRESHOLD.conversationLength})`);
  }
  
  return {
    status: issues.length > 0 ? 'warning' : 'healthy',
    averageProcessingTime: Math.round(avgProcessingTime),
    maxConversationLength,
    currentEstimatedSize: currentSize,
    issues,
    recommendation: issues.length > 0 ? 
      'Consider implementing conversation history trimming or pagination' : 
      'Performance looks good'
  };
};

/**
 * Trim conversation history to maintain performance
 * @param {Array} conversationHistory - Current conversation history
 * @param {number} maxLength - Maximum allowed length (defaults to 50)
 * @returns {Array} Trimmed conversation history
 */
export const trimConversationHistory = (conversationHistory, maxLength = 50) => {
  if (!conversationHistory || !Array.isArray(conversationHistory)) {
    return conversationHistory;
  }
  
  if (conversationHistory.length <= maxLength) {
    return conversationHistory;
  }
  
  // Keep the most recent conversations and the first few for context
  const headCount = Math.floor(maxLength * 0.2); // Keep 20% from the beginning
  const tailCount = maxLength - headCount;       // Keep 80% from the end
  
  const head = conversationHistory.slice(0, headCount);
  const tail = conversationHistory.slice(-tailCount);
  
  console.info(`Trimmed conversation history from ${conversationHistory.length} to ${maxLength} turns`);
  
  return [...head, ...tail];
};

/**
 * Monitor and optimize conversation history for performance
 * @param {Array} conversationHistory - Current conversation history
 * @returns {Array} Optimized conversation history
 */
export const monitorAndOptimizeHistory = (conversationHistory) => {
  if (!conversationHistory || !Array.isArray(conversationHistory)) {
    return conversationHistory;
  }
  
  // Check if we need to trim the history
  if (conversationHistory.length > PERFORMANCE_THRESHOLD.conversationLength) {
    return trimConversationHistory(conversationHistory);
  }
  
  return conversationHistory;
};

/**
 * Performance monitoring hook for React components
 * @param {Function} callback - Function to monitor
 * @param {Array} deps - Dependencies for the effect
 */
export const usePerformanceMonitor = (callback, deps) => {
  return (...args) => {
    const startTime = Date.now();
    const result = callback(...args);
    
    // Log performance after the operation completes
    Promise.resolve(result).then(() => {
      logPerformanceMetric(callback.name || 'unknown-operation', startTime, args[0]?.conversationHistory || []);
    }).catch(error => {
      logPerformanceMetric(`${callback.name || 'unknown-operation'}-error`, startTime, args[0]?.conversationHistory || []);
      throw error;
    });
    
    return result;
  };
};