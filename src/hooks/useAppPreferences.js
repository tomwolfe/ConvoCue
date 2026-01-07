import { useState, useEffect, useRef, useCallback } from 'react';
import { getManualPreferences, saveUserPreferences } from '../utils/preferences';
import { getInferredPreferences } from '../utils/responseEnhancement';
import { secureLocalStorageGet, secureLocalStorageSet } from '../utils/encryption';
import { eventBus, EVENTS } from '../utils/eventBus';

export const useAppPreferences = (initialDispatch) => {
  const [settings, setSettings] = useState({
    enablePersonalization: true,
    enableSpeakerDetection: true,
    enableSentimentAnalysis: true,
    privacyMode: false,
    isSubtleMode: false,
    showAnalytics: true
  });
  
  const prefsCache = useRef(null);

  const fetchPrefs = useCallback(async () => {
    const manualPrefs = await getManualPreferences();
    const inferredPrefs = await getInferredPreferences();
    prefsCache.current = { ...manualPrefs, ...inferredPrefs };

    const savedSettings = await secureLocalStorageGet('convocue_settings');
    if (savedSettings) setSettings(savedSettings);

    if (initialDispatch) {
      const savedContext = await secureLocalStorageGet('selectedCulturalContext', 'general');
      initialDispatch({ type: 'SET_CULTURAL_CONTEXT', culturalContext: savedContext });

      const savedPersona = manualPrefs.preferredPersona || 'anxiety';
      initialDispatch({ type: 'SET_PERSONA', persona: savedPersona });
    }
  }, [initialDispatch]);

  useEffect(() => {
    fetchPrefs();

    const handlePrefsChange = (manualPrefs) => {
      const inferredPrefs = getInferredPreferences();
      prefsCache.current = { ...manualPrefs, ...inferredPrefs };
      if (manualPrefs && manualPrefs.preferredPersona && initialDispatch) {
        initialDispatch({ type: 'SET_PERSONA', persona: manualPrefs.preferredPersona });
      }
    };

    const handleSettingsChange = (newSettings) => {
      setSettings(newSettings);
      fetchPrefs(); // Refresh cache as settings might impact inferred prefs
    };

    eventBus.on(EVENTS.PREFERENCES_CHANGED, handlePrefsChange);
    eventBus.on(EVENTS.SETTINGS_CHANGED, handleSettingsChange);

    return () => {
      eventBus.off(EVENTS.PREFERENCES_CHANGED, handlePrefsChange);
      eventBus.off(EVENTS.SETTINGS_CHANGED, handleSettingsChange);
    };
  }, [fetchPrefs, initialDispatch]);

  const updatePersona = useCallback(async (persona) => {
    try {
      const prefs = await getManualPreferences();
      prefs.preferredPersona = persona;
      await saveUserPreferences(prefs);
      if (initialDispatch) {
        initialDispatch({ type: 'SET_PERSONA', persona });
      }
    } catch (error) {
      console.error('Failed to save persona preference:', error);
    }
  }, [initialDispatch]);

  const updateCulturalContext = useCallback(async (context) => {
    await secureLocalStorageSet('selectedCulturalContext', context);
    if (initialDispatch) {
      initialDispatch({ type: 'SET_CULTURAL_CONTEXT', culturalContext: context });
    }
  }, [initialDispatch]);

  return {
    settings,
    prefsCache,
    updatePersona,
    updateCulturalContext
  };
};
