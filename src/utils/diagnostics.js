/**
 * Diagnostic utilities for ConvoCue
 * Helps identify common issues with WASM assets, memory, and model loading
 */

/**
 * Checks if required WASM assets are available
 */
export const checkAssets = async () => {
  const requiredAssets = [
    { url: '/ort-wasm-simd-threaded.wasm', name: 'ONNX Runtime WASM' },
    { url: '/ort-wasm-simd-threaded.mjs', name: 'ONNX Runtime MJS' },
    { url: '/ort-wasm-simd-threaded.jsep.wasm', name: 'ONNX Runtime JSEP WASM' },
    { url: '/ort-wasm-simd-threaded.jsep.mjs', name: 'ONNX Runtime JSEP MJS' },
    { url: '/vad.worklet.bundle.min.js', name: 'VAD Worklet' },
    { url: '/silero_vad_v5.onnx', name: 'Silero VAD Model' }
  ];

  const missing = [];
  const available = [];

  for (const asset of requiredAssets) {
    try {
      const response = await fetch(asset.url);
      if (response.ok) {
        available.push({ ...asset, size: response.headers.get('content-length') });
      } else {
        missing.push(asset);
      }
    } catch (error) {
      missing.push({ ...asset, error: error.message });
    }
  }

  return {
    allOk: missing.length === 0,
    missing,
    available,
    total: requiredAssets.length,
    availableCount: available.length
  };
};

/**
 * Gets memory usage information
 */
export const getMemoryInfo = () => {
  if (typeof performance !== 'undefined' && performance.memory) {
    return {
      used: performance.memory.usedJSHeapSize,
      total: performance.memory.totalJSHeapSize,
      limit: performance.memory.jsHeapSizeLimit,
      usedMB: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
      totalMB: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
      limitMB: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024),
      usagePercent: Math.round((performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100)
    };
  }
  
  // Fallback for browsers that don't expose memory info
  return {
    used: 'N/A',
    total: 'N/A',
    limit: 'N/A',
    usedMB: 'N/A',
    totalMB: 'N/A',
    limitMB: 'N/A',
    usagePercent: 'N/A'
  };
};

/**
 * Checks if the browser supports required features
 */
export const checkBrowserSupport = () => {
  const features = {
    webWorkers: typeof Worker !== 'undefined',
    webAssembly: typeof WebAssembly !== 'undefined',
    audioContext: typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined',
    mediaDevices: typeof navigator !== 'undefined' && !!navigator.mediaDevices,
    mediaRecorder: typeof MediaRecorder !== 'undefined',
    indexedDB: typeof indexedDB !== 'undefined',
    performanceObserver: typeof PerformanceObserver !== 'undefined',
    fetch: typeof fetch !== 'undefined'
  };

  const supported = Object.values(features).every(Boolean);
  
  return {
    supported,
    features,
    unsupported: Object.keys(features).filter(key => !features[key])
  };
};

/**
 * Runs comprehensive diagnostics
 */
export const runDiagnostics = async () => {
  const assetCheck = await checkAssets();
  const memoryInfo = getMemoryInfo();
  const browserSupport = checkBrowserSupport();

  return {
    timestamp: new Date().toISOString(),
    assetCheck,
    memoryInfo,
    browserSupport,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
    isMobile: typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
    hardwareConcurrency: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : 'N/A',
    deviceMemory: typeof navigator !== 'undefined' ? navigator.deviceMemory : 'N/A'
  };
};

/**
 * Logs diagnostic events
 */
export const logEvent = (category, message, data = {}) => {
  const event = {
    timestamp: new Date().toISOString(),
    category,
    message,
    data,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development' || typeof window !== 'undefined') {
    console.log(`[${category}] ${message}`, data);
  }

  // In a real app, you might send this to an analytics service
  // For now, we'll just return the event object
  return event;
};

// In-memory log storage
let systemLogs = [];

/**
 * Gets system logs
 */
export const getSystemLogs = () => {
  return systemLogs;
};

/**
 * Clears system logs
 */
export const clearSystemLogs = () => {
  systemLogs = [];
};