import { pipeline, env, TextStreamer } from '@huggingface/transformers';
import { AppConfig } from './config';
import { analyzeEmotion } from './utils/emotion';
import {
    getCulturalPromptTips,
    getLanguageLearningPromptTips,
    getProfessionalPromptTips,
    detectCulturalContext
} from './utils/culturalContext';

// Include the ConversationTurnManager class directly in the worker
class ConversationTurnManager {
  constructor() {
    this.turns = [];
    this.currentTurn = null;
    this.lastSpeaker = 'user'; // Start assuming user is speaking
    this.turnThreshold = 1500; // 1.5 seconds of silence to consider turn end
    this.lastSpeechTime = 0;
  }

  /**
   * Processes incoming audio and determines if it's a new turn
   * @param {Float32Array} audioData - Audio data from microphone
   * @param {string} detectedText - Text from speech recognition
   * @returns {Object} Turn information
   */
  processAudio(audioData, detectedText = '') {
    const currentTime = Date.now();
    const isSilent = this.isSilent(audioData);

    // Analyze speaker characteristics
    const speakerAnalysis = this.analyzeSpeakerCharacteristics(audioData, this.lastAudioData);
    this.lastAudioData = audioData;

    // Determine if this is likely a new speaker
    const isLikelyNewSpeaker = speakerAnalysis.isLikelyNewSpeaker;

    // Check if enough time has passed to consider a new turn
    const timeSinceLastSpeech = currentTime - this.lastSpeechTime;
    const shouldStartNewTurn = timeSinceLastSpeech > this.turnThreshold || isLikelyNewSpeaker;

    if (!isSilent) {
      this.lastSpeechTime = currentTime;
    }

    // Determine speaker role
    let speakerRole = 'user'; // Default to user
    if (isLikelyNewSpeaker && this.lastSpeaker === 'user') {
      speakerRole = 'other'; // Likely other person speaking
    } else if (isLikelyNewSpeaker && this.lastSpeaker === 'other') {
      speakerRole = 'user'; // Likely back to user
    } else {
      speakerRole = this.lastSpeaker; // Maintain current speaker
    }

    // Create or continue turn
    if (!this.currentTurn || shouldStartNewTurn) {
      // End previous turn if exists
      if (this.currentTurn) {
        this.endCurrentTurn();
      }

      // Start new turn
      this.currentTurn = {
        id: Date.now(),
        startTime: currentTime,
        speaker: speakerRole,
        text: detectedText,
        audioFeatures: speakerAnalysis.features,
        isLikelyNewSpeaker: isLikelyNewSpeaker,
        messages: detectedText ? [{ role: speakerRole, content: detectedText, timestamp: currentTime }] : []
      };
    } else if (detectedText) {
      // Add to current turn
      this.currentTurn.text += ' ' + detectedText;
      this.currentTurn.messages.push({
        role: speakerRole,
        content: detectedText,
        timestamp: currentTime
      });
    }

    this.lastSpeaker = speakerRole;

    return {
      turn: this.currentTurn,
      isLikelyNewSpeaker,
      speakerChangeLikelihood: speakerAnalysis.speakerChangeLikelihood
    };
  }

  /**
   * Analyzes audio characteristics to distinguish between speakers
   * This is a simplified approach - in a real implementation, you'd use more sophisticated audio analysis
   *
   * @param {Float32Array} audioData - Audio data from the microphone
   * @param {Object} previousAudioData - Previous audio data for comparison
   * @returns {Object} Speaker analysis results
   */
  analyzeSpeakerCharacteristics(audioData, previousAudioData = null) {
    // Calculate basic audio features that might help distinguish speakers
    const features = {
      volume: this.calculateRMS(audioData),
      pitchEstimate: this.estimatePitch(audioData),
      speechRate: this.estimateSpeechRate(audioData),
      spectralCentroid: this.calculateSpectralCentroid(audioData)
    };

    // Compare with previous audio to detect potential speaker change
    let speakerChangeLikelihood = 0;
    if (previousAudioData) {
      const prevFeatures = {
        volume: this.calculateRMS(previousAudioData),
        pitchEstimate: this.estimatePitch(previousAudioData),
        speechRate: this.estimateSpeechRate(previousAudioData),
        spectralCentroid: this.calculateSpectralCentroid(previousAudioData)
      };

      // Calculate difference between current and previous features
      const volumeDiff = Math.abs(features.volume - prevFeatures.volume);
      const pitchDiff = Math.abs(features.pitchEstimate - prevFeatures.pitchEstimate);
      const spectralDiff = Math.abs(features.spectralCentroid - prevFeatures.spectralCentroid);

      // Weighted combination of differences to estimate speaker change likelihood
      speakerChangeLikelihood = (volumeDiff * 0.3 + pitchDiff * 0.5 + spectralDiff * 0.2) / 100;
    }

    return {
      features,
      speakerChangeLikelihood,
      isLikelyNewSpeaker: speakerChangeLikelihood > 0.3 // Threshold for considering it a new speaker
    };
  }

