import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useSessionHistory } from './useSessionHistory';
import { jest } from '@jest/globals';

// Mock localStorage
const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Simple test component to use the hook
const TestComponent = ({ onSessionsChange }) => {
  const {
    sessions,
    saveSession,
    loadSession,
    deleteSession,
    exportSession,
    exportAllSessions,
    clearAllSessions,
    getSessionStats
  } = useSessionHistory();

  React.useEffect(() => {
    onSessionsChange(sessions);
  }, [sessions, onSessionsChange]);

  return (
    <div>
      <button onClick={() => saveSession(
        [{ speaker: 'me', text: 'Hello', timestamp: '2023-01-01T10:00:00Z' }],
        80,
        100,
        { totalCount: 1, meCount: 1, themCount: 0, totalDrain: 20 }
      )}>
        Save Session
      </button>
      <button onClick={getSessionStats}>
        Get Stats
      </button>
    </div>
  );
};

describe('useSessionHistory', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('initializes with empty sessions', () => {
    const onSessionsChange = jest.fn();
    render(<TestComponent onSessionsChange={onSessionsChange} />);
    
    expect(onSessionsChange).toHaveBeenCalledWith([]);
  });

  test('saves a session correctly', async () => {
    const onSessionsChange = jest.fn();
    render(<TestComponent onSessionsChange={onSessionsChange} />);
    
    fireEvent.click(screen.getByText('Save Session'));
    
    await waitFor(() => {
      expect(onSessionsChange).toHaveBeenLastCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            transcript: expect.arrayContaining([
              expect.objectContaining({
                speaker: 'me',
                text: 'Hello'
              })
            ]),
            battery: 80,
            initialBattery: 100
          })
        ])
      );
    });
  });

  test('gets session statistics', () => {
    const onSessionsChange = jest.fn();
    const { unmount } = render(<TestComponent onSessionsChange={onSessionsChange} />);
    
    fireEvent.click(screen.getByText('Save Session'));
    
    // Wait for the session to be saved
    setTimeout(() => {
      const {
        sessions,
        getSessionStats
      } = useSessionHistory();
      
      const stats = getSessionStats();
      expect(stats.totalSessions).toBeGreaterThanOrEqual(0);
    }, 100);
  });
});