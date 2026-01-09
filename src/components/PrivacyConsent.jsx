import React, { useState, useEffect } from 'react';
import { AppConfig } from '../config';

import { secureLocalStorageGet, secureLocalStorageSet } from '../utils/encryption';

const PrivacyConsent = ({ onConsentGiven }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const checkConsent = async () => {
      const consentGiven = await secureLocalStorageGet('convocue_privacy_consent');
      if (!consentGiven) {
        setIsVisible(true);
      } else if (onConsentGiven) {
        onConsentGiven();
      }
    };
    checkConsent();
  }, [onConsentGiven]);

  const handleAccept = async () => {
    await secureLocalStorageSet('convocue_privacy_consent', 'true');
    setIsVisible(false);
    if (onConsentGiven) onConsentGiven();
  };

  const handleDecline = async () => {
    // Even if declined, still allow basic functionality but disable personalization
    await secureLocalStorageSet('convocue_privacy_consent', 'false');
    setIsVisible(false);
    if (onConsentGiven) onConsentGiven();
  };

  if (!isVisible) return null;

  return (
    <div className="privacy-consent-overlay">
      <div className="privacy-consent-modal">
        <h3>Privacy & Data Collection Notice</h3>
        <p>
          ConvoCue uses advanced AI to provide conversational assistance. To improve your experience, 
          we collect and locally store:
        </p>
        <ul>
          <li>Voice characteristics for speaker identification</li>
          <li>Conversation transcripts for context analysis</li>
          <li>Real-time intent detection for adaptive coaching</li>
          <li>Feedback data to improve suggestions</li>
          <li>Response preferences to customize experience</li>
        </ul>
        <p>
          All data is stored locally on your device using encryption. We do not send your data to external servers.
          You can disable personalization features in settings.
        </p>
        <div className="privacy-consent-buttons">
          <button className="btn btn-secondary" onClick={handleDecline}>
            Decline (Basic Mode)
          </button>
          <button className="btn btn-primary" onClick={handleAccept}>
            Accept & Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyConsent;