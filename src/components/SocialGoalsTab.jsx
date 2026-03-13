import React, { useState } from 'react';
import { Target, TrendingUp, Calendar, CheckCircle, Archive, Trash2, Plus, Sparkles, Heart, Battery, Users, Shield, MessageSquare } from 'lucide-react';

const GOAL_ICONS = {
  energy: Battery,
  balance: Users,
  intent: Heart,
  frequency: Calendar,
  conflict: Shield
};

const SocialGoalsTab = ({ growthEngine }) => {
  const {
    goals,
    weeklyTrends,
    monthlyStats,
    suggestedGoal,
    isLoading,
    createGoal,
    acceptSuggestedGoal,
    completeGoal,
    archiveGoal,
    deleteGoal
  } = growthEngine;

  const [showCreateGoal, setShowCreateGoal] = useState(false);
  const [selectedGoalType, setSelectedGoalType] = useState('frequency');

  const handleAcceptSuggested = async () => {
    try {
      await acceptSuggestedGoal();
    } catch (error) {
      console.error('Failed to accept suggested goal:', error);
    }
  };

  const handleCreateGoal = async () => {
    try {
      await createGoal(selectedGoalType);
      setShowCreateGoal(false);
    } catch (error) {
      console.error('Failed to create goal:', error);
    }
  };

  const getProgressPercent = (goal) => {
    if (goal.target === 0) return 0;
    
    // For goals where lower is better (energy, conflict)
    if (goal.type === 'energy' || goal.type === 'conflict') {
      if (goal.current <= 0) return 100;
      const percent = Math.max(0, 100 - ((goal.current / goal.target) * 100));
      return Math.min(100, Math.round(percent));
    }
    
    // For goals where higher/count is better
    return Math.min(100, Math.round((goal.current / goal.target) * 100));
  };

  const getProgressColor = (goal, percent) => {
    if (percent >= 100) return '#10b981'; // Green - completed
    if (percent >= 70) return '#3b82f6'; // Blue - good progress
    if (percent >= 40) return '#f59e0b'; // Yellow - moderate
    return '#ef4444'; // Red - needs attention
  };

  if (isLoading) {
    return (
      <div className="goals-loading">
        <div className="loading-spinner" />
        <p>Loading your growth insights...</p>
      </div>
    );
  }

  return (
    <div className="social-goals-tab">
      {/* Monthly Stats Overview */}
      {monthlyStats && (
        <div className="monthly-stats-section">
          <h3>This Month's Overview</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <MessageSquare size={20} className="stat-icon" />
              <div className="stat-value">{monthlyStats.totalConversations}</div>
              <div className="stat-label">Conversations</div>
            </div>
            <div className="stat-card">
              <Battery size={20} className="stat-icon" />
              <div className="stat-value">{monthlyStats.avgBatteryDrain}%</div>
              <div className="stat-label">Avg Drain</div>
            </div>
            <div className="stat-card">
              <Target size={20} className="stat-icon" />
              <div className="stat-value">{monthlyStats.dominantIntent}</div>
              <div className="stat-label">Top Intent</div>
            </div>
            <div className="stat-card">
              <Users size={20} className="stat-icon" />
              <div className="stat-value">{monthlyStats.meMessagePercent}%</div>
              <div className="stat-label">You Speak</div>
            </div>
          </div>
        </div>
      )}

      {/* Suggested Goal */}
      {suggestedGoal && goals.length === 0 && (
        <div className="suggested-goal-card">
          <div className="suggestion-header">
            <Sparkles size={24} className="sparkle-icon" />
            <h3>Recommended Goal</h3>
          </div>
          <div className="suggestion-content">
            <h4>{suggestedGoal.title}</h4>
            <p>{suggestedGoal.description}</p>
            <p className="suggestion-reason">{suggestedGoal.reason}</p>
          </div>
          <button className="btn-primary" onClick={handleAcceptSuggested}>
            <Target size={16} />
            Accept This Goal
          </button>
        </div>
      )}

      {/* Active Goals */}
      <div className="goals-section">
        <div className="section-header">
          <h3>Active Goals</h3>
          <button className="btn-icon" onClick={() => setShowCreateGoal(true)} title="Create Goal">
            <Plus size={18} />
          </button>
        </div>

        {goals.length === 0 ? (
          <div className="empty-goals">
            <Target size={48} className="empty-icon" />
            <p>No active goals yet</p>
            <p className="empty-hint">Accept the suggested goal above or create your own to start tracking progress</p>
          </div>
        ) : (
          <div className="goals-list">
            {goals.map(goal => {
              const Icon = GOAL_ICONS[goal.type] || Target;
              const progress = getProgressPercent(goal);
              const color = getProgressColor(goal, progress);

              return (
                <div key={goal.id} className="goal-card">
                  <div className="goal-header">
                    <div className="goal-title">
                      <Icon size={20} style={{ color }} />
                      <h4>{goal.title}</h4>
                    </div>
                    <div className="goal-actions">
                      {progress >= 100 && (
                        <button 
                          className="btn-icon-success" 
                          onClick={() => completeGoal(goal.id)}
                          title="Mark Complete"
                        >
                          <CheckCircle size={16} />
                        </button>
                      )}
                      <button 
                        className="btn-icon-secondary" 
                        onClick={() => archiveGoal(goal.id)}
                        title="Archive"
                      >
                        <Archive size={16} />
                      </button>
                      <button 
                        className="btn-icon-danger" 
                        onClick={() => deleteGoal(goal.id)}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <p className="goal-description">{goal.description}</p>
                  
                  <div className="goal-progress">
                    <div className="progress-info">
                      <span className="current-value">{goal.current}</span>
                      <span className="target-value">/ {goal.target}</span>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${progress}%`, backgroundColor: color }}
                      />
                    </div>
                    <div className="progress-percent">{progress}%</div>
                  </div>

                  {goal.dueDate && (
                    <div className="goal-due-date">
                      <Calendar size={12} />
                      <span>Due: {new Date(goal.dueDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Weekly Trends */}
      {weeklyTrends && weeklyTrends.length > 0 && (
        <div className="weekly-trends-section">
          <h3>Weekly Activity</h3>
          <div className="trends-grid">
            {weeklyTrends.map((day, index) => (
              <div key={index} className="trend-card">
                <div className="trend-day">{day.date}</div>
                <div className="trend-value">{day.conversations}</div>
                <div className="trend-label">conversations</div>
                {day.avgDrain > 0 && (
                  <div className="trend-drain">
                    <Battery size={12} />
                    <span>{day.avgDrain}% avg drain</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Goal Modal */}
      {showCreateGoal && (
        <div className="modal-overlay" onClick={() => setShowCreateGoal(false)}>
          <div className="create-goal-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Goal</h3>
              <button className="close-button" onClick={() => setShowCreateGoal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p className="modal-description">Choose a goal type to focus on:</p>
              
              <div className="goal-type-options">
                <button 
                  className={`goal-type-option ${selectedGoalType === 'frequency' ? 'selected' : ''}`}
                  onClick={() => setSelectedGoalType('frequency')}
                >
                  <Calendar size={24} />
                  <span>More Conversations</span>
                  <small>Complete X conversations this week</small>
                </button>

                <button 
                  className={`goal-type-option ${selectedGoalType === 'energy' ? 'selected' : ''}`}
                  onClick={() => setSelectedGoalType('energy')}
                >
                  <Battery size={24} />
                  <span>Better Energy</span>
                  <small>Keep average drain below X%</small>
                </button>

                <button 
                  className={`goal-type-option ${selectedGoalType === 'balance' ? 'selected' : ''}`}
                  onClick={() => setSelectedGoalType('balance')}
                >
                  <Users size={24} />
                  <span>Better Balance</span>
                  <small>Achieve X% speaking balance</small>
                </button>

                <button 
                  className={`goal-type-option ${selectedGoalType === 'intent' ? 'selected' : ''}`}
                  onClick={() => setSelectedGoalType('intent')}
                >
                  <Heart size={24} />
                  <span>More Positive</span>
                  <small>Have X positive interactions</small>
                </button>

                <button 
                  className={`goal-type-option ${selectedGoalType === 'conflict' ? 'selected' : ''}`}
                  onClick={() => setSelectedGoalType('conflict')}
                >
                  <Shield size={24} />
                  <span>Less Conflict</span>
                  <small>Reduce conflict to X%</small>
                </button>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowCreateGoal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleCreateGoal}>
                <Target size={16} />
                Create Goal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SocialGoalsTab;
