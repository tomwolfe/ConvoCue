/**
 * Bias Monitoring Dashboard Component for ConvoCue
 * Provides transparency about potential bias in cultural and language suggestions
 */

import { getBiasMonitoringDashboard, clearBiasMonitoringData } from '../utils/biasMonitoring.js';
import { isCulturalProfileCustomized, getUserCulturalProfile } from '../utils/userCulturalProfile.js';

// Display the bias monitoring dashboard
export const showBiasMonitoringDashboard = () => {
  const biasData = getBiasMonitoringDashboard();
  
  const dashboardHTML = `
    <div id="bias-monitoring-dashboard" class="bias-dashboard-modal">
      <div class="bias-dashboard-content">
        <h2>Bias Monitoring Dashboard</h2>
        
        <div class="dashboard-summary">
          <h3>System Summary</h3>
          <div class="summary-grid">
            <div class="summary-item">
              <span class="label">Total Cultural Suggestions:</span>
              <span class="value">${biasData.summary.totalCulturalSuggestions}</span>
            </div>
            <div class="summary-item">
              <span class="label">Override Rate:</span>
              <span class="value">${biasData.summary.overrideRate}%</span>
            </div>
            <div class="summary-item">
              <span class="label">User Feedback:</span>
              <span class="value">${biasData.summary.userFeedbackCount}</span>
            </div>
            <div class="summary-item">
              <span class="label">Profile Customized:</span>
              <span class="value">${isCulturalProfileCustomized() ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>
        
        <div class="categorized-overrides">
          <h3>Override Categories</h3>
          <div class="summary-grid">
            <div class="summary-item">
              <span class="label">Preference-based rejections:</span>
              <span class="value">${biasData.summary.categorizedOverrides.preference_based}</span>
            </div>
            <div class="summary-item">
              <span class="label">Accurate suggestions rejected:</span>
              <span class="value">${biasData.summary.categorizedOverrides.accurate_rejected}</span>
            </div>
            <div class="summary-item">
              <span class="label">Biased suggestions rejected:</span>
              <span class="value">${biasData.summary.categorizedOverrides.bias_rejected}</span>
            </div>
          </div>
        </div>
        
        <div class="risk-metrics">
          <h3>Risk Metrics</h3>
          <div class="metrics-grid">
            <div class="metric-item ${biasData.biasRiskMetrics.highOverrideRate ? 'high-risk' : 'low-risk'}">
              <span class="label">High Override Rate:</span>
              <span class="value">${biasData.biasRiskMetrics.highOverrideRate ? 'Yes' : 'No'}</span>
            </div>
            <div class="metric-item ${biasData.biasRiskMetrics.patternOverrepresentation ? 'high-risk' : 'low-risk'}">
              <span class="label">Pattern Overrepresentation:</span>
              <span class="value">${biasData.biasRiskMetrics.patternOverrepresentation ? 'Yes' : 'No'}</span>
            </div>
            <div class="metric-item ${biasData.biasRiskMetrics.negativeFeedbackTrend ? 'high-risk' : 'low-risk'}">
              <span class="label">Negative Feedback Trend:</span>
              <span class="value">${biasData.biasRiskMetrics.negativeFeedbackTrend ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>
        
        <div class="top-cultural-patterns">
          <h3>Top Cultural Patterns Applied</h3>
          ${biasData.topCulturalPatterns.length > 0 
            ? `<ul>
                 ${biasData.topCulturalPatterns.map(pattern => 
                   `<li>${pattern.culture}: ${pattern.count} times (${pattern.percentage}%)</li>`
                 ).join('')}
               </ul>`
            : '<p>No cultural patterns have been applied yet.</p>'}
        </div>
        
        <div class="recent-incidents">
          <h3>Recent Incidents</h3>
          ${biasData.recentIncidents.length > 0 
            ? `<ul>
                 ${biasData.recentIncidents.slice(0, 5).map(incident => 
                   `<li>
                      <strong>${new Date(incident.timestamp).toLocaleString()}:</strong> 
                      ${incident.type} - ${incident.reason || incident.source || 'N/A'}
                    </li>`
                 ).join('')}
               </ul>`
            : '<p>No recent incidents to report.</p>'}
        </div>
        
        <div class="system-alerts">
          <h3>System Alerts</h3>
          ${biasData.alerts.length > 0 
            ? `<ul>
                 ${biasData.alerts.map(alert => 
                   `<li class="alert-${alert.severity}">
                      <strong>${alert.severity.toUpperCase()}:</strong> ${alert.message}
                    </li>`
                 ).join('')}
               </ul>`
            : '<p>No current system alerts.</p>'}
        </div>
        
        <div class="dashboard-actions">
          <button id="customize-culture-btn" class="btn-primary">Customize Cultural Preferences</button>
          <button id="reset-bias-data-btn" class="btn-secondary">Reset Monitoring Data</button>
          <button id="close-dashboard-btn" class="btn-close">Close</button>
        </div>
      </div>
    </div>
  `;
  
  // Add CSS for the dashboard
  addDashboardStyles();
  
  // Inject the dashboard into the DOM
  document.body.insertAdjacentHTML('beforeend', dashboardHTML);
  
  // Attach event listeners
  attachDashboardEventListeners();
};

