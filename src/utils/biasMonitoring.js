/**
 * Bias Monitoring System for ConvoCue
 * Tracks potential bias in cultural and language suggestions
 */

// Storage keys
const BIAS_MONITORING_KEY = 'convoCue_biasMonitoring';
const BIAS_ALERTS_KEY = 'convoCue_biasAlerts';

// Initialize monitoring data
const initializeBiasMonitoring = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    // Initialize bias monitoring data if not present
    if (!window.localStorage.getItem(BIAS_MONITORING_KEY)) {
      const initialData = {
        totalCulturalSuggestions: 0,
        overriddenSuggestions: 0,
        userFeedbackCount: 0,
        biasIncidents: [],
        culturalPatternUsage: {}, // Track usage of each cultural pattern
        lastUpdated: Date.now()
      };
      window.localStorage.setItem(BIAS_MONITORING_KEY, JSON.stringify(initialData));
    }
    
    // Initialize bias alerts if not present
    if (!window.localStorage.getItem(BIAS_ALERTS_KEY)) {
      window.localStorage.setItem(BIAS_ALERTS_KEY, JSON.stringify([]));
    }
  }
};

// Log a cultural suggestion event
export const logCulturalSuggestion = (suggestionData) => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const monitoringData = JSON.parse(window.localStorage.getItem(BIAS_MONITORING_KEY) || '{}');
      
      // Update statistics
      monitoringData.totalCulturalSuggestions = (monitoringData.totalCulturalSuggestions || 0) + 1;
      
      // Track cultural pattern usage
      const culture = suggestionData.primaryCulture || 'unknown';
      monitoringData.culturalPatternUsage = monitoringData.culturalPatternUsage || {};
      monitoringData.culturalPatternUsage[culture] = (monitoringData.culturalPatternUsage[culture] || 0) + 1;
      
      monitoringData.lastUpdated = Date.now();
      
      window.localStorage.setItem(BIAS_MONITORING_KEY, JSON.stringify(monitoringData));
    } catch (error) {
      console.warn('Could not log cultural suggestion to bias monitoring:', error);
    }
  }
};

// Log when a user overrides a cultural suggestion
export const logCulturalOverride = (suggestionData, reason = 'user_override', overrideType = 'preference') => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const monitoringData = JSON.parse(window.localStorage.getItem(BIAS_MONITORING_KEY) || '{}');

      // Update statistics
      monitoringData.overriddenSuggestions = (monitoringData.overriddenSuggestions || 0) + 1;

      // Categorize override type to distinguish between accurate but unwanted vs biased suggestions
      const overrideCategory = overrideType === 'bias' ? 'biased_suggestion_rejected' :
                              overrideType === 'accuracy' ? 'accurate_suggestion_rejected' : 'preference_based_rejection';

      // Update categorized counts
      monitoringData.categorizedOverrides = monitoringData.categorizedOverrides || {
        preference_based: 0,
        accurate_rejected: 0,
        bias_rejected: 0
      };

      switch(overrideType) {
        case 'preference':
          monitoringData.categorizedOverrides.preference_based += 1;
          break;
        case 'accuracy':
          monitoringData.categorizedOverrides.accurate_rejected += 1;
          break;
        case 'bias':
          monitoringData.categorizedOverrides.bias_rejected += 1;
          break;
      }

      // Log the incident for review
      monitoringData.biasIncidents = monitoringData.biasIncidents || [];
      monitoringData.biasIncidents.push({
        timestamp: Date.now(),
        type: 'cultural_override',
        reason,
        overrideType,
        overrideCategory,
        suggestionData,
        culture: suggestionData.primaryCulture || 'unknown',
        confidence: suggestionData.confidence || 0
      });

      // Limit incidents to last 1000 entries
      if (monitoringData.biasIncidents.length > 1000) {
        monitoringData.biasIncidents = monitoringData.biasIncidents.slice(-1000);
      }

      monitoringData.lastUpdated = Date.now();

      window.localStorage.setItem(BIAS_MONITORING_KEY, JSON.stringify(monitoringData));
    } catch (error) {
      console.warn('Could not log cultural override to bias monitoring:', error);
    }
  }
};

