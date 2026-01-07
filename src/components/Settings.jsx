import React, { useState, useEffect } from 'react';
import { X, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { resetPersonalizationData } from '../utils/feedback';
import { secureLocalStorageGet, secureLocalStorageSet } from '../utils/encryption';
import { getSocialSuccessWeights, saveSocialSuccessWeights } from '../utils/feedbackAnalytics';

const Settings = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState({
    enablePersonalization: true,
    enableSpeakerDetection: true,
    enableSentimentAnalysis: true,
    privacyMode: false,
    isSubtleMode: false,
    showAnalytics: true
  });

  const [weights, setWeights] = useState({
    satisfaction: 50,
    sentiment: 30,
    engagement: 20
  });

  const [showWeightConfig, setShowWeightConfig] = useState(false);
  const [showDataUsageModal, setShowDataUsageModal] = useState(false);

  useEffect(() => {
    // Load settings from secure storage
    const loadSettings = async () => {
      const savedSettings = await secureLocalStorageGet('convocue_settings');
      if (savedSettings) {
        setSettings(savedSettings);
      }
      
      const savedWeights = await getSocialSuccessWeights();
      setWeights(savedWeights);
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

  const handleWeightChange = async (key, value) => {
    const val = parseInt(value);
    const otherKeys = Object.keys(weights).filter(k => k !== key);
    
    // Simple logic to distribute the remaining percentage among other weights
    const remaining = 100 - val;
    const currentOthersSum = weights[otherKeys[0]] + weights[otherKeys[1]];
    
    let newWeights;
    if (currentOthersSum === 0) {
      newWeights = {
        ...weights,
        [key]: val,
        [otherKeys[0]]: Math.floor(remaining / 2),
        [otherKeys[1]]: Math.ceil(remaining / 2)
      };
    } else {
      newWeights = {
        ...weights,
        [key]: val,
        [otherKeys[0]]: Math.round((weights[otherKeys[0]] / currentOthersSum) * remaining),
        [otherKeys[1]]: Math.round((weights[otherKeys[1]] / currentOthersSum) * remaining)
      };
    }
    
    // Ensure it sums exactly to 100
    const sum = newWeights.satisfaction + newWeights.sentiment + newWeights.engagement;
    if (sum !== 100) {
      newWeights[otherKeys[1]] += (100 - sum);
    }

    setWeights(newWeights);
    await saveSocialSuccessWeights(newWeights);
  };

  const handleResetPersonalization = async () => {
    if (window.confirm('Are you sure you want to reset all personalization data? This will clear your feedback history and learned preferences.')) {
      await resetPersonalizationData();
      
      const defaultSettings = {
        enablePersonalization: true,
        enableSpeakerDetection: true,
        enableSentimentAnalysis: true,
        privacyMode: false,
        isSubtleMode: false,
        showAnalytics: true
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
          <section className="settings-section">
            <h3 className="section-title">Personalization</h3>
            
            <div className="setting-item">
              <div className="setting-info">
                <h3>Improvement Suggestions</h3>
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
                <h3>Social Success Score</h3>
                <div className="flex items-center gap-2">
                  <p>Track your communication growth trends</p>
                  <button 
                    className="info-icon-btn" 
                    onClick={() => setShowDataUsageModal(true)}
                    title="What data does this use?"
                  >
                    <Info size={14} />
                  </button>
                </div>
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

            {settings.showAnalytics && (
              <div className="sub-setting-config">
                <button 
                  className="config-toggle-btn"
                  onClick={() => setShowWeightConfig(!showWeightConfig)}
                >
                  <span>Customize Scoring Weights</span>
                  {showWeightConfig ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                
                {showWeightConfig && (
                  <div className="weight-config-panel">
                    <div className="weight-slider-item">
                      <div className="weight-label">
                        <span>Satisfaction</span>
                        <span>{weights.satisfaction}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" max="100" 
                        value={weights.satisfaction} 
                        onChange={(e) => handleWeightChange('satisfaction', e.target.value)}
                      />
                    </div>
                    <div className="weight-slider-item">
                      <div className="weight-label">
                        <span>Sentiment</span>
                        <span>{weights.sentiment}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" max="100" 
                        value={weights.sentiment} 
                        onChange={(e) => handleWeightChange('sentiment', e.target.value)}
                      />
                    </div>
                    <div className="weight-slider-item">
                      <div className="weight-label">
                        <span>Engagement</span>
                        <span>{weights.engagement}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" max="100" 
                        value={weights.engagement} 
                        onChange={(e) => handleWeightChange('engagement', e.target.value)}
                      />
                    </div>
                    <p className="setting-help-text">Adjust how much each factor contributes to your overall score.</p>
                  </div>
                )}
              </div>
            )}

            <div className="setting-item">
              <div className="setting-info">
                <h3>Speaker Detection</h3>
                <p>Detect and distinguish between different speakers</p>
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
                <p>Analyze emotional tone for empathetic responses</p>
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
          </section>

          <section className="settings-section">
            <h3 className="section-title">Privacy & Modes</h3>
            
            <div className="setting-item">
              <div className="setting-info">
                <h3>Subtle Mode</h3>
                <p>Provide micro-cues for minimal distraction</p>
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
          </section>

          <section className="settings-section">
            <h3 className="section-title">Data Management</h3>
            <div className="data-management-actions">
              <button 
                className="btn btn-outline btn-sm"
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
              
              <button 
                className="btn btn-outline btn-sm"
                onClick={handleResetPersonalization}
              >
                Reset All Personalization
              </button>
            </div>
          </section>
        </div>
      </div>

      {showDataUsageModal && (
        <div className="settings-sub-modal-overlay" onClick={() => setShowDataUsageModal(false)}>
          <div className="settings-sub-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-header">
              <h3>Social Success Score Data</h3>
              <button className="close-btn" onClick={() => setShowDataUsageModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="sub-modal-content">
              <p>To calculate your growth trends, the Social Success Score (SSS) uses:</p>
              <ul>
                <li><strong>Feedback History:</strong> Your "likes" and "dislikes" on suggestions.</li>
                <li><strong>Conversation Sentiment:</strong> The general tone of your interactions (stored as anonymous metadata).</li>
                <li><strong>Engagement:</strong> How often you use and interact with the app.</li>
              </ul>
              <p>All data is <strong>encrypted</strong> and stored <strong>only on your device</strong>. Disabling SSS stops further collection, and "Clear Analytics History" deletes all stored score data.</p>
            </div>
            <div className="sub-modal-footer">
              <button className="btn btn-primary btn-block" onClick={() => setShowDataUsageModal(false)}>Got it</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;

export default Settings;