// Add CSS styles for the dashboard
const addDashboardStyles = () => {
  if (document.getElementById('bias-dashboard-styles')) {
    return; // Styles already added
  }
  
  const styleElement = document.createElement('style');
  styleElement.id = 'bias-dashboard-styles';
  styleElement.textContent = `
    .bias-dashboard-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.8);
      z-index: 10001;
      display: flex;
      justify-content: center;
      align-items: center;
      overflow: auto;
    }
    
    .bias-dashboard-content {
      background: white;
      padding: 20px;
      border-radius: 8px;
      max-width: 800px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      position: relative;
    }
    
    .dashboard-summary, .categorized-overrides, .risk-metrics, .top-cultural-patterns, .recent-incidents, .system-alerts {
      margin-bottom: 20px;
      padding: 15px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    
    h2, h3 {
      margin-top: 0;
      color: #333;
    }
    
    .summary-grid, .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 10px;
      margin-top: 10px;
    }
    
    .summary-item, .metric-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
    
    .label {
      font-weight: bold;
      color: #555;
    }
    
    .value {
      color: #333;
    }
    
    .metric-item.high-risk .value {
      color: #dc3545;
      font-weight: bold;
    }
    
    .metric-item.low-risk .value {
      color: #28a745;
    }
    
    .alert-high {
      color: #dc3545;
      font-weight: bold;
    }
    
    .alert-medium {
      color: #ffc107;
      font-weight: bold;
    }
    
    .alert-low {
      color: #6c757d;
    }
    
    .dashboard-actions {
      display: flex;
      gap: 10px;
      margin-top: 20px;
      flex-wrap: wrap;
    }
    
    .dashboard-actions button {
      padding: 10px 15px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }
    
    .btn-primary {
      background-color: #007bff;
      color: white;
    }
    
    .btn-secondary {
      background-color: #6c757d;
      color: white;
    }
    
    .btn-close {
      background-color: #dc3545;
      color: white;
      position: absolute;
      top: 10px;
      right: 10px;
    }
    
    ul {
      padding-left: 20px;
    }
    
    li {
      margin-bottom: 5px;
    }
  `;
  
  document.head.appendChild(styleElement);
};

// Attach event listeners to dashboard buttons
const attachDashboardEventListeners = () => {
  // Close button
  document.getElementById('close-dashboard-btn').addEventListener('click', () => {
    document.getElementById('bias-monitoring-dashboard').remove();
  });
  
  // Customize cultural preferences button
  document.getElementById('customize-culture-btn').addEventListener('click', () => {
    alert('Opening cultural preferences customization...');
    // In a real implementation, this would open the cultural preferences UI
    document.getElementById('bias-monitoring-dashboard').remove();
  });
  
  // Reset bias data button
  document.getElementById('reset-bias-data-btn').addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all bias monitoring data? This cannot be undone.')) {
      clearBiasMonitoringData();
      alert('Bias monitoring data has been reset.');
      document.getElementById('bias-monitoring-dashboard').remove();
      // Reopen the dashboard to show cleared data
      setTimeout(() => showBiasMonitoringDashboard(), 500);
    }
  });
};

// Function to get a summary of bias metrics for display in other UI elements
export const getBiasSummary = () => {
  const biasData = getBiasMonitoringDashboard();
  
  return {
    overrideRate: biasData.summary.overrideRate,
    totalSuggestions: biasData.summary.totalCulturalSuggestions,
    hasAlerts: biasData.alerts.length > 0,
    highRiskIndicators: [
      biasData.biasRiskMetrics.highOverrideRate && 'High override rate',
      biasData.biasRiskMetrics.patternOverrepresentation && 'Pattern overrepresentation',
      biasData.biasRiskMetrics.negativeFeedbackTrend && 'Negative feedback trend'
    ].filter(Boolean),
    lastUpdated: biasData.summary.lastUpdated
  };
};