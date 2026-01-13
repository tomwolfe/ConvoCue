import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, Clock, BatteryCharging, MessageSquare, AlertTriangle, Calendar, User, Users, Heart, Briefcase, ShieldAlert, Globe } from 'lucide-react';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6ee7b7', '#93c5fd', '#fde68a', '#fca5a5'];

const InsightsDashboard = ({ sessions }) => {
  const [insights, setInsights] = useState({
    totalConversations: 0,
    avgBatteryDrain: 0,
    dominantIntents: [],
    weeklyActivity: [],
    batteryTrends: [],
    speakerBalance: {},
    personaUsage: {},
    conversationThemes: [],
    improvementSuggestions: []
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
    const speakerCounts = { me: 0, them: 0 };
    const personaCounts = {};

    sessions.forEach(session => {
      // Count persona usage
      if (session.persona) {
        personaCounts[session.persona] = (personaCounts[session.persona] || 0) + 1;
      }

      if (session.transcript) {
        session.transcript.forEach(entry => {
          if (entry.intent) {
            intentCounts[entry.intent] = (intentCounts[entry.intent] || 0) + 1;
          }
          if (entry.speaker) {
            speakerCounts[entry.speaker] = (speakerCounts[entry.speaker] || 0) + 1;
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

    // Calculate conversation themes based on common topics in transcripts
    const themes = calculateConversationThemes(sessions);

    // Generate improvement suggestions based on patterns
    const suggestions = generateImprovementSuggestions(
      avgBatteryDrain,
      dominantIntents,
      speakerCounts,
      personaCounts
    );

    setInsights({
      totalConversations,
      avgBatteryDrain: Math.round(avgBatteryDrain * 100) / 100,
      dominantIntents,
      weeklyActivity,
      batteryTrends,
      speakerBalance: speakerCounts,
      personaUsage: personaCounts,
      conversationThemes: themes,
      improvementSuggestions: suggestions
    });
  };

  // Helper function to calculate conversation themes
  const calculateConversationThemes = (sessions) => {
    const themeKeywords = {
      'Work/Professional': ['project', 'meeting', 'deadline', 'work', 'job', 'company', 'client', 'boss', 'team'],
      'Personal Relationships': ['family', 'friend', 'relationship', 'partner', 'children', 'husband', 'wife', 'dating'],
      'Hobbies/Interests': ['hobby', 'interest', 'sport', 'music', 'movie', 'book', 'game', 'travel', 'food'],
      'Health/Wellness': ['health', 'exercise', 'fitness', 'doctor', 'medicine', 'stress', 'sleep', 'diet'],
      'Current Events': ['news', 'politics', 'election', 'government', 'world', 'country', 'local']
    };

    const themeCounts = {};

    sessions.forEach(session => {
      if (session.transcript) {
        session.transcript.forEach(entry => {
          Object.entries(themeKeywords).forEach(([theme, keywords]) => {
            const lowerText = entry.text.toLowerCase();
            const matches = keywords.filter(keyword => lowerText.includes(keyword)).length;

            if (matches > 0) {
              themeCounts[theme] = (themeCounts[theme] || 0) + matches;
            }
          });
        });
      }
    });

    return Object.entries(themeCounts)
      .map(([theme, count]) => ({ name: theme, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  };

  // Helper function to generate improvement suggestions
  const generateImprovementSuggestions = (avgDrain, intents, speakers, personas) => {
    const suggestions = [];

    // Energy management suggestions
    if (avgDrain > 20) {
      suggestions.push({
        category: 'Energy Management',
        text: 'Your conversations tend to drain your social battery significantly. Consider using the "Anxiety Coach" persona for high-stress situations.',
        priority: 'high'
      });
    } else if (avgDrain < 10) {
      suggestions.push({
        category: 'Energy Management',
        text: 'Your conversations are energy-efficient. You might be able to engage in longer, more meaningful discussions.',
        priority: 'medium'
      });
    }

    // Speaker balance suggestions
    const meRatio = speakers.me / (speakers.me + speakers.them);
    if (meRatio > 0.7) {
      suggestions.push({
        category: 'Conversation Balance',
        text: 'You\'re speaking more than others in conversations. Try asking more questions to encourage dialogue.',
        priority: 'medium'
      });
    } else if (meRatio < 0.3) {
      suggestions.push({
        category: 'Conversation Balance',
        text: 'You\'re speaking less than others. Consider sharing more of your thoughts and experiences.',
        priority: 'medium'
      });
    }

    // Intent pattern suggestions
    if (intents.length > 0) {
      const topIntent = intents[0];
      if (topIntent.name === 'conflict') {
        suggestions.push({
          category: 'Communication Style',
          text: `Conflict is your most common conversation type. Consider practicing de-escalation techniques or using the "EQ Coach" persona.`,
          priority: 'high'
        });
      } else if (topIntent.name === 'empathy') {
        suggestions.push({
          category: 'Communication Style',
          text: `Empathetic conversations are your strength. You excel at emotional support and connection.`,
          priority: 'low'
        });
      }
    }

    // Persona usage suggestions
    if (Object.keys(personas).length > 0) {
      const mostUsed = Object.entries(personas).sort((a, b) => b[1] - a[1])[0];
      if (mostUsed[0] === 'anxiety' && mostUsed[1] > 3) {
        suggestions.push({
          category: 'Persona Selection',
          text: `You frequently use the "Anxiety Coach" persona. As you gain confidence, consider experimenting with other personas for variety.`,
          priority: 'medium'
        });
      }
    }

    return suggestions.slice(0, 5);
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

  // Calculate speaker balance percentage
  const totalSpeakers = insights.speakerBalance.me + insights.speakerBalance.them;
  const mePercentage = totalSpeakers > 0 ? Math.round((insights.speakerBalance.me / totalSpeakers) * 100) : 0;
  const themPercentage = totalSpeakers > 0 ? Math.round((insights.speakerBalance.them / totalSpeakers) * 100) : 0;

  // Format persona usage data for chart
  const personaChartData = Object.entries(insights.personaUsage).map(([persona, count]) => {
    const personaIcons = {
      anxiety: <ShieldAlert size={16} />,
      professional: <Briefcase size={16} />,
      relationship: <Heart size={16} />,
      crosscultural: <Globe size={16} />
    };

    const personaLabels = {
      anxiety: 'Anxiety Coach',
      professional: 'Pro Exec',
      relationship: 'EQ Coach',
      crosscultural: 'Culture Guide'
    };

    return {
      name: personaLabels[persona] || persona,
      value: count,
      icon: personaIcons[persona] || <User size={16} />
    };
  });

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

      {/* Speaker Balance */}
      <div className="chart-section">
        <h3>Speaking Balance</h3>
        <div className="balance-stats">
          <div className="balance-item">
            <div className="balance-icon">
              <User size={20} />
            </div>
            <div className="balance-info">
              <div className="balance-label">You</div>
              <div className="balance-value">{mePercentage}%</div>
              <div className="balance-count">({insights.speakerBalance.me} messages)</div>
            </div>
          </div>
          <div className="balance-item">
            <div className="balance-icon">
              <Users size={20} />
            </div>
            <div className="balance-info">
              <div className="balance-label">Others</div>
              <div className="balance-value">{themPercentage}%</div>
              <div className="balance-count">({insights.speakerBalance.them} messages)</div>
            </div>
          </div>
        </div>
        <div className="balance-chart">
          <ResponsiveContainer width="100%" height={100}>
            <BarChart layout="vertical" data={[
              { name: 'You', value: mePercentage },
              { name: 'Others', value: themPercentage }
            ]}>
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis dataKey="name" type="category" hide />
              <Tooltip formatter={(value) => [`${value}%`, 'Percentage']} />
              <Bar dataKey="value" fill="#8884d8">
                {[
                  <Cell key="0" fill={mePercentage > themPercentage ? '#3b82f6' : '#93c5fd'} />,
                  <Cell key="1" fill={themPercentage > mePercentage ? '#10b981' : '#6ee7b7'} />
                ]}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
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

      {/* Persona Usage Chart */}
      <div className="chart-section">
        <h3>Persona Usage</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={personaChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#3b82f6" name="Times Used">
                {personaChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
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
            <LineChart data={insights.batteryTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="session" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="drain" stroke="#ef4444" name="Battery Drain %" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Conversation Themes */}
      <div className="chart-section">
        <h3>Common Conversation Themes</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={insights.conversationThemes}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#10b981" name="Occurrences" />
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

      {/* Improvement Suggestions */}
      <div className="insights-summary">
        <h3>Personalized Improvement Suggestions</h3>
        <div className="insights-list">
          {insights.improvementSuggestions.length > 0 ? (
            insights.improvementSuggestions.map((suggestion, index) => (
              <div key={index} className={`insight-item priority-${suggestion.priority}`}>
                <AlertTriangle className="insight-icon" size={20} />
                <div>
                  <strong>{suggestion.category}:</strong> {suggestion.text}
                </div>
              </div>
            ))
          ) : (
            <div className="insight-item">
              <TrendingUp className="insight-icon info" size={20} />
              <div>
                <strong>Keep up the good work!</strong> Your conversation patterns look balanced and healthy.
              </div>
            </div>
          )}
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

              <div className="insight-item">
                <User className="insight-icon info" size={20} />
                <div>
                  <strong>Speaking Balance:</strong> You speak {mePercentage}% of the time in conversations.
                  {mePercentage > 60 ? ' Consider allowing others more space to share.' :
                   mePercentage < 40 ? ' Consider sharing more of your thoughts and experiences.' :
                   ' Your speaking balance looks good!'}
                </div>
              </div>
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