  /**
   * Calculates Root Mean Square (RMS) of audio data
   * @param {Float32Array} audioData - Audio data
   * @returns {number} RMS value
   */
  calculateRMS(audioData) {
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
      sum += audioData[i] * audioData[i];
    }
    return Math.sqrt(sum / audioData.length);
  }

  /**
   * Estimates pitch from audio data (simplified approach)
   * @param {Float32Array} audioData - Audio data
   * @returns {number} Estimated pitch
   */
  estimatePitch(audioData) {
    // This is a very simplified pitch estimation
    // In a real implementation, you'd use autocorrelation or other methods
    let maxVal = 0;
    let maxIdx = 0;

    // Find the maximum value in the first portion of the audio
    const sampleSize = Math.min(1000, Math.floor(audioData.length / 4));
    for (let i = 0; i < sampleSize; i++) {
      if (Math.abs(audioData[i]) > maxVal) {
        maxVal = Math.abs(audioData[i]);
        maxIdx = i;
      }
    }

    // Convert to a rough pitch estimate (in Hz)
    // This is not accurate but provides a relative measure
    return 100 + (maxIdx * 50); // Rough estimate between 100-500 Hz
  }

  /**
   * Estimates speech rate from audio data
   * @param {Float32Array} audioData - Audio data
   * @returns {number} Estimated speech rate
   */
  estimateSpeechRate(audioData) {
    // Count zero crossings as a simple measure of speech activity
    let zeroCrossings = 0;
    for (let i = 1; i < audioData.length; i++) {
      if ((audioData[i] >= 0 && audioData[i-1] < 0) || (audioData[i] < 0 && audioData[i-1] >= 0)) {
        zeroCrossings++;
      }
    }

    // Normalize by audio length to get rate
    return (zeroCrossings / audioData.length) * 10000; // Arbitrary scaling
  }

  /**
   * Calculates spectral centroid as a measure of "brightness" of audio
   * @param {Float32Array} audioData - Audio data
   * @returns {number} Spectral centroid
   */
  calculateSpectralCentroid(audioData) {
    // Simplified spectral centroid calculation
    // In a real implementation, you'd use FFT
    let weightedSum = 0;
    let sum = 0;

    // Use a simple approach with the first portion of the signal
    const sampleSize = Math.min(2048, audioData.length);
    for (let i = 0; i < sampleSize; i++) {
      const magnitude = Math.abs(audioData[i]);
      weightedSum += i * magnitude;
      sum += magnitude;
    }

    return sum > 0 ? weightedSum / sum : 0;
  }

  /**
   * Checks if audio data is silent
   * @param {Float32Array} audioData - Audio data
   * @returns {boolean} True if audio is silent
   */
  isSilent(audioData) {
    const rms = this.calculateRMS(audioData);
    return rms < 0.01; // Threshold for silence
  }

  /**
   * Ends the current turn and adds it to history
   */
  endCurrentTurn() {
    if (this.currentTurn) {
      this.currentTurn.endTime = Date.now();
      this.turns.push(this.currentTurn);

      // Keep only recent turns to manage memory
      if (this.turns.length > 20) {
        this.turns = this.turns.slice(-20);
      }
    }
  }

  /**
   * Gets conversation history with speaker identification
   * @returns {Array} Array of messages with speaker information
   */
  getConversationHistory() {
    const history = [];

    // Add completed turns
    this.turns.forEach(turn => {
      turn.messages.forEach(message => {
        history.push({
          role: message.role,
          content: message.content,
          timestamp: message.timestamp,
          turnId: turn.id
        });
      });
    });

    // Add current turn if it has messages
    if (this.currentTurn && this.currentTurn.messages.length > 0) {
      this.currentTurn.messages.forEach(message => {
        history.push({
          role: message.role,
          content: message.content,
          timestamp: message.timestamp,
          turnId: this.currentTurn.id
        });
      });
    }

    return history;
  }

  /**
   * Resets the conversation turn manager
   */
  reset() {
    this.turns = [];
    this.currentTurn = null;
    this.lastSpeaker = 'user';
    this.lastSpeechTime = 0;
  }
}

