import React, { useState } from 'react';
import { BarChart3, Target } from 'lucide-react';
import EnhancedInsightsDashboard from './EnhancedInsightsDashboard';
import SocialGoalsTab from './SocialGoalsTab';
import { useGrowthEngine } from '../hooks/useGrowthEngine';

const InsightsModal = ({ sessions, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('insights'); // 'insights' | 'goals'
  const growthEngine = useGrowthEngine();

  if (!isOpen) return null;

  return (
    <div className="insights-overlay" onClick={onClose}>
      <div className="insights-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-left">
            <h2>Social Insights</h2>
          </div>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        {/* Tab Navigation */}
        <div className="insights-tabs">
          <button 
            className={`tab-button ${activeTab === 'insights' ? 'active' : ''}`}
            onClick={() => setActiveTab('insights')}
          >
            <BarChart3 size={18} />
            <span>Dashboard</span>
          </button>
          <button 
            className={`tab-button ${activeTab === 'goals' ? 'active' : ''}`}
            onClick={() => setActiveTab('goals')}
          >
            <Target size={18} />
            <span>Social Goals</span>
          </button>
        </div>

        <div className="modal-content">
          {activeTab === 'insights' && (
            <EnhancedInsightsDashboard sessions={sessions} onClose={onClose} />
          )}
          {activeTab === 'goals' && (
            <SocialGoalsTab growthEngine={growthEngine} />
          )}
        </div>
      </div>
    </div>
  );
};

export default InsightsModal;
