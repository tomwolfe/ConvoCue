import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import SocialNudgeHUD from './SocialNudgeHUD';
import { useMLWorker } from '../hooks/useMLWorker';
import { provideIntentHaptics } from '../utils/haptics';

vi.mock('../hooks/useMLWorker');
vi.mock('../utils/haptics', () => ({
  provideIntentHaptics: vi.fn()
}));
vi.mock('../utils/systemAnalytics', () => ({
  trackSystemEvent: vi.fn()
}));

describe('SocialNudgeHUD Cultural Adaptation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses Western thresholds (60%) for "usa" context', () => {
    useMLWorker.mockReturnValue({
      engagement: { talkRatio: 0.65, totalTurns: 5 },
      detectedIntent: null,
      isProcessing: true,
      settings: { hapticsEnabled: true },
      culturalContext: 'usa'
    });

    render(<SocialNudgeHUD />);
    // In USA context, 65% is above the 55-60% threshold
    expect(screen.getByText('Pause & Listen')).toBeDefined();
  });

  it('uses East Asian thresholds (75%) for "east-asian" context', () => {
    // 65% talk ratio in East Asian context should NOT trigger "Pause & Listen"
    // because the threshold is 75%
    useMLWorker.mockReturnValue({
      engagement: { talkRatio: 0.65, totalTurns: 5 },
      detectedIntent: null,
      isProcessing: true,
      settings: { hapticsEnabled: true },
      culturalContext: 'east-asian'
    });

    const { queryByText } = render(<SocialNudgeHUD />);
    expect(queryByText('Pause & Listen')).toBeNull();
    expect(queryByText('Observe the Space')).toBeNull();
    
    // It might show "Engage More" (or similar) because it's not yet "Dominating"
    // Actually, "Engage More" is for < balancedMin
    // Let's check what it shows.
  });

  it('shows "Observe the Space" instead of "Pause & Listen" in East Asian context at 80%', () => {
    useMLWorker.mockReturnValue({
      engagement: { talkRatio: 0.8, totalTurns: 5 },
      detectedIntent: null,
      isProcessing: true,
      settings: { hapticsEnabled: true },
      culturalContext: 'east-asian'
    });

    render(<SocialNudgeHUD />);
    expect(screen.getByText('Observe the Space')).toBeDefined();
    expect(screen.queryByText('Pause & Listen')).toBeNull();
  });

  it('adapts empathy labels for high-context cultures', () => {
    useMLWorker.mockReturnValue({
      engagement: { talkRatio: 0.4, totalTurns: 5 },
      detectedIntent: 'EMPATHY',
      isProcessing: true,
      settings: { hapticsEnabled: true },
      culturalContext: 'japan' // high-context
    });

    render(<SocialNudgeHUD />);
    expect(screen.getByText('Hold Space')).toBeDefined();
    expect(screen.queryByText('Show Support')).toBeNull();
  });

  it('adapts success labels for high-context cultures', () => {
    useMLWorker.mockReturnValue({
      engagement: { talkRatio: 0.5, totalTurns: 5 }, // In high-context, 0.5 is "balanced" (balancedMin=0.5, balancedMax=0.65)
      detectedIntent: null,
      isProcessing: true,
      settings: { hapticsEnabled: true },
      culturalContext: 'china' // high-context
    });

    render(<SocialNudgeHUD />);
    expect(screen.getByText('Harmonious Flow')).toBeDefined();
  });

  it('de-escalates haptics for CONFLICT in East Asian context', () => {
    useMLWorker.mockReturnValue({
      engagement: { talkRatio: 0.8, totalTurns: 5 },
      detectedIntent: null,
      isProcessing: true,
      settings: { hapticsEnabled: true },
      culturalContext: 'east-asian'
    });

    render(<SocialNudgeHUD />);
    
    // Should call with 'SUGGESTION' instead of 'CONFLICT'
    expect(provideIntentHaptics).toHaveBeenCalledWith('SUGGESTION');
    expect(provideIntentHaptics).not.toHaveBeenCalledWith('CONFLICT');
  });
});
