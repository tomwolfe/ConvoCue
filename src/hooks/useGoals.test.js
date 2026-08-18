import React from 'react';
import { jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useGoals } from './useGoals';

const mockStorage = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => { store[key] = value.toString(); }),
    removeItem: jest.fn((key) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
    _store: () => store,
  };
})();

Object.defineProperty(window, 'localStorage', { value: mockStorage });

beforeEach(() => {
  mockStorage.clear();
  mockStorage.getItem.mockClear();
  mockStorage.setItem.mockClear();
});

describe('useGoals', () => {
  it('starts with an empty goals array', () => {
    const { result } = renderHook(() => useGoals());
    expect(result.current.goals).toEqual([]);
  });

  it('addGoal adds a goal with correct shape', () => {
    const { result } = renderHook(() => useGoals());

    act(() => {
      result.current.addGoal('speak_up', 10, 'daily');
    });

    expect(result.current.goals).toHaveLength(1);
    const goal = result.current.goals[0];
    expect(goal).toMatchObject({
      type: 'speak_up',
      target: 10,
      current: 0,
      timeframe: 'daily',
      completedAt: null,
    });
    expect(goal.id).toBeDefined();
    expect(goal.createdAt).toBeDefined();
  });

  it('updateProgress increments goal current', () => {
    const { result } = renderHook(() => useGoals());

    act(() => {
      result.current.addGoal('speak_up', 10, 'daily');
    });

    act(() => {
      result.current.updateProgress('speak_up', 3);
    });

    expect(result.current.goals[0].current).toBe(3);
  });

  it('updateProgress caps current at target and sets completedAt', () => {
    const { result } = renderHook(() => useGoals());

    act(() => {
      result.current.addGoal('speak_up', 5, 'daily');
    });

    act(() => {
      result.current.updateProgress('speak_up', 10);
    });

    expect(result.current.goals[0].current).toBe(5);
    expect(result.current.goals[0].completedAt).toBeDefined();
  });

  it('deleteGoal removes a goal by id', () => {
    const { result } = renderHook(() => useGoals());

    act(() => {
      result.current.addGoal('speak_up', 10, 'daily');
    });

    const goalId = result.current.goals[0].id;

    act(() => {
      result.current.deleteGoal(goalId);
    });

    expect(result.current.goals).toEqual([]);
  });

  it('persists goals to localStorage', () => {
    const { result } = renderHook(() => useGoals());

    act(() => {
      result.current.addGoal('listen_more', 5, 'weekly');
    });

    expect(mockStorage.setItem).toHaveBeenCalled();
    const lastCall = mockStorage.setItem.mock.calls[mockStorage.setItem.mock.calls.length - 1];
    const saved = JSON.parse(lastCall[1]);
    expect(saved).toHaveLength(1);
    expect(saved[0].type).toBe('listen_more');
  });

  it('loads goals from localStorage on init', () => {
    const existingGoals = [
      {
        id: 'test1',
        type: 'speak_up',
        target: 8,
        current: 3,
        timeframe: 'daily',
        createdAt: new Date().toISOString(),
        completedAt: null,
      },
    ];
    mockStorage.getItem.mockReturnValueOnce(JSON.stringify(existingGoals));

    const { result } = renderHook(() => useGoals());
    expect(result.current.goals).toHaveLength(1);
    expect(result.current.goals[0].type).toBe('speak_up');
  });
});
