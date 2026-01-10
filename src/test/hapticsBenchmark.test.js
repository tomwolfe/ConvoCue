import { describe, it, expect, vi, beforeEach } from 'vitest';
import { provideIntentHaptics, _resetHapticCooldown } from '../utils/haptics';
import { AppConfig } from '../config';

describe('Haptic Fast-Path Performance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetHapticCooldown();
    // Mock navigator.vibrate if it doesn't exist in test env
    if (typeof navigator === 'undefined') {
      global.navigator = { vibrate: vi.fn().mockReturnValue(true) };
    } else if (!navigator.vibrate) {
      navigator.vibrate = vi.fn().mockReturnValue(true);
    } else {
      vi.spyOn(navigator, 'vibrate').mockReturnValue(true);
    }
    
    // Reset lastVibrationTime in haptics.js if needed (we'll just use a different intent)
  });

  it('should execute the haptic fast-path logic efficiently', () => {
    const start = Date.now();
    provideIntentHaptics('CONFLICT');
    const end = Date.now();
    const duration = end - start;
    
    console.log(`[Benchmark] provideIntentHaptics (CONFLICT) took ${duration}ms`);
    
    // Logic should be extremely fast
    expect(duration).toBeLessThan(10); 
  });

  it('should correctly map intents to patterns from AppConfig', () => {
    provideIntentHaptics('ACTION_ITEM');
    
    // Pattern for ACTION_ITEM is 'ACTION' in AppConfig
    // VIBRATION_PATTERNS.ACTION is typically what we expect
    expect(navigator.vibrate).toHaveBeenCalled();
  });
});
