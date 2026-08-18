/**
 * useSpeakerDetection - Speaker toggle, auto-detection heuristics, confidence scoring
 * Exported functions for useML.js to call.
 * Self-contained - no references to useML.
 */

// Module-owned refs
const lastManualToggleRef = { current: 0 };
const speakerConfidenceRef = { current: { me: 0, them: 0 } };

export const processIntentHint = (text, currentSpeaker) => {
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

    if (isMeTargeted && !isThemTargeted) {
        speakerConfidenceRef.current = { me: 0, them: 0 };
        return 'me';
    }

    if (isThemTargeted && !isMeTargeted) {
        if (textLower.includes('?') || textLower.startsWith('do you') || textLower.startsWith('how about you') || textLower.startsWith('can you')) {
            speakerConfidenceRef.current = { me: 0, them: 0 };
            return 'them';
        }
        if (currentSpeaker === 'me' && text.length > 30) {
            return null;
        }
        speakerConfidenceRef.current = { me: 0, them: 0 };
        return 'them';
    }

    const isShortResponse = /^(yeah|yes|no|okay|ok|sure|right|cool|exactly|true)\.?$/i.test(textLower);
    if (isShortResponse) {
        if (currentSpeaker === 'them') {
            speakerConfidenceRef.current = { me: 0, them: 0 };
            return 'me';
        }
        return null;
    }

    return null;
};

export const toggleSpeakerIntent = () => {
    lastManualToggleRef.current = Date.now();
    speakerConfidenceRef.current = { me: 0, them: 0 };
};

export const getSpeakerConfidence = () => ({ ...speakerConfidenceRef.current });

export const getLastManualToggle = () => lastManualToggleRef.current;

export const getSpeakerDetectionState = () => ({
    lastManualToggle: lastManualToggleRef.current,
    speakerConfidence: speakerConfidenceRef,
});