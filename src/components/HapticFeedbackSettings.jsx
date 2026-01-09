import React, { useState, useEffect } from 'react';
import { VIBRATION_PATTERNS, getHapticFeedbackAnalytics, clearHapticFeedbackAnalytics } from '../utils/haptics';

const HapticFeedbackSettings = ({ settings, onSave }) => {
  const [localSettings, setLocalSettings] = useState({
    enabled: settings.haptics?.enabled ?? true,
    intensity: settings.haptics?.intensity || 'medium',
    patterns: settings.haptics?.patterns || { ...VIBRATION_PATTERNS }
  });

  const [analytics, setAnalytics] = useState(null);
  const [showTestPattern, setShowTestPattern] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState('SUGGESTION');

  useEffect(() => {
    setLocalSettings({
      enabled: settings.haptics?.enabled ?? true,
      intensity: settings.haptics?.intensity || 'medium',
      patterns: settings.haptics?.patterns || { ...VIBRATION_PATTERNS }
    });
  }, [settings]);

  useEffect(() => {
    const feedbackAnalytics = getHapticFeedbackAnalytics();
    setAnalytics(feedbackAnalytics);
  }, []);

  const handleChange = (field, value) => {
    setLocalSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePatternChange = (patternName, newValue) => {
    setLocalSettings(prev => ({
      ...prev,
      patterns: {
        ...prev.patterns,
        [patternName]: newValue
      }
    }));
  };

  const handleSave = () => {
    onSave(localSettings);
  };

  const handleTestPattern = () => {
    if (navigator.vibrate) {
      navigator.vibrate(VIBRATION_PATTERNS[selectedPattern]);
    } else {
      // Fallback to visual feedback
      const { provideVisualFeedback } = require('../utils/haptics');
      provideVisualFeedback(selectedPattern);
    }
  };

  const handleClearAnalytics = () => {
    clearHapticFeedbackAnalytics();
    setAnalytics([]);
  };

  return (
    <div className="haptic-settings">
      <h3>Haptic & Visual Feedback</h3>
      <p className="setting-description">
        Customize vibration patterns and visual feedback for different conversation cues.
      </p>

      <div className="setting-group">
        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={localSettings.enabled}
              onChange={(e) => handleChange('enabled', e.target.checked)}
            />
            Enable Haptic Feedback
          </label>
          <p className="setting-help">
            Vibrations will alert you to different types of conversation cues when available.
          </p>
        </div>

        <div className="setting-item">
          <label htmlFor="intensity">Vibration Intensity</label>
          <select
            id="intensity"
            value={localSettings.intensity}
            onChange={(e) => handleChange('intensity', e.target.value)}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <p className="setting-help">
            Adjust the strength of vibrations (implementation varies by device).
          </p>
        </div>

        <div className="setting-item">
          <label>Test Vibration Patterns</label>
          <div className="haptic-test-controls">
            <select
              value={selectedPattern}
              onChange={(e) => setSelectedPattern(e.target.value)}
            >
              {Object.keys(VIBRATION_PATTERNS).map(pattern => (
                <option key={pattern} value={pattern}>
                  {pattern.charAt(0) + pattern.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
            <button onClick={handleTestPattern} className="btn btn-secondary">
              Test Pattern
            </button>
          </div>
          <p className="setting-help">
            Select a pattern and click "Test Pattern" to experience the vibration.
          </p>
        </div>

        <div className="setting-item">
          <details>
            <summary>Advanced Pattern Configuration</summary>
            <div className="advanced-haptic-config">
              <p>Customize vibration patterns (milliseconds):</p>
              {Object.entries(localSettings.patterns).map(([name, pattern]) => (
                <div key={name} className="pattern-config-row">
                  <label>{name}:</label>
                  <input
                    type="text"
                    value={Array.isArray(pattern) ? pattern.join(', ') : pattern}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Parse comma-separated numbers
                      const parsed = value.split(',')
                        .map(str => parseInt(str.trim()))
                        .filter(num => !isNaN(num));
                      handlePatternChange(name, parsed);
                    }}
                    placeholder="Enter comma-separated ms values"
                  />
                  <small>Current: [{pattern.join(', ')}]</small>
                </div>
              ))}
            </div>
          </details>
        </div>

        {analytics && (
          <div className="setting-item">
            <details>
              <summary>Haptic Feedback Analytics</summary>
              <div className="analytics-section">
                <p>Total Feedback Events: {analytics.length}</p>
                <button onClick={handleClearAnalytics} className="btn btn-danger">
                  Clear Analytics
                </button>
                {analytics.length > 0 && (
                  <div className="recent-analytics">
                    <h4>Recent Feedback Events:</h4>
                    <ul className="haptic-patterns-list">
                      {analytics.slice(-5).reverse().map((entry, index) => (
                        <li key={index}>
                          <strong>{entry.intentType}</strong> ({entry.status}) - {new Date(entry.timestamp).toLocaleTimeString()}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </details>
          </div>
        )}
      </div>

      <div className="settings-actions">
        <button onClick={handleSave} className="btn btn-primary">
          Save Settings
        </button>
      </div>
    </div>
  );
};

export default HapticFeedbackSettings;