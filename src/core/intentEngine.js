import { INTENT_PATTERNS } from './config';

// Pre-compile regex for performance and accuracy (word boundaries)
const COMPILED_PATTERNS = Object.entries(INTENT_PATTERNS).map(([intent, config]) => {
    // Escape keywords and join with word boundaries
    const pattern = config.keywords
        .map(kw => {
            const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            return `\\b${escaped}\\b`;
        })
        .join('|');
    return {
        intent,
        regex: new RegExp(pattern, 'gi'),
        weight: config.weight
    };
});

const NUANCE_PATTERNS = [
    { regex: /\b(sorry but|sorry, but|i hear you but|no offense but)\b/gi, conflict: 2.5, empathy: -1 },
    { regex: /\b(not sure|maybe|perhaps|possibly)\b/gi, social: 0.5 },
    // Negation check: if "don't disagree" or "no problem", reduce conflict significantly
    { regex: /\b(don't|do not|doesn't|does not|no|not|never)\s+\b(disagree|wrong|problem|issue|mistake|fail|upset|mad)\b/gi, conflict: -4, empathy: 1 },
    { regex: /\b(really|very|extremely|so|totally)\b/gi, multiplier: 1.3 } // Intensifiers
];

export const detectIntent = (text) => {
    if (!text || text.trim().length < 3) return 'general';
    
    const scores = {
        social: 0,
        professional: 0,
        conflict: 0,
        empathy: 0
    };

    let globalMultiplier = 1.0;

    // Check pre-compiled patterns
    for (const { intent, regex, weight } of COMPILED_PATTERNS) {
        const matches = text.match(regex);
        if (matches) {
            matches.forEach(match => {
                const multiplier = match.includes(' ') ? 1.5 : 1;
                scores[intent] += weight * multiplier;
            });
        }
    }

    // Apply nuance adjustments
    for (const { regex, multiplier, ...adjustments } of NUANCE_PATTERNS) {
        const matches = text.match(regex);
        if (matches) {
            if (multiplier) globalMultiplier *= multiplier;
            matches.forEach(() => {
                for (const [intent, adjustment] of Object.entries(adjustments)) {
                    if (scores[intent] !== undefined) {
                        scores[intent] += adjustment;
                    }
                }
            });
        }
    }

    let bestIntent = 'general';
    let maxScore = 0.7; // Slightly lower threshold for better sensitivity

    for (const [intent, score] of Object.entries(scores)) {
        const finalScore = score * globalMultiplier;
        if (finalScore > maxScore) {
            maxScore = finalScore;
            bestIntent = intent;
        }
    }

    return bestIntent;
};