// Log user feedback about cultural suggestions
export const logCulturalFeedback = (suggestion, isAccurate, feedbackText = '') => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const monitoringData = JSON.parse(window.localStorage.getItem(BIAS_MONITORING_KEY) || '{}');
      
      // Update statistics
      monitoringData.userFeedbackCount = (monitoringData.userFeedbackCount || 0) + 1;
      
      // Log the feedback for review
      monitoringData.biasIncidents = monitoringData.biasIncidents || [];
      monitoringData.biasIncidents.push({
        timestamp: Date.now(),
        type: 'user_feedback',
        suggestion,
        isAccurate,
        feedbackText,
        source: 'user_direct_feedback'
      });
      
      // Limit incidents to last 1000 entries
      if (monitoringData.biasIncidents.length > 1000) {
        monitoringData.biasIncidents = monitoringData.biasIncidents.slice(-1000);
      }
      
      monitoringData.lastUpdated = Date.now();
      
      window.localStorage.setItem(BIAS_MONITORING_KEY, JSON.stringify(monitoringData));
    } catch (error) {
      console.warn('Could not log cultural feedback to bias monitoring:', error);
    }
  }
};

// Check for potential bias patterns
export const checkForBiasPatterns = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const monitoringData = JSON.parse(window.localStorage.getItem(BIAS_MONITORING_KEY) || '{}');
      
      const alerts = [];
      
      // Check if certain cultural patterns are being applied too frequently
      if (monitoringData.culturalPatternUsage) {
        const totalSuggestions = monitoringData.totalCulturalSuggestions || 1;
        for (const [culture, count] of Object.entries(monitoringData.culturalPatternUsage)) {
          const percentage = (count / totalSuggestions) * 100;
          
          // Alert if a single culture is suggested more than 60% of the time
          if (percentage > 60) {
            alerts.push({
              severity: 'high',
              type: 'overrepresentation',
              message: `Culture "${culture}" is being suggested in ${percentage.toFixed(1)}% of interactions. This may indicate overgeneralization.`,
              timestamp: Date.now()
            });
          }
          // Alert if a single culture is suggested more than 40% of the time
          else if (percentage > 40) {
            alerts.push({
              severity: 'medium',
              type: 'potential_overrepresentation',
              message: `Culture "${culture}" is being suggested in ${percentage.toFixed(1)}% of interactions. Monitor for potential overgeneralization.`,
              timestamp: Date.now()
            });
          }
        }
      }
      
      // Check override ratio
      const totalSuggestions = monitoringData.totalCulturalSuggestions || 1;
      const overrideRatio = (monitoringData.overriddenSuggestions || 0) / totalSuggestions;
      
      if (overrideRatio > 0.3) { // More than 30% of suggestions are being overridden
        alerts.push({
          severity: 'high',
          type: 'high_override_rate',
          message: `Users are overriding cultural suggestions at a rate of ${(overrideRatio * 100).toFixed(1)}%. This may indicate inappropriate generalizations.`,
          timestamp: Date.now()
        });
      } else if (overrideRatio > 0.2) { // More than 20% of suggestions are being overridden
        alerts.push({
          severity: 'medium',
          type: 'moderate_override_rate',
          message: `Users are overriding cultural suggestions at a rate of ${(overrideRatio * 100).toFixed(1)}%. Monitor for potential inappropriateness.`,
          timestamp: Date.now()
        });
      }
      
      // Check for feedback patterns
      const recentIncidents = monitoringData.biasIncidents?.slice(-50) || []; // Look at last 50 incidents
      const negativeFeedbackCount = recentIncidents.filter(incident => 
        incident.type === 'user_feedback' && incident.isAccurate === false
      ).length;
      
      if (negativeFeedbackCount > 10) { // More than 10 negative feedbacks in recent incidents
        alerts.push({
          severity: 'high',
          type: 'negative_feedback_trend',
          message: `Received ${negativeFeedbackCount} negative feedbacks in recent interactions. Review cultural suggestion algorithms.`,
          timestamp: Date.now()
        });
      }
      
      // Save alerts to storage
      window.localStorage.setItem(BIAS_ALERTS_KEY, JSON.stringify(alerts));
      
      return alerts;
    } catch (error) {
      console.warn('Could not check for bias patterns:', error);
      return [];
    }
  }
  
  return [];
};

