import { renderHook, act } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import { useMLWorker } from './useMLWorker';

// Improved Worker Mock
class MockWorker {
  constructor(url, options) {
    this.url = url;
    this.options = options;
    this.postMessage = vi.fn((data) => {
      // Auto-respond to load
      if (data.type === 'load') {
        setTimeout(() => {
          if (this.onmessage) {
            this.onmessage({ data: { type: 'ready' } });
          }
        }, 10);
      }
    });
    this.terminate = vi.fn();
    this.onmessage = null;
    this.onerror = null;
    MockWorker.instance = this;
  }
}

vi.stubGlobal('Worker', MockWorker);

describe('useMLWorker Comprehensive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('transitions to ready state', async () => {
    const { result } = renderHook(() => useMLWorker());
    
    expect(result.current.status).toBe('Initializing Models...');
    
    // Wait for the mock worker to "respond"
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(result.current.isReady).toBe(true);
    expect(result.current.status).toBe('Ready');
  });

  test('handles stt and llm result flow', async () => {
    const { result } = renderHook(() => useMLWorker());
    
    // Wait for ready
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    const audioBuffer = new Float32Array(100);
    
    await act(async () => {
      result.current.processAudio(audioBuffer);
    });

    expect(result.current.isProcessing).toBe(true);
    expect(result.current.processingStep).toBe('transcribing');

    // Simulate STT result from worker
    await act(async () => {
      MockWorker.instance.onmessage({ data: { type: 'stt_result', text: 'Hello world' } });
    });

    expect(result.current.transcript).toBe('Hello world');
    expect(result.current.processingStep).toBe('thinking');

    // Simulate LLM result from worker
    const mockEmotion = { emotion: 'joy', confidence: 0.9 };
    await act(async () => {
      MockWorker.instance.onmessage({ data: { type: 'llm_result', text: 'Hi there', emotionData: mockEmotion } });
    });

    expect(result.current.suggestion).toContain('Hi there');
    expect(result.current.emotionData).toEqual(mockEmotion);
    expect(result.current.isProcessing).toBe(false);
    expect(result.current.processingStep).toBe('none');
    expect(result.current.history).toHaveLength(2); // user + assistant
  });

  test('handles worker errors', async () => {
    const { result } = renderHook(() => useMLWorker());
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    await act(async () => {
      MockWorker.instance.onmessage({ data: { type: 'error', error: 'Test error' } });
    });

    expect(result.current.status).toContain('Model Error');
    expect(result.current.isReady).toBe(false);
  });
});
