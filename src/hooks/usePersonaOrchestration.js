import { useRef, useCallback, useState } from 'react';
import { AppConfig } from '../config';
import { orchestratePersona } from '../utils/personaOrchestrator';

/**
 * Hook to manage Auto-Persona Orchestration logic.
 * Handles switching logic, user rejection dampening, and switch transparency.
 */
export const usePersonaOrchestration = (currentPersona, settings, historyRef, dispatch) => {
  const autoSwitchInfoRef = useRef({ time: 0, from: null, to: null });
  const rejectionDampeningRef = useRef({}); // { persona: { value, timestamp } }
  const [lastSwitchReason, setLastSwitchReason] = useState(null);

  /**
   * Calculates the current dampening for a persona, applying temporal decay.
   * Uses a 5-minute half-life for the dampening effect.
   */
  const getDecayedDampening = useCallback((persona) => {
    const entry = rejectionDampeningRef.current[persona];
    if (!entry) return 0;
    
    const now = Date.now();
    const elapsedMinutes = (now - entry.timestamp) / (1000 * 60);
    const halfLife = 5; // Dampening reduces by half every 5 minutes
    
    const decayedValue = entry.value * Math.pow(0.5, elapsedMinutes / halfLife);
    
    if (decayedValue < 0.05) {
      delete rejectionDampeningRef.current[persona];
      return 0;
    }
    
    return decayedValue;
  }, []);

  /**
   * Evaluates the current context and performs a persona switch if needed.
   * @returns {string} The active persona after orchestration
   */
  const performOrchestration = useCallback((cleanText) => {
    if (settings.enableAutoPersona === false || settings.privacyMode) {
      return currentPersona;
    }

    const dampening = getDecayedDampening(currentPersona);
    const { suggestedPersona, confidence, debug } = orchestratePersona(
      cleanText, 
      historyRef.current, 
      currentPersona,
      { 
        rejectionDampening: dampening,
        sensitivity: settings.autoPersonaSensitivity 
      }
    );
    
    if (suggestedPersona !== currentPersona) {
      // Find the primary reason for the switch
      const winnerDebug = debug.scores[suggestedPersona];
      let reason = 'Context change';
      
      if (winnerDebug.keywords.length > 0) {
        const topKeyword = winnerDebug.keywords.sort((a, b) => b.contribution - a.contribution)[0].keyword;
        reason = `${suggestedPersona.charAt(0).toUpperCase() + suggestedPersona.slice(1)} context ('${topKeyword}')`;
      } else if (winnerDebug.intents.length > 0) {
        const topIntent = winnerDebug.intents.sort((a, b) => b.contribution - a.contribution)[0].intent;
        reason = `${topIntent} intent detected`;
      }

      console.log(`[Orchestrator] Switching: ${currentPersona} -> ${suggestedPersona}`, {
        confidence: confidence.toFixed(2),
        reason,
        debug
      });

      autoSwitchInfoRef.current = { 
        time: Date.now(), 
        from: currentPersona, 
        to: suggestedPersona 
      };
      
      setLastSwitchReason(reason);
      dispatch({ type: 'SET_PERSONA', persona: suggestedPersona });
      return suggestedPersona;
    }

    return currentPersona;
  }, [currentPersona, settings, getDecayedDampening, historyRef, dispatch]);

  /**
   * Detects if a manual persona change is a rejection of a recent auto-switch.
   */
  const handleManualPersonaChange = useCallback((newPersona) => {
    const now = Date.now();
    const lastSwitch = autoSwitchInfoRef.current;
    
    // If user switches away from an auto-switched persona within 15 seconds
    if (lastSwitch.time > 0 && (now - lastSwitch.time < 15000) && newPersona !== lastSwitch.to) {
      console.warn(`[Orchestrator] User rejected auto-switch to ${lastSwitch.to}. Applying dampening.`);
      const currentEntry = rejectionDampeningRef.current[lastSwitch.to];
      const currentDampening = currentEntry ? currentEntry.value : 0;
      
      rejectionDampeningRef.current[lastSwitch.to] = {
        value: currentDampening + (AppConfig.system.orchestrator?.rejectionDampening || 0.3),
        timestamp: now
      };
      
      // Clear the reason if user rejected it
      setLastSwitchReason(null);
    }
  }, []);

  /**
   * Manually reverts an auto-switch.
   */
  const undoPersonaSwitch = useCallback(() => {
    const lastSwitch = autoSwitchInfoRef.current;
    if (lastSwitch.from && lastSwitch.to === currentPersona) {
      handleManualPersonaChange(lastSwitch.from);
      dispatch({ type: 'SET_PERSONA', persona: lastSwitch.from });
      autoSwitchInfoRef.current = { time: 0, from: null, to: null };
    }
  }, [currentPersona, handleManualPersonaChange, dispatch]);

  return {
    performOrchestration,
    handleManualPersonaChange,
    undoPersonaSwitch,
    lastSwitchReason
  };
};
