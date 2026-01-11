import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import SocialNudgeHUD from './SocialNudgeHUD';
import { useMLWorker } from '../hooks/useMLWorker';

vi.mock('../hooks/useMLWorker');
vi.mock('../utils/haptics', () => ({
  provideIntentHaptics: vi.fn()
}));

describe('SocialNudgeHUD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Pause & Listen" when talk ratio is too high', () => {
    useMLWorker.mockReturnValue({
      engagement: { talkRatio: 0.7, totalTurns: 5 },
      detectedIntent: null,
      isProcessing: true,
      settings: { hapticsEnabled: true }
    });

    render(<SocialNudgeHUD />);
    expect(screen.getByText('Pause & Listen')).toBeDefined();
    expect(screen.getByText(/Talk Ratio: 70%/)).toBeDefined();
  });

  it('renders "Great Flow" when interaction is balanced', () => {
    useMLWorker.mockReturnValue({
      engagement: { talkRatio: 0.4, totalTurns: 6 },
      detectedIntent: null,
      isProcessing: true,
      settings: { hapticsEnabled: true }
    });

    render(<SocialNudgeHUD />);
    expect(screen.getByText('Great Flow')).toBeDefined();
  });

  it('renders "Clarify Intent" when misunderstanding is detected', () => {
    useMLWorker.mockReturnValue({
      engagement: { talkRatio: 0.5, totalTurns: 2 },
      detectedIntent: 'MISUNDERSTANDING',
      isProcessing: true,
      settings: { hapticsEnabled: true }
    });

    render(<SocialNudgeHUD />);
    expect(screen.getByText('Clarify Intent')).toBeDefined();
  });

  it('is hidden when not processing and no turns', () => {
    useMLWorker.mockReturnValue({
      engagement: { talkRatio: 0, totalTurns: 0 },
      detectedIntent: null,
      isProcessing: false,
      settings: { hapticsEnabled: true }
    });

    const { container } = render(<SocialNudgeHUD />);
    expect(container.firstChild).toBeNull();
  });

  it('can be dismissed', async () => {
    useMLWorker.mockReturnValue({
      engagement: { talkRatio: 0.7, totalTurns: 5 },
      detectedIntent: null,
      isProcessing: true,
      settings: { hapticsEnabled: true }
    });

    render(<SocialNudgeHUD />);
    expect(screen.getByText('Pause & Listen')).toBeDefined();

    const dismissBtn = screen.getByLabelText('Dismiss nudge');
    
    await act(async () => {
      fireEvent.click(dismissBtn);
    });

    expect(screen.queryByText('Pause & Listen')).toBeNull();
  });
});