/**
 * Creates a conversation summary that distinguishes between speakers
 * @param {Array} conversationHistory - History with speaker information
 * @returns {string} Conversation summary
 */
const createSpeakerAwareSummary = (conversationHistory) => {
  if (!conversationHistory || conversationHistory.length === 0) {
    return '';
  }

  // Group messages by speaker to identify conversation flow
  const speakerMessages = {};
  conversationHistory.forEach(msg => {
    if (!speakerMessages[msg.role]) {
      speakerMessages[msg.role] = [];
    }
    speakerMessages[msg.role].push(msg.content);
  });

  // Create summary based on speaker contributions
  const summaryParts = [];

  Object.entries(speakerMessages).forEach(([speaker, messages]) => {
    if (messages.length > 0) {
      // Extract key topics from this speaker's messages
      const topics = extractTopicsFromText(messages.join(' '));
      if (topics.length > 0) {
        summaryParts.push(`${speaker === 'user' ? 'User' : 'Other person'} discussed: ${topics.slice(0, 3).join(', ')}`);
      }
    }
  });

  // Identify the flow of conversation
  if (conversationHistory.length >= 2) {
    const firstSpeaker = conversationHistory[0].role;
    const lastSpeaker = conversationHistory[conversationHistory.length - 1].role;
    summaryParts.push(`Conversation started by ${firstSpeaker === 'user' ? 'you' : 'other person'} and ended with ${lastSpeaker === 'user' ? 'you' : 'other person'}`);
  }

  return summaryParts.join(' | ');
};

/**
 * Analyzes sentiment across an entire conversation
 * @param {Array} conversationHistory - Array of conversation messages [{role, content, timestamp}]
 * @returns {Object} Comprehensive sentiment analysis
 */
const analyzeConversationSentiment = (conversationHistory) => {
  if (!conversationHistory || conversationHistory.length === 0) {
    return {
      overallSentiment: 'neutral',
      sentimentScore: 0,
      emotionalTrend: 'stable',
      speakerSentiments: {},
      keyEmotionalMoments: []
    };
  }

  // Analyze sentiment for each message
  const messageAnalyses = conversationHistory.map((msg, index) => {
    const emotionAnalysis = analyzeEmotion(msg.content);
    return {
      ...msg,
      emotion: emotionAnalysis.emotion,
      emotionConfidence: emotionAnalysis.confidence,
      sentimentScore: getSentimentScoreFromEmotion(emotionAnalysis.emotion, emotionAnalysis.confidence)
    };
  });

  // Calculate overall sentiment
  const overallSentiment = calculateOverallSentiment(messageAnalyses);

  // Analyze trend
  const emotionalTrend = analyzeEmotionalTrend(messageAnalyses);

  // Analyze by speaker
  const speakerSentiments = analyzeBySpeaker(messageAnalyses);

  // Identify key emotional moments
  const keyEmotionalMoments = identifyKeyEmotionalMoments(messageAnalyses);

  return {
    overallSentiment,
    sentimentScore: calculateAverageSentimentScore(messageAnalyses),
    emotionalTrend,
    speakerSentiments,
    keyEmotionalMoments,
    messageAnalyses
  };
};

/**
 * Converts emotion to a numerical sentiment score
 * @param {string} emotion - The emotion detected
 * @param {number} confidence - The confidence of the emotion detection
 * @returns {number} Sentiment score (-1 to 1)
 */
