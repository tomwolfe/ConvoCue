/**
 * Conversation Summary Component
 * Displays a summary of the conversation history with key themes, action items, and sentiment
 */

import React, { useState, useEffect } from 'react';
import { FileText, Calendar, TrendingUp, CheckCircle, AlertCircle, Clock, Download, Copy } from 'lucide-react';
import { generateConversationSummary, generateSummaryCard } from '../utils/conversationSummarizer';
import { useConversation } from '../hooks/useConversation';

const ConversationSummary = ({ conversationTurns, isVisible, onClose, workerRef }) => {
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('summary'); // 'summary', 'themes', 'action-items'

  // Generate summary when component mounts or conversation changes
  useEffect(() => {
    if (isVisible && conversationTurns && conversationTurns.length > 0) {
      generateSummary();
    }
  }, [isVisible, conversationTurns]);

  const generateSummary = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const summaryData = await generateConversationSummary(conversationTurns, {
        maxTurns: 20,
        includeThemes: true,
        includeActionItems: true,
        includeSentiment: true,
        summaryLength: 'medium'
      }, workerRef);

      setSummary(summaryData);
    } catch (err) {
      setError(err.message);
      console.error("Error generating summary:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = () => {
    generateSummary();
  };

  const handleCopy = async () => {
    if (summary) {
      try {
        await navigator.clipboard.writeText(summary.summary);
        // Could add a toast notification here
      } catch (err) {
        console.error("Failed to copy summary:", err);
      }
    }
  };

  const handleDownload = () => {
    if (summary) {
      const blob = new Blob([summary.summary], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversation-summary-${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="conversation-summary-overlay" onClick={onClose}>
      <div className="conversation-summary-modal" onClick={e => e.stopPropagation()}>
        <div className="summary-header">
          <div className="summary-title-section">
            <FileText size={24} className="summary-icon" />
            <h2>Conversation Summary</h2>
          </div>
          <button className="summary-close-btn" onClick={onClose} aria-label="Close summary">
            ×
          </button>
        </div>

        {isLoading && (
          <div className="summary-loading">
            <Clock className="animate-spin" size={24} />
            <p>Analyzing conversation...</p>
          </div>
        )}

        {error && (
          <div className="summary-error">
            <AlertCircle size={20} />
            <p>Error: {error}</p>
            <button onClick={generateSummary} className="btn-retry">
              Try Again
            </button>
          </div>
        )}

        {summary && !isLoading && !error && (
          <div className="summary-content">
            {/* Summary Stats Bar */}
            <div className="summary-stats">
              <div className="stat-item">
                <TrendingUp size={16} />
                <span>{summary.stats.sentiment.charAt(0).toUpperCase() + summary.stats.sentiment.slice(1)}</span>
              </div>
              <div className="stat-item">
                <Calendar size={16} />
                <span>{summary.stats.themesCount} Themes</span>
              </div>
              <div className="stat-item">
                <CheckCircle size={16} />
                <span>{summary.stats.actionItemsCount} Actions</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="summary-tabs">
              <button 
                className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
                onClick={() => setActiveTab('summary')}
              >
                Summary
              </button>
              <button 
                className={`tab-btn ${activeTab === 'themes' ? 'active' : ''}`}
                onClick={() => setActiveTab('themes')}
              >
                Themes
              </button>
              <button 
                className={`tab-btn ${activeTab === 'action-items' ? 'active' : ''}`}
                onClick={() => setActiveTab('action-items')}
              >
                Action Items
              </button>
            </div>

            {/* Tab Content */}
            <div className="summary-tab-content">
              {activeTab === 'summary' && (
                <div className="summary-tab-pane">
                  <p className="summary-text">{summary.summary}</p>
                </div>
              )}

              {activeTab === 'themes' && (
                <div className="summary-tab-pane">
                  {summary.themes.length > 0 ? (
                    <ul className="themes-list">
                      {summary.themes.map((theme, index) => (
                        <li key={index} className="theme-item">
                          <div className="theme-bullet">•</div>
                          <span>{theme}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="no-data">No specific themes identified in this conversation.</p>
                  )}
                </div>
              )}

              {activeTab === 'action-items' && (
                <div className="summary-tab-pane">
                  {summary.actionItems.length > 0 ? (
                    <ul className="action-items-list">
                      {summary.actionItems.map((item, index) => (
                        <li key={index} className="action-item">
                          <CheckCircle size={16} />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="no-data">No action items identified in this conversation.</p>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="summary-actions">
              <button 
                className="btn-secondary" 
                onClick={handleRegenerate}
                title="Regenerate summary"
              >
                Regenerate
              </button>
              <button 
                className="btn-secondary" 
                onClick={handleCopy}
                title="Copy summary to clipboard"
              >
                <Copy size={16} />
                Copy
              </button>
              <button 
                className="btn-primary" 
                onClick={handleDownload}
                title="Download summary as text file"
              >
                <Download size={16} />
                Download
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationSummary;