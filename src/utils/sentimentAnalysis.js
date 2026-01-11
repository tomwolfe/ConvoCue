/**
 * Advanced Sentiment Analysis Utility
 * Provides more accurate sentiment analysis using contextual understanding
 */

/**
 * Improved sentiment analysis using contextual clues and negation handling
 * @param {string} text - The text to analyze for sentiment
 * @returns {string} - The detected sentiment ('positive', 'negative', or 'neutral')
 */
export const analyzeSentiment = (text) => {
  if (!text || typeof text !== 'string') {
    return 'neutral';
  }

  // Convert to lowercase for consistent processing
  const lowerText = text.toLowerCase().trim();
  
  // Handle negation patterns (e.g., "not happy", "not bad", "never good")
  const negationPattern = /\b(not|no|never|nothing|nowhere|neither|nor|none|nobody|nothing|hardly|scarcely|barely|doesn't|don't|won't|wouldn't|couldn't|can't|shouldn't|isn't|aren't|wasn't|weren't|hasn't|haven't|hadn't)\b/;
  
  // Define sentiment-bearing phrases and words
  const positivePhrases = [
    'very good', 'really good', 'extremely positive', 'quite positive', 'highly positive',
    'very pleased', 'really pleased', 'extremely pleased', 'quite pleased', 'highly pleased',
    'very satisfied', 'really satisfied', 'extremely satisfied', 'quite satisfied', 'highly satisfied',
    'very happy', 'really happy', 'extremely happy', 'quite happy', 'highly happy',
    'very optimistic', 'really optimistic', 'extremely optimistic', 'quite optimistic', 'highly optimistic',
    'very encouraging', 'really encouraging', 'extremely encouraging', 'quite encouraging', 'highly encouraging',
    'very constructive', 'really constructive', 'extremely constructive', 'quite constructive', 'highly constructive',
    'very successful', 'really successful', 'extremely successful', 'quite successful', 'highly successful',
    'very beneficial', 'really beneficial', 'extremely beneficial', 'quite beneficial', 'highly beneficial',
    'very uplifting', 'really uplifting', 'extremely uplifting', 'quite uplifting', 'highly uplifting',
    'very hopeful', 'really hopeful', 'extremely hopeful', 'quite hopeful', 'highly hopeful',
    'very confident', 'really confident', 'extremely confident', 'quite confident', 'highly confident',
    'very impressed', 'really impressed', 'extremely impressed', 'quite impressed', 'highly impressed',
    'very productive', 'really productive', 'extremely productive', 'quite productive', 'highly productive',
    'very positive outcome', 'really positive outcome', 'extremely positive outcome', 'quite positive outcome',
    'very good progress', 'really good progress', 'extremely good progress', 'quite good progress',
    'very great success', 'really great success', 'extremely great success', 'quite great success',
    'very excellent result', 'really excellent result', 'extremely excellent result', 'quite excellent result',
    'very constructive discussion', 'really constructive discussion', 'extremely constructive discussion',
    'very productive meeting', 'really productive meeting', 'extremely productive meeting',
    'very positive feedback', 'really positive feedback', 'extremely positive feedback'
  ];

  const negativePhrases = [
    'very bad', 'really bad', 'extremely negative', 'quite negative', 'highly negative',
    'very frustrated', 'really frustrated', 'extremely frustrated', 'quite frustrated', 'highly frustrated',
    'very angry', 'really angry', 'extremely angry', 'quite angry', 'highly angry',
    'very disappointed', 'really disappointed', 'extremely disappointed', 'quite disappointed', 'highly disappointed',
    'very upset', 'really upset', 'extremely upset', 'quite upset', 'highly upset',
    'very tense', 'really tense', 'extremely tense', 'quite tense', 'highly tense',
    'very stressful', 'really stressful', 'extremely stressful', 'quite stressful', 'highly stressful',
    'very problematic', 'really problematic', 'extremely problematic', 'quite problematic', 'highly problematic',
    'very concerning', 'really concerning', 'extremely concerning', 'quite concerning', 'highly concerning',
    'very challenging', 'really challenging', 'extremely challenging', 'quite challenging', 'highly challenging',
    'very difficult', 'really difficult', 'extremely difficult', 'quite difficult', 'highly difficult',
    'very poor result', 'really poor result', 'extremely poor result', 'quite poor result',
    'very major issue', 'really major issue', 'extremely major issue', 'quite major issue',
    'very significant problem', 'really significant problem', 'extremely significant problem',
    'very unproductive discussion', 'really unproductive discussion', 'extremely unproductive discussion',
    'very negative feedback', 'really negative feedback', 'extremely negative feedback',
    'very concerning trend', 'really concerning trend', 'extremely concerning trend'
  ];

  // More comprehensive individual sentiment words
  const positiveWords = [
    'positive', 'good', 'great', 'excellent', 'happy', 'satisfied', 'pleased',
    'successful', 'beneficial', 'constructive', 'optimistic', 'encouraging',
    'uplifting', 'hopeful', 'confident', 'impressed', 'pleased', 'satisfied',
    'wonderful', 'fantastic', 'amazing', 'brilliant', 'superb', 'outstanding',
    'remarkable', 'exceptional', 'terrific', 'marvelous', 'fabulous', 'incredible',
    'awesome', 'delighted', 'thrilled', 'ecstatic', 'joyful', 'cheerful', 'content',
    'grateful', 'thankful', 'appreciative', 'delightful', 'enjoyable', 'pleasant',
    'agreeable', 'satisfying', 'fulfilling', 'rewarding', 'valuable', 'worthwhile',
    'advantageous', 'favorable', 'promising', 'bright', 'encouraging', 'upbeat',
    'motivated', 'inspired', 'energized', 'enthusiastic', 'excited', 'eager',
    'confident', 'assured', 'certain', 'secure', 'comfortable', 'peaceful',
    'calm', 'serene', 'tranquil', 'relaxed', 'restful', 'reassuring',
    'supportive', 'helpful', 'kind', 'generous', 'caring', 'compassionate',
    'friendly', 'welcoming', 'inclusive', 'accepting', 'open', 'accessible',
    'collaborative', 'cooperative', 'harmonious', 'unified', 'connected', 'bonded',
    'productive', 'efficient', 'effective', 'fruitful', 'profitable', 'prosperous',
    'progressive', 'forward-thinking', 'innovative', 'creative', 'original', 'ingenious',
    'achievable', 'realistic', 'feasible', 'practical', 'workable', 'viable',
    'stable', 'steady', 'consistent', 'reliable', 'dependable', 'trustworthy',
    'safe', 'secure', 'protected', 'guarded', 'defended', 'sheltered',
    'healthy', 'robust', 'vibrant', 'lively', 'vigorous', 'strong',
    'prosperous', 'flourishing', 'thriving', 'blooming', 'booming', 'expanding',
    'sustainable', 'responsible', 'ethical', 'fair', 'just', 'equitable',
    'love', 'loves', 'loved', 'liking', 'like', 'likes', 'enjoy', 'enjoys', 'enjoyed', 'enjoying'
  ];

  const negativeWords = [
    'negative', 'bad', 'poor', 'terrible', 'sad', 'frustrated', 'angry',
    'problem', 'issue', 'concern', 'difficult', 'challenging', 'worry',
    'concerned', 'disappointed', 'frustrated', 'upset', 'tense', 'stressful',
    'awful', 'horrible', 'dreadful', 'atrocious', 'abysmal', 'appalling',
    'dismal', 'bleak', 'grim', 'gloomy', 'depressing', 'miserable',
    'unhappy', 'miserable', 'sorrowful', 'heartbroken', 'devastated', 'crushed',
    'annoyed', 'irritated', 'exasperated', 'infuriated', 'livid', 'outraged',
    'worried', 'anxious', 'nervous', 'apprehensive', 'fearful', 'alarmed',
    'concerned', 'troubled', 'distressed', 'perturbed', 'troubled', 'disturbed',
    'disappointed', 'let down', 'betrayed', 'frustrated', 'disillusioned', 'disheartened',
    'angry', 'mad', 'furious', 'enraged', 'seething', 'livid',
    'sad', 'unhappy', 'miserable', 'dejected', 'despondent', 'forlorn',
    'lonely', 'isolated', 'abandoned', 'neglected', 'forgotten', 'overlooked',
    'jealous', 'envious', 'covetous', 'resentful', 'bitter', 'sour',
    'guilty', 'ashamed', 'embarrassed', 'humiliated', 'mortified', 'chagrined',
    'scared', 'frightened', 'terrified', 'petrified', 'horrified', 'panicked',
    'stressed', 'overwhelmed', 'burdened', 'loaded', 'swamped', 'flooded',
    'tired', 'exhausted', 'drained', 'worn out', 'fatigued', 'spent',
    'bored', 'uninterested', 'indifferent', 'apathetic', 'unmoved', 'unaffected',
    'confused', 'bewildered', 'perplexed', 'puzzled', 'mystified', 'baffled',
    'uncertain', 'doubtful', 'hesitant', 'tentative', 'unsure', 'wavering',
    'competitive', 'hostile', 'aggressive', 'combative', 'confrontational', 'antagonistic',
    'rigid', 'inflexible', 'stubborn', 'obstinate', 'pigheaded', 'mulish',
    'critical', 'judgmental', 'nitpicky', 'fault-finding', 'carping', 'captious',
    'demanding', 'exacting', 'stringent', 'rigorous', 'onerous', 'burdensome',
    'unreliable', 'inconsistent', 'erratic', 'capricious', 'mercurial', 'volatile',
    'unsafe', 'dangerous', 'hazardous', 'risky', 'treacherous', 'perilous',
    'unhealthy', 'sickly', 'feeble', 'frail', 'weak', 'fragile',
    'unstable', 'volatile', 'shaky', 'wobbly', 'unsteady', 'precarious',
    'unfair', 'unjust', 'biased', 'discriminatory', 'prejudiced', 'partial'
  ];

  // Check for negation in the text
  const hasNegation = negationPattern.test(lowerText);
  
  // Count sentiment-bearing phrases
  let positivePhraseCount = 0;
  let negativePhraseCount = 0;
  
  positivePhrases.forEach(phrase => {
    if (lowerText.includes(phrase)) {
      positivePhraseCount++;
    }
  });
  
  negativePhrases.forEach(phrase => {
    if (lowerText.includes(phrase)) {
      negativePhraseCount++;
    }
  });
  
  // Count individual sentiment words
  let positiveWordCount = 0;
  let negativeWordCount = 0;
  
  positiveWords.forEach(word => {
    if (lowerText.includes(word)) {
      positiveWordCount++;
    }
  });
  
  negativeWords.forEach(word => {
    if (lowerText.includes(word)) {
      negativeWordCount++;
    }
  });
  
  // Calculate weighted scores
  const positiveScore = (positivePhraseCount * 2) + positiveWordCount;
  const negativeScore = (negativePhraseCount * 2) + negativeWordCount;
  
  // Apply negation logic: if negation is present, reverse the sentiment interpretation
  if (hasNegation) {
    // If there's a negation, we flip the interpretation
    // For example, "not happy" would have a positive word but be negative sentiment
    if (positiveScore > 0 && negativeScore === 0) {
      // Text has positive words but negation, so it's likely negative
      return 'negative';
    } else if (negativeScore > 0 && positiveScore === 0) {
      // Text has negative words but negation, so it's likely positive
      return 'positive';
    }
  }
  
  // Determine sentiment based on scores
  if (positiveScore > negativeScore) {
    return 'positive';
  } else if (negativeScore > positiveScore) {
    return 'negative';
  } else {
    // If scores are equal, check for explicit sentiment mentions
    if (lowerText.includes('overall sentiment is') || lowerText.includes('the sentiment is')) {
      if (lowerText.includes('positive')) {
        return 'positive';
      } else if (lowerText.includes('negative')) {
        return 'negative';
      } else {
        return 'neutral';
      }
    }
    return 'neutral';
  }
};