const getSentimentScoreFromEmotion = (emotion, confidence) => {
  const sentimentMap = {
    joy: 0.8,
    surprise: 0.3,
    neutral: 0,
    fear: -0.4,
    sadness: -0.6,
    disgust: -0.7,
    anger: -0.9
  };

  const baseScore = sentimentMap[emotion] || 0;
  return baseScore * confidence; // Weight by confidence
};

/**
 * Calculates the overall sentiment of a conversation
 * @param {Array} messageAnalyses - Array of analyzed messages
 * @returns {string} Overall sentiment category
 */
const calculateOverallSentiment = (messageAnalyses) => {
  const totalScore = messageAnalyses.reduce((sum, msg) => sum + msg.sentimentScore, 0);
  const averageScore = totalScore / messageAnalyses.length;

  if (averageScore > 0.3) return 'positive';
  if (averageScore > -0.1) return 'neutral';
  if (averageScore > -0.4) return 'mixed';
  return 'negative';
};

/**
 * Analyzes the emotional trend over the conversation
 * @param {Array} messageAnalyses - Array of analyzed messages
 * @returns {string} Emotional trend
 */
const analyzeEmotionalTrend = (messageAnalyses) => {
  if (messageAnalyses.length < 2) return 'stable';

  const firstHalf = messageAnalyses.slice(0, Math.ceil(messageAnalyses.length / 2));
  const secondHalf = messageAnalyses.slice(Math.ceil(messageAnalyses.length / 2));

  const firstAvg = firstHalf.reduce((sum, msg) => sum + msg.sentimentScore, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, msg) => sum + msg.sentimentScore, 0) / secondHalf.length;

  const difference = secondAvg - firstAvg;

  if (difference > 0.2) return 'improving';
  if (difference < -0.2) return 'declining';
  return 'stable';
};

/**
 * Analyzes sentiment by speaker
 * @param {Array} messageAnalyses - Array of analyzed messages
 * @returns {Object} Sentiment analysis by speaker
 */
const analyzeBySpeaker = (messageAnalyses) => {
  const speakerData = {};

  messageAnalyses.forEach(msg => {
    const role = msg.role;
    if (!speakerData[role]) {
      speakerData[role] = {
        totalMessages: 0,
        totalSentimentScore: 0,
        emotions: {},
        mostCommonEmotion: 'neutral'
      };
    }

    speakerData[role].totalMessages++;
    speakerData[role].totalSentimentScore += msg.sentimentScore;

    // Track emotions
    if (!speakerData[role].emotions[msg.emotion]) {
      speakerData[role].emotions[msg.emotion] = 0;
    }
    speakerData[role].emotions[msg.emotion]++;
  });

  // Calculate averages and most common emotions
  Object.keys(speakerData).forEach(role => {
    speakerData[role].averageSentimentScore =
      speakerData[role].totalSentimentScore / speakerData[role].totalMessages;

    // Find most common emotion
    let maxCount = 0;
    let mostCommon = 'neutral';
    for (const [emotion, count] of Object.entries(speakerData[role].emotions)) {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = emotion;
      }
    }
    speakerData[role].mostCommonEmotion = mostCommon;
  });

  return speakerData;
};

/**
 * Identifies key emotional moments in the conversation
 * @param {Array} messageAnalyses - Array of analyzed messages
 * @returns {Array} Key emotional moments
 */
const identifyKeyEmotionalMoments = (messageAnalyses) => {
  const keyMoments = [];

  messageAnalyses.forEach((msg, index) => {
    // High emotional intensity moments
    if (Math.abs(msg.sentimentScore) > 0.6) {
      keyMoments.push({
        index,
        type: 'intense_emotion',
        emotion: msg.emotion,
        score: msg.sentimentScore,
        content: msg.content,
        role: msg.role
      });
    }

    // Significant shifts in sentiment
    if (index > 0) {
      const prevMsg = messageAnalyses[index - 1];
      const sentimentChange = Math.abs(msg.sentimentScore - prevMsg.sentimentScore);

      if (sentimentChange > 0.5) {
        keyMoments.push({
          index,
          type: 'sentiment_shift',
          from: prevMsg.emotion,
          to: msg.emotion,
          changeMagnitude: sentimentChange,
          content: msg.content,
          role: msg.role
        });
      }
    }
  });

  // Sort by significance (highest impact first)
  return keyMoments.sort((a, b) => Math.abs(b.score || b.changeMagnitude) - Math.abs(a.score || a.changeMagnitude));
};

