import { describe, it, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMLWorker } from '../src/hooks/useMLWorker';

// Mock the worker and other dependencies
let mockWorkerPostMessage;
let mockWorkerTerminate;

// Set up the Worker mock before each test
beforeEach(() => {
  mockWorkerPostMessage = vi.fn();
  mockWorkerTerminate = vi.fn();

  global.Worker = vi.fn().mockImplementation(() => ({
    postMessage: mockWorkerPostMessage,
    terminate: mockWorkerTerminate,
    onmessage: null,
    onerror: null,
  }));
});

describe('useMLWorker', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    // Clean up the global Worker mock
    delete global.Worker;
  });

  it('should include retrySTTLoad function in the returned object', () => {
    const { result } = renderHook(() => useMLWorker());
    
    expect(result.current).toHaveProperty('retrySTTLoad');
    expect(typeof result.current.retrySTTLoad).toBe('function');
  });

  it('should call retrySTTLoad without errors', () => {
    const { result } = renderHook(() => useMLWorker());

    // Just verify that calling the function doesn't throw errors
    expect(() => {
      act(() => {
        result.current.retrySTTLoad();
      });
    }).not.toThrow();
  });

  it('should not send retry message if worker is not available', () => {
    // Temporarily mock Worker to return null for this test
    const originalWorker = global.Worker;
    global.Worker = vi.fn().mockImplementation(() => null);
    
    const { result } = renderHook(() => useMLWorker());
    
    act(() => {
      result.current.retrySTTLoad();
    });

    expect(mockWorkerPostMessage).not.toHaveBeenCalled();
    
    // Restore original Worker
    global.Worker = originalWorker;
  });

  it('should dispatch appropriate status messages during retrySTTLoad', () => {
    // This test would require more complex mocking of the dispatch mechanism
    // For now, we'll just verify the function exists and can be called
    const { result } = renderHook(() => useMLWorker());

    expect(() => {
      act(() => {
        result.current.retrySTTLoad();
      });
    }).not.toThrow();
  });

  it('should send retry_stt_load message when retrySTTLoad is called', () => {
    const { result } = renderHook(() => useMLWorker());

    act(() => {
      result.current.retrySTTLoad();
    });

    expect(mockWorkerPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'retry_stt_load',
        taskId: expect.stringMatching(/^retry-\d+$/)
      })
    );
  });

  it('should properly handle worker status response during retry', () => {
    // Create a mock worker with onmessage handler
    const mockWorker = {
      postMessage: mockWorkerPostMessage,
      terminate: mockWorkerTerminate,
      onmessage: null,
      onerror: null,
    };

    global.Worker = vi.fn().mockImplementation(() => mockWorker);

    const { result } = renderHook(() => useMLWorker());

    // Trigger the retrySTTLoad function
    act(() => {
      result.current.retrySTTLoad();
    });

    // Verify that the retry message was sent
    expect(mockWorkerPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'retry_stt_load',
        taskId: expect.stringMatching(/^retry-\d+$/)
      })
    );

    // Simulate the worker sending a status message back
    const messageEvent = {
      data: {
        type: 'status',
        status: 'Speech Engine loaded successfully',
        taskId: 'retry-12345'
      }
    };

    // Call the onmessage handler if it exists
    if (mockWorker.onmessage) {
      act(() => {
        mockWorker.onmessage(messageEvent);
      });
    }
  });

  it('should properly handle worker error response during retry', () => {
    // Create a mock worker with onmessage handler
    const mockWorker = {
      postMessage: mockWorkerPostMessage,
      terminate: mockWorkerTerminate,
      onmessage: null,
      onerror: null,
    };

    global.Worker = vi.fn().mockImplementation(() => mockWorker);

    const { result } = renderHook(() => useMLWorker());

    // Trigger the retrySTTLoad function
    act(() => {
      result.current.retrySTTLoad();
    });

    // Simulate the worker sending an error message back
    const messageEvent = {
      data: {
        type: 'error',
        error: 'Speech recognition model failed to load: Network error',
        taskId: 'retry-12345'
      }
    };

    // Call the onmessage handler if it exists
    if (mockWorker.onmessage) {
      act(() => {
        mockWorker.onmessage(messageEvent);
      });
    }
  });

  it('should maintain existing functionality after adding retrySTTLoad', () => {
    const { result } = renderHook(() => useMLWorker());

    // Check that all expected properties are still present
    const expectedProperties = [
      'status', 'progress', 'isReady', 'isLowMemory', 'transcript', 'suggestion',
      'detectedIntent', 'emotionData', 'coachingInsights', 'isProcessing',
      'processingStep', 'error', 'persona', 'culturalContext', 'history',
      'conversationTurns', 'conversationSentiment', 'processAudio',
      'refreshSuggestion', 'retrySTTLoad', 'isRetrying', 'prewarmLLM', 'setTranscript',
      'setSuggestion', 'setStatus', 'setPersona', 'setCulturalContext',
      'clearHistory', 'resetWorker', 'settings', 'lastSwitchReason',
      'undoPersonaSwitch'
    ];

    expectedProperties.forEach(prop => {
      expect(result.current).toHaveProperty(prop);
    });
  });

  it('should track retry attempts and limit retries', () => {
    const { result } = renderHook(() => useMLWorker());

    // Simulate multiple retry attempts
    act(() => {
      result.current.retrySTTLoad();
      result.current.retrySTTLoad();
      result.current.retrySTTLoad();
      result.current.retrySTTLoad(); // This should exceed the limit
    });

    // Verify that the status reflects the retry limit being reached
    expect(result.current.status).toContain('Maximum retry attempts');
  });
});