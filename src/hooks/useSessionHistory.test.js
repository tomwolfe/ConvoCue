import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSessionHistory } from './useSessionHistory';

describe('useSessionHistory', () => {
    beforeEach(() => {
        // Clear mock database before each test
        vi.clearAllMocks();
    });

    it('should initialize with empty sessions', async () => {
        const { result } = renderHook(() => useSessionHistory());
        
        // Initial state should have empty sessions and loading true
        expect(result.current.sessions).toEqual([]);
        expect(result.current.isLoading).toBe(true);
    });

    it('should provide saveSession function', async () => {
        const { result } = renderHook(() => useSessionHistory());
        
        // Wait for initial load
        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
        });

        expect(result.current.saveSession).toBeDefined();
        expect(typeof result.current.saveSession).toBe('function');
    });

    it('should provide deleteSession function', async () => {
        const { result } = renderHook(() => useSessionHistory());
        
        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
        });

        expect(result.current.deleteSession).toBeDefined();
        expect(typeof result.current.deleteSession).toBe('function');
    });

    it('should provide getSessionStats function', async () => {
        const { result } = renderHook(() => useSessionHistory());
        
        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
        });

        const stats = result.current.getSessionStats();
        expect(stats).toEqual({
            totalSessions: 0,
            totalMessages: 0,
            avgDuration: 0,
            avgBatteryDrain: 0
        });
    });

    it('should provide export and clear functions', async () => {
        const { result } = renderHook(() => useSessionHistory());
        
        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
        });

        expect(result.current.exportSession).toBeDefined();
        expect(result.current.exportAllSessions).toBeDefined();
        expect(result.current.clearAllSessions).toBeDefined();
    });

    it('should track migration status', async () => {
        const { result } = renderHook(() => useSessionHistory());
        
        expect(result.current.migrationStatus).toBeDefined();
        expect(['pending', 'migrating', 'completed', 'failed'])
            .toContain(result.current.migrationStatus);
    });
});