/**
 * Calculates the average sentiment score
 * @param {Array} messageAnalyses - Array of analyzed messages
 * @returns {number} Average sentiment score
 */
const calculateAverageSentimentScore = (messageAnalyses) => {
  if (messageAnalyses.length === 0) return 0;

  const totalScore = messageAnalyses.reduce((sum, msg) => sum + msg.sentimentScore, 0);
  return totalScore / messageAnalyses.length;
};

/**
 * Extracts topics from text
 * @param {string} text - Input text
 * @returns {Array} Array of topics
 */
const extractTopicsFromText = (text) => {
  const words = text.toLowerCase().split(/\s+/);

  // Common stop words to filter out
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
    'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
    'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her', 'its', 'our', 'their'
  ]);

  // Count word frequencies
  const wordFreq = {};
  for (const word of words) {
    const cleanWord = word.replace(/[^\w\s]/g, '').trim();
    if (cleanWord.length > 4 && !stopWords.has(cleanWord)) {
      wordFreq[cleanWord] = (wordFreq[cleanWord] || 0) + 1;
    }
  }

  // Get top words as potential topics
  return Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5) // Top 5 potential topics
    .map(([word]) => word);
};

// Configuration for on-device execution
env.allowLocalModels = false;
env.useBrowserCache = true;

// Optimize threads based on hardware
env.backends.onnx.wasm.numThreads = AppConfig.worker.numThreads;
env.backends.onnx.wasm.simd = AppConfig.worker.simd;
env.backends.onnx.wasm.proxy = false;

if (AppConfig.vad.onnxWASMPaths) {
    env.backends.onnx.wasm.wasmPaths = AppConfig.vad.onnxWASMPaths;
}

class MLPipeline {
    static instance = null;
    static stt = null;
    static llm = null;
    static lastUsed = Date.now();
    static inactivityTimer = null;

    static async getInstance() {
        if (!this.instance) {
            this.instance = new MLPipeline();
        }
        return this.instance;
    }

    async loadSTT(progress_callback) {
        if (!MLPipeline.stt) {
            try {
                MLPipeline.stt = await pipeline('automatic-speech-recognition', AppConfig.models.stt.name, {
                    progress_callback,
                    device: AppConfig.models.stt.device,
                    dtype: AppConfig.models.stt.dtype,
                });
            } catch (err) {
                console.error("STT Load Failed:", err);
                throw err;
            }
        }
        MLPipeline.lastUsed = Date.now();
        this.resetInactivityTimer();
    }

    async loadLLM(progress_callback) {
        // Memory Guard: Don't load if memory is already very high on mobile
        const mem = checkMemoryUsage();
        if (AppConfig.isMobile && mem && mem.usagePercent > AppConfig.system.memory.modelUnloadThreshold) {
            console.warn("Memory too high to load LLM:", mem.usagePercent);
            return;
        }

        if (!MLPipeline.llm) {
            try {
                MLPipeline.llm = await pipeline('text-generation', AppConfig.models.llm.name, {
                    progress_callback,
                    device: AppConfig.models.llm.device,
                    dtype: AppConfig.models.llm.dtype,
                });
            } catch (err) {
                console.error("LLM Load Failed:", err);
                throw err;
            }
        }
        MLPipeline.lastUsed = Date.now();
        this.resetInactivityTimer();
    }

    resetInactivityTimer() {
        if (MLPipeline.inactivityTimer) clearTimeout(MLPipeline.inactivityTimer);
        MLPipeline.inactivityTimer = setTimeout(async () => {
            if (Date.now() - MLPipeline.lastUsed >= AppConfig.system.memory.llmInactivityTimeout) {
                await MLPipeline.disposeLLM();
            }
        }, AppConfig.system.memory.llmInactivityTimeout + 100);
    }

