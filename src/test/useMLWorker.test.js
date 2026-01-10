import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMLWorker } from '../hooks/useMLWorker';

// Improved Worker Mock
class MockWorker {
  constructor(url, options) {
    this.url = url;
    this.options = options;
    this.postMessage = vi.fn();
    this.terminate = vi.fn();
    this.onmessage = null;
    this.onerror = null;
    MockWorker.instance = this;
  }
}

// Set up the mock globally
vi.stubGlobal('Worker', MockWorker);

// Mock the URL constructor properly
const OriginalURL = global.URL;
global.URL = class extends OriginalURL {
  constructor(url, base) {
    super(url, base || 'http://localhost');
  }
  static createObjectURL = vi.fn(() => 'mocked-url');
};

describe('useMLWorker Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset localStorage
    localStorage.clear();
  });

  it('initializes with correct default state', () => {
    const { result } = renderHook(() => useMLWorker());

    expect(result.current.status).toBe('Initializing Models...');
    expect(result.current.progress).toBe(0);
    expect(result.current.isReady).toBe(false);
    expect(result.current.transcript).toBe('');
    expect(result.current.suggestion).toBe('');
    expect(result.current.emotionData).toBe(null);
    expect(result.current.isProcessing).toBe(false);
    expect(result.current.persona).toBeDefined();
  });

  it('handles worker messages correctly', async () => {
    const { result } = renderHook(() => useMLWorker());

    // Simulate worker ready message
    await act(async () => {
      MockWorker.instance.onmessage({ data: { type: 'ready' } });
    });

    expect(result.current.isReady).toBe(true);
    expect(result.current.status).toBe('Ready');
  });

  it('processes audio when ready', async () => {
    const { result } = renderHook(() => useMLWorker());

    // Simulate worker ready
    await act(async () => {
      MockWorker.instance.onmessage({ data: { type: 'ready' } });
    });

    // Process audio
    const audioBuffer = new Float32Array([0.1, 0.2, 0.3]);
    await act(async () => {
      result.current.processAudio(audioBuffer);
    });

    expect(MockWorker.instance.postMessage).toHaveBeenCalledWith(
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
      MockWorker.instance.onmessage({ data: { type: 'ready' } });
    });

    // Simulate transcription result
    await act(async () => {
      MockWorker.instance.onmessage({ data: { type: 'stt_result', text: 'Hello world', metadata: { rms: 0.1, duration: 1 } } });
    });

    expect(result.current.transcript).toBe('Hello world');
  });

  it('handles LLM results', async () => {
    const { result } = renderHook(() => useMLWorker());

    // Simulate ready state
    await act(async () => {
      MockWorker.instance.onmessage({ data: { type: 'ready' } });
    });

    // Simulate LLM result
    const mockEmotion = { emotion: 'joy', confidence: 0.8 };
    await act(async () => {
      MockWorker.instance.onmessage({ data: { type: 'llm_result', text: 'This is a suggestion', emotionData: mockEmotion } });
    });

    expect(result.current.suggestion).toContain('This is a suggestion');
    expect(result.current.emotionData).toEqual(mockEmotion);
    expect(result.current.isProcessing).toBe(false);
  });

  it('manages persona preferences in localStorage', async () => {
    const { result } = renderHook(() => useMLWorker());

    // Wait for initial fetch to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50)); 
    });

    // Change persona
    await act(async () => {
      await result.current.setPersona('professional');
    });

    // Wait for state update to propagate
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(result.current.persona).toBe('professional');
    // Check that preferences were saved (even if encrypted)
    const encryptedPrefs = localStorage.getItem('convocue_preferences');
    expect(encryptedPrefs).not.toBeNull();
  });

  it('handles processing errors gracefully', async () => {
    const { result } = renderHook(() => useMLWorker());

    // Simulate error
    await act(async () => {
      MockWorker.instance.onmessage({ data: { type: 'error', error: 'Test error' } });
    });

    expect(result.current.status).toContain('Model Error');
    expect(result.current.isReady).toBe(false);
  });
});
