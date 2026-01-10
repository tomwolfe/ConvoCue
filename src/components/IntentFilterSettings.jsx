import React, { useState, useEffect } from 'react';
import { TAG_METADATA } from '../utils/intentRecognition';

const IntentFilterSettings = ({ settings, onSave }) => {
  const [enabledIntents, setEnabledIntents] = useState(
    settings.enabledIntents || []
  );

  useEffect(() => {
    setEnabledIntents(settings.enabledIntents || []);
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
    // Enable all intents that are available in TAG_METADATA
    setEnabledIntents(Object.keys(TAG_METADATA));
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
            <label className="toggle-switch" htmlFor={`intent-toggle-${intent}`}>
              <input
                id={`intent-toggle-${intent}`}
                type="checkbox"
                checked={enabledIntents.includes(intent)}
                onChange={() => toggleIntent(intent)}
                aria-label={`Enable ${metadata.label} intent`}
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