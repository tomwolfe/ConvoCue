/**
 * Enhanced emotional analysis function for more nuanced emotional context
 */

const emotionWords = {
    joy: ['happy', 'joy', 'excited', 'wonderful', 'amazing', 'fantastic', 'love', 'pleased', 'delighted', 'thrilled', 'cheerful', 'delighted', 'ecstatic', 'glad', 'jubilant', 'merry', 'overjoyed', 'pleased', 'tickled'],
    sadness: ['sad', 'depressed', 'unhappy', 'miserable', 'sorrow', 'gloomy', 'heartbroken', 'melancholy', 'despair', 'grief', 'mourn', 'sorrowful', 'tearful', 'tragic', 'upset', 'woeful'],
    anger: ['angry', 'mad', 'furious', 'irate', 'enraged', 'annoyed', 'irritated', 'offended', 'hostile', 'aggressive', 'infuriated', 'livid', 'outraged', 'resentful', 'seething', 'vexed'],
    fear: ['afraid', 'scared', 'frightened', 'anxious', 'nervous', 'worried', 'panicked', 'terrified', 'apprehensive', 'dread', 'fearful', 'horrified', 'petrified', 'startled', 'timid', 'trepidation'],
    surprise: ['surprised', 'shocked', 'amazed', 'astonished', 'astounded', 'stunned', 'flabbergasted', 'dumbfounded', 'speechless', 'unbelievable', 'incredible', 'unexpected', 'startled', 'wonder'],
    disgust: ['disgusted', 'revolted', 'nauseated', 'sickened', 'repulsed', 'horrified', 'appalled', 'grossed', 'offended', 'repugnant', 'sick', 'turned off', 'vile', 'wretched']
};

/**
 * Analyzes emotions in text and returns the dominant emotion
 * @param {string} text - Input text to analyze
 * @returns {Object} - Object with emotion and confidence
 */
export const analyzeEmotion = (text) => {
    if (!text || typeof text !== 'string') {
        return { emotion: 'neutral', confidence: 0 };
    }

    const words = text.toLowerCase().split(/\s+/);
    const emotionScores = {};

    // Calculate scores for each emotion
    for (const [emotion, wordList] of Object.entries(emotionWords)) {
        let score = 0;
        for (const word of words) {
            const cleanWord = word.replace(/[^\w\s]/g, '').trim();
            if (cleanWord && wordList.includes(cleanWord)) {
                score++;
            }
        }
        emotionScores[emotion] = score;
    }

    // Find the dominant emotion
    let dominantEmotion = 'neutral';
    let maxScore = 0;

    for (const [emotion, score] of Object.entries(emotionScores)) {
        if (score > maxScore) {
            maxScore = score;
            dominantEmotion = emotion;
        }
    }

    // If no strong emotion detected, use neutral
    if (maxScore === 0) {
        return { emotion: 'neutral', confidence: 0 };
    }

    // Calculate confidence based on the ratio of dominant emotion to total emotion words
    const totalEmotionWords = Object.values(emotionScores).reduce((sum, val) => sum + val, 0);
    const confidence = totalEmotionWords > 0 ? maxScore / totalEmotionWords : 0;

    return { 
        emotion: dominantEmotion, 
        confidence: Math.min(confidence, 1.0) // Cap at 1.0
    };
};