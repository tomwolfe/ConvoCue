import React, { useState, useEffect } from 'react';
import { secureLocalStorageGet, secureLocalStorageSet } from '../utils/encryption';

const EmotionalAnalysisConsent = ({ onConsentGiven, persona }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  useEffect(() => {
    const checkConsent = async () => {
      // Show consent only for relationship and anxiety personas
      if (persona === 'relationship' || persona === 'anxiety') {
        const consentGiven = await secureLocalStorageGet('convocue_emotional_analysis_consent');
        if (!consentGiven) {
          setIsVisible(true);
        } else if (onConsentGiven) {
          onConsentGiven();
        }
      }
    };
    checkConsent();
  }, [onConsentGiven, persona]);

  const handleAccept = async () => {
    await secureLocalStorageSet('convocue_emotional_analysis_consent', {
      accepted: true,
      timestamp: Date.now()
    });
    setIsVisible(false);
    if (onConsentGiven) onConsentGiven();
  };

  const handleDecline = async () => {
    await secureLocalStorageSet('convocue_emotional_analysis_consent', {
      accepted: false,
      timestamp: Date.now()
    });
    setIsVisible(false);
    if (onConsentGiven) onConsentGiven();
  };

  if (!isVisible) return null;

  return (
    <div className="emotional-analysis-consent-overlay">
      <div className="emotional-analysis-consent-modal">
        <h3>Emotional Analysis Consent</h3>
        <p>
          ConvoCue's relationship and anxiety support features include emotional intelligence analysis 
          that detects and responds to emotional cues in your conversations.
        </p>
        
        <div className="consent-warning">
          <strong>Important Disclaimer:</strong> ConvoCue is not a substitute for professional 
          mental health services. If you're experiencing serious emotional distress, please contact 
          a qualified mental health professional or emergency services.
        </div>
        
        <p>
          By consenting, you allow ConvoCue to analyze emotional content in your conversations 
          to provide more empathetic and supportive responses. This analysis happens entirely 
          on your device - no emotional data is stored or transmitted externally.
        </p>
        
        <div className="consent-buttons">
          <button className="btn btn-secondary" onClick={handleDecline}>
            Decline Emotional Analysis
          </button>
          <button className="btn btn-primary" onClick={handleAccept}>
            Consent & Continue
          </button>
        </div>
        
        <div className="crisis-resources">
          <p><strong>If you're in crisis:</strong></p>
          <ul>
            <li>US: Call or text 988 (Suicide & Crisis Lifeline)</li>
            <li>International: See <a href="https://www.befrienders.org" target="_blank" rel="noopener noreferrer">befrienders.org</a></li>
            <li>Or contact your local emergency services</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default EmotionalAnalysisConsent;