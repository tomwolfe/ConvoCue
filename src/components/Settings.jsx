import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { resetPersonalizationData } from '../utils/feedback';
import { secureLocalStorageGet, secureLocalStorageSet } from '../utils/encryption';

const Settings = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState({
    enablePersonalization: true,
    enableSpeakerDetection: true,
    enableSentimentAnalysis: true,
    privacyMode: false,
    isSubtleMode: false,
    showAnalytics: true
  });

  useEffect(() => {
    // Load settings from secure storage
    const loadSettings = async () => {
      const savedSettings = await secureLocalStorageGet('convocue_settings');
      if (savedSettings) {
        setSettings(savedSettings);
      }
    };
    loadSettings();
  }, []);

  const handleSettingChange = async (key, value) => {
    const newSettings = {
      ...settings,
      [key]: value
    };
    setSettings(newSettings);
    
    // Save to secure storage
    await secureLocalStorageSet('convocue_settings', newSettings);

    // Dispatch event to notify listeners
    window.dispatchEvent(new CustomEvent('convocue_settings_changed', { detail: newSettings }));
  };

  const handleResetPersonalization = async () => {
    if (window.confirm('Are you sure you want to reset all personalization data? This will clear your feedback history and learned preferences.')) {
      await resetPersonalizationData();
      
      const defaultSettings = {
        enablePersonalization: true,
        enableSpeakerDetection: true,
        enableSentimentAnalysis: true,
        privacyMode: false
      };
      
      setSettings(defaultSettings);
      
      // Notify other components
      window.dispatchEvent(new CustomEvent('convocue_settings_changed', { detail: defaultSettings }));
      
      alert('Personalization data has been reset.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close Settings">
            <X size={20} />
          </button>
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
              <h3>Subtle Mode</h3>
              <p>Provide extremely concise "Quick Cues" for minimal distraction</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.isSubtleMode}
                onChange={(e) => handleSettingChange('isSubtleMode', e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <h3>Communication Analytics</h3>
              <p>Show your Social Success Score and communication trends</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.showAnalytics}
                onChange={(e) => handleSettingChange('showAnalytics', e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>
          
          <div className="setting-item">
            <div className="setting-info">
              <h3>Privacy Mode</h3>
              <p>Minimal data collection, focus on absolute privacy</p>
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

          <div className="danger-zone">
            <h4>Data Management</h4>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={async () => {
                if (window.confirm('Clear all communication analytics and feedback history? This cannot be undone.')) {
                  const { clearFeedbackData } = await import('../utils/feedback');
                  await clearFeedbackData();
                  alert('Analytics data cleared.');
                }
              }}
            >
              Clear Analytics History
            </button>
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