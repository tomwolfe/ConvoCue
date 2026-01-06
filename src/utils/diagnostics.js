import { AppConfig } from '../config';
import { logError } from './errorHandling';

export const checkAssets = async () => {
  // Skip diagnostics in test environment or non-browser environments
  if (typeof window === 'undefined' || (window && window.__VITEST__)) {
    return { allOk: true, missing: [] };
  }

  try {
    const assets = [
      AppConfig.vad.modelURL,
      AppConfig.vad.workletURL,
      ...Object.values(AppConfig.vad.onnxWASMPaths)
    ].filter(url => url); // Filter out any undefined/null values

    const results = await Promise.all(
      assets.map(async (url) => {
        try {
          // Validate the URL format first
          if (!url || typeof url !== 'string' || !url.trim()) {
            return { url: url || 'invalid', ok: false, error: 'Invalid URL' };
          }

          // Ensure url is absolute for fetch if possible, or just catch failures
          const fetchUrl = url.startsWith('/') ? window.location.origin + url : url;

          // Basic URL validation
          try {
            new URL(fetchUrl);
          } catch (urlError) {
            return { url, ok: false, error: `Invalid URL format: ${urlError.message}` };
          }

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
  } catch (error) {
    logError(error, { context: 'checkAssets' });
    return { allOk: false, missing: [], error: error.message };
  }
};
