import '@testing-library/jest-dom';

// Mock Worker class for testing web workers
class MockWorker {
  constructor(stringUrl) {
    this.url = stringUrl;
    this.onmessage = null;
    this.onerror = null;
  }

  postMessage(data) {
    // Simulate worker response
    if (this.onmessage && typeof this.onmessage === 'function') {
      // Simulate async worker behavior
      setTimeout(() => {
        if (data.type === 'load') {
          this.onmessage({ data: { type: 'ready', loadTime: 100 } });
        } else if (data.type === 'stt') {
          this.onmessage({ data: { type: 'stt_result', text: 'Mock transcription' } });
        } else if (data.type === 'llm') {
          this.onmessage({ 
            data: { 
              type: 'llm_result', 
              suggestion: 'Mock suggestion',
              taskId: data.taskId 
            } 
          });
        } else if (data.type === 'summarize') {
          this.onmessage({ 
            data: { 
              type: 'summary_result', 
              summary: 'Mock summary',
              taskId: data.taskId 
            } 
          });
        } else if (data.type === 'heartbeat') {
          this.onmessage({ 
            data: { 
              type: 'heartbeat_ack', 
              taskId: data.taskId 
            } 
          });
        } else if (data.type === 'cache_stats') {
          this.onmessage({
            data: {
              type: 'cache_stats_result',
              stats: { size: 0, memoryMB: '0.00' },
              taskId: data.taskId
            }
          });
        } else if (data.type === 'cache_cleanup') {
          this.onmessage({
            data: {
              type: 'cache_cleanup_result',
              stats: { size: 0, cleanups: 0 },
              taskId: data.taskId
            }
          });
        }
      }, 10);
    }
  }

  terminate() {
    // Mock termination
  }
}

// Replace native Worker with our mock
global.Worker = MockWorker;

// Mock URL.createObjectURL for worker blobs
global.URL.createObjectURL = (blob) => {
  return 'mock-blob-url';
};

// Mock performance.memory for cache testing
if (!global.performance) {
  global.performance = {};
}
if (!global.performance.memory) {
  global.performance.memory = {
    usedJSHeapSize: 1000000,
    jsHeapSizeLimit: 2000000
  };
}

// Mock IndexedDB using a simple in-memory implementation
const mockIndexedDB = {
  databases: new Map(),
  open: (name, version) => {
    return Promise.resolve({
      objectStoreNames: [],
      createObjectStore: (name, options) => ({}),
      transaction: (stores, mode) => ({
        objectStore: (name) => ({
          add: (data) => Promise.resolve(1),
          get: (key) => Promise.resolve(null),
          getAll: () => Promise.resolve([]),
          delete: (key) => Promise.resolve(),
          clear: () => Promise.resolve(),
          count: () => Promise.resolve(0)
        })
      }),
      close: () => {}
    });
  }
};

global.indexedDB = mockIndexedDB;

// Mock Dexie
class MockDexieTable {
    constructor() {
        this.data = new Map();
        this.idCounter = 1;
    }

    async add(item) {
        const id = this.idCounter++;
        this.data.set(id, { ...item, id });
        return id;
    }

    async get(key) {
        return this.data.get(key) || null;
    }

    async getAll() {
        return Array.from(this.data.values());
    }

    async delete(key) {
        return this.data.delete(key);
    }

    async clear() {
        return this.data.clear();
    }

    async count() {
        return this.data.size;
    }

    where(query) {
        return {
            equals: (value) => ({
                toArray: async () => {
                    if (typeof query === 'string') {
                        return Array.from(this.data.values()).filter(item => item[query] === value);
                    }
                    return Array.from(this.data.values()).filter(item => {
                        return Object.entries(query).every(([k, v]) => item[k] === v);
                    });
                },
                delete: async () => {
                    const items = await this.equals(value).toArray();
                    items.forEach(item => this.data.delete(item.id));
                }
            }),
            anyOf: (values) => ({
                toArray: async () => {
                    return Array.from(this.data.values()).filter(item => values.includes(item[Object.keys(query)[0]]));
                }
            }),
            between: (lower, upper, includeLower, includeUpper) => ({
                toArray: async () => {
                    const key = Object.keys(query)[0];
                    return Array.from(this.data.values()).filter(item => {
                        const value = item[key];
                        return (includeLower ? value >= lower : value > lower) &&
                               (includeUpper ? value <= upper : value < upper);
                    });
                }
            })
        };
    }

    orderBy(key) {
        return {
            reverse: () => ({
                toArray: async () => {
                    return Array.from(this.data.values())
                        .sort((a, b) => b[key] - a[key]);
                },
                limit: (count) => ({
                    toArray: async () => {
                        return Array.from(this.data.values())
                            .sort((a, b) => b[key] - a[key])
                            .slice(0, count);
                    }
                }),
                offset: (count) => ({
                    limit: (limitCount) => ({
                        toArray: async () => {
                            return Array.from(this.data.values())
                                .sort((a, b) => b[key] - a[key])
                                .slice(count, count + limitCount);
                        }
                    })
                })
            }),
            toArray: async () => {
                return Array.from(this.data.values())
                    .sort((a, b) => a[key] - b[key]);
            }
        };
    }
}

class MockDexie {
    constructor(name) {
        this.name = name;
        this.tables = {};
        this.versionNum = 0;
    }

    version(num) {
        this.versionNum = num;
        return {
            stores: (schema) => {
                Object.keys(schema).forEach(storeName => {
                    this.tables[storeName] = new MockDexieTable();
                });
            }
        };
    }

