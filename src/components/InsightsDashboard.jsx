import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Clock, BatteryCharging, MessageSquare, AlertTriangle, Calendar } from 'lucide-react';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

const InsightsDashboard = ({ sessions }) => {
  const [insights, setInsights] = useState({
    totalConversations: 0,
    avgBatteryDrain: 0,
    dominantIntents: [],
    weeklyActivity: [],
    batteryTrends: []
  });

  useEffect(() => {
    if (sessions && sessions.length > 0) {
      calculateInsights();
    }
  }, [sessions]);

  const calculateInsights = () => {
    // Calculate total conversations
    const totalConversations = sessions.length;

    // Calculate average battery drain
    const totalDrain = sessions.reduce((sum, session) => {
      return sum + (session.initialBattery - session.battery);
    }, 0);
    const avgBatteryDrain = totalConversations > 0 ? totalDrain / totalConversations : 0;

    // Calculate dominant intents from transcripts
    const intentCounts = {};
    sessions.forEach(session => {
      if (session.transcript) {
        session.transcript.forEach(entry => {
          if (entry.intent) {
            intentCounts[entry.intent] = (intentCounts[entry.intent] || 0) + 1;
          }
        });
      }
    });

    const dominantIntents = Object.entries(intentCounts)
      .map(([intent, count]) => ({ name: intent, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Calculate weekly activity (last 7 days)
    const now = new Date();
    const weeklyActivity = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const sessionsOnDate = sessions.filter(session => 
        session.timestamp.startsWith(dateStr)
      );
      
      weeklyActivity.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        conversations: sessionsOnDate.length,
        avgDrain: sessionsOnDate.length > 0 
          ? sessionsOnDate.reduce((sum, session) => sum + (session.initialBattery - session.battery), 0) / sessionsOnDate.length
          : 0
      });
    }

    // Calculate battery trends
    const batteryTrends = sessions
      .map((session, index) => ({
        session: `S${index + 1}`,
        start: session.initialBattery,
        end: session.battery,
        drain: session.initialBattery - session.battery
      }))
      .slice(-10); // Last 10 sessions

    setInsights({
      totalConversations,
      avgBatteryDrain: Math.round(avgBatteryDrain * 100) / 100,
      dominantIntents,
      weeklyActivity,
      batteryTrends
    });
  };

  const formatDuration = (milliseconds) => {
    if (!milliseconds) return '0s';
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
  };

  // Calculate additional metrics
  const avgSessionDuration = sessions && sessions.length > 0 
    ? sessions.reduce((sum, session) => sum + (session.duration || 0), 0) / sessions.length
    : 0;

  const avgMessagesPerSession = sessions && sessions.length > 0
    ? sessions.reduce((sum, session) => sum + (session.transcript ? session.transcript.length : 0), 0) / sessions.length
    : 0;

  return (
    <div className="insights-dashboard">
      <h2>Conversation Insights</h2>
      <p className="dashboard-description">Understand your conversation patterns and social energy trends</p>

      {/* Stats Overview */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <MessageSquare size={24} />
          </div>
          <div className="stat-info">
            <h3>{insights.totalConversations}</h3>
            <p>Total Conversations</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">
            <BatteryCharging size={24} />
          </div>
          <div className="stat-info">
            <h3>{insights.avgBatteryDrain}%</h3>
            <p>Avg. Battery Drain</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">
            <Clock size={24} />
          </div>
          <div className="stat-info">
            <h3>{formatDuration(avgSessionDuration)}</h3>
            <p>Avg. Duration</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">
            <TrendingUp size={24} />
          </div>
          <div className="stat-info">
            <h3>{Math.round(avgMessagesPerSession)}</h3>
            <p>Avg. Messages</p>
          </div>
        </div>
      </div>

      {/* Dominant Intents Chart */}
      <div className="chart-section">
        <h3>Dominant Conversation Intents</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={insights.dominantIntents}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#8884d8" name="Occurrences" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Weekly Activity Chart */}
      <div className="chart-section">
        <h3>Weekly Conversation Activity</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={insights.weeklyActivity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" orientation="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="conversations" fill="#3b82f6" name="Conversations" />
              <Bar yAxisId="right" dataKey="avgDrain" fill="#f59e0b" name="Avg. Drain %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Battery Trends Chart */}
      <div className="chart-section">
        <h3>Recent Battery Drain Trends</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={insights.batteryTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="session" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="drain" fill="#ef4444" name="Battery Drain %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Intent Distribution Pie Chart */}
      <div className="chart-section">
        <h3>Intent Distribution</h3>
        <div className="chart-container pie-chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={insights.dominantIntents}
                cx="50%"
                cy="50%"
                labelLine={true}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {insights.dominantIntents.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Insights Summary */}
      <div className="insights-summary">
        <h3>Key Insights</h3>
        <div className="insights-list">
          {insights.totalConversations > 0 ? (
            <>
              <div className="insight-item">
                <AlertTriangle className="insight-icon warning" size={20} />
                <div>
                  <strong>Energy Management:</strong> Your average battery drain is {insights.avgBatteryDrain}% per conversation. 
                  Consider using the "Anxiety Coach" persona for high-drain scenarios.
                </div>
              </div>
              
              {insights.dominantIntents.length > 0 && (
                <div className="insight-item">
                  <TrendingUp className="insight-icon info" size={20} />
                  <div>
                    <strong>Conversation Patterns:</strong> Your most common conversation type is "{insights.dominantIntents[0].name}" 
                    ({insights.dominantIntents[0].value} occurrences). Consider preparing more responses for this scenario.
                  </div>
                </div>
              )}
              
              {avgSessionDuration > 300000 && ( // 5 minutes in milliseconds
                <div className="insight-item">
                  <AlertTriangle className="insight-icon warning" size={20} />
                  <div>
                    <strong>Engagement Level:</strong> Your average conversation length is quite long. 
                    You might benefit from the "Pro Exec" persona to keep discussions focused.
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="insight-item">
              <Calendar className="insight-icon info" size={20} />
              <div>
                <strong>No Data Yet:</strong> Start a conversation to begin collecting insights about your social patterns.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InsightsDashboard;