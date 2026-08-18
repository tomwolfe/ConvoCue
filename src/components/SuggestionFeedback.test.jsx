import React from 'react';
import '@testing-library/jest-dom';
import { jest } from '@jest/globals';
import { render, screen, fireEvent, act } from '@testing-library/react';
import SuggestionFeedback from './SuggestionFeedback';

const mockStorage = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => { store[key] = value.toString(); }),
    removeItem: jest.fn((key) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: mockStorage });

beforeEach(() => {
  jest.useFakeTimers();
  mockStorage.clear();
  mockStorage.getItem.mockClear();
  mockStorage.setItem.mockClear();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('SuggestionFeedback', () => {
  it('shows nothing initially', () => {
    render(<SuggestionFeedback suggestion="Test suggestion" intent="social" />);
    expect(screen.queryByText('Was this helpful?')).not.toBeInTheDocument();
  });

  it('shows nothing when suggestion is null', () => {
    render(<SuggestionFeedback suggestion={null} intent="social" />);
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(screen.queryByText('Was this helpful?')).not.toBeInTheDocument();
  });

  it('shows feedback buttons after 2 seconds when suggestion is present', () => {
    render(<SuggestionFeedback suggestion="Test suggestion" intent="social" />);

    act(() => {
      jest.advanceTimersByTime(1999);
    });
    expect(screen.queryByText('Was this helpful?')).not.toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(screen.getByText('Was this helpful?')).toBeInTheDocument();
  });

  it('stores feedback in localStorage on thumbs up click', () => {
    render(
      <SuggestionFeedback
        suggestion="Test suggestion"
        intent="social"
        persona="friendly"
        onFeedback={jest.fn()}
      />
    );

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    fireEvent.click(screen.getByTitle('Helpful'));

    expect(mockStorage.setItem).toHaveBeenCalled();
    const lastCall = mockStorage.setItem.mock.calls[mockStorage.setItem.mock.calls.length - 1];
    const saved = JSON.parse(lastCall[1]);
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      suggestion: 'Test suggestion',
      intent: 'social',
      persona: 'friendly',
      rating: 'up',
    });
  });

  it('stores feedback in localStorage on thumbs down click', () => {
    render(
      <SuggestionFeedback
        suggestion="Test suggestion"
        intent="conflict"
        onFeedback={jest.fn()}
      />
    );

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    fireEvent.click(screen.getByTitle('Not helpful'));

    expect(mockStorage.setItem).toHaveBeenCalled();
    const lastCall = mockStorage.setItem.mock.calls[mockStorage.setItem.mock.calls.length - 1];
    const saved = JSON.parse(lastCall[1]);
    expect(saved[0].rating).toBe('down');
  });

  it('hides buttons after feedback is submitted', () => {
    render(<SuggestionFeedback suggestion="Test suggestion" intent="social" />);

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    fireEvent.click(screen.getByTitle('Helpful'));

    expect(screen.queryByText('Was this helpful?')).not.toBeInTheDocument();
  });

  it('calls onFeedback callback when provided', () => {
    const onFeedback = jest.fn();
    render(
      <SuggestionFeedback
        suggestion="Test suggestion"
        intent="social"
        onFeedback={onFeedback}
      />
    );

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    fireEvent.click(screen.getByTitle('Helpful'));

    expect(onFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        suggestion: 'Test suggestion',
        intent: 'social',
        rating: 'up',
      })
    );
  });
});
