import React, { useState, useEffect } from 'react';
import { IntentDetectionConfig } from '../config/intentDetection';

const IntentDetectionSettings = ({ settings, onSave }) => {
  const [localSettings, setLocalSettings] = useState({
    confidenceThreshold: settings.intentDetection?.confidenceThreshold || 0.5,
    debounceWindowMs: settings.intentDetection?.debounceWindowMs || 800,
    stickyDurationMs: settings.intentDetection?.stickyDurationMs || 2000
  });
  
  const [errors, setErrors] = useState({});
  
  useEffect(() => {
    setLocalSettings({
      confidenceThreshold: settings.intentDetection?.confidenceThreshold || 0.5,
      debounceWindowMs: settings.intentDetection?.debounceWindowMs || 800,
      stickyDurationMs: settings.intentDetection?.stickyDurationMs || 2000
    });
  }, [settings]);

  const validate = () => {
    const newErrors = {};
    
    if (localSettings.confidenceThreshold < 0.1 || localSettings.confidenceThreshold > 0.9) {
      newErrors.confidenceThreshold = 'Must be between 0.1 and 0.9';
    }
    
    if (localSettings.debounceWindowMs < 200 || localSettings.debounceWindowMs > 2000) {
      newErrors.debounceWindowMs = 'Must be between 200ms and 2000ms';
    }
    
    if (localSettings.stickyDurationMs < 1000 || localSettings.stickyDurationMs > 5000) {
      newErrors.stickyDurationMs = 'Must be between 1000ms and 5000ms';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field, value) => {
    const numValue = parseFloat(value);
    setLocalSettings(prev => ({
      ...prev,
      [field]: numValue
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const handleSave = () => {
    if (validate()) {
      onSave(localSettings);
    }
  };

  const handleReset = async () => {
    await IntentDetectionConfig.resetToDefaults();
    setLocalSettings(IntentDetectionConfig.defaults);
    onSave(IntentDetectionConfig.defaults);
  };

  return (
    <div className="intent-detection-settings">
      <h3>Real-time Intent Detection</h3>
      <p className="setting-description">
        Customize how quickly and accurately the system detects your conversation intents in real-time.
      </p>
      
      <div className="setting-group">
        <div className="setting-item">
          <label htmlFor="confidenceThreshold">Confidence Threshold</label>
          <div className="input-with-unit">
            <input
              id="confidenceThreshold"
              type="range"
              min="0.1"
              max="0.9"
              step="0.05"
              value={localSettings.confidenceThreshold}
              onChange={(e) => handleChange('confidenceThreshold', e.target.value)}
            />
            <input
              type="number"
              min="0.1"
              max="0.9"
              step="0.05"
              value={localSettings.confidenceThreshold}
              onChange={(e) => handleChange('confidenceThreshold', e.target.value)}
              className={errors.confidenceThreshold ? 'error' : ''}
            />
            <span className="unit">threshold</span>
          </div>
          {errors.confidenceThreshold && (
            <span className="error-message">{errors.confidenceThreshold}</span>
          )}
          <p className="setting-help">
            Minimum confidence required to display a live intent badge. Lower values show more intents but may be less accurate.
          </p>
        </div>
        
        <div className="setting-item">
          <label htmlFor="debounceWindow">Debounce Window</label>
          <div className="input-with-unit">
            <input
              id="debounceWindow"
              type="range"
              min="200"
              max="2000"
              step="100"
              value={localSettings.debounceWindowMs}
              onChange={(e) => handleChange('debounceWindowMs', e.target.value)}
            />
            <input
              type="number"
              min="200"
              max="2000"
              value={localSettings.debounceWindowMs}
              onChange={(e) => handleChange('debounceWindowMs', e.target.value)}
              className={errors.debounceWindowMs ? 'error' : ''}
            />
            <span className="unit">ms</span>
          </div>
          {errors.debounceWindowMs && (
            <span className="error-message">{errors.debounceWindowMs}</span>
          )}
          <p className="setting-help">
            Time window to prevent rapid switching between different intent badges. Higher values provide stability.
          </p>
        </div>
        
        <div className="setting-item">
          <label htmlFor="stickyDuration">Sticky Duration</label>
          <div className="input-with-unit">
            <input
              id="stickyDuration"
              type="range"
              min="1000"
              max="5000"
              step="500"
              value={localSettings.stickyDurationMs}
              onChange={(e) => handleChange('stickyDurationMs', e.target.value)}
            />
            <input
              type="number"
              min="1000"
              max="5000"
              value={localSettings.stickyDurationMs}
              onChange={(e) => handleChange('stickyDurationMs', e.target.value)}
              className={errors.stickyDurationMs ? 'error' : ''}
            />
            <span className="unit">ms</span>
          </div>
          {errors.stickyDurationMs && (
            <span className="error-message">{errors.stickyDurationMs}</span>
          )}
          <p className="setting-help">
            How long to keep showing the same intent badge before allowing a change. Prevents flickering.
          </p>
        </div>
      </div>
      
      <div className="settings-actions">
        <button onClick={handleSave} className="btn btn-primary">
          Save Settings
        </button>
        <button onClick={handleReset} className="btn btn-secondary">
          Reset to Defaults
        </button>
      </div>
    </div>
  );
};

export default IntentDetectionSettings;