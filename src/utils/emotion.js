/**
 * @fileoverview Optimized emotional analysis using a pre-computed lookup map for O(1) word checks.
 */

/**
 * Analyzes emotions in text and returns the dominant emotion.
 * Optimized for performance in real-time streaming contexts.
 *
 * @param {string} text - The text to analyze for emotions
 * @returns {Object} An object containing the emotion and confidence level
 * @property {string} emotion - The dominant emotion detected ('joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust', or 'neutral')
 * @property {number} confidence - Confidence level between 0 and 1
 */

const emotionWords = {
    joy: ['happy', 'joy', 'excited', 'wonderful', 'amazing', 'fantastic', 'love', 'pleased', 'delighted', 'thrilled', 'cheerful', 'ecstatic', 'glad', 'jubilant', 'merry', 'overjoyed', 'blissful', 'content', 'grateful', 'optimistic', 'playful', 'satisfied', 'upbeat'],
    sadness: ['sad', 'depressed', 'unhappy', 'miserable', 'sorrow', 'gloomy', 'heartbroken', 'melancholy', 'despair', 'grief', 'mourn', 'sorrowful', 'tearful', 'tragic', 'upset', 'woeful', 'despondent', 'downcast', 'forlorn', 'lonely'],
    anger: ['angry', 'mad', 'furious', 'irate', 'enraged', 'annoyed', 'irritated', 'offended', 'hostile', 'aggressive', 'infuriated', 'livid', 'outraged', 'resentful', 'seething', 'vexed', 'fuming', 'indignant', 'raging'],
    fear: ['afraid', 'scared', 'frightened', 'anxious', 'nervous', 'worried', 'panicked', 'terrified', 'apprehensive', 'dread', 'fearful', 'horrified', 'petrified', 'startled', 'alarmed', 'concerned', 'panicky'],
    surprise: ['surprised', 'shocked', 'amazed', 'astonished', 'astounded', 'stunned', 'flabbergasted', 'dumbfounded', 'speechless', 'unbelievable', 'incredible', 'unexpected', 'wonder', 'gobsmacked'],
    disgust: ['disgusted', 'revolted', 'nauseated', 'sickened', 'repulsed', 'horrified', 'appalled', 'grossed', 'offended', 'repugnant', 'sick', 'vile', 'wretched', 'abhorrent', 'loathing']
};

// Pre-compute lookup map for O(1) access
const emotionLookup = {};
for (const [emotion, words] of Object.entries(emotionWords)) {
    for (const word of words) {
        emotionLookup[word] = emotion;
    }
}

const negationWords = new Set(['not', 'no', 'never', 'hardly', 'barely', 'dont', 'doesnt', 'isnt', 'arent', 'wasnt', 'werent', 'cant', 'couldnt', 'wont']);

/**
 * Analyzes emotions in text and returns the dominant emotion.
 * Optimized for performance in real-time streaming contexts.
 */
export const analyzeEmotion = (text) => {
    if (!text || typeof text !== 'string') {
        return { emotion: 'neutral', confidence: 0 };
    }

    const words = text.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(Boolean);

    if (words.length === 0) return { emotion: 'neutral', confidence: 0 };

    const scores = { joy: 0, sadness: 0, anger: 0, fear: 0, surprise: 0, disgust: 0 };
    let totalScore = 0;
    let isNegated = false;

    for (let i = 0; i < words.length; i++) {
        const word = words[i];

        if (negationWords.has(word)) {
            isNegated = true;
            continue;
        }

        const emotion = emotionLookup[word];
        if (emotion) {
            if (!isNegated) {
                scores[emotion] += 1.0;
                totalScore += 1.0;
            }
            isNegated = false; // Reset negation after applying
        } else {
            // Decay negation if not followed by emotion word within 1 word
            isNegated = false;
        }
    }

    let dominantEmotion = 'neutral';
    let maxScore = 0;

    for (const [emotion, score] of Object.entries(scores)) {
        if (score > maxScore) {
            maxScore = score;
            dominantEmotion = emotion;
        }
    }

    // Additional analysis for context-based emotions
    const contextBasedEmotion = analyzeContextBasedEmotions(text);

    // If context-based emotion has higher confidence, use it
    if (contextBasedEmotion.confidence > (totalScore > 0 ? maxScore / totalScore : 0) && contextBasedEmotion.confidence > 0.5) {
        return contextBasedEmotion;
    }

    return {
        emotion: dominantEmotion,
        confidence: totalScore > 0 ? Math.min(maxScore / totalScore, 1.0) : 0
    };
};

/**
 * Analyzes emotions based on context clues in the text
 * @param {string} text - The text to analyze
 * @returns {Object} An object containing the emotion and confidence level
 */
const analyzeContextBasedEmotions = (text) => {
    const lowerText = text.toLowerCase();

    // Check for context-based emotional indicators
    if (lowerText.includes('thank you') || lowerText.includes('thanks') || lowerText.includes('appreciate')) {
        return { emotion: 'joy', confidence: 0.8 };
    }

    if (lowerText.includes('sorry') || lowerText.includes('apologize') || lowerText.includes('forgive')) {
        return { emotion: 'sadness', confidence: 0.7 };
    }

    if (lowerText.includes('wow') || lowerText.includes('really?') || lowerText.includes('unbelievable')) {
        return { emotion: 'surprise', confidence: 0.8 };
    }

    if (lowerText.includes('scared') || lowerText.includes('worried') || lowerText.includes('nervous')) {
        return { emotion: 'fear', confidence: 0.9 };
    }

    if (lowerText.includes('angry') || lowerText.includes('frustrated') || lowerText.includes('fed up')) {
        return { emotion: 'anger', confidence: 0.9 };
    }

    if (lowerText.includes('disgusting') || lowerText.includes('gross') || lowerText.includes('disgusted')) {
        return { emotion: 'disgust', confidence: 0.9 };
    }

    // Check for question marks indicating surprise or uncertainty
    if ((text.match(/\?/g) || []).length > 1) {
        return { emotion: 'surprise', confidence: 0.6 };
    }

    // Check for exclamation points indicating strong emotion
    if ((text.match(/!/g) || []).length > 2) {
        // Determine which emotion based on other context
        if (lowerText.includes('great') || lowerText.includes('amazing') || lowerText.includes('awesome')) {
            return { emotion: 'joy', confidence: 0.8 };
        } else if (lowerText.includes('no') || lowerText.includes('stop') || lowerText.includes('hate')) {
            return { emotion: 'anger', confidence: 0.7 };
        }
    }

    return { emotion: 'neutral', confidence: 0 };
};