/**
 * Analyzes sentiment with confidence score
 * @param {string} text - The text to analyze
 * @returns {Object} - Object containing sentiment and confidence
 */
export const analyzeSentimentWithConfidence = (text) => {
  const sentiment = analyzeSentiment(text);
  
  // Calculate a basic confidence score based on the strength of signals
  const lowerText = text.toLowerCase();
  
  // Count strong indicators
  const strongPositiveIndicators = [
    'very positive', 'extremely positive', 'highly positive', 'really positive',
    'very good', 'extremely good', 'highly good', 'really good',
    'very happy', 'extremely happy', 'highly happy', 'really happy',
    'very satisfied', 'extremely satisfied', 'highly satisfied', 'really satisfied'
  ].filter(indicator => lowerText.includes(indicator)).length;
  
  const strongNegativeIndicators = [
    'very negative', 'extremely negative', 'highly negative', 'really negative',
    'very bad', 'extremely bad', 'highly bad', 'really bad',
    'very angry', 'extremely angry', 'highly angry', 'really angry',
    'very disappointed', 'extremely disappointed', 'highly disappointed', 'really disappointed'
  ].filter(indicator => lowerText.includes(indicator)).length;
  
  // Calculate confidence based on signal strength
  const totalStrongIndicators = strongPositiveIndicators + strongNegativeIndicators;
  let confidence = 0.5; // Base confidence
  
  if (totalStrongIndicators > 0) {
    confidence = Math.min(0.95, 0.5 + (totalStrongIndicators * 0.1));
  } else {
    // If no strong indicators, check for moderate ones
    const moderateIndicators = [
      'positive', 'good', 'happy', 'satisfied', 'pleased', 'successful',
      'negative', 'bad', 'angry', 'disappointed', 'frustrated', 'concern'
    ].filter(indicator => lowerText.includes(indicator)).length;
    
    if (moderateIndicators > 0) {
      confidence = Math.min(0.8, 0.5 + (moderateIndicators * 0.05));
    }
  }
  
  return {
    sentiment,
    confidence: Math.round(confidence * 100) / 100
  };
};

