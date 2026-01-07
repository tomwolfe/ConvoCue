import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, Heart, Award, ChevronDown, ChevronUp } from 'lucide-react';
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

          {/* Historical Trend Chart - Lightweight SVG Implementation */}
          {historicalData && historicalData.length > 1 && (
            <div className="mt-4 h-48">
              <h4 className="text-sm font-semibold mb-2 text-gray-700">Historical Trend</h4>
              <div className="w-full h-40 bg-white border border-gray-200 rounded">
                <svg
                  viewBox={`0 0 ${historicalData.length * 30} 120`}
                  preserveAspectRatio="none"
                  className="w-full h-full"
                >
                  {/* Y-axis grid lines */}
                  {[0, 25, 50, 75, 100].map((value) => (
                    <g key={value}>
                      <line
                        x1="0"
                        y1={100 - value}
                        x2={historicalData.length * 30}
                        y2={100 - value}
                        stroke="#eee"
                        strokeDasharray="2,2"
                      />
                      <text
                        x="2"
                        y={102 - value}
                        fontSize="8"
                        fill="#999"
                      >
                        {value}
                      </text>
                    </g>
                  ))}

                  {/* Line chart */}
                  <polyline
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    points={historicalData.map((point, index) =>
                      `${index * 30 + 15},${100 - point.score}`
                    ).join(' ')}
                  />

                  {/* Data points */}
                  {historicalData.map((point, index) => (
                    <circle
                      key={index}
                      cx={index * 30 + 15}
                      cy={100 - point.score}
                      r="3"
                      fill="#3b82f6"
                    />
                  ))}

                  {/* X-axis labels */}
                  {historicalData.map((point, index) => (
                    <text
                      key={index}
                      x={index * 30 + 15}
                      y="115"
                      fontSize="8"
                      fill="#666"
                      textAnchor="middle"
                    >
                      {index % 2 === 0 ? point.date : ''}
                    </text>
                  ))}
                </svg>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SocialSuccessScore;
