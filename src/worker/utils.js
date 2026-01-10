import { AppConfig } from '../config';

export const sanitizeText = (text) => {
    if (!text || typeof text !== 'string') {
        return '';
    }

    return text
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/vbscript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .substring(0, AppConfig.system.maxTranscriptLength);
};

export const throttledProgress = (p, statusPrefix, taskId) => {
    if (p.status === 'progress') {
        self.postMessage({ type: 'status', status: `${statusPrefix}: ${Math.round(p.progress ?? 0)}%`, progress: p.progress, taskId });
    } else if (p.status === 'initiate') {
        self.postMessage({ type: 'status', status: `${statusPrefix}: Initializing...`, taskId });
    } else if (p.status === 'done') {
        self.postMessage({ type: 'status', status: `${statusPrefix}: Ready`, taskId });
    }
};

export const validateCoachingInsights = (insights) => {
  if (!insights) return null;

  if (typeof insights !== 'object' || Array.isArray(insights)) {
    console.warn('[Worker] Invalid coaching insights format, rejecting');
    return null;
  }

  const serialized = JSON.stringify(insights);
  if (serialized.length > (AppConfig.system.maxCoachingInsightsSize || 100000)) { 
    console.warn('[Worker] Coaching insights too large, rejecting');
    return null;
  }

  if (insights.insights && !Array.isArray(insights.insights)) {
    console.warn('[Worker] Invalid insights array format, rejecting');
    return null;
  }

  return insights;
};