// Simple cache to store results based on conversation history
const sentimentCache = new Map();

/**
 * Analyzes sentiment across an entire conversation history
 * @param {Array<Object>} conversationHistory - Array of conversation messages with content and role
 * @returns {Object} - Overall sentiment analysis for the conversation
 */
export const analyzeConversationSentiment = (conversationHistory) => {
  // Create a cache key based on the conversation history
  const cacheKey = JSON.stringify(conversationHistory || []);

  // Check if we have a cached result
  if (sentimentCache.has(cacheKey)) {
    return sentimentCache.get(cacheKey);
  }
  if (!conversationHistory || !Array.isArray(conversationHistory) || conversationHistory.length === 0) {
    return {
      overallSentiment: 'neutral',
      sentimentScore: 0,
      participantSentiments: {}
    };
  }

  let totalScore = 0;
  let positiveCount = 0;
  let negativeCount = 0;
  let neutralCount = 0;

  const participantSentiments = {};

  // Analyze each message in the conversation
  conversationHistory.forEach((message, index) => {
    const content = typeof message === 'string' ? message : (message.content || '');
    const role = (typeof message !== 'string' && message.role) ? message.role : 'unknown';

    if (content) {
      const sentimentResult = analyzeSentimentWithConfidence(content);
      const sentiment = sentimentResult.sentiment;

      // Assign numerical values to sentiments for scoring
      let score = 0;
      if (sentiment === 'positive') {
        score = sentimentResult.confidence;
        positiveCount++;
      } else if (sentiment === 'negative') {
        score = -sentimentResult.confidence;
        negativeCount++;
      } else {
        score = 0;
        neutralCount++;
      }

      totalScore += score;

      // Track participant-specific sentiments
      if (role && role !== 'unknown') {
        if (!participantSentiments[role]) {
          participantSentiments[role] = {
            sentimentCount: 0,
            totalScore: 0,
            sentiments: { positive: 0, negative: 0, neutral: 0 }
          };
        }

        participantSentiments[role].sentimentCount++;
        participantSentiments[role].totalScore += score;
        participantSentiments[role].sentiments[sentiment]++;
      }
    }
  });

  // Calculate average sentiment score
  const avgScore = conversationHistory.length > 0 ? totalScore / conversationHistory.length : 0;

  // Determine overall sentiment based on average score
  let overallSentiment;
  if (avgScore > 0.1) {
    overallSentiment = 'positive';
  } else if (avgScore < -0.1) {
    overallSentiment = 'negative';
  } else {
    overallSentiment = 'neutral';
  }

  // Calculate emotional trend
  let emotionalTrend = null;
  if (conversationHistory.length >= 2) {
    // Analyze sentiment of early messages vs later messages
    const earlyMessages = conversationHistory.slice(0, Math.ceil(conversationHistory.length / 2));
    const lateMessages = conversationHistory.slice(Math.floor(conversationHistory.length / 2));

    const earlyAvgSentiment = earlyMessages.reduce((sum, msg) => {
      const content = typeof msg === 'string' ? msg : (msg.content || '');
      if (content) {
        const sentimentResult = analyzeSentimentWithConfidence(content);
        return sum + (sentimentResult.sentiment === 'positive' ? 1 :
                     sentimentResult.sentiment === 'negative' ? -1 : 0);
      }
      return sum;
    }, 0) / earlyMessages.length;

    const lateAvgSentiment = lateMessages.reduce((sum, msg) => {
      const content = typeof msg === 'string' ? msg : (msg.content || '');
      if (content) {
        const sentimentResult = analyzeSentimentWithConfidence(content);
        return sum + (sentimentResult.sentiment === 'positive' ? 1 :
                     sentimentResult.sentiment === 'negative' ? -1 : 0);
      }
      return sum;
    }, 0) / lateMessages.length;

    // Determine trend based on comparison
    if (earlyAvgSentiment < lateAvgSentiment) {
      if (earlyAvgSentiment <= 0 && lateAvgSentiment > 0) {
        emotionalTrend = 'improving';
      } else {
        emotionalTrend = 'becoming more positive';
      }
    } else if (earlyAvgSentiment > lateAvgSentiment) {
      if (earlyAvgSentiment >= 0 && lateAvgSentiment < 0) {
        emotionalTrend = 'declining';
      } else {
        emotionalTrend = 'becoming more negative';
      }
    } else {
      emotionalTrend = 'stable';
    }
  }

  // Normalize participant sentiments
  Object.keys(participantSentiments).forEach(role => {
    const participant = participantSentiments[role];
    participant.avgScore = participant.totalScore / participant.sentimentCount;

    if (participant.avgScore > 0.1) {
      participant.overallSentiment = 'positive';
    } else if (participant.avgScore < -0.1) {
      participant.overallSentiment = 'negative';
    } else {
      participant.overallSentiment = 'neutral';
    }
  });

  // Create message analyses for each message in the conversation
  const messageAnalyses = conversationHistory.map(message => {
    const content = typeof message === 'string' ? message : (message.content || '');
    const role = (typeof message !== 'string' && message.role) ? message.role : 'unknown';

    if (content) {
      const sentimentResult = analyzeSentimentWithConfidence(content);
      return {
        content,
        role,
        sentiment: sentimentResult.sentiment,
        confidence: sentimentResult.confidence
      };
    }

    return {
      content: '',
      role,
      sentiment: 'neutral',
      confidence: 0
    };
  });

  const result = {
    overallSentiment,
    sentimentScore: parseFloat(avgScore.toFixed(3)),
    emotionalTrend,
    messageAnalyses, // Add the message analyses to the result
    participantSentiments,
    statistics: {
      totalMessages: conversationHistory.length,
      positiveMessages: positiveCount,
      negativeMessages: negativeCount,
      neutralMessages: neutralCount
    }
  };

  // Store the result in the cache
  sentimentCache.set(cacheKey, result);

  return result;
};