/**
 * @typedef {import('../types/emotion').EmotionWords} EmotionWords
 * @typedef {import('../types/emotion').VadScores} VadScores
 * @typedef {import('../types/emotion').EmotionAnalysisResult} EmotionAnalysisResult
 * @typedef {import('../types/emotion').SentimentAnalysisResult} SentimentAnalysisResult
 */

/**
 * Enhanced emotional analysis function for more nuanced emotional context
 */

export const emotionWords = {
    joy: ['happy', 'joy', 'excited', 'wonderful', 'amazing', 'fantastic', 'love', 'pleased', 'delighted', 'thrilled', 'cheerful', 'delighted', 'ecstatic', 'glad', 'jubilant', 'merry', 'overjoyed', 'pleased', 'tickled', 'blissful', 'content', 'grateful', 'optimistic', 'playful', 'satisfied', 'upbeat', 'elated', 'gleeful', 'radiant', 'uplifted', 'buoyant', 'jovial', 'mirthful', 'zestful', 'ebullient', 'jubilant', 'sanguine', 'jaunty', 'sprightly'],
    sadness: ['sad', 'depressed', 'unhappy', 'miserable', 'sorrow', 'gloomy', 'heartbroken', 'melancholy', 'despair', 'grief', 'mourn', 'sorrowful', 'tearful', 'tragic', 'upset', 'woeful', 'despondent', 'downcast', 'forlorn', 'grieved', 'heavy-hearted', 'lonely', 'mournful', 'dejected', 'desolate', 'doleful', 'dreary', 'lamentable', 'lugubrious', 'mournful', 'piteous', 'saddened', 'sullen', 'woebegone', 'bereaved', 'disconsolate', 'grievous', 'plaintive'],
    anger: ['angry', 'mad', 'furious', 'irate', 'enraged', 'annoyed', 'irritated', 'offended', 'hostile', 'aggressive', 'infuriated', 'livid', 'outraged', 'resentful', 'seething', 'vexed', 'choleric', 'cross', 'fuming', 'indignant', 'irate', 'provoked', 'raging', 'incensed', 'ireful', 'wrathful', 'choleric', 'implacable', 'inflamed', 'ire', 'livid', 'mad', 'nettled', 'offended', 'peeved', 'rankled', 'seething', 'simmering', 'stormy', 'tempestuous'],
    fear: ['afraid', 'scared', 'frightened', 'anxious', 'nervous', 'worried', 'panicked', 'terrified', 'apprehensive', 'dread', 'fearful', 'horrified', 'petrified', 'startled', 'timid', 'trepidation', 'alarmed', 'concerned', 'daunted', 'dreadful', 'fright', 'hysterical', 'panicky', 'apprehensive', 'cowardly', 'dismayed', 'frightened', 'intimidated', 'leery', 'lethophobic', 'phobic', 'skittish', 'spooked', 'startled', 'timorous', 'trepid', 'unnerved', 'wary', 'worrisome'],
    surprise: ['surprised', 'shocked', 'amazed', 'astonished', 'astounded', 'stunned', 'flabbergasted', 'dumbfounded', 'speechless', 'unbelievable', 'incredible', 'unexpected', 'startled', 'wonder', 'baffled', 'bewildered', 'dumbstruck', 'flummoxed', 'gobsmacked', 'staggered', 'thunderstruck', 'agog', 'amazed', 'astound', 'bemused', 'bewildered', 'confounded', 'dazzled', 'dumfounded', 'flummoxed', 'gobsmacked', 'intrigued', 'marveled', 'perplexed', 'stumped', 'thunderstruck', 'wonder', 'stupefied'],
    disgust: ['disgusted', 'revolted', 'nauseated', 'sickened', 'repulsed', 'horrified', 'appalled', 'grossed', 'offended', 'repugnant', 'sick', 'turned off', 'vile', 'wretched', 'abhorrent', 'contemptuous', 'loathing', 'nauseous', 'repellent', 'revolting', 'sickening', 'abominated', 'anted', 'detested', 'loathe', 'odious', 'repugnant', 'repulsive', 'reviling', 'scornful', 'shocking', 'sickening', 'unsavory', 'vile', 'vomit', 'wretched', 'yucky']
};

/**
 * More sophisticated sentiment analysis using valence, arousal, and dominance (VAD) model
 * @param {string} text - Input text to analyze
 * @returns {VadScores} VAD scores for the text
 */
export const analyzeSentimentVAD = (text) => {
    // Valence (positive/negative), Arousal (calm/excited), Dominance (controlled/in control)
    const vadWords = {
        'love': { valence: 0.8, arousal: 0.6, dominance: 0.5 },
        'hate': { valence: 0.1, arousal: 0.8, dominance: 0.7 },
        'happy': { valence: 0.8, arousal: 0.5, dominance: 0.4 },
        'sad': { valence: 0.2, arousal: 0.3, dominance: 0.2 },
        'angry': { valence: 0.1, arousal: 0.9, dominance: 0.8 },
        'excited': { valence: 0.7, arousal: 0.9, dominance: 0.6 },
        'calm': { valence: 0.6, arousal: 0.2, dominance: 0.5 },
        'scared': { valence: 0.2, arousal: 0.8, dominance: 0.1 },
        'confident': { valence: 0.7, arousal: 0.4, dominance: 0.9 },
        'nervous': { valence: 0.3, arousal: 0.7, dominance: 0.2 },
        'peaceful': { valence: 0.8, arousal: 0.1, dominance: 0.4 },
        'frustrated': { valence: 0.2, arousal: 0.7, dominance: 0.3 },
        'hopeful': { valence: 0.7, arousal: 0.5, dominance: 0.6 },
        'disappointed': { valence: 0.2, arousal: 0.4, dominance: 0.3 },
        'grateful': { valence: 0.9, arousal: 0.4, dominance: 0.5 },
        'anxious': { valence: 0.3, arousal: 0.8, dominance: 0.2 },
        'relaxed': { valence: 0.7, arousal: 0.2, dominance: 0.4 },
        'overwhelmed': { valence: 0.2, arousal: 0.9, dominance: 0.1 }
    };

    if (!text || typeof text !== 'string') {
        return { valence: 0.5, arousal: 0.5, dominance: 0.5 };
    }

    const normalizedText = text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const words = normalizedText.split(/\s+/).filter(w => w.length > 0);

    let totalValence = 0, totalArousal = 0, totalDominance = 0;
    let wordCount = 0;

    for (const word of words) {
        if (vadWords[word]) {
            totalValence += vadWords[word].valence;
            totalArousal += vadWords[word].arousal;
            totalDominance += vadWords[word].dominance;
            wordCount++;
        }
    }

    if (wordCount === 0) {
        return { valence: 0.5, arousal: 0.5, dominance: 0.5 };
    }

    return {
        valence: totalValence / wordCount,
        arousal: totalArousal / wordCount,
        dominance: totalDominance / wordCount
    };
};

