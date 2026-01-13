import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import { 
  TrendingUp, Clock, BatteryCharging, MessageSquare, 
  Activity, Calendar, Target, Award 
} from 'lucide-react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const EnhancedInsightsDashboard = ({ sessions, onClose }) => {
  // Calculate overall statistics
  const overallStats = useMemo(() => {
    if (!sessions || sessions.length === 0) {
      return {
        totalSessions: 0,
        totalMessages: 0,
        avgBatteryDrain: 0,
        avgDuration: 0,
        mostCommonIntent: 'N/A',
        improvementTrend: 0
      };
    }

    const totalMessages = sessions.reduce((sum, session) => sum + (session.transcript?.length || 0), 0);
    const avgBatteryDrain = sessions.reduce((sum, session) => {
      return sum + (session.initialBattery - session.battery);
    }, 0) / sessions.length;
    
    const avgDuration = sessions.reduce((sum, session) => sum + (session.duration || 0), 0) / sessions.length / 1000; // Convert to seconds
    
    // Calculate most common intent
    const intentCounts = {};
    sessions.forEach(session => {
      session.transcript?.forEach(entry => {
        if (entry.intent) {
          intentCounts[entry.intent] = (intentCounts[entry.intent] || 0) + 1;
        }
      });
    });
    
    let mostCommonIntent = 'general';
    let maxCount = 0;
    for (const [intent, count] of Object.entries(intentCounts)) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonIntent = intent;
      }
    }
    
    // Calculate improvement trend (simplified - comparing recent vs earlier sessions)
    let improvementTrend = 0;
    if (sessions.length >= 2) {
      const recentSessions = sessions.slice(0, Math.floor(sessions.length / 2));
      const earlierSessions = sessions.slice(Math.floor(sessions.length / 2));
      
      const recentAvgDrain = recentSessions.reduce((sum, session) => 
        sum + (session.initialBattery - session.battery), 0) / recentSessions.length;
      const earlierAvgDrain = earlierSessions.reduce((sum, session) => 
        sum + (session.initialBattery - session.battery), 0) / earlierSessions.length;
        
      improvementTrend = ((earlierAvgDrain - recentAvgDrain) / earlierAvgDrain) * 100;
    }

    return {
      totalSessions: sessions.length,
      totalMessages,
      avgBatteryDrain: parseFloat(avgBatteryDrain.toFixed(1)),
      avgDuration: parseFloat(avgDuration.toFixed(1)),
      mostCommonIntent,
      improvementTrend: parseFloat(improvementTrend.toFixed(1))
    };
  }, [sessions]);

  // Prepare data for charts
  const intentDistribution = useMemo(() => {
    if (!sessions || sessions.length === 0) return [];

    const intentCounts = {};
    sessions.forEach(session => {
      session.transcript?.forEach(entry => {
        if (entry.intent) {
          intentCounts[entry.intent] = (intentCounts[entry.intent] || 0) + 1;
        }
      });
    });

    return Object.entries(intentCounts).map(([intent, count]) => ({
      name: intent.charAt(0).toUpperCase() + intent.slice(1),
      value: count
    }));
  }, [sessions]);

  const sessionTrends = useMemo(() => {
    if (!sessions || sessions.length === 0) return [];

    // Sort sessions by date and take the last 10 for trend analysis
    const sortedSessions = [...sessions].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10);
    
    return sortedSessions.map((session, index) => ({
      name: `S${sortedSessions.length - index}`, // Reverse the numbering so newest is S1
      batteryDrain: session.initialBattery - session.battery,
      messageCount: session.transcript?.length || 0,
      date: new Date(session.timestamp).toLocaleDateString()
    })).reverse(); // Reverse again to show oldest first in chart
  }, [sessions]);

  const batteryTrends = useMemo(() => {
    if (!sessions || sessions.length === 0) return [];

    const sortedSessions = [...sessions].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10);
    
    return sortedSessions.map((session, index) => ({
      name: `S${sortedSessions.length - index}`,
      endingBattery: session.battery,
      startingBattery: session.initialBattery,
      date: new Date(session.timestamp).toLocaleDateString()
    })).reverse();
  }, [sessions]);

  // Calculate insights for recommendations
  const insights = useMemo(() => {
    const insightsList = [];
    
    if (overallStats.avgBatteryDrain > 30) {
      insightsList.push({
        type: 'warning',
        title: 'High Energy Drain Detected',
        description: 'Your conversations are consistently draining your social battery quickly. Consider using the "Anxiety Coach" persona for gentler interactions.'
      });
    } else if (overallStats.avgBatteryDrain < 15) {
      insightsList.push({
        type: 'info',
        title: 'Excellent Energy Management',
        description: 'You maintain good social energy throughout conversations. Keep up the great work!'
      });
    }
    
    if (overallStats.mostCommonIntent === 'conflict') {
      insightsList.push({
        type: 'warning',
        title: 'Conflict-Dense Conversations',
        description: 'Many of your conversations involve conflict. Consider practicing de-escalation techniques.'
      });
    }
    
    if (overallStats.improvementTrend > 10) {
      insightsList.push({
        type: 'info',
        title: 'Improving Pattern',
        description: 'Your social energy management is getting better over time!'
      });
    } else if (overallStats.improvementTrend < -10) {
      insightsList.push({
        type: 'warning',
        title: 'Declining Pattern',
        description: 'Your social energy management may be declining. Consider reviewing your conversation strategies.'
      });
    }
    
    if (overallStats.avgDuration > 120) { // More than 2 minutes average
      insightsList.push({
        type: 'info',
        title: 'Engaging Conversations',
        description: 'You engage in longer, more meaningful conversations. Great for building relationships!'
      });
    }
    
    return insightsList;
  }, [overallStats]);

  return (
    <div className="enhanced-insights-dashboard">
      <div className="dashboard-header">
        <h2>Conversation Insights Dashboard</h2>
        <p>Track your social interaction patterns and improvement over time</p>
      </div>

      {/* Stats Overview */}
      <div className="stats-overview">
        <div className="stat-card">
          <div className="stat-icon bg-indigo-500/20">
            <Activity className="text-indigo-500" size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{overallStats.totalSessions}</div>
            <div className="stat-label">Total Sessions</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon bg-green-500/20">
            <MessageSquare className="text-green-500" size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{overallStats.totalMessages}</div>
            <div className="stat-label">Total Messages</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon bg-yellow-500/20">
            <BatteryCharging className="text-yellow-500" size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{overallStats.avgBatteryDrain}%</div>
            <div className="stat-label">Avg. Battery Drain</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon bg-blue-500/20">
            <TrendingUp className="text-blue-500" size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{overallStats.improvementTrend > 0 ? '+' : ''}{overallStats.improvementTrend}%</div>
            <div className="stat-label">Improvement Trend</div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-section">
        <div className="chart-container">
          <h3>Intent Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={intentDistribution}
                cx="50%"
                cy="50%"
                labelLine={true}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {intentDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [value, 'Occurrences']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className="chart-container">
          <h3>Session Trends (Last 10)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sessionTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="batteryDrain" name="Battery Drain (%)" fill="#ef4444" />
              <Bar dataKey="messageCount" name="Message Count" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="chart-container">
          <h3>Battery Levels Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={batteryTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="startingBattery" name="Starting Battery" stroke="#6366f1" strokeWidth={2} />
              <Line type="monotone" dataKey="endingBattery" name="Ending Battery" stroke="#f59e0b" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Insights & Recommendations */}
      <div className="insights-section">
        <h3>Personalized Insights</h3>
        <div className="insights-list">
          {insights.length > 0 ? (
            insights.map((insight, index) => (
              <div key={index} className={`insight-item priority-${insight.type}`}>
                <div className={`insight-icon ${insight.type}`}>
                  {insight.type === 'info' ? <Target size={20} /> : <Award size={20} />}
                </div>
                <div>
                  <strong>{insight.title}</strong>
                  <p>{insight.description}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="no-insights">
              <p>No specific insights detected yet. Continue using ConvoCue to build your conversation history.</p>
            </div>
          )}
        </div>
      </div>

      {/* Actionable Tips */}
      <div className="tips-section">
        <h3>Improve Your Social Skills</h3>
        <div className="tips-grid">
          <div className="tip-card">
            <div className="tip-icon">
              <Clock size={24} className="text-indigo-500" />
            </div>
            <h4>Pacing Matters</h4>
            <p>Longer conversations don't always mean better ones. Quality over quantity.</p>
          </div>
          
          <div className="tip-card">
            <div className="tip-icon">
              <BatteryCharging size={24} className="text-green-500" />
            </div>
            <h4>Energy Management</h4>
            <p>Watch your social battery. Take breaks when it gets low to prevent exhaustion.</p>
          </div>
          
          <div className="tip-card">
            <div className="tip-icon">
              <MessageSquare size={24} className="text-yellow-500" />
            </div>
            <h4>Active Listening</h4>
            <p>Balance talking and listening. Good conversations are a two-way street.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedInsightsDashboard;