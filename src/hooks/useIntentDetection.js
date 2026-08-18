/**
 * useIntentDetection - Intent detection, caching, turn-take, speaker hints
 * Exported functions for useML.js to call.
 * Self-contained - no references to useML.
 */

import { detectIntent as detectIntentBase, shouldGenerateSuggestion as shouldGenerateSuggestionBase, detectTurnTake as detectTurnTakeBase, detectSpeakerHint as detectSpeakerHintBase, getPrecomputedSuggestion as getPrecomputedSuggestionBase, COMMON_PATTERNS } from '../core/intentEngine';
import { BRIDGE_PHRASES, QUICK_ACTIONS, INTENT_PATTERNS } from '../core/config';

// Module-owned refs
const fastLookupMapRef = { current: new Map([
    ['hello', { intent: 'social', suggestion: 'Hi there! How are you doing today?' }],
    ['hi', { intent: 'social', suggestion: 'Hello! Nice to meet you.' }],
    ['hey', { intent: 'social', suggestion: 'Hey! What\'s up?' }],
    ['how are you', { intent: 'social', suggestion: 'I\'m doing well, thank you! How about yourself?' }],
    ['how\'s it going', { intent: 'social', suggestion: 'Pretty good! How about with you?' }],

    ['what\'s up', { intent: 'social', suggestion: 'Not much, just taking it easy. How about you?' }],
    ['what are you up to', { intent: 'social', suggestion: 'Just relaxing. What about you?' }],
    ['how was your weekend', { intent: 'social', suggestion: 'It was relaxing, thanks! How about yours?' }],

    ['how is the project going', { intent: 'professional', suggestion: 'Making good progress. Any specific concerns?' }],
    ['what are the next steps', { intent: 'professional', suggestion: 'The priority is finalizing the proposal by Friday.' }],

    ['i had a rough day', { intent: 'empathy', suggestion: 'I\'m sorry to hear that. What happened?' }],
    ['i\'m feeling overwhelmed', { intent: 'empathy', suggestion: 'That sounds really challenging. How can I support you?' }],

    ['i don\'t agree', { intent: 'conflict', suggestion: 'I see where you\'re coming from. Can we find common ground?' }],
    ['that won\'t work', { intent: 'conflict', suggestion: 'I understand your concern. What would work better for you?' }]
])};

const suggestionCacheRef = { current: new Map() };
const intentHistoryRef = { current: [] };

const lastSuggestionTimeRef = { current: 0 };
const lastManualToggleRef = { current: 0 };
const speakerConfidenceRef = { current: { me: 0, them: 0 } };

export const detectIntent = (text) => {
    if (!text || text.trim().length < 3) return 'general';

    const cacheKey = text.toLowerCase().trim().substring(0, 50);
    const cachedResult = suggestionCacheRef.current.get(cacheKey);
    if (cachedResult && Date.now() - cachedResult.timestamp < 30000) {
        return cachedResult.intent;
    }

    const bestIntent = detectIntentBase(text);

    if (suggestionCacheRef.current.size >= 50) {
        const firstKey = suggestionCacheRef.current.keys().next().value;
        suggestionCacheRef.current.delete(firstKey);
    }
    suggestionCacheRef.current.set(cacheKey, { intent: bestIntent, timestamp: Date.now() });

    return bestIntent;
};

export const shouldGenerateSuggestion = (text) => {
    if (!text) return false;
    const clean = text.toLowerCase().trim().replace(/[?.!,]/g, '');

    if (text.includes('?')) return true;
    if (clean.length < 3) return false;

    const backchannel = new Set(['yeah', 'yes', 'no', 'okay', 'ok', 'right', 'cool', 'wow', 'uh-huh', 'mhmm']);
    if (backchannel.has(clean)) return false;

    const words = clean.split(/\s+/);
    if (words.length < 3 && backchannel.has(words[0])) return false;

    return true;
};

