const INTENT_PATTERNS = {
    social: {
        keywords: [
            'hello', 'hi', 'how are you', 'nice to meet', 'weather', 'party', 'weekend', 
            'name', 'thanks', 'cool', 'awesome', 'fun', 'plans', 'hobbies', 'family',
            'vacation', 'trip', 'recommend', 'favorite'
        ],
        weight: 1
    },
    professional: {
        keywords: [
            'project', 'meeting', 'deadline', 'report', 'client', 'strategy', 'goal', 
            'agenda', 'update', 'feedback', 'workflow', 'resource', 'budget', 'roadmap',
            'stakeholder', 'quarterly', 'deliverable', 'action item', 'sync', 'call'
        ],
        weight: 1.2
    },
    conflict: {
        keywords: [
            'disagree', 'wrong', 'mistake', 'fail', 'issue', 'problem', 'not true', 
            'but', 'actually', 'unacceptable', 'frustrated', 'no way', 'impossible',
            'refuse', 'blame', 'error', 'delay', 'broken', 'unfair', 'uncomfortable'
        ],
        weight: 1.5
    },
    empathy: {
        keywords: [
            'understand', 'feel', 'difficult', 'hard', 'support', 'help', 'sorry to hear', 
            'bummer', 'that sucks', 'tough', 'exhausting', 'sorry', 'apologize', 
            'listen', 'there for you', 'hear you', 'valid', 'mean a lot'
        ],
        weight: 1.3
    }
};

export const detectIntent = (text) => {
    if (!text || text.length < 3) return 'general';
    
    const lowerText = text.toLowerCase();
    const scores = {
        social: 0,
        professional: 0,
        conflict: 0,
        empathy: 0
    };

    // Check keywords and phrases
    for (const [intent, config] of Object.entries(INTENT_PATTERNS)) {
        config.keywords.forEach(kw => {
            if (lowerText.includes(kw)) {
                // Higher weight for multi-word phrase matches
                const multiplier = kw.includes(' ') ? 1.5 : 1;
                scores[intent] += config.weight * multiplier;
            }
        });
    }

    // Special cases for nuanced detection
    if (/\b(sorry but|sorry, but|i hear you but)\b/.test(lowerText)) {
        scores.conflict += 2.5;
        scores.empathy -= 1;
    }

    if (/\b(not sure|maybe|perhaps)\b/.test(lowerText)) {
        scores.social += 0.5; // Softening language
    }

    let bestIntent = 'general';
    let maxScore = 0.8; // Slightly higher threshold to avoid jitter

    for (const [intent, score] of Object.entries(scores)) {
        if (score > maxScore) {
            maxScore = score;
            bestIntent = intent;
        }
    }

    return bestIntent;
};
