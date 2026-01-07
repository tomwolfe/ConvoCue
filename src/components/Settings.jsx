import React, { useState, useEffect } from 'react';
import { resetPersonalizationData } from '../utils/feedback';

const Settings = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState({
    enablePersonalization: true,
    enableSpeakerDetection: true,
    enableSentimentAnalysis: true,
    privacyMode: false
  });

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('convocue_settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const handleSettingChange = (key, value) => {
    const newSettings = {
      ...settings,
      [key]: value
    };
    setSettings(newSettings);
    
    // Save to localStorage
    localStorage.setItem('convocue_settings', JSON.stringify(newSettings));
  };

  const handleResetPersonalization = async () => {
    if (window.confirm('Are you sure you want to reset all personalization data? This will clear your feedback history and learned preferences.')) {
      await resetPersonalizationData();
      alert('Personalization data has been reset.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="settings-content">
          <div className="setting-item">
            <div className="setting-info">
              <h3>Personalization</h3>
              <p>Allow the app to learn from your feedback to improve suggestions</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.enablePersonalization}
                onChange={(e) => handleSettingChange('enablePersonalization', e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>
          
          <div className="setting-item">
            <div className="setting-info">
              <h3>Speaker Detection</h3>
              <p>Detect and distinguish between different speakers in conversations</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.enableSpeakerDetection}
                onChange={(e) => handleSettingChange('enableSpeakerDetection', e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>
          
          <div className="setting-item">
            <div className="setting-info">
              <h3>Sentiment Analysis</h3>
              <p>Analyze emotional tone to provide more empathetic responses</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.enableSentimentAnalysis}
                onChange={(e) => handleSettingChange('enableSentimentAnalysis', e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>
          
          <div className="setting-item">
            <div className="setting-info">
              <h3>Privacy Mode</h3>
              <p>Limit data collection and processing for maximum privacy</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.privacyMode}
                onChange={(e) => handleSettingChange('privacyMode', e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>
          
          <div className="setting-item reset-section">
            <div className="setting-info">
              <h3>Reset Personalization</h3>
              <p>Clear all learned preferences and start fresh</p>
            </div>
            <button className="reset-btn" onClick={handleResetPersonalization}>
              Reset Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;