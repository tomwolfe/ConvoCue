import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// Mock metrics tracker for UI revision evaluation
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
    <div className="metrics-tracker" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h3>UI Revision Metrics Tracker</h3>
      <p>Tracking progress toward our goals: 30% reduction in task completion time, 90% success rate, 50% fewer support tickets</p>
      
      <div style={{ marginBottom: '30px' }}>
        <h4>Task Completion Time (seconds)</h4>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 50]} />
            <Tooltip />
            <Bar dataKey="value" name="Baseline/Current">
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : '#10b981'} />
              ))}
            </Bar>
            <Bar dataKey="target" name="Target" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
        <p>Target: Reduce from 45s to 31.5s (30% reduction) | Current: {metrics.taskCompletionTime.toFixed(1)}s</p>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h4>Task Success Rate (%)</h4>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={successData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Bar dataKey="value" name="Baseline/Current">
              {successData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : '#10b981'} />
              ))}
            </Bar>
            <Bar dataKey="target" name="Target" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
        <p>Target: Increase to 90% | Current: {metrics.successRate.toFixed(1)}%</p>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h4>Support Tickets (monthly)</h4>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={ticketData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 40]} />
            <Tooltip />
            <Bar dataKey="value" name="Baseline/Current">
              {ticketData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : '#10b981'} />
              ))}
            </Bar>
            <Bar dataKey="target" name="Target" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
        <p>Target: Reduce from 32 to 16 (50% reduction) | Current: {metrics.supportTickets.toFixed(1)}</p>
      </div>
    </div>
  );
};

export default MetricsTracker;