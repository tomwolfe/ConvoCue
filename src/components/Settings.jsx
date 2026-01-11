import React, { useState, useEffect } from 'react';
import { X, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { resetPersonalizationData, resetCoachingFeedback } from '../utils/feedback';
import { secureLocalStorageGet, secureLocalStorageSet } from '../utils/encryption';
import { getSocialSuccessWeights, saveSocialSuccessWeights } from '../utils/feedbackAnalytics';
import { eventBus, EVENTS } from '../utils/eventBus';
import { getSystemLogs, clearSystemLogs } from '../utils/diagnostics';
import { calculateEngagementMetrics } from '../utils/engagementTracking';
import performanceMonitor from '../utils/performance';
import IntentDetectionSettings from './IntentDetectionSettings';
import IntentFilterSettings from './IntentFilterSettings';
import HapticFeedbackSettings from './HapticFeedbackSettings';
import { ALL_INTENTS } from '../constants/intents';

const Settings = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState({
    enablePersonalization: true,
    enableSpeakerDetection: true,
    enableSentimentAnalysis: true,
    enableAutoPersona: true,
    autoPersonaSensitivity: 'medium',
    showCoachingInsights: true,
    showSocialNudge: true,
    isGroupMode: false,
    showSubtleCoaching: false,
    privacyMode: false,
    isSubtleMode: false,
    showAnalytics: true,
    mirroringSensitivity: 'medium',
    intentDetection: {
      confidenceThreshold: 0.5,
      debounceWindowMs: 800,
      stickyDurationMs: 2000
    },
    enabledIntents: ALL_INTENTS
  });

  const [weights, setWeights] = useState({
    satisfaction: 50,
    sentiment: 30,
    engagement: 20
  });

  const [showWeightConfig, setShowWeightConfig] = useState(false);
  const [showDataUsageModal, setShowDataUsageModal] = useState(false);
  const [transparencyData, setTransparencyData] = useState(null);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    sl: 0,
    abandonment: 0,
    totalCues: 0
  });

  const [activeTab, setActiveTab] = useState('personalization');
  const [showCalibrationModal, setShowCalibrationModal] = useState(false);

  useEffect(() => {
    // Load settings from secure storage
    const loadSettings = async () => {
      try {
        const savedSettings = await secureLocalStorageGet('convocue_settings', {});
        setSettings(prev => ({ ...prev, ...savedSettings }));

        // Load weights
        const savedWeights = await getSocialSuccessWeights();
        setWeights(savedWeights);

        // Load transparency data
        const feedback = await secureLocalStorageGet('convocue_feedback', []);
        const scores = await secureLocalStorageGet('convocue_historical_scores', []);
        setTransparencyData({
          likes: feedback.filter(f => f.feedbackType === 'like').length,
          dislikes: feedback.filter(f => f.feedbackType === 'dislike').length,
          totalScores: scores.length,
          lastScore: scores.length > 0 ? scores[scores.length - 1].score : 'N/A'
        });

        // Load performance metrics
        const engagement = await calculateEngagementMetrics();
        const avgSL = performanceMonitor.getAverageTime('suggestionLatency');
        setPerformanceMetrics({
          sl: avgSL,
          abandonment: engagement.abandonmentRate * 100,
          totalCues: engagement.totalCues
        });
      } catch (error) {
        console.error('Error loading settings:', error);
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
    eventBus.emit(EVENTS.SETTINGS_CHANGED, newSettings);
  };

  const handleWeightChange = async (key, value) => {
    const val = parseInt(value);
    const otherKeys = Object.keys(weights).filter(k => k !== key);

    // Calculate the remaining percentage after changing one weight
    const remaining = 100 - val;

    // Calculate the sum of all other weights
    const currentOthersSum = otherKeys.reduce((sum, k) => sum + weights[k], 0);

    let newWeights = { ...weights, [key]: val };

    if (currentOthersSum === 0) {
      // If all other weights are 0, distribute equally
      otherKeys.forEach((k, i) => {
        if (i === otherKeys.length - 1) {
          // Adjust the last weight to ensure sum is exactly 100
          newWeights[k] = remaining - otherKeys.slice(0, i).reduce((sum, key) => sum + newWeights[key], 0);
        } else {
          newWeights[k] = Math.floor(remaining / otherKeys.length);
        }
      });
    } else {
      // Distribute remaining percentage proportionally among other weights
      otherKeys.forEach(k => {
        if (k === otherKeys[otherKeys.length - 1]) {
          // For the last key, calculate to ensure sum is exactly 100
          const othersSum = otherKeys.slice(0, -1).reduce((sum, key) => sum + newWeights[key], 0);
          newWeights[k] = remaining - othersSum;
        } else {
          newWeights[k] = Math.round((weights[k] / currentOthersSum) * remaining);
        }
      });
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
        enableAutoPersona: true,
        autoPersonaSensitivity: 'medium',
        showCoachingInsights: true,
        showSubtleCoaching: false,
        privacyMode: false,
        isSubtleMode: false,
        showAnalytics: true
      };

      setSettings(defaultSettings);

      // Notify other components
      eventBus.emit(EVENTS.SETTINGS_CHANGED, defaultSettings);

      alert('Personalization data has been reset.');
    }
  };

  const handleResetCoaching = async () => {
    if (window.confirm('Reset coaching feedback? This will clear your insight preferences and reset your progress on coaching tips.')) {
      await resetCoachingFeedback();
      alert('Coaching feedback has been reset.');
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
          {/* Navigation Tabs for Settings */}
          <div className="settings-tabs" role="tablist" aria-label="Settings categories">
            <button
              className={`tab-button ${activeTab === 'personalization' ? 'active' : ''}`}
              role="tab"
              aria-selected={activeTab === 'personalization'}
              onClick={() => setActiveTab('personalization')}
              id="personalization-tab-button"
            >
              Personalization
            </button>
            <button
              className={`tab-button ${activeTab === 'privacy' ? 'active' : ''}`}
              role="tab"
              aria-selected={activeTab === 'privacy'}
              onClick={() => setActiveTab('privacy')}
              id="privacy-tab-button"
            >
              Privacy & Modes
            </button>
            <button
              className={`tab-button ${activeTab === 'advanced' ? 'active' : ''}`}
              role="tab"
              aria-selected={activeTab === 'advanced'}
              onClick={() => setActiveTab('advanced')}
              id="advanced-tab-button"
            >
              Advanced
            </button>
          </div>

          {/* Personalization Tab Content */}
          {activeTab === 'personalization' && (
            <section className="settings-section" id="personalization-tab" role="tabpanel" aria-labelledby="personalization-tab-button">
              <h3 className="section-title">Personalization</h3>

              <div className="setting-item">
                <div className="setting-info">
                  <h3>Auto-Persona Selection</h3>
                  <p>Automatically switch personas based on conversation context</p>
                  <p className="setting-help-text">Uses 100% local pattern analysis. No conversational data ever leaves your device for context detection.</p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.enableAutoPersona}
                    onChange={(e) => handleSettingChange('enableAutoPersona', e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              {settings.enableAutoPersona && (
                <div className="setting-item sub-setting">
                  <div className="setting-info">
                    <h3>Switch Sensitivity</h3>
                    <p>How quickly the app adapts to context changes</p>
                  </div>
                  <select
                    className="setting-select"
                    value={settings.autoPersonaSensitivity}
                    onChange={(e) => handleSettingChange('autoPersonaSensitivity', e.target.value)}
                  >
                    <option value="low">Low (Stable)</option>
                    <option value="medium">Medium (Balanced)</option>
                    <option value="high">High (Reactive)</option>
                  </select>
                </div>
              )}

              <div className="setting-item">
                <div className="setting-info">
                  <h3>Mirroring Sensitivity</h3>
                  <p>How the AI matches your pace and volume</p>
                </div>
                <select
                  className="setting-select"
                  value={settings.mirroringSensitivity || 'medium'}
                  onChange={(e) => handleSettingChange('mirroringSensitivity', e.target.value)}
                >
                  <option value="low">Low (Stable)</option>
                  <option value="medium">Medium (Balanced)</option>
                  <option value="high">High (Reactive)</option>
                </select>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <h3>Improvement Suggestions</h3>
                  <p>Allow the app to learn from your feedback to improve suggestions</p>
                  <small className="text-muted" style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.7rem' }}>
                    Your feedback helps tailor future responses to your specific communication style.
                  </small>
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
                  <h3>Coaching Insights</h3>
                  <p>Show real-time behavioral insights and coaching tips</p>
                  <small className="text-muted" style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.7rem' }}>
                    Your "Likes/Dislikes" are stored locally to personalize future insights.
                  </small>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.showCoachingInsights}
                    onChange={(e) => handleSettingChange('showCoachingInsights', e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <h3>Social Nudge HUD</h3>
                  <p>Real-time visual and haptic cues for conversation flow</p>
                  <small className="text-muted" style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.7rem' }}>
                    Includes haptic alerts on supported devices.
                  </small>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.showSocialNudge}
                    onChange={(e) => handleSettingChange('showSocialNudge', e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <h3>Group Mode</h3>
                  <p>Calibrate engagement metrics for 3+ participants</p>
                  <small className="text-muted" style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.7rem' }}>
                    Adjusts "dominating" thresholds for more participants.
                  </small>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.isGroupMode}
                    onChange={(e) => handleSettingChange('isGroupMode', e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              {settings.showCoachingInsights && (
                <div className="setting-item sub-setting">
                  <div className="setting-info">
                    <h3>Subtle Insights</h3>
                    <p>Hide advanced controls (feedback, logic) for a cleaner experience</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.showSubtleCoaching}
                      onChange={(e) => handleSettingChange('showSubtleCoaching', e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              )}

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
                      <button
                        className="btn btn-outline btn-sm btn-block mt-2"
                        onClick={() => {
                          const feedback = window.confirm("Score Calibration: If your score feels too high or low, we can adjust weights. Do you want to set weights based on your recent conversation success?");
                          if (feedback) {
                            setShowCalibrationModal(true);
                          }
                        }}
                      >
                        Calibrate My Score
                      </button>
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
          )}

          {/* Privacy & Modes Tab Content */}
          {activeTab === 'privacy' && (
            <section className="settings-section" id="privacy-tab" role="tabpanel" aria-labelledby="privacy-tab-button">
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
                  <p className="setting-help-text">Disables advanced AI features like Auto-Persona and Sentiment analysis.</p>
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

              {transparencyData && (
                <section className="settings-section">
                  <h3 className="section-title">SSS Transparency Report</h3>
                  <div className="transparency-grid">
                    <div className="transparency-item">
                      <span className="label">Likes</span>
                      <span className="value">{transparencyData.likes}</span>
                    </div>
                    <div className="transparency-item">
                      <span className="label">Dislikes</span>
                      <span className="value">{transparencyData.dislikes}</span>
                    </div>
                    <div className="transparency-item">
                      <span className="label">Hist. Data</span>
                      <span className="value">{transparencyData.totalScores} pts</span>
                    </div>
                    <div className="transparency-item">
                      <span className="label">Latest</span>
                      <span className="value">{transparencyData.lastScore}</span>
                    </div>
                  </div>
                </section>
              )}
            </section>
          )}

          {/* Advanced Tab Content */}
          {activeTab === 'advanced' && (
            <section className="settings-section" id="advanced-tab" role="tabpanel" aria-labelledby="advanced-tab-button">
              <h3 className="section-title">Advanced Settings</h3>

              <section className="settings-section">
                <h3 className="section-title">Real-time Intent Detection</h3>
                <IntentDetectionSettings
                  settings={settings}
                  onSave={async (newIntentSettings) => {
                    const newSettings = {
                      ...settings,
                      intentDetection: newIntentSettings
                    };
                    setSettings(newSettings);
                    await secureLocalStorageSet('convocue_settings', newSettings);
                    eventBus.emit(EVENTS.SETTINGS_CHANGED, newSettings);
                  }}
                />
              </section>

              <section className="settings-section">
                <h3 className="section-title">Live Intent Visibility</h3>
                <IntentFilterSettings
                  settings={settings}
                  onSave={async (newFilterSettings) => {
                    const newSettings = {
                      ...settings,
                      ...newFilterSettings
                    };
                    setSettings(newSettings);
                    await secureLocalStorageSet('convocue_settings', newSettings);
                    eventBus.emit(EVENTS.SETTINGS_CHANGED, newSettings);
                  }}
                />
              </section>

              <section className="settings-section">
                <HapticFeedbackSettings
                  settings={settings}
                  onSave={async (newHapticSettings) => {
                    const newSettings = {
                      ...settings,
                      haptics: newHapticSettings
                    };
                    setSettings(newSettings);
                    await secureLocalStorageSet('convocue_settings', newSettings);
                    eventBus.emit(EVENTS.SETTINGS_CHANGED, newSettings);
                  }}
                />
              </section>

              <section className="settings-section">
                <h3 className="section-title">Performance & Engagement</h3>
                <div className="transparency-grid">
                  <div className="transparency-item" title="Suggestion Latency: Time from speech end to AI response">
                    <span className="label">Avg Latency</span>
                    <span className={`value ${performanceMetrics.sl > 1500 ? 'warning' : 'success'}`}>
                      {performanceMetrics.sl > 0 ? `${(performanceMetrics.sl / 1000).toFixed(2)}s` : 'N/A'}
                    </span>
                  </div>
                  <div className="transparency-item" title="Abandonment Rate: % of suggestions that received no feedback">
                    <span className="label">Abandonment</span>
                    <span className={`value ${performanceMetrics.abandonment > 40 ? 'warning' : 'success'}`}>
                      {performanceMetrics.abandonment.toFixed(0)}%
                    </span>
                  </div>
                  <div className="transparency-item">
                    <span className="label">Total Cues</span>
                    <span className="value">{performanceMetrics.totalCues}</span>
                  </div>
                  <div className="transparency-item">
                    <span className="label">Status</span>
                    <span className="value success">Healthy</span>
                  </div>
                </div>
                <p className="setting-help-text mt-2">Target: Latency &lt; 1.2s, Abandonment &lt; 20%</p>
              </section>

              <section className="settings-section">
                <h3 className="section-title">Data Management</h3>
                <div className="data-management-actions">
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={async () => {
                      try {
                        const keys = [
                          'convocue_feedback',
                          'convocue_subtle_feedback',
                          'convocue_preferences',
                          'convocue_custom_personas',
                          'convocue_historical_scores',
                          'convocue_settings',
                          'selectedCulturalContext'
                        ];

                        const exportData = {};
                        for (const key of keys) {
                          const data = await secureLocalStorageGet(key);
                          if (data) exportData[key] = data;
                        }

                        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `convocue_data_export_${new Date().toISOString().split('T')[0]}.json`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      } catch (e) {
                        console.error('Export failed:', e);
                        alert('Export failed. Please try again.');
                      }
                    }}
                  >
                    Export My Data (JSON)
                  </button>

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
                    onClick={handleResetCoaching}
                  >
                    Reset Coaching Feedback
                  </button>

                  <button
                    className="btn btn-outline btn-sm"
                    onClick={handleResetPersonalization}
                  >
                    Reset All Personalization
                  </button>
                </div>
              </section>

              <section className="settings-section">
                <h3 className="section-title">System Diagnostics</h3>
                <div className="diagnostics-panel">
                  <div className="diagnostics-controls">
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => {
                        const logs = getSystemLogs();
                        if (logs.length === 0) {
                          alert('No logs available yet.');
                          return;
                        }
                        console.table(logs);
                        alert('Detailed logs have been printed to the browser console for inspection.');
                      }}
                    >
                      View Console Logs
                    </button>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => {
                        clearSystemLogs();
                        alert('Logs cleared.');
                      }}
                    >
                      Clear Logs
                    </button>
                  </div>

                  <div className="recent-logs">
                    <p className="setting-help-text mb-2">Recent Persona Switches & AI Logic:</p>
                    {getSystemLogs().length === 0 ? (
                      <div className="log-entry empty">No recent orchestration events</div>
                    ) : (
                      getSystemLogs().slice(0, 5).map((log, i) => (
                        <div key={i} className="log-entry">
                          <span className="log-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
                          <span className="log-msg">{log.message}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>
            </section>
          )}
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

      {showCalibrationModal && (
        <div className="settings-sub-modal-overlay" onClick={() => setShowCalibrationModal(false)}>
          <div className="settings-sub-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-header">
              <h3>Score Calibration</h3>
              <button className="close-btn" onClick={() => setShowCalibrationModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="sub-modal-content">
              <p>Which factor matters most to you in your communication success?</p>
              <div className="calibration-options">
                <button
                  className="btn btn-outline btn-block"
                  onClick={() => {
                    handleWeightChange('satisfaction', 70);
                    setShowCalibrationModal(false);
                  }}
                >
                  Satisfaction Focus
                </button>
                <button
                  className="btn btn-outline btn-block"
                  onClick={() => {
                    handleWeightChange('sentiment', 70);
                    setShowCalibrationModal(false);
                  }}
                >
                  Emotional Tone Focus
                </button>
                <button
                  className="btn btn-outline btn-block"
                  onClick={() => {
                    handleWeightChange('engagement', 70);
                    setShowCalibrationModal(false);
                  }}
                >
                  Interaction Frequency Focus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;