import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { provideHapticFeedback, VIBRATION_PATTERNS, _resetHapticCooldown } from './haptics';

describe('haptics utility', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    _resetHapticCooldown();
    // Mock navigator.vibrate
    global.navigator.vibrate = vi.fn().mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('triggers conflict vibration for [conflict] tag', () => {
    provideHapticFeedback('This is a [conflict]');
    expect(navigator.vibrate).toHaveBeenCalledWith(VIBRATION_PATTERNS.CONFLICT);
  });

  it('triggers action vibration for [action item] tag', () => {
    provideHapticFeedback('Please [action item] this');
    expect(navigator.vibrate).toHaveBeenCalledWith(VIBRATION_PATTERNS.ACTION);
  });

  it('triggers empathy vibration for empathy keywords', () => {
    provideHapticFeedback('I understand how you feel');
    expect(navigator.vibrate).toHaveBeenCalledWith(VIBRATION_PATTERNS.EMPATHY);
  });

  it('obeys the cooldown period', () => {
    provideHapticFeedback('First vibration');
    expect(navigator.vibrate).toHaveBeenCalledTimes(1);

    // Advance time by 500ms (less than 1500ms cooldown)
    vi.advanceTimersByTime(500);
    provideHapticFeedback('Second vibration');
    expect(navigator.vibrate).toHaveBeenCalledTimes(1);

    // Advance time past cooldown
    vi.advanceTimersByTime(1100);
    provideHapticFeedback('Third vibration');
    expect(navigator.vibrate).toHaveBeenCalledTimes(2);
  });

  it('does nothing if navigator.vibrate is missing', () => {
    delete global.navigator.vibrate;
    provideHapticFeedback('Test');
    // Should not throw
  });
});