    table(name) {
        if (!this.tables[name]) {
            this.tables[name] = new MockDexieTable();
        }
        return this.tables[name];
    }

    async transaction(rw, ...tables) {
        const fn = tables.pop();
        return await fn();
    }
}

vi.mock('dexie', () => ({
    default: MockDexie
}));

// Mock the database module
vi.mock('../src/core/database', () => ({
  default: {
    version: vi.fn(() => ({ stores: vi.fn() })),
    sessionDB: {
      save: vi.fn(() => Promise.resolve({ sessionId: 1, transcriptIds: [1] })),
      getAll: vi.fn(() => Promise.resolve([])),
      getById: vi.fn(() => Promise.resolve(null)),
      delete: vi.fn(() => Promise.resolve()),
      clearAll: vi.fn(() => Promise.resolve()),
      getByDateRange: vi.fn(() => Promise.resolve([])),
      getByPersona: vi.fn(() => Promise.resolve([])),
      getCount: vi.fn(() => Promise.resolve(0))
    },
    goalDB: {
      create: vi.fn(() => Promise.resolve(1)),
      getActive: vi.fn(() => Promise.resolve([])),
      getAll: vi.fn(() => Promise.resolve([])),
      updateProgress: vi.fn(() => Promise.resolve(null)),
      complete: vi.fn(() => Promise.resolve()),
      archive: vi.fn(() => Promise.resolve()),
      delete: vi.fn(() => Promise.resolve())
    },
    metricsDB: {
      recordDaily: vi.fn(() => Promise.resolve(1)),
      getByDateRange: vi.fn(() => Promise.resolve([])),
      getLastNDays: vi.fn(() => Promise.resolve([]))
    },
    analyticsDB: {
      getIntentDistribution: vi.fn(() => Promise.resolve([])),
      getSpeakerBalance: vi.fn(() => Promise.resolve({ me: 0, them: 0 })),
      getBatteryDrainTrends: vi.fn(() => Promise.resolve([])),
      getWeeklyActivity: vi.fn(() => Promise.resolve([]))
    }
  },
  db: {},
  sessionDB: {
    save: vi.fn(() => Promise.resolve({ sessionId: 1, transcriptIds: [1] })),
    getAll: vi.fn(() => Promise.resolve([])),
    getById: vi.fn(() => Promise.resolve(null)),
    delete: vi.fn(() => Promise.resolve()),
    clearAll: vi.fn(() => Promise.resolve()),
    getByDateRange: vi.fn(() => Promise.resolve([])),
    getByPersona: vi.fn(() => Promise.resolve([])),
    getCount: vi.fn(() => Promise.resolve(0))
  },
  goalDB: {
    create: vi.fn(() => Promise.resolve(1)),
    getActive: vi.fn(() => Promise.resolve([])),
    getAll: vi.fn(() => Promise.resolve([])),
    updateProgress: vi.fn(() => Promise.resolve(null)),
    complete: vi.fn(() => Promise.resolve()),
    archive: vi.fn(() => Promise.resolve()),
    delete: vi.fn(() => Promise.resolve())
  },
  metricsDB: {
    recordDaily: vi.fn(() => Promise.resolve(1)),
    getByDateRange: vi.fn(() => Promise.resolve([])),
    getLastNDays: vi.fn(() => Promise.resolve([]))
  },
  analyticsDB: {
    getIntentDistribution: vi.fn(() => Promise.resolve([])),
    getSpeakerBalance: vi.fn(() => Promise.resolve({ me: 0, them: 0 })),
    getBatteryDrainTrends: vi.fn(() => Promise.resolve([])),
    getWeeklyActivity: vi.fn(() => Promise.resolve([]))
  }
}));

// Mock VAD
vi.mock('@ricky0123/vad-react', () => ({
  default: vi.fn(() => null)
}));

vi.mock('@ricky0123/vad-web', () => ({
  UserMediaWebVAD: class MockVAD {
    constructor(options) {
      this.onSpeechStart = options.onSpeechStart;
      this.onSpeechEnd = options.onSpeechEnd;
      this.onVADMisfire = options.onVADMisfire;
      this.onRecordingStart = options.onRecordingStart;
      this.onRecordingEnd = options.onRecordingEnd;
    }
    
    async init() {
      return Promise.resolve();
    }
    
    destroy() {}
  }
}));

// Mock localStorage
const localStorageMock = {
  store: {},
  getItem: function(key) {
    return this.store[key] || null;
  },
  setItem: function(key, value) {
    this.store[key] = String(value);
  },
  removeItem: function(key) {
    delete this.store[key];
  },
  clear: function() {
    this.store = {};
  },
  get length() {
    return Object.keys(this.store).length;
  },
  key: function(i) {
    const keys = Object.keys(this.store);
    return keys[i] || null;
  }
};

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock
});

// Mock navigator.mediaDevices
global.navigator.mediaDevices = {
  getUserMedia: vi.fn(() => Promise.resolve({
    getTracks: () => [{ stop: vi.fn() }],
    getAudioTracks: () => [{ stop: vi.fn() }]
  }))
};

// Mock navigator.gpu for WebGPU detection
global.navigator.gpu = undefined; // No WebGPU support in tests

// Mock navigator.hardwareConcurrency
Object.defineProperty(global.navigator, 'hardwareConcurrency', {
  value: 4,
  writable: true
});

// Mock navigator.deviceMemory
Object.defineProperty(global.navigator, 'deviceMemory', {
  value: 8,
  writable: true
});

// Mock document.addEventListener for visibilitychange
global.document.addEventListener = vi.fn();
