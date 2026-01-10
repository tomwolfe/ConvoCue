import React, { useState, useEffect } from 'react';
import { TAG_METADATA } from '../utils/intentRecognition';
import { ALL_INTENTS } from '../constants/intents';

const IntentFilterSettings = ({ settings, onSave }) => {
  const [enabledIntents, setEnabledIntents] = useState(
    settings.enabledIntents || ALL_INTENTS
  );

  useEffect(() => {
    setEnabledIntents(settings.enabledIntents || ALL_INTENTS);
  }, [settings]);

  const toggleIntent = (intent) => {
    if (enabledIntents.includes(intent)) {
      setEnabledIntents(enabledIntents.filter(i => i !== intent));
    } else {
      setEnabledIntents([...enabledIntents, intent]);
    }
  };

  const handleSave = () => {
    onSave({ enabledIntents });
  };

  const handleEnableAll = () => {
    setEnabledIntents(ALL_INTENTS);
  };

  const handleDisableAll = () => {
    setEnabledIntents([]);
  };

  return (
    <div className="intent-filter-settings">
      <h3>Live Intent Visibility</h3>
      <p className="setting-description">
        Select which intent types appear in the real-time "Live" badge during conversations.
      </p>
      
      <div className="intent-toggle-controls">
        <button onClick={handleEnableAll} className="btn btn-small btn-secondary">
          Enable All
        </button>
        <button onClick={handleDisableAll} className="btn btn-small btn-secondary">
          Disable All
        </button>
      </div>
      
      <div className="intent-grid">
        {Object.entries(TAG_METADATA).map(([intent, metadata]) => (
          <div key={intent} className="intent-toggle">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={enabledIntents.includes(intent)}
                onChange={() => toggleIntent(intent)}
              />
              <span className="slider"></span>
            </label>
            <div className="intent-info">
              <div className="intent-header">
                <span className={`glance-badge ${metadata.variant}`}>
                  {metadata.label}
                </span>
              </div>
              <p className="intent-description">{metadata.description}</p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="settings-actions">
        <button onClick={handleSave} className="btn btn-primary">
          Save Intent Preferences
        </button>
      </div>
    </div>
  );
};

export default IntentFilterSettings;