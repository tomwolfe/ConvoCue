import { useState, useEffect, useRef, useCallback } from 'react';
import { getManualPreferences, saveUserPreferences } from '../utils/preferences';
import { getInferredPreferences } from '../utils/responseEnhancement';
import { secureLocalStorageGet, secureLocalStorageSet } from '../utils/encryption';
import { eventBus, EVENTS } from '../utils/eventBus';
import { useEvent } from './useEvent';
import { ALL_INTENTS } from '../constants/intents';
import { mergeNewIntents } from '../utils/intentUtils';

export const useAppPreferences = (initialDispatch) => {
  const [settings, setSettings] = useState({
    enablePersonalization: true,
    enableSpeakerDetection: true,
    enableSentimentAnalysis: true,
    enableAutoPersona: true,
    privacyMode: false,
    isSubtleMode: false,
    showAnalytics: true,
    intentDetection: {
      confidenceThreshold: 0.5,
      debounceWindowMs: 800,
      stickyDurationMs: 2000
    },
    enabledIntents: ALL_INTENTS
  });
  
  const prefsCache = useRef(null);

  const fetchPrefs = useCallback(async () => {
    const manualPrefs = await getManualPreferences();
    const inferredPrefs = await getInferredPreferences();
    prefsCache.current = { ...manualPrefs, ...inferredPrefs };

    const savedSettings = await secureLocalStorageGet('convocue_settings');
    if (savedSettings) {
      // Merge with defaults to ensure intentDetection settings exist
      const mergedSettings = {
        ...{
          enablePersonalization: true,
          enableSpeakerDetection: true,
          enableSentimentAnalysis: true,
          enableAutoPersona: true,
          privacyMode: false,
          isSubtleMode: false,
          showAnalytics: true,
          intentDetection: {
            confidenceThreshold: 0.5,
            debounceWindowMs: 800,
            stickyDurationMs: 2000
          },
          enabledIntents: ALL_INTENTS
        },
        ...savedSettings
      };

      // If the user already had enabledIntents, we want to make sure new ones are added
      // but they keep their choices for old ones.
      if (savedSettings.enabledIntents) {
        mergedSettings.enabledIntents = mergeNewIntents(savedSettings.enabledIntents, ALL_INTENTS);
      }
      
      setSettings(mergedSettings);
    }

    if (initialDispatch) {
      const savedContext = await secureLocalStorageGet('selectedCulturalContext', 'general');
      initialDispatch({ type: 'SET_CULTURAL_CONTEXT', culturalContext: savedContext });

      const savedPersona = manualPrefs.preferredPersona || 'anxiety';
      initialDispatch({ type: 'SET_PERSONA', persona: savedPersona });
    }
  }, [initialDispatch]);

  useEffect(() => {
    fetchPrefs();
  }, [fetchPrefs]);

  const handlePrefsChange = useCallback((manualPrefs) => {
    const inferredPrefs = getInferredPreferences();
    prefsCache.current = { ...manualPrefs, ...inferredPrefs };
    if (manualPrefs && manualPrefs.preferredPersona && initialDispatch) {
      initialDispatch({ type: 'SET_PERSONA', persona: manualPrefs.preferredPersona });
    }
  }, [initialDispatch]);

  const handleSettingsChange = useCallback((newSettings) => {
    setSettings(newSettings);
    fetchPrefs(); // Refresh cache as settings might impact inferred prefs
  }, [fetchPrefs]);

  useEvent(EVENTS.PREFERENCES_CHANGED, handlePrefsChange);
  useEvent(EVENTS.SETTINGS_CHANGED, handleSettingsChange);

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
