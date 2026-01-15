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

// Cache for recent intent detections to avoid repeated processing of similar inputs
const INTENT_CACHE = new Map();
const MAX_CACHE_SIZE = 50;

// Function to generate a cache key based on text content
const getCacheKey = (text) => {
    // Normalize text for consistent caching
    return text.toLowerCase().trim().substring(0, 50);
};

// Enhanced nuance patterns with more context awareness
const NUANCE_PATTERNS = [
    { regex: /\b(sorry but|sorry, but|i hear you but|no offense but|actually|wrong|disagree)\b/gi, conflict: 2.5, empathy: -1 },
    { regex: /\b(not sure|maybe|perhaps|possibly)\b/gi, social: 0.5 },
    // Positive/Recharge patterns
    { regex: /\b(great|excellent|wonderful|love|happy|excited|good job|well done|thank you so much)\b/gi, positive: 2.0, empathy: 1.0 },
    // Negation check: if "don't disagree" or "no problem", reduce conflict significantly
    { regex: /\b(don't|do not|doesn't|does not|no|not|never)\s+\b(disagree|wrong|problem|issue|mistake|fail|upset|mad)\b/gi, conflict: -4, empathy: 1, positive: 1 },
    { regex: /\b(really|very|extremely|so|totally)\b/gi, multiplier: 1.3 }, // Intensifiers
    // Negation of positive terms = conflict/negative
    { regex: /\b(don't|do not|doesn't|does not|no|not|never)\s+\b(agree|sure|certain|happy|like|want|good|great|fine)\b/gi, conflict: 2.0, positive: -1.5 },
    // Context-aware patterns for more sophisticated detection
    { regex: /\b(understand|see your point|that makes sense|valid point|good point)\b/gi, empathy: 1.5, conflict: -1 },
    { regex: /\b(what do you think|how do you feel|your opinion|what's your take)\b/gi, social: 1.2, empathy: 1.0 },
    { regex: /\b(urgent|deadline|ASAP|immediately|right now)\b/gi, professional: 1.5, conflict: 0.5 },
    { regex: /\b(relationship|personal|private|confidential)\b/gi, empathy: 1.2, social: 0.8 },
    { regex: /\b(agree|support|behind|with you|on board)\b/gi, positive: 1.5, empathy: 1.0 },
    { regex: /\b(need to|have to|must|required)\b/gi, professional: 1.0, conflict: 0.5 }
];

export const detectIntent = (text) => {
    if (!text || text.trim().length < 3) return 'general';

    // Check cache first for frequently detected intents
    const cacheKey = getCacheKey(text);
    const cachedResult = INTENT_CACHE.get(cacheKey);
    if (cachedResult && Date.now() - cachedResult.timestamp < 30000) { // 30 second cache
        return cachedResult.intent;
    }

    const textLower = text.toLowerCase();

    // Enhanced scoring with context awareness
    const scores = {
        social: 0,
        professional: 0,
        conflict: 0,
        empathy: 0,
        positive: 0
    };

    // Track match details for better context
    const matchDetails = {
        social: [],
        professional: [],
        conflict: [],
        empathy: [],
        positive: []
    };

    // Check pre-compiled patterns and record match details
    for (const { intent, regex, weight } of COMPILED_PATTERNS) {
        const matches = text.match(regex);
        if (matches) {
            matches.forEach(match => {
                const multiplier = match.includes(' ') ? 1.5 : 1;
                scores[intent] += weight * multiplier;
                matchDetails[intent].push({ match: match.toLowerCase(), weight: weight * multiplier });
            });
        }
    }

    // Apply nuance adjustments with more sophisticated logic
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

    // Enhanced context detection
    // Detect if this is a question and adjust scoring accordingly
    if (text.includes('?')) {
        // Questions often indicate social intent, but also could be professional
        if (scores.professional > scores.social * 0.8) {
            scores.professional += 0.5;
        } else {
            scores.social += 0.8;
        }
    }

    // Boost empathy if text contains personal pronouns with emotional context
    if (textLower.includes('i feel') || textLower.includes('i think') || textLower.includes('i believe')) {
        scores.empathy += 1.5; // Increased from 1.0
    }

    // Enhanced negation handling
    if (/(don't|do not|doesn't|does not|no|not|never).*\b(disagree|wrong|problem|issue|mistake|fail|upset|mad|bad|terrible|awful)\b/.test(textLower)) {
        scores.conflict -= 2.0; // Strongly reduce conflict if negated
        scores.positive += 1.0; // Increase positive if conflict is negated
    }

    // Contextual adjustment: if multiple intents have high scores, apply tie-breaking rules
    const highScoringIntents = Object.entries(scores)
        .filter(([intent, score]) => score > 0.5)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2); // Get top 2 intents

    // If two intents are close in score, apply context-based tiebreaker
    if (highScoringIntents.length >= 2) {
        const [first, second] = highScoringIntents;
        const scoreDiff = first[1] - second[1];

        // If scores are very close, apply context rules
        if (scoreDiff < 0.5) {
            // If empathy and conflict are close, empathy wins if emotional words present
            if ((first[0] === 'empathy' && second[0] === 'conflict') ||
                (first[0] === 'conflict' && second[0] === 'empathy')) {

                if (/(sad|depressed|anxious|worried|scared|afraid|upset|angry|frustrated|stressed)/.test(textLower)) {
                    scores.empathy += 0.5;
                }
            }

            // If social and professional are close, check for business terms
            if ((first[0] === 'social' && second[0] === 'professional') ||
                (first[0] === 'professional' && second[0] === 'social')) {

                if (/(project|meeting|work|job|company|client|boss|team|deadline|report)/.test(textLower)) {
                    scores.professional += 0.5;
                } else {
                    scores.social += 0.5;
                }
            }
        }
    }

    // Apply final adjustments based on conversation context
    // If positive and conflict are both high, reduce both to favor other intents
    if (scores.positive > 1.0 && scores.conflict > 1.0) {
        scores.positive *= 0.6;
        scores.conflict *= 0.6;
    }

    // Determine the best intent with improved threshold logic
    let bestIntent = 'general';
    let maxScore = 0.5; // Slightly lowered threshold for better sensitivity

    for (const [intent, score] of Object.entries(scores)) {
        if (score > maxScore) {
            maxScore = score;
            bestIntent = intent;
        }
    }

    // Store result in cache
    if (INTENT_CACHE.size >= MAX_CACHE_SIZE) {
        // Remove oldest entry if cache is full
        const firstKey = INTENT_CACHE.keys().next().value;
        INTENT_CACHE.delete(firstKey);
    }
    INTENT_CACHE.set(cacheKey, {
        intent: bestIntent,
        timestamp: Date.now()
    });

    return bestIntent;
};

const BACKCHANNEL_PHRASES = new Set([
    'yeah', 'yes', 'no', 'okay', 'ok', 'right', 'cool', 'wow', 'uh-huh', 'mhmm', 
    'got it', 'sure', 'thanks', 'thank you', 'maybe', 'possibly', 'i see',
    'interesting', 'yep', 'nope', 'hi', 'hello', 'hey'
]);

// Expanded precomputed common conversation patterns to speed up response
const COMMON_PATTERNS = new Map([
    // Social patterns
    [/how are you/i, { intent: 'social', suggestion: "I'm doing well, thank you! How about yourself?" }],
    [/how's it going/i, { intent: 'social', suggestion: "Pretty good! How are things with you?" }],
    [/what's up/i, { intent: 'social', suggestion: "Not much, just enjoying the day. What about you?" }],
    [/how was your weekend/i, { intent: 'social', suggestion: "It was relaxing, thanks! How about yours?" }],
    [/what did you do/i, { intent: 'social', suggestion: "Oh, I mostly just relaxed at home. What about you?" }],
    [/nice to see you/i, { intent: 'social', suggestion: "You too! It's been a while. How have you been?" }],
    [/tell me about/i, { intent: 'social', suggestion: "That's interesting! Tell me more about that." }],
    [/what do you think/i, { intent: 'social', suggestion: "That's a great point. I think..." }],
    [/good to see you/i, { intent: 'social', suggestion: "Yes, it's been too long! How have you been?" }],
    [/long time no see/i, { intent: 'social', suggestion: "I know, right? Time flies! What have you been up to?" }],

    // Professional patterns
    [/project status/i, { intent: 'professional', suggestion: "We're on track to meet the deadline. Any concerns?" }],
    [/timeline/i, { intent: 'professional', suggestion: "Based on our current progress, we should finish by..." }],
    [/budget/i, { intent: 'professional', suggestion: "The budget is within acceptable limits for now." }],
    [/meeting agenda/i, { intent: 'professional', suggestion: "Let's cover the key points first, then discuss next steps." }],
    [/next steps/i, { intent: 'professional', suggestion: "The priority is to finalize the proposal by Friday." }],
    [/deadline/i, { intent: 'professional', suggestion: "We're aiming to complete this by the end of the week." }],
    [/what do you do/i, { intent: 'professional', suggestion: "I work in software development. What about you?" }],
    [/how is work/i, { intent: 'professional', suggestion: "Busy as usual, but good. How are things on your end?" }],

    // Empathy patterns
    [/had a bad day/i, { intent: 'empathy', suggestion: "I'm sorry to hear that. What happened?" }],
    [/feeling overwhelmed/i, { intent: 'empathy', suggestion: "That sounds really challenging. How can I support you?" }],
    [/don't know what to do/i, { intent: 'empathy', suggestion: "It's okay to feel uncertain. Let's think through this together." }],
    [/really stressed/i, { intent: 'empathy', suggestion: "I can hear that you're under pressure. What would be most helpful right now?" }],
    [/going through a tough time/i, { intent: 'empathy', suggestion: "I'm here for you. Do you want to talk about what's going on?" }],
    [/don't feel heard/i, { intent: 'empathy', suggestion: "I hear that you're feeling unheard. Can we try that again?" }],

    // Conflict patterns
    [/don't agree/i, { intent: 'conflict', suggestion: "I see where you're coming from. Can we find common ground?" }],
    [/this won't work/i, { intent: 'conflict', suggestion: "I understand your concern. What would work better for you?" }],
    [/problem with/i, { intent: 'conflict', suggestion: "Thanks for bringing this up. How should we address it?" }],
    [/not sure about that/i, { intent: 'conflict', suggestion: "I appreciate your perspective. Let's explore both options." }],
    [/that's not fair/i, { intent: 'conflict', suggestion: "I hear your concern. How can we make this more equitable?" }],
    [/feeling frustrated/i, { intent: 'conflict', suggestion: "I understand your frustration. What solution would work best for you?" }],
    [/you're wrong/i, { intent: 'conflict', suggestion: "I might have misunderstood. Can you help me see your perspective?" }]
]);

export const detectTurnTake = (text) => {
    if (!text || text.trim().length < 3) return false;
    const textLower = text.toLowerCase().trim();

    // Direct questions are the strongest turn-take indicator
    if (text.includes('?') || 
        textLower.startsWith('what do you') || 
        textLower.startsWith('how about') ||
        textLower.startsWith('do you') ||
        textLower.endsWith('right?')) {
        return true;
    }

    // Imperatives or "Your turn" indicators
    const turnTakePatterns = [
        /\b(your turn|what's your take|tell me|you go|go ahead|listening|thoughts\?)\b/i,
        /\b(do you agree|don't you think|is that okay|make sense\?)\b/i,
        /\b(how are you|how about you|and you\?)\b/i
    ];

    return turnTakePatterns.some(pattern => pattern.test(textLower));
};

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

/**
 * Provides a hint for who is likely speaking based on content.
 * 80/20: Robust heuristics for pronouns and turn-taking solve most speaker-switching friction.
 */
export const detectSpeakerHint = (text, currentSpeaker) => {
    if (!text || text.trim().length < 2) return null;
    const textLower = text.toLowerCase().trim();

    // Heuristics for 'me' (the user) - Strong self-referential starters
    const meIndicators = [
        /^i\b/i, /^i'm\b/i, /^i've\b/i, /^i'll\b/i, /^my\b/i,
        /^i\sdon't\b/i, /^i\sthink\b/i, /^i\sknow\b/i, /^i\sfeel\b/i,
        /^me\stoo\b/i, /^that's\smy\b/i
    ];
    
    // Heuristics for 'them' (the other person) - Direct address or questions to 'you'
    const themIndicators = [
        /^you\b/i, /^your\b/i, /^you're\b/i,
        /^do\syou\b/i, /^can\syou\b/i, /^have\syou\b/i, /^how\sabout\syou/i,
        /^are\syou\b/i, /^did\syou\b/i,
        /what\sdo\syou\b/i, /how\sdo\syou\b/i, /your\sturn\b/i
    ];

    const isMeTargeted = meIndicators.some(pattern => pattern.test(textLower));
    const isThemTargeted = themIndicators.some(pattern => pattern.test(textLower));

    // Priority 1: High-confidence "I" statements belong to the mic owner ('me')
    if (isMeTargeted && !isThemTargeted) return 'me';
    
    // Priority 2: Questions directed at "you" or statements starting with "You" are likely 'them'
    // but only if they don't also contain "I" (which would be the user talking about themselves and the other person)
    if (isThemTargeted && !isMeTargeted) {
        // If it's a question, it's very likely 'them' asking the user.
        if (textLower.includes('?') || textLower.startsWith('do you') || textLower.startsWith('how about you') || textLower.startsWith('can you')) {
            return 'them';
        }
        
        // If it's a statement starting with "You", it's likely 'them'
        // unless the current speaker is 'me' and it's a long sentence (user explaining something to 'them')
        if (currentSpeaker === 'me' && text.length > 30) {
            return null; // Stay as 'me'
        }
        
        return 'them';
    }

    // Priority 3: Turn-taking logic
    // If it's a short response like "Yeah", "No", "Okay", it's often a speaker change
    // but we only trigger it if it's very clearly a backchannel
    const isShortResponse = /^(yeah|yes|no|okay|ok|sure|right|cool|exactly|true)\.?$/i.test(textLower);
    if (isShortResponse) {
        // If 'them' is speaking and we hear a short response, it's almost certainly 'me' (the user)
        if (currentSpeaker === 'them') return 'me';
        
        // If 'me' is speaking and we hear a short response, it could be 'them' or just the user agreeing
        // We'll be conservative and not switch automatically here to avoid flickering
        return null;
    }
    
    return null;
};
