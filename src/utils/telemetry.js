/**
 * Telemetry Utility
 * Provides analytics and monitoring for key application metrics
 */

class TelemetryService {
  constructor() {
    this.metrics = new Map();
    this.events = [];
    this.isEnabled = true;
  }

  /**
   * Track a metric value
   * @param {string} name - Metric name
   * @param {any} value - Metric value
   * @param {Object} properties - Additional properties
   */
  trackMetric(name, value, properties = {}) {
    if (!this.isEnabled) return;

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const entry = {
      timestamp: Date.now(),
      value,
      properties
    };

    const metricData = this.metrics.get(name);
    metricData.push(entry);

    // Keep only the last 1000 entries per metric to prevent memory issues
    if (metricData.length > 1000) {
      this.metrics.set(name, metricData.slice(-1000));
    }
  }

  /**
   * Track an event
   * @param {string} name - Event name
   * @param {Object} properties - Event properties
   */
  trackEvent(name, properties = {}) {
    if (!this.isEnabled) return;

    const event = {
      name,
      timestamp: Date.now(),
      properties
    };

    this.events.push(event);

    // Keep only the last 1000 events to prevent memory issues
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }
  }

  /**
   * Get statistics for a specific metric
   * @param {string} name - Metric name
   * @returns {Object} Statistics object
   */
  getMetricStats(name) {
    const metricData = this.metrics.get(name);
    if (!metricData || metricData.length === 0) {
      return null;
    }

    const values = metricData.map(item => item.value);
    const count = values.length;
    const sum = values.reduce((acc, val) => acc + val, 0);
    const avg = sum / count;
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Calculate success rate if values are boolean-like (0/1 or true/false)
    const successCount = values.filter(v => v === 1 || v === true).length;
    const successRate = count > 0 ? successCount / count : 0;

    return {
      count,
      average: avg,
      min,
      max,
      successRate,
      successCount,
      totalCount: count
    };
  }

  /**
   * Get recent events
   * @param {string} eventName - Optional event name to filter
   * @param {number} limit - Number of events to return (default: 100)
   * @returns {Array} Array of events
   */
  getRecentEvents(eventName = null, limit = 100) {
    let filteredEvents = this.events;
    if (eventName) {
      filteredEvents = filteredEvents.filter(e => e.name === eventName);
    }
    return filteredEvents.slice(-limit).reverse(); // Return most recent first
  }

  /**
   * Enable/disable telemetry
   * @param {boolean} enabled - Whether to enable telemetry
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
  }

  /**
   * Reset all collected metrics and events
   */
  reset() {
    this.metrics.clear();
    this.events = [];
  }
}

// Create a singleton instance
export const telemetry = new TelemetryService();

// Export convenience functions
export const trackParserSuccess = (success, properties = {}) => {
  telemetry.trackMetric('parser_success_rate', success ? 1 : 0, {
    ...properties,
    timestamp: Date.now()
  });
};

export const trackSummaryGeneration = (properties = {}) => {
  telemetry.trackEvent('summary_generation', {
    ...properties,
    timestamp: Date.now()
  });
};

export const trackSummaryParsingResult = (parsingSuccessful, properties = {}) => {
  telemetry.trackEvent('summary_parsing_result', {
    parsingSuccessful,
    ...properties,
    timestamp: Date.now()
  });
};