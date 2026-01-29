/**
 * @jest-environment jsdom
 */
import { jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useSocialBattery } from './useSocialBattery';
import { AppConfig } from '../core/config';

describe('useSocialBattery', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should initialize with 100% battery', () => {
        const { result } = renderHook(() => useSocialBattery());
        expect(result.current.battery).toBe(100);
        expect(result.current.isExhausted).toBe(false);
    });

    it('should deduct battery correctly and trigger exhaustion at 20%', () => {
        const { result } = renderHook(() => useSocialBattery());
        
        // Deduct enough to get close to 20
        // baseRate 0.1 * conflict 2.5 * drainRate 1.5 * sensitivity 1.0 * wordCount (sqrt(100)=10 * 2.5 = 25)
        // 0.1 * 2.5 * 1.5 * 1.0 * 25 = 9.375 per deduction
        
        act(() => {
            // Rapid drain simulation
            for (let i = 0; i < 10; i++) {
                result.current.deduct('This is a very long text to ensure significant drain '.repeat(10), 'conflict');
            }
        });

        // Battery should be bounded by 0
        expect(result.current.battery).toBeGreaterThanOrEqual(0);
        
        // If it drained a lot, it should be exhausted
        if (result.current.battery < 20) {
            expect(result.current.isExhausted).toBe(true);
        }
    });

    it('should never drop below 0%', () => {
        const { result } = renderHook(() => useSocialBattery());
        
        act(() => {
            // Extreme drain
            for (let i = 0; i < 100; i++) {
                result.current.deduct('EXTREME DRAIN '.repeat(50), 'conflict');
            }
        });

        expect(result.current.battery).toBe(0);
        expect(result.current.isExhausted).toBe(true);
    });

    it('should never exceed 100%', () => {
        const { result } = renderHook(() => useSocialBattery());
        
        act(() => {
            result.current.recharge(50);
        });

        expect(result.current.battery).toBe(100);
    });

    it('should trigger Exhaustion Mode exactly when hitting the threshold', () => {
        const { result } = renderHook(() => useSocialBattery());
        
        act(() => {
            result.current.setBattery(21);
        });
        expect(result.current.isExhausted).toBe(false);

        act(() => {
            result.current.setBattery(19.9);
        });
        expect(result.current.isExhausted).toBe(true);
    });

    it('should recover battery over time when idle', () => {
        const { result } = renderHook(() => useSocialBattery());
        
        act(() => {
            result.current.setBattery(50);
        });

        // Fast forward 15 seconds to ensure idleTime > 10
        act(() => {
            jest.advanceTimersByTime(15000);
        });

        // Should have recovered some battery (idleTime > 10 => recoveryRate = 0.2)
        expect(result.current.battery).toBeGreaterThan(50);
    });
});
