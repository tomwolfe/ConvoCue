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
    const dispatch = vi.fn();
    const historyRef = { current: [] };
    const settings = { enableAutoPersona: true, autoPersonaSensitivity: 'medium' };
    
    const { result } = renderHook(() => usePersonaOrchestration('meeting', settings, historyRef, dispatch));

    // 1. Initial switch (Meeting -> Professional)
    // "contract" should trigger professional
    act(() => {
      result.current.performOrchestration("I need to discuss the contract");
    });

    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_PERSONA', persona: 'professional' });
    dispatch.mockClear();

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
});
