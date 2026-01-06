import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMLWorker } from '../hooks/useMLWorker';

// Mock the Worker API
const mockWorker = {
  postMessage: vi.fn(),
  onmessage: null,
  onerror: null,
  terminate: vi.fn(),
};

// Mock the Worker constructor
const mockWorkerConstructor = vi.fn(() => mockWorker);

// Set up the mock globally
global.Worker = mockWorkerConstructor;

// Mock the URL constructor
global.URL = {
  createObjectURL: vi.fn(() => 'mocked-url'),
};

describe('useMLWorker Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset localStorage
    localStorage.clear();
  });

  afterEach(() => {
    // Clean up any workers that might have been created
    if (global.Worker.mock.results.length > 0) {
      const worker = global.Worker.mock.results[0].value;
      if (worker && typeof worker.terminate === 'function') {
        worker.terminate();
      }
    }
  });

  it('initializes with correct default state', () => {
    const { result } = renderHook(() => useMLWorker());

    expect(result.current.status).toBe('Initializing Models...');
    expect(result.current.progress).toBe(0);
    expect(result.current.isReady).toBe(false);
    expect(result.current.transcript).toBe('');
    expect(result.current.suggestion).toBe('');
    expect(result.current.isProcessing).toBe(false);
    expect(result.current.persona).toBeDefined();
  });

  it('handles worker messages correctly', async () => {
    const { result } = renderHook(() => useMLWorker());

    // Simulate worker ready message
    await act(async () => {
      const worker = mockWorkerConstructor.mock.results[0].value;
      worker.onmessage({ data: { type: 'ready' } });
    });

    expect(result.current.isReady).toBe(true);
    expect(result.current.status).toBe('Ready');
  });

  it('processes audio when ready', async () => {
    const { result } = renderHook(() => useMLWorker());

    // Simulate worker ready
    await act(async () => {
      const worker = mockWorkerConstructor.mock.results[0].value;
      worker.onmessage({ data: { type: 'ready' } });
    });

    // Process audio
    const audioBuffer = new Float32Array([0.1, 0.2, 0.3]);
    await act(async () => {
      result.current.processAudio(audioBuffer);
    });

    expect(mockWorker.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'stt',
        audio: expect.any(Float32Array),
      }),
      [expect.any(ArrayBuffer)]
    );
  });

  it('handles transcription results', async () => {
    const { result } = renderHook(() => useMLWorker());

    // Simulate ready state
    await act(async () => {
      const worker = mockWorkerConstructor.mock.results[0].value;
      worker.onmessage({ data: { type: 'ready' } });
    });

    // Simulate transcription result
    await act(async () => {
      const worker = mockWorkerConstructor.mock.results[0].value;
      worker.onmessage({ data: { type: 'stt_result', text: 'Hello world' } });
    });

    expect(result.current.transcript).toBe('Hello world');
  });

  it('handles LLM results', async () => {
    const { result } = renderHook(() => useMLWorker());

    // Simulate ready state
    await act(async () => {
      const worker = mockWorkerConstructor.mock.results[0].value;
      worker.onmessage({ data: { type: 'ready' } });
    });

    // Simulate LLM result
    await act(async () => {
      const worker = mockWorkerConstructor.mock.results[0].value;
      worker.onmessage({ data: { type: 'llm_result', text: 'This is a suggestion' } });
    });

    expect(result.current.suggestion).toBe('This is a suggestion');
    expect(result.current.isProcessing).toBe(false);
  });

  it('manages persona preferences in localStorage', async () => {
    const { result } = renderHook(() => useMLWorker());

    // Change persona
    await act(async () => {
      result.current.setPersona('professional');
    });

    expect(result.current.persona).toBe('professional');
    expect(localStorage.getItem('convocue_preferences')).toContain('professional');
  });

  it('handles processing errors gracefully', async () => {
    const { result } = renderHook(() => useMLWorker());

    // Simulate error
    await act(async () => {
      const worker = mockWorkerConstructor.mock.results[0].value;
      worker.onmessage({ data: { type: 'error', error: 'Test error' } });
    });

    expect(result.current.status).toContain('Model Error');
    expect(result.current.isReady).toBe(false);
  });
});