/**
 * Analyzes emotions in text and returns the dominant emotion
 * @param {string} text - Input text to analyze
 * @returns {EmotionAnalysisResult} - Object with emotion, confidence, valence, arousal, dominance
 */
export const analyzeEmotion = (text) => {
    if (!text || typeof text !== 'string') {
        return { emotion: 'neutral', confidence: 0, valence: 0.5, arousal: 0.5, dominance: 0.5 };
    }

    // Normalize text: remove extra whitespace, convert to lowercase
    const normalizedText = text.toLowerCase().replace(/\s+/g, ' ').trim();

    // Get VAD scores for more nuanced emotional analysis
    const vadScores = analyzeSentimentVAD(text);

    // Split into words and phrases for more context
    const words = normalizedText.split(/\s+/);
    const phrases = extractPhrases(normalizedText);

    const emotionScores = {};

    // Calculate scores for each emotion based on individual words
    for (const [emotion, wordList] of Object.entries(emotionWords)) {
        let score = 0;

        // Score individual words
        for (const word of words) {
            const cleanWord = word.replace(/[^\w\s]/g, '').trim();
            if (cleanWord && wordList.includes(cleanWord)) {
                score++;
            }
        }

        // Score phrases (which often carry more emotional weight)
        for (const phrase of phrases) {
            for (const emotionWord of wordList) {
                if (phrase.includes(emotionWord)) {
                    // Phrases get higher weight than individual words
                    score += 1.5;
                }
            }
        }

        // Apply negation detection (e.g., "not happy", "not sad")
        const negationWords = ['not', 'no', 'never', 'nothing', 'nowhere', 'neither', 'nor', 'none', 'nobody', 'nothing', 'hardly', 'scarcely', 'barely', 'doesn\'t', 'don\'t', 'won\'t', 'can\'t', 'couldn\'t', 'shouldn\'t', 'wouldn\'t', 'isn\'t', 'aren\'t', 'wasn\'t', 'weren\'t'];
        for (const negation of negationWords) {
            if (normalizedText.includes(negation)) {
                // Look for negation followed by emotion words within a certain distance
                const negationIndex = normalizedText.indexOf(negation);
                for (const emotionWord of wordList) {
                    const emotionIndex = normalizedText.indexOf(emotionWord);
                    if (emotionIndex > negationIndex && emotionIndex - negationIndex < 10) { // Within 10 characters
                        score = Math.max(0, score - 1); // Reduce score for negated emotions
                    }
                }
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
        return {
            emotion: 'neutral',
            confidence: 0,
            valence: vadScores.valence,
            arousal: vadScores.arousal,
            dominance: vadScores.dominance
        };
    }

    // Calculate confidence based on the ratio of dominant emotion to total emotion words
    const totalEmotionWords = Object.values(emotionScores).reduce((sum, val) => sum + val, 0);
    let confidence = totalEmotionWords > 0 ? maxScore / totalEmotionWords : 0;

    // Adjust confidence based on text length and complexity
    const textLength = normalizedText.length;
    if (textLength < 10) {
        // Short texts may have less reliable emotion detection
        confidence *= 0.7;
    } else if (textLength > 50) {
        // Longer texts may have more nuanced emotions
        confidence = Math.min(1.0, confidence * 1.2);
    }

    return {
        emotion: dominantEmotion,
        confidence: Math.min(confidence, 1.0), // Cap at 1.0
        valence: vadScores.valence,
        arousal: vadScores.arousal,
        dominance: vadScores.dominance
    };
};

/**
 * Extracts common phrases from text for more contextual emotion analysis
 * @param {string} text - Input text to analyze
 * @returns {Array} - Array of phrases
 */
const extractPhrases = (text) => {
    // Simple phrase extraction based on common emotional expressions
    const phrasePatterns = [
        /\b(?:i am|i'm|i feel|i'm feeling|i feel like)\s+(\w+)\b/gi,
        /\b(?:very|really|extremely|quite|so|super|incredibly)\s+(\w+)\b/gi,
        /\b(?:feeling|feels|felt)\s+(\w+)\b/gi,
        /\b(?:getting|get|gets)\s+(\w+)\b/gi,
        /\b(?:becoming|become|becomes)\s+(\w+)\b/gi,
        /\b(?:kind of|sort of|a little|somewhat)\s+(\w+)\b/gi
    ];

    const phrases = [];
    for (const pattern of phrasePatterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            phrases.push(match[0]);
        }
    }

    return phrases;
};
