import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, Heart, Award, ChevronDown, ChevronUp } from 'lucide-react';
import { calculateSocialSuccessScore } from '../utils/feedbackAnalytics';

const SocialSuccessScore = ({ feedbackHistory, conversationTurns, settings }) => {
  const [metrics, setMetrics] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const updateMetrics = async () => {
      const results = await calculateSocialSuccessScore(feedbackHistory, conversationTurns);
      setMetrics(results);
    };
    updateMetrics();
  }, [feedbackHistory, conversationTurns]);

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
              <span>Satisfaction: {metrics.breakdown.satisfaction}/50</span>
            </div>
            <div className="metric-item">
              <TrendingUp size={14} />
              <span>Sentiment: {metrics.breakdown.sentiment}/30</span>
            </div>
            <div className="metric-item">
              <Users size={14} />
              <span>Engagement: {metrics.breakdown.engagement}/20</span>
            </div>
          </div>
          <div className="score-trend-indicator">
            Trend: <span className={`trend-${metrics.trend}`}>{metrics.trend}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SocialSuccessScore;
