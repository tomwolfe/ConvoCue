import { AppConfig } from '../config';

export const checkAssets = async () => {
  // Skip diagnostics in test environment or non-browser environments
  if (typeof window === 'undefined' || (window && window.__VITEST__)) {
    return { allOk: true, missing: [] };
  }

  const assets = [
    AppConfig.vad.modelURL,
    AppConfig.vad.workletURL,
    ...Object.values(AppConfig.vad.onnxWASMPaths)
  ];

  const results = await Promise.all(
    assets.map(async (url) => {
      try {
        // Ensure url is absolute for fetch if possible, or just catch failures
        const fetchUrl = url.startsWith('/') ? window.location.origin + url : url;
        const response = await fetch(fetchUrl, { method: 'HEAD' });
        return { url, ok: response.ok, status: response.status };
      } catch (error) {
        return { url, ok: false, error: error.message };
      }
    })
  );

  const missing = results.filter(r => !r.ok);
  return {
    allOk: missing.length === 0,
    missing
  };
};

const MAX_LOGS = 50;
let systemLogs = [];

export const logEvent = (category, message, data = {}) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    category,
    message,
    data
  };
  
  systemLogs.unshift(logEntry);
  if (systemLogs.length > MAX_LOGS) {
    systemLogs = systemLogs.slice(0, MAX_LOGS);
  }
  
  // Also log to console for development convenience
  if (process.env.NODE_ENV !== 'test') {
    console.log(`[${category}] ${message}`, data);
  }
};

export const getSystemLogs = () => [...systemLogs];

export const clearSystemLogs = () => {
  systemLogs = [];
};

