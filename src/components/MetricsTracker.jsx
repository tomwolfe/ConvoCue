import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// Mock metrics tracker for UI revision evaluation - FOR INTERNAL USE ONLY
const MetricsTracker = ({ isActive }) => {
  const [metrics, setMetrics] = useState({
    taskCompletionTime: 0,
    successRate: 0,
    supportTickets: 0,
    engagement: 0
  });

  // Simulate metrics improvement over time
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setMetrics(prev => ({
        taskCompletionTime: Math.max(0, prev.taskCompletionTime - 0.5), // Improvement over time
        successRate: Math.min(100, prev.successRate + 0.2), // Improvement over time
        supportTickets: Math.max(0, prev.supportTickets - 0.1), // Reduction over time
        engagement: Math.min(100, prev.engagement + 0.15) // Improvement over time
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive]);

  // Initialize with baseline metrics
  useEffect(() => {
    setMetrics({
      taskCompletionTime: 45, // seconds (baseline)
      successRate: 65, // percentage (baseline)
      supportTickets: 32, // count (baseline)
      engagement: 45 // percentage (baseline)
    });
  }, []);

  const data = [
    { name: 'Before', value: 45, target: 31.5, current: metrics.taskCompletionTime },
    { name: 'After', value: metrics.taskCompletionTime, target: 31.5, current: metrics.taskCompletionTime }
  ];

  const successData = [
    { name: 'Before', value: 65, target: 90, current: metrics.successRate },
    { name: 'After', value: metrics.successRate, target: 90, current: metrics.successRate }
  ];

  const ticketData = [
    { name: 'Before', value: 32, target: 16, current: metrics.supportTickets },
    { name: 'After', value: metrics.supportTickets, target: 16, current: metrics.supportTickets }
  ];

  return (
    <div
      className="metrics-tracker"
      style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}
      role="region"
      aria-label="UI Revision Metrics Dashboard - Simulation for Internal Evaluation"
    >
      <h3>UI Revision Metrics Tracker</h3>
      <p><strong>DISCLAIMER:</strong> This is a simulation for internal evaluation purposes only. Data is not real.</p>
      <p>Tracking progress toward our goals: 30% reduction in task completion time, 90% success rate, 50% fewer support tickets</p>

      <div style={{ marginBottom: '30px' }} role="group" aria-labelledby="completion-time-chart">
        <h4 id="completion-time-chart">Task Completion Time (seconds)</h4>
        <div role="img" aria-label={`Task Completion Time Chart: Before ${data[0].value}s, After ${data[1].current.toFixed(1)}s, Target ${data[0].target}s`}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={data}
              aria-label="Task Completion Time Chart"
              role="graphics-document document"
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 50]} />
              <Tooltip />
              <Bar dataKey="value" name="Baseline/Current">
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index === 0 ? '#ef4444' : '#10b981'}
                    aria-label={`${entry.name} value: ${entry.value} seconds`}
                    role="graphics-symbol img"
                  />
                ))}
              </Bar>
              <Bar dataKey="target" name="Target" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p>Target: Reduce from 45s to 31.5s (30% reduction) | Current: {metrics.taskCompletionTime.toFixed(1)}s</p>

        {/* Accessible data table for screen readers */}
        <table role="table" aria-label="Task Completion Time Data Table" style={{ display: 'none', marginTop: '10px', borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th>Metric</th>
              <th>Before</th>
              <th>After</th>
              <th>Target</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Task Completion Time (seconds)</td>
              <td>{data[0].value}</td>
              <td>{data[1].current.toFixed(1)}</td>
              <td>{data[0].target}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ marginBottom: '30px' }} role="group" aria-labelledby="success-rate-chart">
        <h4 id="success-rate-chart">Task Success Rate (%)</h4>
        <div role="img" aria-label={`Task Success Rate Chart: Before ${successData[0].value}%, After ${successData[1].current.toFixed(1)}%, Target ${successData[0].target}%`}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={successData}
              aria-label="Task Success Rate Chart"
              role="graphics-document document"
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="value" name="Baseline/Current">
                {successData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index === 0 ? '#ef4444' : '#10b981'}
                    aria-label={`${entry.name} value: ${entry.value}%`}
                    role="graphics-symbol img"
                  />
                ))}
              </Bar>
              <Bar dataKey="target" name="Target" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p>Target: Increase to 90% | Current: {metrics.successRate.toFixed(1)}%</p>

        {/* Accessible data table for screen readers */}
        <table role="table" aria-label="Task Success Rate Data Table" style={{ display: 'none', marginTop: '10px', borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th>Metric</th>
              <th>Before</th>
              <th>After</th>
              <th>Target</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Task Success Rate (%)</td>
              <td>{successData[0].value}</td>
              <td>{successData[1].current.toFixed(1)}</td>
              <td>{successData[0].target}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ marginBottom: '30px' }} role="group" aria-labelledby="support-tickets-chart">
        <h4 id="support-tickets-chart">Support Tickets (monthly)</h4>
        <div role="img" aria-label={`Support Tickets Chart: Before ${ticketData[0].value}, After ${ticketData[1].current.toFixed(1)}, Target ${ticketData[0].target}`}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={ticketData}
              aria-label="Support Tickets Chart"
              role="graphics-document document"
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 40]} />
              <Tooltip />
              <Bar dataKey="value" name="Baseline/Current">
                {ticketData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index === 0 ? '#ef4444' : '#10b981'}
                    aria-label={`${entry.name} value: ${entry.value} tickets`}
                    role="graphics-symbol img"
                  />
                ))}
              </Bar>
              <Bar dataKey="target" name="Target" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p>Target: Reduce from 32 to 16 (50% reduction) | Current: {metrics.supportTickets.toFixed(1)}</p>

        {/* Accessible data table for screen readers */}
        <table role="table" aria-label="Support Tickets Data Table" style={{ display: 'none', marginTop: '10px', borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th>Metric</th>
              <th>Before</th>
              <th>After</th>
              <th>Target</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Support Tickets (monthly)</td>
              <td>{ticketData[0].value}</td>
              <td>{ticketData[1].current.toFixed(1)}</td>
              <td>{ticketData[0].target}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MetricsTracker;