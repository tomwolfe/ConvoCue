import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTranscript } from './useTranscript';

describe('useTranscript', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should initialize with correct default values', () => {
        const { result } = renderHook(() => useTranscript());
        expect(result.current.transcript).toEqual([]);
        expect(result.current.currentSpeaker).toBe('them');
        expect(result.current.trafficLightStatus).toBe('green');
    });

    it('should update traffic light status based on duration for "me"', () => {
        const { result } = renderHook(() => useTranscript());

        act(() => {
            result.current.toggleSpeaker(); // Switch to 'me'
        });

        expect(result.current.currentSpeaker).toBe('me');
        expect(result.current.trafficLightStatus).toBe('green');

        // Advance by 61 seconds
        act(() => {
            vi.advanceTimersByTime(61000);
        });
        expect(result.current.trafficLightStatus).toBe('yellow');

        // Advance by another 60 seconds (total 121s)
        act(() => {
            vi.advanceTimersByTime(60000);
        });
        expect(result.current.trafficLightStatus).toBe('red');
    });

    it('should reset traffic light status when switching back to "them"', () => {
        const { result } = renderHook(() => useTranscript());

        act(() => {
            result.current.toggleSpeaker(); // Switch to 'me'
        });

        act(() => {
            vi.advanceTimersByTime(121000);
        });
        expect(result.current.trafficLightStatus).toBe('red');

        act(() => {
            result.current.toggleSpeaker(); // Switch to 'them'
        });
        expect(result.current.trafficLightStatus).toBe('green');
    });

    it('should update traffic light status when adding entries as "me"', () => {
        const { result } = renderHook(() => useTranscript());

        act(() => {
            result.current.setCurrentSpeaker('me');
            result.current.addEntry('Hello', 'me');
        });

        expect(result.current.currentSpeaker).toBe('me');
        expect(result.current.trafficLightStatus).toBe('green');

        act(() => {
            vi.advanceTimersByTime(61000);
        });
        expect(result.current.trafficLightStatus).toBe('yellow');
    });
});