export const detectTurnTake = (text) => {
    if (!text || text.trim().length < 3) return false;
    const textLower = text.toLowerCase().trim();

    if (text.includes('?') || textLower.startsWith('what do you') || textLower.startsWith('how about') ||
        textLower.startsWith('do you') || textLower.endsWith('right?')) {
        return true;
    }

    const turnTakePatterns = [
        /\b(your turn|what's your take|tell me|you go|go ahead|listening|thoughts\?)\b/i,
        /\b(do you agree|don't you think|is that okay|make sense\?)\b/i,
        /\b(how are you|how about you|and you\?)\b/i
    ];

    return turnTakePatterns.some(pattern => pattern.test(textLower));
};

export const detectSpeakerHint = (text, currentSpeaker) => {
    if (!text || text.trim().length < 2) return null;
    const textLower = text.toLowerCase().trim();

    const meIndicators = [
        /^i\b/i, /^i'm\b/i, /^i've\b/i, /^i'll\b/i, /^my\b/i,
        /^i\sdon't\b/i, /^i\sthink\b/i, /^i\sknow\b/i, /^i\sfeel\b/i,
        /^me\stoo\b/i, /^that's\smy\b/i
    ];

    const themIndicators = [
        /^you\b/i, /^your\b/i, /^you're\b/i,
        /^do\syou\b/i, /^can\syou\b/i, /^have\syou\b/i, /^how\sabout\syou/i,
        /^are\syou\b/i, /^did\syou\b/i,
        /what\sdo\syou\b/i, /how\sdo\syou\b/i, /your\sturn\b/i
    ];

    const isMeTargeted = meIndicators.some(pattern => pattern.test(textLower));
    const isThemTargeted = themIndicators.some(pattern => pattern.test(textLower));

    if (isMeTargeted && !isThemTargeted) return 'me';

    if (isThemTargeted && !isMeTargeted) {
        if (textLower.includes('?') || textLower.startsWith('do you') || textLower.startsWith('how about you') || textLower.startsWith('can you')) {
            return 'them';
        }
        if (currentSpeaker === 'me' && text.length > 30) {
            return null;
        }
        return 'them';
    }

    const isShortResponse = /^(yeah|yes|no|okay|ok|sure|right|cool|exactly|true)\.?$/i.test(textLower);
    if (isShortResponse) {
        if (currentSpeaker === 'them') return 'me';
        return null;
    }

    return null;
};

export const getPrecomputedSuggestion = (text) => {
    if (!text) return null;
    for (const [pattern, result] of COMMON_PATTERNS) {
        if (pattern.test(text)) {
            return result;
        }
    }
    return null;
};

export const processTextIntent = (text) => {
    const normalizedText = text.toLowerCase().trim();
    const fastLookupResult = fastLookupMapRef.current.get(normalizedText);

    if (fastLookupResult) {
        return { intent: fastLookupResult.intent, suggestion: fastLookupResult.suggestion, fromCache: true };
    }

    const intent = detectIntent(text);
    const needsSuggestion = shouldGenerateSuggestion(text);

    intentHistoryRef.current.push({ intent, timestamp: Date.now() });
    if (intentHistoryRef.current.length > 5) {
        intentHistoryRef.current.shift();
    }

    if (intent === 'conflict') {
        suggestionCacheRef.current.clear();
    }

    const precomputed = getPrecomputedSuggestion(text);
    if (precomputed) {
        return { intent, suggestion: precomputed.suggestion, fromCache: true };
    }

    return { intent, suggestion: null, fromCache: false };
};

export const toggleSpeakerIntent = () => {
    lastManualToggleRef.current = Date.now();
    speakerConfidenceRef.current = { me: 0, them: 0 };
};

export const getSpeakerConfidence = () => ({ ...speakerConfidenceRef.current });

export const getFastLookupMap = () => fastLookupMapRef;

export const getSuggestionCache = () => suggestionCacheRef;

export const getIntentHistory = () => intentHistoryRef;

export const getLastSuggestionTime = () => lastSuggestionTimeRef;

export const getLastManualToggle = () => lastManualToggleRef.current;

export const getIntentDetectionState = () => ({
    fastLookupMap: fastLookupMapRef,
    suggestionCache: suggestionCacheRef,
    intentHistory: intentHistoryRef,
    lastSuggestionTime: lastSuggestionTimeRef,
    lastManualToggle: lastManualToggleRef,
    speakerConfidence: speakerConfidenceRef,
});