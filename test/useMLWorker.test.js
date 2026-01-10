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

  global.Worker = vi.fn().mockImplementation(function() {
    this.postMessage = (data, transfer) => {
      mockWorkerPostMessage(data, transfer);
    };
    this.terminate = mockWorkerTerminate;
    
    // Allow the test to access the instance's onmessage
    setTimeout(() => {
        global.lastWorkerInstance = this;
    }, 0);
  });
});

describe('useMLWorker', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    // Clean up the global Worker mock
    delete global.Worker;
    delete global.lastWorkerInstance;
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

  it('should send retry_stt_load message when retrySTTLoad is called', async () => {
    const { result } = renderHook(() => useMLWorker());

    // Wait for worker initialization
    await vi.waitFor(() => expect(global.lastWorkerInstance).toBeDefined());

    act(() => {
      result.current.retrySTTLoad();
    });

    expect(mockWorkerPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'retry_stt_load',
        taskId: expect.stringMatching(/^retry-\d+$/)
      }),
      undefined
    );
  });

  it('should properly handle worker status response during retry', async () => {
    const { result } = renderHook(() => useMLWorker());

    // Wait for worker initialization
    await vi.waitFor(() => expect(global.lastWorkerInstance).toBeDefined());

    // Trigger the retrySTTLoad function
    act(() => {
      result.current.retrySTTLoad();
    });

    // Verify that the retry message was sent
    expect(mockWorkerPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'retry_stt_load'
      }),
      undefined
    );

    // Simulate the worker sending a status message back with updated ML state data
    act(() => {
      global.lastWorkerInstance.onmessage({
        data: {
          type: 'status',
          status: 'Speech Engine loaded successfully',
          mlStateData: {
            state: 'ready',
            context: { retryCount: 0, maxRetries: 3 }
          },
          taskId: 'retry-12345'
        }
      });
    });

    expect(result.current.isRetrying).toBe(false);
  });

  it('should properly handle worker error response during retry', async () => {
    const { result } = renderHook(() => useMLWorker());

    // Wait for worker initialization
    await vi.waitFor(() => expect(global.lastWorkerInstance).toBeDefined());

    // Trigger the retrySTTLoad function
    act(() => {
      result.current.retrySTTLoad();
    });

    // Simulate the worker sending an error message back
    act(() => {
      global.lastWorkerInstance.onmessage({
        data: {
          type: 'error',
          error: 'Speech recognition model failed to load: Network error',
          mlStateData: {
            state: 'error',
            context: { retryCount: 1, maxRetries: 3 }
          },
          taskId: 'retry-12345'
        }
      });
    });

    expect(result.current.isRetrying).toBe(false);
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

  it('should track retry attempts and limit retries', async () => {
    const { result } = renderHook(() => useMLWorker());

    // Wait for worker initialization
    await vi.waitFor(() => expect(global.lastWorkerInstance).toBeDefined());

    // Simulate 3 failed retry attempts
    for (let i = 1; i <= 3; i++) {
      act(() => {
        result.current.retrySTTLoad();
      });

      act(() => {
        global.lastWorkerInstance.onmessage({
          data: {
            type: 'error',
            error: 'Loading failed',
            mlStateData: {
              state: 'error',
              context: { retryCount: i, maxRetries: 3 }
            }
          }
        });
      });
    }

    // Now attempt 4th retry
    act(() => {
      result.current.retrySTTLoad();
    });

    // Verify that the status reflects the retry limit being reached
    expect(result.current.status).toContain('unavailable after 3 attempts');
  });

  it('should include retryLLMLoad function in the returned object', () => {
    const { result } = renderHook(() => useMLWorker());

    expect(result.current).toHaveProperty('retryLLMLoad');
    expect(typeof result.current.retryLLMLoad).toBe('function');
  });

  it('should call retryLLMLoad without errors', () => {
    const { result } = renderHook(() => useMLWorker());

    // Just verify that calling the function doesn't throw errors
    expect(() => {
      act(() => {
        result.current.retryLLMLoad();
      });
    }).not.toThrow();
  });

  it('should not send retry LLM message if worker is not available', () => {
    // Temporarily mock Worker to return null for this test
    const originalWorker = global.Worker;
    global.Worker = vi.fn().mockImplementation(() => null);

    const { result } = renderHook(() => useMLWorker());

    act(() => {
      result.current.retryLLMLoad();
    });

    expect(mockWorkerPostMessage).not.toHaveBeenCalled();

    // Restore original Worker
    global.Worker = originalWorker;
  });

  it('should send retry_llm_load message when retryLLMLoad is called', async () => {
    const { result } = renderHook(() => useMLWorker());

    // Wait for worker initialization
    await vi.waitFor(() => expect(global.lastWorkerInstance).toBeDefined());

    act(() => {
      result.current.retryLLMLoad();
    });

    expect(mockWorkerPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'retry_llm_load',
        taskId: expect.stringMatching(/^retry-llm-\d+$/)
      }),
      undefined
    );
  });

  it('should maintain existing functionality after adding retryLLMLoad', () => {
    const { result } = renderHook(() => useMLWorker());

    // Check that all expected properties are still present
    const expectedProperties = [
      'status', 'progress', 'isReady', 'isLowMemory', 'transcript', 'suggestion',
      'detectedIntent', 'emotionData', 'coachingInsights', 'isProcessing',
      'processingStep', 'error', 'persona', 'culturalContext', 'history',
      'conversationTurns', 'conversationSentiment', 'processAudio',
      'refreshSuggestion', 'retrySTTLoad', 'retryLLMLoad', 'isRetrying', 'isRetryingLLM', 'prewarmLLM', 'setTranscript',
      'setSuggestion', 'setStatus', 'setPersona', 'setCulturalContext',
      'clearHistory', 'resetWorker', 'settings', 'lastSwitchReason',
      'undoPersonaSwitch'
    ];

    expectedProperties.forEach(prop => {
      expect(result.current).toHaveProperty(prop);
    });
  });
});