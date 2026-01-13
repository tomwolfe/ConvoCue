import React from 'react';
import InsightsDashboard from './InsightsDashboard';

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
          <InsightsDashboard sessions={sessions} />
        </div>
      </div>
    </div>
  );
};

export default InsightsModal;