    static async disposeLLM() {
        if (MLPipeline.llm) {
            console.log("Disposing LLM to free memory...");
            try {
                if (MLPipeline.llm.model && MLPipeline.llm.model.session) {
                    const sessions = Array.isArray(MLPipeline.llm.model.session) 
                        ? MLPipeline.llm.model.session 
                        : [MLPipeline.llm.model.session];
                    
                    for (const s of sessions) {
                        if (s && typeof s.release === 'function') await s.release();
                    }
                }
                MLPipeline.llm = null;
            } catch (e) {
                console.error("Error during LLM disposal:", e);
                MLPipeline.llm = null;
            }
        }
    }
}

const checkMemoryUsage = () => {
    if (self.performance && self.performance.memory) {
        const memory = self.performance.memory;
        return {
            usedMB: Math.round(memory.usedJSHeapSize / 1024 / 1024),
            usagePercent: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100)
        };
    }
    return null;
};

const throttledProgress = (p, statusPrefix, taskId) => {
    if (p.status === 'progress') {
        self.postMessage({ type: 'status', status: `${statusPrefix}: ${Math.round(p.progress ?? 0)}%`, progress: p.progress, taskId });
    } else if (p.status === 'initiate') {
        self.postMessage({ type: 'status', status: `${statusPrefix}: Initializing...`, taskId });
    } else if (p.status === 'done') {
        self.postMessage({ type: 'status', status: `${statusPrefix}: Ready`, taskId });
    }
};

// Sanitize text to prevent potential XSS issues
const sanitizeText = (text) => {
    if (!text || typeof text !== 'string') {
        return '';
    }

    // Remove potential script tags and other dangerous content
    return text
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/vbscript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .substring(0, AppConfig.system.maxTranscriptLength); // Also enforce length limit
};

// Conversation turn management in worker
let conversationTurnManager = null;

// Initialize conversation turn manager
const initConversationTurnManager = () => {
    if (!conversationTurnManager) {
        conversationTurnManager = new self.ConversationTurnManager();
    }
    return conversationTurnManager;
};

let cachedSystemPrompt = { key: null, content: null };

