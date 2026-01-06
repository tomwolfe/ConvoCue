import '@testing-library/jest-dom';

// Mock localStorage
const localStorageMock = (() => {
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
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index) => Object.keys(store)[index] || null
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

// Mock Worker
class MockWorker {
  constructor(stringUrl) {
    this.url = stringUrl;
    this.onmessage = null;
    this.onerror = null;
  }

  postMessage(msg) {
    // Simulate async message handling
    setTimeout(() => {
      if (this.onmessage) {
        // Send a ready message initially
        if (msg.type === 'load') {
          this.onmessage({ data: { type: 'ready', taskId: msg.taskId } });
        }
        // Handle STT result
        else if (msg.type === 'stt') {
          this.onmessage({ data: { type: 'stt_result', text: 'test transcription', taskId: msg.taskId } });
        }
        // Handle LLM result
        else if (msg.type === 'llm') {
          this.onmessage({ data: { type: 'llm_result', text: 'test suggestion', taskId: msg.taskId } });
        }
        // Handle prewarm
        else if (msg.type === 'prewarm_llm') {
          this.onmessage({ data: { type: 'prewarm_complete', taskId: msg.taskId } });
        }
        // Handle cleanup
        else if (msg.type === 'cleanup') {
          this.onmessage({ data: { type: 'cleanup_complete', taskId: msg.taskId } });
        }
      }
    }, 0);
  }

  terminate() {
    // Mock termination
  }
}

window.Worker = MockWorker;

// Mock URL constructor
window.URL = class MockURL {
  constructor(url, base) {
    this.href = url || base;
  }
  static createObjectURL = () => 'mock-url';
  static revokeObjectURL = () => {};
};

// Mock performance.memory if needed
Object.defineProperty(window, 'performance', {
  value: {
    ...window.performance,
    memory: {
      usedJSHeapSize: 10000000,
      jsHeapSizeLimit: 50000000,
      totalJSHeapSize: 20000000
    }
  },
  writable: true
});
