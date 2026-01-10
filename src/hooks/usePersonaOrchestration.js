import { useRef, useCallback, useState } from 'react';
import { AppConfig } from '../config';
import { orchestratePersona } from '../utils/personaOrchestrator';
import { logEvent } from '../utils/diagnostics';

/**
 * Hook to manage Auto-Persona Orchestration logic.
 * Handles switching logic, user rejection dampening, and switch transparency.
 */
export const usePersonaOrchestration = (currentPersona, settings, historyRef, dispatch) => {
  const autoSwitchInfoRef = useRef({ time: 0, from: null, to: null });
  const lastAutoSwitchTimestampRef = useRef(0);
  const rejectionDampeningRef = useRef({}); // { persona: { value, timestamp } }
  const manualPreferenceRef = useRef({ persona: null, timestamp: 0 });
  const [lastSwitchReason, setLastSwitchReason] = useState(null);

  /**
   * Calculates if manual preference is still active (10 minute window)
   */
  const getActiveManualPreference = useCallback(() => {
    const { persona, timestamp } = manualPreferenceRef.current;
    if (!persona) return null;
    
    const now = Date.now();
    const activeWindow = 10 * 60 * 1000; // 10 minutes
    
    if (now - timestamp > activeWindow) {
      manualPreferenceRef.current = { persona: null, timestamp: 0 };
      return null;
    }
    
    return persona;
  }, []);

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

    const now = Date.now();
    const dampening = getDecayedDampening(currentPersona);
    const manualPreference = getActiveManualPreference();
    
    const { suggestedPersona, confidence, debug } = orchestratePersona(
      cleanText, 
      historyRef.current, 
      currentPersona,
      { 
        rejectionDampening: dampening,
        manualPreference,
        sensitivity: settings.autoPersonaSensitivity 
      }
    );
    
    if (suggestedPersona !== currentPersona) {
      // Cycle 2: Dynamic Sticky Persona Logic
      // Prevent switching again too quickly if we just switched automatically.
      // Use a shorter cooldown for similar personas to improve responsiveness.
      const getDynamicCooldown = (from, to) => {
        const baseCooldown = AppConfig.system.orchestrator?.stickyCooldownMs || 30000;
        const similarityMap = AppConfig.system.orchestrator?.similarityMatrix || {};
        
        const isRelated = similarityMap[from]?.includes(to) || similarityMap[to]?.includes(from);
        return isRelated ? baseCooldown / 3 : baseCooldown; // 10s for related, 30s for unrelated
      };

      const stickyCooldown = getDynamicCooldown(currentPersona, suggestedPersona);
      if (now - lastAutoSwitchTimestampRef.current < stickyCooldown) {
        return currentPersona;
      }

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
        time: now, 
        from: currentPersona, 
        to: suggestedPersona 
      };
      
      lastAutoSwitchTimestampRef.current = now;
      
      setLastSwitchReason(reason);
      logEvent('Orchestrator', `Auto-switch: ${currentPersona} -> ${suggestedPersona}`, {
        reason,
        confidence: confidence.toFixed(2),
        debug
      });
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
    
    // Record this as a manual preference to boost this persona in subsequent turns
    manualPreferenceRef.current = { persona: newPersona, timestamp: now };

    // Reset sticky cooldown on manual change to ensure the user's choice is respected
    // for at least the sticky duration.
    lastAutoSwitchTimestampRef.current = now;
    
    // If user switches away from an auto-switched persona within 15 seconds
    if (lastSwitch.time > 0 && (now - lastSwitch.time < 15000) && newPersona !== lastSwitch.to) {
      logEvent('Orchestrator', `User rejected auto-switch to ${lastSwitch.to}. Applying dampening.`, {
        from: lastSwitch.from,
        to: lastSwitch.to,
        manualSelection: newPersona
      });
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