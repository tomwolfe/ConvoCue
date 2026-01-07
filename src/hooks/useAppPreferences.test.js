import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppPreferences } from './useAppPreferences';
import { eventBus, EVENTS } from '../utils/eventBus';
import { secureLocalStorageGet } from '../utils/encryption';

vi.mock('../utils/encryption', () => ({
  secureLocalStorageGet: vi.fn(),
  secureLocalStorageSet: vi.fn()
}));

vi.mock('../utils/preferences', () => ({
  getManualPreferences: vi.fn(() => Promise.resolve({ preferredPersona: 'anxiety' })),
  saveUserPreferences: vi.fn(() => Promise.resolve())
}));

vi.mock('../utils/responseEnhancement', () => ({
  getInferredPreferences: vi.fn(() => ({ isSubtleMode: false }))
}));

describe('useAppPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    secureLocalStorageGet.mockImplementation((key) => {
      if (key === 'convocue_settings') return Promise.resolve(null);
      if (key === 'selectedCulturalContext') return Promise.resolve('general');
      return Promise.resolve(null);
    });
  });

  it('should initialize with default settings', async () => {
    const { result } = renderHook(() => useAppPreferences());
    
    // Wait for async effects
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.settings.enablePersonalization).toBe(true);
  });

  it('should update settings when event is received', async () => {
    const { result } = renderHook(() => useAppPreferences());
    
    const newSettings = { isSubtleMode: true };
    
    await act(async () => {
      eventBus.emit(EVENTS.SETTINGS_CHANGED, newSettings);
    });
    
    expect(result.current.settings.isSubtleMode).toBe(true);
  });

  it('should update persona', async () => {
    const dispatch = vi.fn();
    const { result } = renderHook(() => useAppPreferences(dispatch));
    
    await act(async () => {
      await result.current.updatePersona('professional');
    });
    
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_PERSONA', persona: 'professional' });
  });
});
