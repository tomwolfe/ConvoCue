import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePersonaOrchestration } from '../hooks/usePersonaOrchestration';
import { AppConfig } from '../config';

// Mock diagnostics to avoid side effects
vi.mock('../utils/diagnostics', () => ({
  logEvent: vi.fn()
}));

describe('usePersonaOrchestration - Sticky Logic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should enforce sticky persona cooldown', () => {
    let currentPersona = 'meeting';
    const dispatch = vi.fn((action) => {
      if (action.type === 'SET_PERSONA') {
        currentPersona = action.persona;
      }
    });
    const historyRef = { current: [] };
    const settings = { enableAutoPersona: true, autoPersonaSensitivity: 'medium' };
    
    const { result, rerender } = renderHook(
      ({ persona }) => usePersonaOrchestration(persona, settings, historyRef, dispatch),
      { initialProps: { persona: 'meeting' } }
    );

    // 1. Initial switch (Meeting -> Professional)
    // "contract" should trigger professional
    act(() => {
      result.current.performOrchestration("I need to discuss the contract");
    });

    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_PERSONA', persona: 'professional' });
    dispatch.mockClear();
    rerender({ persona: currentPersona });

    // 2. Immediate second switch (Professional -> Anxiety)
    // "anxious" is a keyword for anxiety in config
    act(() => {
      result.current.performOrchestration("I am so anxious about this presentation");
    });

    expect(dispatch).not.toHaveBeenCalled(); // Should be blocked by sticky cooldown

    // 3. Wait 31 seconds and try again
    act(() => {
      vi.advanceTimersByTime(31000);
    });

    act(() => {
      result.current.performOrchestration("I am so anxious about this presentation");
    });

    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_PERSONA', persona: 'anxiety' });
  });

  it('should use a shorter cooldown for related personas', () => {
    let currentPersona = 'meeting';
    const dispatch = vi.fn((action) => {
      if (action.type === 'SET_PERSONA') {
        currentPersona = action.persona;
      }
    });
    const historyRef = { current: [] };
    const settings = { enableAutoPersona: true, autoPersonaSensitivity: 'medium' };
    
    const { result, rerender } = renderHook(
      ({ persona }) => usePersonaOrchestration(persona, settings, historyRef, dispatch),
      { initialProps: { persona: 'meeting' } }
    );

    // 1. Initial switch (Meeting -> Professional) - Related
    act(() => {
      result.current.performOrchestration("I need to discuss the contract");
    });
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_PERSONA', persona: 'professional' });
    dispatch.mockClear();
    
    // Update the hook with the new persona
    rerender({ persona: currentPersona });

    // 2. Wait 11 seconds (more than 10s short cooldown, less than 30s base)
    act(() => {
      vi.advanceTimersByTime(11000);
    });

    // 3. Switch back to meeting - Related
    act(() => {
      // Use multiple keywords to overcome the threshold
      result.current.performOrchestration("Let's look at the meeting agenda and update the schedule for the sync");
    });

    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_PERSONA', persona: 'meeting' });
  });
});
