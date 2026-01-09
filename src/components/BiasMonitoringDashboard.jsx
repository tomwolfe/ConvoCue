/**
 * Bias Monitoring Dashboard Component for ConvoCue
 * Provides visibility into potential bias in cultural and language suggestions
 */

import React, { useState, useEffect } from 'react';

const BiasMonitoringDashboard = ({ isVisible = false }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isVisible) {
      loadDashboardData();
    }
  }, [isVisible]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Dynamically import the bias monitoring module
      const { getBiasMonitoringDashboard } = await import('../utils/biasMonitoring.js');
      const data = getBiasMonitoringDashboard();
      setDashboardData(data);
    } catch (error) {
      console.error('Failed to load bias monitoring dashboard:', error);
      setDashboardData({
        summary: { totalCulturalSuggestions: 0, overriddenSuggestions: 0, overrideRate: 0, userFeedbackCount: 0 },
        topCulturalPatterns: [],
        recentIncidents: [],
        alerts: [],
        biasRiskMetrics: {}
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshDashboard = () => {
    loadDashboardData();
  };

  const checkForNewAlerts = async () => {
    try {
      // Dynamically import the bias monitoring module
      const { checkForBiasPatterns } = await import('../utils/biasMonitoring.js');
      const alerts = checkForBiasPatterns();
      if (alerts.length > 0) {
        alert(`Found ${alerts.length} new bias alerts. Check the dashboard for details.`);
      } else {
        alert('No new bias alerts detected.');
      }
      // Reload dashboard to show updated data
      loadDashboardData();
    } catch (error) {
      console.error('Failed to check for bias patterns:', error);
      alert('Failed to check for bias patterns.');
    }
  };

  if (!isVisible) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="bias-dashboard-container">
        <div className="bias-dashboard-header">
          <h3>Cultural Bias Monitoring Dashboard</h3>
          <button onClick={loadDashboardData}>Refresh</button>
        </div>
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  const { summary, topCulturalPatterns, recentIncidents, alerts, biasRiskMetrics } = dashboardData || {};

  return (
    <div className="bias-dashboard-container">
      <div className="bias-dashboard-header">
        <h3>Cultural Bias Monitoring Dashboard</h3>
        <div className="dashboard-controls">
          <button onClick={refreshDashboard}>Refresh Data</button>
          <button onClick={checkForNewAlerts}>Check for Alerts</button>
        </div>
      </div>

      <div className="dashboard-summary">
        <h4>System Summary</h4>
        <div className="summary-cards">
          <div className="summary-card">
            <h5>Total Cultural Suggestions</h5>
            <p>{summary?.totalCulturalSuggestions || 0}</p>
          </div>
          <div className="summary-card">
            <h5>User Overrides</h5>
            <p>{summary?.overriddenSuggestions || 0}</p>
          </div>
          <div className="summary-card">
            <h5>Override Rate</h5>
            <p>{summary?.overrideRate !== undefined ? `${summary.overrideRate}%` : 'N/A'}</p>
          </div>
          <div className="summary-card">
            <h5>User Feedback</h5>
            <p>{summary?.userFeedbackCount || 0}</p>
          </div>
        </div>
      </div>

      <div className="dashboard-alerts">
        <h4>Active Alerts ({alerts?.length || 0})</h4>
        {alerts && alerts.length > 0 ? (
          <ul className="alerts-list">
            {alerts.map((alert, index) => (
              <li key={index} className={`alert-item alert-${alert.severity}`}>
                <strong>[{alert.severity.toUpperCase()}]</strong> {alert.message}
              </li>
            ))}
          </ul>
        ) : (
          <p>No active alerts detected.</p>
        )}
      </div>

      <div className="dashboard-risk-metrics">
        <h4>Risk Indicators</h4>
        <ul className="risk-list">
          <li className={biasRiskMetrics?.highOverrideRate ? 'risk-active' : 'risk-inactive'}>
            High Override Rate: {biasRiskMetrics?.highOverrideRate ? 'YES' : 'NO'}
          </li>
          <li className={biasRiskMetrics?.patternOverrepresentation ? 'risk-active' : 'risk-inactive'}>
            Pattern Overrepresentation: {biasRiskMetrics?.patternOverrepresentation ? 'YES' : 'NO'}
          </li>
          <li className={biasRiskMetrics?.negativeFeedbackTrend ? 'risk-active' : 'risk-inactive'}>
            Negative Feedback Trend: {biasRiskMetrics?.negativeFeedbackTrend ? 'YES' : 'NO'}
          </li>
        </ul>
      </div>

      <div className="dashboard-top-patterns">
        <h4>Top Cultural Patterns</h4>
        {topCulturalPatterns && topCulturalPatterns.length > 0 ? (
          <table className="patterns-table">
            <thead>
              <tr>
                <th>Culture</th>
                <th>Count</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              {topCulturalPatterns.map((pattern, index) => (
                <tr key={index}>
                  <td>{pattern.culture}</td>
                  <td>{pattern.count}</td>
                  <td>{pattern.percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No cultural pattern data available.</p>
        )}
      </div>

      <div className="dashboard-recent-incidents">
        <h4>Recent Incidents (Last 10)</h4>
        {recentIncidents && recentIncidents.length > 0 ? (
          <ul className="incidents-list">
            {recentIncidents.map((incident, index) => (
              <li key={index} className="incident-item">
                <strong>{new Date(incident.timestamp).toLocaleString()}</strong>: 
                {incident.type} - {incident.source || incident.reason || incident.culture}
              </li>
            ))}
          </ul>
        ) : (
          <p>No recent incidents recorded.</p>
        )}
      </div>

      <div className="dashboard-notes">
        <h4>Notes</h4>
        <p>
          This dashboard monitors potential bias in cultural suggestions. 
          Regular review of these metrics helps ensure the system remains fair and respectful of individual differences.
        </p>
      </div>
    </div>
  );
};

export default BiasMonitoringDashboard;

// CSS styles for the dashboard component
export const dashboardStyles = `
.bias-dashboard-container {
  margin: 20px 0;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 8px;
  background-color: #f9f9f9;
  font-family: Arial, sans-serif;
}

.bias-dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.dashboard-controls button {
  margin-left: 10px;
  padding: 5px 10px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.dashboard-controls button:hover {
  background-color: #0056b3;
}

.dashboard-summary {
  margin-bottom: 30px;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
}

.summary-card {
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: white;
  text-align: center;
}

.summary-card h5 {
  margin: 0 0 10px 0;
  color: #333;
}

.summary-card p {
  margin: 0;
  font-size: 1.5em;
  font-weight: bold;
  color: #007bff;
}

.dashboard-alerts, .dashboard-risk-metrics, .dashboard-top-patterns, .dashboard-recent-incidents, .dashboard-notes {
  margin-bottom: 30px;
}

.alerts-list, .risk-list, .incidents-list {
  list-style-type: none;
  padding: 0;
}

.alert-item {
  padding: 8px;
  margin: 5px 0;
  border-radius: 4px;
}

.alert-high {
  background-color: #ffebee;
  border-left: 4px solid #f44336;
}

.alert-medium {
  background-color: #fff3e0;
  border-left: 4px solid #ff9800;
}

.risk-active {
  color: #f44336;
  font-weight: bold;
}

.risk-inactive {
  color: #4caf50;
}

.patterns-table {
  width: 100%;
  border-collapse: collapse;
}

.patterns-table th, .patterns-table td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}

.patterns-table th {
  background-color: #f2f2f2;
}

.incident-item {
  padding: 5px 0;
  border-bottom: 1px solid #eee;
}
`;