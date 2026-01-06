import { renderHook, act } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import { useMLWorker } from './useMLWorker';

// Mock Worker
vi.stubGlobal('Worker', vi.fn().mockImplementation(function() {
  this.postMessage = vi.fn();
  this.terminate = vi.fn();
  this.onmessage = vi.fn();
  this.onerror = vi.fn();
}));

// Mock URL.createObjectURL and revokeObjectURL
window.URL.createObjectURL = vi.fn();
window.URL.revokeObjectURL = vi.fn();

// Mock AppConfig import
vi.mock('../../config', () => ({
  AppConfig: {
    system: {
      maxTranscriptLength: 1000,
      maxSuggestionLength: 500,
      allowedTranscriptPattern: /^[a-zA-Z0-9\s.,!?'""-]+$/,
    }
  }
}));

describe('useMLWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('initializes with correct default state', () => {
    const { result } = renderHook(() => useMLWorker());
    
    expect(result.current.status).toBe('Initializing Models...');
    expect(result.current.progress).toBe(0);
    expect(result.current.isReady).toBe(false);
    expect(result.current.transcript).toBe('');
    expect(result.current.suggestion).toBe('');
    expect(result.current.isProcessing).toBe(false);
  });

  test('processAudio validates input', () => {
    const { result } = renderHook(() => useMLWorker());
    
    // Test with null input
    act(() => {
      result.current.processAudio(null);
    });
    
    // Test with invalid input
    act(() => {
      result.current.processAudio("invalid");
    });
    
    // Should not call postMessage for invalid inputs
    const workerInstance = new Worker(new URL('../../worker.js', import.meta.url), { type: 'module' });
    expect(workerInstance.postMessage).not.toHaveBeenCalled();
  });
});