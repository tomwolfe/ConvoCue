import React from 'react';
import EnhancedInsightsDashboard from './EnhancedInsightsDashboard';

const InsightsModal = ({ sessions, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="insights-overlay" onClick={onClose}>
      <div className="insights-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Conversation Insights</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <div className="modal-content">
          <EnhancedInsightsDashboard sessions={sessions} onClose={onClose} />
        </div>
      </div>
    </div>
  );
};

export default InsightsModal;