self.onmessage = async (event) => {
    const { type, audio, taskId, text: _text, persona, history, culturalContext, metadata, preferences } = event.data;
    const pipelineManager = await MLPipeline.getInstance();

    try {
        if (type === 'load') {
            await pipelineManager.loadSTT((p) => throttledProgress(p, 'Speech Engine', taskId));
            await pipelineManager.loadLLM((p) => throttledProgress(p, 'Social Brain', taskId));
            self.postMessage({ type: 'ready', taskId });
        }

        if (type === 'prewarm_llm') {
            await pipelineManager.loadLLM();
        }

        if (type === 'stt') {
            if (!MLPipeline.stt) await pipelineManager.loadSTT();
            MLPipeline.lastUsed = Date.now();
            pipelineManager.resetInactivityTimer();

            const audioData = audio instanceof Float32Array ? audio : new Float32Array(Object.values(audio));

            const sum = audioData.reduce((a, b) => a + b * b, 0);
            const rms = Math.sqrt(sum / audioData.length);
            const duration = audioData.length / 16000;

            const output = await MLPipeline.stt(audioData, {
                chunk_length_s: AppConfig.models.stt.chunk_length_s,
                stride_length_s: AppConfig.models.stt.stride_length_s,
                return_timestamps: false,
            });

            // Sanitize the output text to prevent potential XSS issues
            const sanitizedText = sanitizeText(output.text);

            // Process the text through conversation turn manager
            const turnManager = initConversationTurnManager();
            const turnInfo = turnManager.processAudio(audioData, sanitizedText);

            // Send STT result back to main thread
            self.postMessage({
                type: 'stt_result',
                text: sanitizedText,
                metadata: { rms, duration, turnInfo },
                taskId
            });
        }

        if (type === 'llm') {
            if (!MLPipeline.llm) await pipelineManager.loadLLM((p) => throttledProgress(p, 'Social Brain', taskId));
            if (!MLPipeline.llm) throw new Error("Social Brain failed to load or was deferred due to memory.");

            MLPipeline.lastUsed = Date.now();
            pipelineManager.resetInactivityTimer();

            const personaConfig = AppConfig.models.personas[persona] || AppConfig.models.personas.anxiety;
            const sanitizedText = _text.trim().substring(0, AppConfig.system.maxTranscriptLength);
            const emotionData = analyzeEmotion(sanitizedText);

            // Cached System Prompt Generation
            const promptKey = `${persona}-${culturalContext}-${preferences?.preferredLength}`;
            if (cachedSystemPrompt.key !== promptKey) {
                let contextInstruction = `Persona: ${personaConfig.label}. `;

                // Detect cultural context from the input text
                const detectedCulturalContext = detectCulturalContext(sanitizedText, culturalContext);

                // Use detected cultural context if more specific than current context
                const effectiveCulturalContext = detectedCulturalContext.primaryCulture !== 'general'
                    ? detectedCulturalContext.primaryCulture
                    : culturalContext;

                // Add Cultural Context Tips
                if (effectiveCulturalContext && effectiveCulturalContext !== 'general') {
                    contextInstruction += getCulturalPromptTips(effectiveCulturalContext);
                }

                // Add Persona-specific Contextual Tips
                if (persona === 'languagelearning') {
                    contextInstruction += getLanguageLearningPromptTips(effectiveCulturalContext || 'english');
                } else if (persona === 'meeting' || persona === 'professional') {
                    contextInstruction += getProfessionalPromptTips(persona === 'meeting' ? 'business' : 'academic');
                }

                if (preferences) contextInstruction += `Preference: ${preferences.preferredLength} length. `;

                cachedSystemPrompt = {
                    key: promptKey,
                    content: `${personaConfig.prompt} ${contextInstruction} Respond naturally.`
                };
            }

            // Analyze conversation sentiment
            const conversationSentiment = analyzeConversationSentiment(history || []);

            // Dynamic Context (Not cached)
            let dynamicContext = "";
            if (metadata) {
                const speechRate = sanitizedText.split(/\s+/).length / (metadata.duration || 1);
                if (metadata.rms > 0.01 && speechRate > 3) dynamicContext += "User sounds urgent. ";

                // Add turn information if available
                if (metadata?.turnInfo) {
                    const turnInfo = metadata.turnInfo;
                    if (turnInfo.isLikelyNewSpeaker) {
                        dynamicContext += "Another person may be speaking now. ";
                    }
                }
            }

            // Add emotional context
            if (emotionData.emotion !== 'neutral') dynamicContext += `Emotion: ${emotionData.emotion}. `;

            // Add conversation sentiment context
            if (conversationSentiment.overallSentiment !== 'neutral') {
                dynamicContext += `Overall conversation sentiment: ${conversationSentiment.overallSentiment}. `;
                if (conversationSentiment.emotionalTrend !== 'stable') {
                    dynamicContext += `Trend: ${conversationSentiment.emotionalTrend}. `;
                }
            }

            // Prepare conversation history with proper roles
            const conversationHistory = (history || []).map(m => ({
                role: m.role || 'user',
                content: m.content
            }));

            // Create messages for the LLM
            const messages = [
                { role: "system", content: `${cachedSystemPrompt.content} ${dynamicContext}` },
                ...conversationHistory,
                { role: "user", content: sanitizedText }
            ];

            const streamer = new TextStreamer(MLPipeline.llm.tokenizer, {
                skip_prompt: true,
                skip_special_tokens: true,
                callback_function: (chunk) => {
                    if (chunk) self.postMessage({ type: 'llm_chunk', text: chunk, taskId });
                },
            });

            const output = await MLPipeline.llm(messages, {
                max_new_tokens: AppConfig.models.llm.max_new_tokens,
                temperature: AppConfig.models.llm.temperature,
                do_sample: AppConfig.models.llm.do_sample,
                streamer,
            });

            let response = "";
            if (output[0]?.generated_text) {
                const gen = output[0].generated_text;
                response = Array.isArray(gen) ? gen[gen.length - 1].content : gen;
            }

            // Sanitize the response before sending it back
            const sanitizedResponse = sanitizeText(response.trim());
            self.postMessage({
              type: 'llm_result',
              text: sanitizedResponse,
              emotionData,
              conversationSentiment, // Include conversation sentiment
              taskId
            });
        }
        
        if (type === 'cleanup') {
            await MLPipeline.disposeLLM();
            self.postMessage({ type: 'cleanup_complete', taskId });
        }
    } catch (error) {
        self.postMessage({ type: 'error', error: error.message, taskId });
    }
};