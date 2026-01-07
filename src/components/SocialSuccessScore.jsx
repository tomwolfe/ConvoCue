import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, Heart, Award, ChevronDown, ChevronUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { calculateSocialSuccessScore, getHistoricalScores } from '../utils/feedbackAnalytics';
import { secureLocalStorageGet } from '../utils/encryption';

const SocialSuccessScore = ({ conversationTurns, settings }) => {
  const [metrics, setMetrics] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const [historicalData, setHistoricalData] = useState([]);

  useEffect(() => {
    const updateMetrics = async () => {
      // Get feedback history from localStorage
      const feedbackHistory = await secureLocalStorageGet('convocue_feedback', []);
      const results = await calculateSocialSuccessScore(feedbackHistory, conversationTurns);
      setMetrics(results);

      // Update historical data
      const histData = await getHistoricalScores();
      setHistoricalData(histData);
    };
    updateMetrics();

    // Listen for feedback submission events to update metrics
    const handleFeedbackUpdate = () => {
      updateMetrics();
    };

    window.addEventListener('convocue_feedback_submitted', handleFeedbackUpdate);

    return () => {
      window.removeEventListener('convocue_feedback_submitted', handleFeedbackUpdate);
    };
  }, [conversationTurns]);

  if (!metrics || !settings?.showAnalytics) return null;

  return (
    <div className={`social-success-container ${isExpanded ? 'expanded' : ''}`}>
      <div className="social-success-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="score-summary">
          <Award size={18} className="score-icon" />
          <span className="score-label">Social Success Score:</span>
          <span className="score-value">{metrics.score}</span>
        </div>
        <div className="score-level-badge">
          {metrics.level}
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      {isExpanded && (
        <div className="social-success-details">
          <div className="metric-row">
            <div className="metric-item">
              <Heart size={14} />
              <span>Satisfaction: {metrics.breakdown.satisfaction}/{metrics.weights?.satisfaction || 50}</span>
            </div>
            <div className="metric-item">
              <TrendingUp size={14} />
              <span>Sentiment: {metrics.breakdown.sentiment}/{metrics.weights?.sentiment || 30}</span>
            </div>
            <div className="metric-item">
              <Users size={14} />
              <span>Engagement: {metrics.breakdown.engagement}/{metrics.weights?.engagement || 20}</span>
            </div>
          </div>
          <div className="score-trend-indicator">
            Trend: <span className={`trend-${metrics.trend.replace(' ', '-')}`}>{metrics.trend.replace('slightly ', '↑ ').replace('increasing', 'Increasing').replace('decreasing', 'Decreasing')}</span>
          </div>

          {/* Historical Trend Chart */}
          {historicalData && historicalData.length > 1 && (
            <div className="mt-4 h-48">
              <h4 className="text-sm font-semibold mb-2 text-gray-700">Historical Trend</h4>
              <ResponsiveContainer width="100%" height="80%">
                <LineChart
                  data={historicalData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis domain={[0, 100]} />
                  <Tooltip
                    formatter={(value) => [`${value}`, 'Score']}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SocialSuccessScore;