// Get bias monitoring dashboard data
export const getBiasMonitoringDashboard = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const monitoringData = JSON.parse(window.localStorage.getItem(BIAS_MONITORING_KEY) || '{}');
      const alerts = JSON.parse(window.localStorage.getItem(BIAS_ALERTS_KEY) || '[]');

      const totalSuggestions = monitoringData.totalCulturalSuggestions || 0;
      const overriddenSuggestions = monitoringData.overriddenSuggestions || 0;
      const overrideRate = totalSuggestions > 0 ? (overriddenSuggestions / totalSuggestions) * 100 : 0;
      const feedbackCount = monitoringData.userFeedbackCount || 0;

      // Get categorized override data
      const categorizedOverrides = monitoringData.categorizedOverrides || {
        preference_based: 0,
        accurate_rejected: 0,
        bias_rejected: 0
      };

      // Get top cultural patterns
      const topCultures = Object.entries(monitoringData.culturalPatternUsage || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([culture, count]) => ({
          culture,
          count,
          percentage: totalSuggestions > 0 ? ((count / totalSuggestions) * 100).toFixed(1) : 0
        }));

      // Get recent incidents
      const recentIncidents = monitoringData.biasIncidents?.slice(-10) || [];

      return {
        summary: {
          totalCulturalSuggestions: totalSuggestions,
          overriddenSuggestions,
          overrideRate: parseFloat(overrideRate.toFixed(2)),
          userFeedbackCount: feedbackCount,
          lastUpdated: monitoringData.lastUpdated,
          categorizedOverrides
        },
        topCulturalPatterns: topCultures,
        recentIncidents,
        alerts,
        biasRiskMetrics: {
          highOverrideRate: overrideRate > 30,
          patternOverrepresentation: topCultures.length > 0 && parseFloat(topCultures[0].percentage) > 60,
          negativeFeedbackTrend: recentIncidents.filter(i => i.type === 'user_feedback' && i.isAccurate === false).length > 5,
          biasRejectionRate: totalSuggestions > 0 ? (categorizedOverrides.bias_rejected / totalSuggestions) * 100 : 0,
          accurateRejectionRate: totalSuggestions > 0 ? (categorizedOverrides.accurate_rejected / totalSuggestions) * 100 : 0
        }
      };
    } catch (error) {
      console.warn('Could not retrieve bias monitoring dashboard:', error);
      return {
        summary: {
          totalCulturalSuggestions: 0,
          overriddenSuggestions: 0,
          overrideRate: 0,
          userFeedbackCount: 0,
          categorizedOverrides: { preference_based: 0, accurate_rejected: 0, bias_rejected: 0 }
        },
        topCulturalPatterns: [],
        recentIncidents: [],
        alerts: [],
        biasRiskMetrics: {}
      };
    }
  }

  return {
    summary: {
      totalCulturalSuggestions: 0,
      overriddenSuggestions: 0,
      overrideRate: 0,
      userFeedbackCount: 0,
      categorizedOverrides: { preference_based: 0, accurate_rejected: 0, bias_rejected: 0 }
    },
    topCulturalPatterns: [],
    recentIncidents: [],
    alerts: [],
    biasRiskMetrics: {}
  };
};

// Clear bias monitoring data (for testing purposes)
export const clearBiasMonitoringData = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(BIAS_MONITORING_KEY);
      window.localStorage.removeItem(BIAS_ALERTS_KEY);
    } catch (error) {
      console.warn('Could not clear bias monitoring data:', error);
    }
  }
};

// Initialize the monitoring system when module loads
initializeBiasMonitoring();