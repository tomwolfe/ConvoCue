import React from 'react';
import { Sparkles, Info } from 'lucide-react';
import { AppConfig } from '../../config';

const PersonaSelector = ({ persona, setPersona, culturalContext, setCulturalContext, availablePersonas, settings, lastSwitchReason }) => {
  if (!availablePersonas || Object.keys(availablePersonas).length === 0) return null;
  
  return (
    <div className="persona-selector" role="group" aria-label="Select conversation mode">
      {settings?.enableAutoPersona && (
        <div className="persona-auto-indicator-container">
          <div className="persona-auto-indicator">
            <Sparkles size={14} />
            <span>Smart Switch: {lastSwitchReason || 'Active'}</span>
          </div>
          <div className="info-tooltip-wrapper">
            <Info size={14} className="info-icon" />
            <div className="info-tooltip">
              <strong>Smart Switch</strong> detects the context of your conversation (e.g., emotional, professional, or social) and automatically updates the coaching style.
            </div>
          </div>
        </div>
      )}
      <div className="persona-grid">
        {Object.values(availablePersonas).map((p) => (
          <button
            key={p.id}
            className={`persona-btn ${persona === p.id ? 'active' : ''}`}
            onClick={() => setPersona(p.id)}
            aria-pressed={persona === p.id}
          >
            <span className="persona-label">{p.label}</span>
            <span className="persona-desc">{p.description}</span>
          </button>
        ))}
      </div>

      {persona === 'crosscultural' && (
        <div className="cultural-context-selector" role="group" aria-label="Select cultural context">
          <label htmlFor="cultural-context">Cultural Context:</label>
          <select
            id="cultural-context"
            className="cultural-context-dropdown"
            value={culturalContext || 'general'}
            onChange={(e) => setCulturalContext(e.target.value)}
          >
            <option value="general">General Cultural Awareness</option>
            <option value="east_asian">East Asian (High-context)</option>
            <option value="western">Western (Low-context)</option>
            <option value="middle_eastern">Middle Eastern</option>
            <option value="latin_american">Latin American</option>
            <option value="formal_business">Formal Business Setting</option>
          </select>
        </div>
      )}
    </div>
  );
};

export default PersonaSelector;
