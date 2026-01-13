import { INTENT_PATTERNS } from './config.js';

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

// Enhanced nuance patterns with more context awareness
const NUANCE_PATTERNS = [
    { regex: /\b(sorry but|sorry, but|i hear you but|no offense but|actually|wrong|disagree)\b/gi, conflict: 2.5, empathy: -1 },
    { regex: /\b(not sure|maybe|perhaps|possibly)\b/gi, social: 0.5 },
    // Positive/Recharge patterns
    { regex: /\b(great|excellent|wonderful|love|happy|excited|good job|well done|thank you so much)\b/gi, positive: 2.0, empathy: 1.0 },
    // Negation check: if "don't disagree" or "no problem", reduce conflict significantly
    { regex: /\b(don't|do not|doesn't|does not|no|not|never)\s+\b(disagree|wrong|problem|issue|mistake|fail|upset|mad)\b/gi, conflict: -4, empathy: 1, positive: 1 },
    { regex: /\b(really|very|extremely|so|totally)\b/gi, multiplier: 1.3 }, // Intensifiers
    // Context-aware patterns for more nuanced detection
    { regex: /\b(understand|see your point|that makes sense|valid point|good point)\b/gi, empathy: 1.5, conflict: -1 },
    { regex: /\b(what do you think|how do you feel|your opinion|what's your take)\b/gi, social: 1.2, empathy: 1.0 },
    { regex: /\b(urgent|deadline|ASAP|immediately|right now)\b/gi, professional: 1.5, conflict: 0.5 },
    { regex: /\b(relationship|personal|private|confidential)\b/gi, empathy: 1.2, social: 0.8 },
    { regex: /\b(agree|support|behind|with you|on board)\b/gi, positive: 1.5, empathy: 1.0 },
    { regex: /\b(need to|have to|must|required)\b/gi, professional: 1.0, conflict: 0.5 }
];

export const detectIntent = (text) => {
    if (!text || text.trim().length < 3) return 'general';

    // Quick early exit for common cases to improve performance
    const textLower = text.toLowerCase();
    if (text.includes('?')) {
        // Questions often indicate social intent, boost it
        const scores = {
            social: 0.8,
            professional: 0,
            conflict: 0,
            empathy: 0,
            positive: 0
        };

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
                let localMultiplier = 1.0;
                if (multiplier) localMultiplier = multiplier;

                matches.forEach(() => {
                    for (const [intent, adjustment] of Object.entries(adjustments)) {
                        if (scores[intent] !== undefined) {
                            scores[intent] += adjustment;
                        }
                    }
                });

                if (multiplier) {
                    for (const [intent, score] of Object.entries(scores)) {
                        scores[intent] = score * localMultiplier;
                    }
                }
            }
        }

        // If text contains both positive and conflict indicators, adjust scores
        if (scores.positive > 0 && scores.conflict > 0) {
            scores.positive *= 0.7; // Reduce positive score if there's conflict
            scores.conflict *= 0.8; // Reduce conflict score if there's positivity
        }

        // Boost empathy if text contains personal pronouns with emotional context
        if (textLower.includes('i feel') || textLower.includes('i think') || textLower.includes('i believe')) {
            scores.empathy += 1.0;
        }

        let bestIntent = 'general';
        let maxScore = 0.7; // Slightly lower threshold for better sensitivity

        for (const [intent, score] of Object.entries(scores)) {
            if (score > maxScore) {
                maxScore = score;
                bestIntent = intent;
            }
        }

        return bestIntent;
    }

    // For non-questions, use the original algorithm
    const scores = {
        social: 0,
        professional: 0,
        conflict: 0,
        empathy: 0,
        positive: 0
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

    // If text contains both positive and conflict indicators, adjust scores
    if (scores.positive > 0 && scores.conflict > 0) {
        scores.positive *= 0.7; // Reduce positive score if there's conflict
        scores.conflict *= 0.8; // Reduce conflict score if there's positivity
    }

    // Boost empathy if text contains personal pronouns with emotional context
    if (textLower.includes('i feel') || textLower.includes('i think') || textLower.includes('i believe')) {
        scores.empathy += 1.0;
    }

    // Boost social if text contains questions
    if (text.includes('?')) {
        scores.social += 0.8;
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

const BACKCHANNEL_PHRASES = new Set([
    'yeah', 'yes', 'no', 'okay', 'ok', 'right', 'cool', 'wow', 'uh-huh', 'mhmm', 
    'got it', 'sure', 'thanks', 'thank you', 'maybe', 'possibly', 'i see',
    'interesting', 'yep', 'nope', 'hi', 'hello', 'hey'
]);

// Precomputed common conversation patterns to speed up response
const COMMON_PATTERNS = new Map([
    // Social patterns
    [/how are you/i, { intent: 'social', suggestion: "I'm doing well, thank you! How about yourself?" }],
    [/how was your weekend/i, { intent: 'social', suggestion: "It was relaxing, thanks! How about yours?" }],
    [/what did you do/i, { intent: 'social', suggestion: "Oh, I mostly just relaxed at home. What about you?" }],
    [/tell me about/i, { intent: 'social', suggestion: "That's interesting! Tell me more about that." }],

    // Professional patterns
    [/project status/i, { intent: 'professional', suggestion: "We're on track to meet the deadline. Any concerns?" }],
    [/timeline/i, { intent: 'professional', suggestion: "Based on our current progress, we should finish by..." }],
    [/budget/i, { intent: 'professional', suggestion: "The budget is within acceptable limits for now." }],

    // Empathy patterns
    [/had a bad day/i, { intent: 'empathy', suggestion: "I'm sorry to hear that. What happened?" }],
    [/feeling overwhelmed/i, { intent: 'empathy', suggestion: "That sounds really challenging. How can I support you?" }],
    [/don't know what to do/i, { intent: 'empathy', suggestion: "It's okay to feel uncertain. Let's think through this together." }],

    // Conflict patterns
    [/don't agree/i, { intent: 'conflict', suggestion: "I see where you're coming from. Can we find common ground?" }],
    [/this won't work/i, { intent: 'conflict', suggestion: "I understand your concern. What would work better for you?" }],
    [/problem with/i, { intent: 'conflict', suggestion: "Thanks for bringing this up. How should we address it?" }]
]);

export const shouldGenerateSuggestion = (text) => {
    if (!text) return false;
    const clean = text.toLowerCase().trim().replace(/[?.!,]/g, '');

    // Always generate for questions
    if (text.includes('?')) return true;

    // Don't generate for very short filler
    if (clean.length < 3) return false;

    // Don't generate if it's just a backchannel word
    if (BACKCHANNEL_PHRASES.has(clean)) return false;

    // Don't generate for very short sentences (e.g. "I know.") unless they are 3+ words
    const words = clean.split(/\s+/);
    if (words.length < 3 && BACKCHANNEL_PHRASES.has(words[0])) return false;

    return true;
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
