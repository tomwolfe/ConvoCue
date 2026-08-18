import { jest } from '@jest/globals';
import {
  initSTT,
  flushAudioBuffer,
  processAudio,
  sttReady,
  getSTTState,
  terminateSTT,
  getSTTWorkerRef,
  getAudioBufferRef,
  getFlushTimeoutRef,
} from './useSTT';

let mockWorker;
const OriginalWorker = global.Worker;

beforeEach(() => {
  mockWorker = {
    postMessage: jest.fn(),
    terminate: jest.fn(),
    onmessage: null,
  };
  global.Worker = jest.fn(() => mockWorker);
  jest.useFakeTimers();
});

afterEach(() => {
  terminateSTT();
  global.Worker = OriginalWorker;
  jest.useRealTimers();
});

describe('initSTT', () => {
  it('creates a Worker and posts load message', () => {
    initSTT();
    expect(global.Worker).toHaveBeenCalled();
    expect(mockWorker.postMessage).toHaveBeenCalledWith({ type: 'load' });
  });

  it('sets onmessage handler on the worker', () => {
    initSTT();
    expect(mockWorker.onmessage).toBeInstanceOf(Function);
  });

  it('stores the worker ref', () => {
    initSTT();
    expect(getSTTWorkerRef()).toBe(mockWorker);
  });
});

describe('flushAudioBuffer', () => {
  it('does nothing when buffer is empty', () => {
    flushAudioBuffer();
    expect(mockWorker.postMessage).not.toHaveBeenCalled();
  });

  it('combines buffers and posts stt message', () => {
    initSTT();
    const buffer = getAudioBufferRef();
    buffer.current = [new Float32Array([1, 2, 3]), new Float32Array([4, 5])];

    flushAudioBuffer();

    expect(mockWorker.postMessage).toHaveBeenCalledTimes(2);
    const call = mockWorker.postMessage.mock.calls[1];
    expect(call[0].type).toBe('stt');
    expect(call[0].data).toEqual(new Float32Array([1, 2, 3, 4, 5]));
  });

  it('clears the buffer after flushing', () => {
    initSTT();
    const buffer = getAudioBufferRef();
    buffer.current = [new Float32Array([1])];

    flushAudioBuffer();

    expect(buffer.current).toEqual([]);
  });

  it('clears the flush timeout', () => {
    initSTT();
    const buffer = getAudioBufferRef();
    const flushTimeout = getFlushTimeoutRef();
    buffer.current = [new Float32Array([1])];
    flushTimeout.current = setTimeout(() => {}, 1000);

    flushAudioBuffer();

    expect(flushTimeout.current).toBeNull();
  });
});

describe('processAudio', () => {
  it('does nothing when stt is initializing and progress is 0', () => {
    const buffer = getAudioBufferRef();
    processAudio(new Float32Array([1]));
    expect(buffer.current).toEqual([]);
  });

  it('buffers audio data after stt is ready', () => {
    initSTT();
    const worker = getSTTWorkerRef();
    const buffer = getAudioBufferRef();

    worker.onmessage({ data: { type: 'progress', progress: 0.5 } });

    processAudio(new Float32Array([1, 2, 3]));
    expect(buffer.current.length).toBe(1);
  });

  it('flushes immediately when buffer exceeds 48000 samples', () => {
    initSTT();
    const worker = getSTTWorkerRef();
    worker.onmessage({ data: { type: 'progress', progress: 0.5 } });

    const largeData = new Float32Array(48001);
    processAudio(largeData);

    expect(mockWorker.postMessage).toHaveBeenCalledTimes(2);
  });

  it('sets a flush timeout when buffer is small', () => {
    initSTT();
    const worker = getSTTWorkerRef();
    worker.onmessage({ data: { type: 'progress', progress: 0.5 } });

    processAudio(new Float32Array([1]));

    const flushTimeout = getFlushTimeoutRef();
    expect(flushTimeout.current).not.toBeNull();
  });

  it('clears previous timeout on re-buffer', () => {
    initSTT();
    const worker = getSTTWorkerRef();
    const flushTimeout = getFlushTimeoutRef();
    worker.onmessage({ data: { type: 'progress', progress: 0.5 } });

    processAudio(new Float32Array([1]));
    const firstTimeout = flushTimeout.current;

    processAudio(new Float32Array([2]));
    expect(flushTimeout.current).not.toBe(firstTimeout);
  });
});

describe('sttReady', () => {
  it('returns false when initializing with progress 0', () => {
    expect(sttReady()).toBe(false);
  });

  it('returns true when progress is > 0', () => {
    initSTT();
    const worker = getSTTWorkerRef();
    worker.onmessage({ data: { type: 'progress', progress: 0.5 } });
    expect(sttReady()).toBe(true);
  });

  it('returns true when stage is not initializing', () => {
    initSTT();
    const worker = getSTTWorkerRef();
    worker.onmessage({ data: { type: 'progress', progress: 0, stage: 'ready' } });
    expect(sttReady()).toBe(true);
  });
});

describe('getSTTState', () => {
  it('returns correct initial shape', () => {
    const state = getSTTState();
    expect(state).toEqual({
      sttProgress: 0,
      sttStage: 'initializing',
      sttLoadTime: null,
      sttReady: false,
    });
  });

  it('reflects updated progress and stage', () => {
    initSTT();
    const worker = getSTTWorkerRef();
    worker.onmessage({ data: { type: 'progress', progress: 0.75, stage: 'loading' } });

    const state = getSTTState();
    expect(state.sttProgress).toBe(0.75);
    expect(state.sttStage).toBe('loading');
    expect(state.sttReady).toBe(true);
  });
});

describe('terminateSTT', () => {
  it('terminates the worker and resets state', () => {
    initSTT();
    terminateSTT();
    expect(mockWorker.terminate).toHaveBeenCalled();
    expect(getSTTWorkerRef()).toBeNull();

    const state = getSTTState();
    expect(state.sttStage).toBe('initializing');
    expect(state.sttProgress).toBe(0);
  });
});
