import { pipeline, env, TextStreamer } from '@huggingface/transformers';
import { AppConfig } from './config';
import { analyzeEmotion } from './utils/emotion';
import {
    getCulturalPromptTips,
    getLanguageLearningPromptTips,
    getProfessionalPromptTips,
    detectCulturalContext,
    getSocialNuanceTips,
    getHighStakesTips
} from './utils/culturalContext';
import {
    ConversationTurnManager
} from './utils/speakerDetection';
import {
    analyzeConversationSentiment
} from './utils/sentimentAnalysis';
import {
    analyzeRelationshipCoaching,
    generateRelationshipCoachingPrompt
} from './utils/relationshipCoaching';
import {
    analyzeAnxietyCoaching,
    generateAnxietyCoachingPrompt
} from './utils/anxietyCoaching';
import {
    analyzeProfessionalCoaching,
    analyzeMeetingCoaching
} from './utils/professionalCoaching';
import { estimateConversationSize, logPerformanceMetric, monitorAndOptimizeHistory } from './utils/performanceMonitoring';
import {
    assessDeviceCapabilities,
    getOptimalModelConfig,
    checkMemoryAdequacy,
    createProgressiveLoadingStrategy
} from './utils/performanceOptimizer';
import {
    provideContextualLanguageFeedback,
    analyzeLanguageLearningText,
    generateLanguageLearningResponse
} from './utils/languageLearning';
import {
    coordinateFeaturesInResponse,
    resolveFeatureConflicts,
    validateInsightsConsistency
} from './utils/featureCoordination';

// Configuration for on-device execution
const deviceCapabilities = assessDeviceCapabilities();

env.allowLocalModels = false;
env.useBrowserCache = true;

// Optimize threads based on hardware
env.backends.onnx.wasm.numThreads = deviceCapabilities.hardwareConcurrency || AppConfig.worker.numThreads;
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
        try {
            // Get optimized STT configuration based on device capabilities
            const optimizedSTTConfig = getOptimalModelConfig('stt', deviceCapabilities);

            // Check memory before loading STT model
            const mem = checkMemoryUsage();
            if (mem && mem.usagePercent > AppConfig.system.memory.modelUnloadThreshold) {
                console.warn("Memory too high to load STT:", mem.usagePercent);
                self.postMessage({
                    type: 'status',
                    status: 'Speech Engine deferred (Low Memory)',
                    isLowMemory: true
                });
                return;
            }

            if (!MLPipeline.stt) {
                // Dispose any existing LLM to free up memory before loading STT
                await MLPipeline.disposeLLM();

                MLPipeline.stt = await pipeline('automatic-speech-recognition', optimizedSTTConfig.name, {
                    progress_callback,
                    device: optimizedSTTConfig.device,
                    dtype: optimizedSTTConfig.dtype,
                });

                // Store the configuration used for this model
                MLPipeline.sttConfig = optimizedSTTConfig;
            }
            MLPipeline.lastUsed = Date.now();
            this.resetInactivityTimer();
        } catch (err) {
            console.error("STT Load Failed:", err);
            self.postMessage({
                type: 'error',
                error: `Speech recognition model failed to load: ${err.message || 'Unknown error'}`
            });
            throw err;
        }
    }

    async loadLLM(progress_callback) {
        try {
            // Get optimized LLM configuration based on device capabilities
            const optimizedLLMConfig = getOptimalModelConfig('llm', deviceCapabilities);

            // Check memory adequacy for both models
            const memoryCheck = checkMemoryAdequacy(
                MLPipeline.sttConfig || getOptimalModelConfig('stt', deviceCapabilities),
                optimizedLLMConfig
            );

            console.log(`[Worker] Memory check: ${memoryCheck.totalMemoryMB}MB total, ${memoryCheck.availableMemoryMB}MB available, Adequate: ${memoryCheck.isAdequate}`);

            // Memory Guard: Don't load if memory is already very high
            const mem = checkMemoryUsage();
            if (mem && mem.usagePercent > AppConfig.system.memory.modelUnloadThreshold) {
                console.warn("Memory too high to load LLM:", mem.usagePercent);
                self.postMessage({
                    type: 'status',
                    status: 'Social Brain deferred (Low Memory)',
                    isLowMemory: true
                });
                return;
            }

            if (!MLPipeline.llm) {
                // Dispose STT temporarily if needed to free up memory for LLM
                if (MLPipeline.stt && deviceCapabilities.capabilities.isLowSpec) {
                    console.log("Temporarily disposing STT to make room for LLM on low-spec device");
                    try {
                        if (MLPipeline.stt.processor && MLPipeline.stt.processor.session) {
                            await MLPipeline.stt.processor.session.release();
                        }
                        if (MLPipeline.stt.model && MLPipeline.stt.model.session) {
                            await MLPipeline.stt.model.session.release();
                        }
                    } catch (disposeErr) {
                        console.warn("Error disposing STT for LLM loading:", disposeErr);
                    }
                }

                // Signal that we are starting to load heavy model
                self.postMessage({ type: 'status', status: 'Loading Social Brain...' });

                MLPipeline.llm = await pipeline('text-generation', optimizedLLMConfig.name, {
                    progress_callback,
                    device: optimizedLLMConfig.device,
                    dtype: optimizedLLMConfig.dtype,
                });

                // Store the configuration used for this model
                MLPipeline.llmConfig = optimizedLLMConfig;
            }
            MLPipeline.lastUsed = Date.now();
            this.resetInactivityTimer();
        } catch (err) {
            console.error("LLM Load Failed:", err);
            self.postMessage({
                type: 'error',
                error: `AI model failed to load: ${err.message || 'Unknown error'}`
            });
            throw err;
        }
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
                // Properly dispose of the model session
                if (MLPipeline.llm.model && MLPipeline.llm.model.session) {
                    const sessions = Array.isArray(MLPipeline.llm.model.session)
                        ? MLPipeline.llm.model.session
                        : [MLPipeline.llm.model.session];

                    for (const s of sessions) {
                        if (s && typeof s.release === 'function') {
                            try {
                                await s.release();
                            } catch (releaseErr) {
                                console.warn("Error releasing session:", releaseErr);
                            }
                        }
                    }
                }

                // Also dispose tokenizer if it has resources to release
                if (MLPipeline.llm.tokenizer && typeof MLPipeline.llm.tokenizer.release === 'function') {
                    try {
                        await MLPipeline.llm.tokenizer.release();
                    } catch (tokenizerErr) {
                        console.warn("Error releasing tokenizer:", tokenizerErr);
                    }
                }

                MLPipeline.llm = null;
            } catch (e) {
                console.error("Error during LLM disposal:", e);
                MLPipeline.llm = null;
            }
        }
    }

    // Method to dispose of STT model to free memory
    static async disposeSTT() {
        if (MLPipeline.stt) {
            console.log("Disposing STT to free memory...");
            try {
                if (MLPipeline.stt.processor && MLPipeline.stt.processor.session) {
                    try {
                        await MLPipeline.stt.processor.session.release();
                    } catch (processorErr) {
                        console.warn("Error releasing processor session:", processorErr);
                    }
                }
                if (MLPipeline.stt.model && MLPipeline.stt.model.session) {
                    try {
                        await MLPipeline.stt.model.session.release();
                    } catch (modelErr) {
                        console.warn("Error releasing model session:", modelErr);
                    }
                }
                MLPipeline.stt = null;
            } catch (e) {
                console.error("Error during STT disposal:", e);
                MLPipeline.stt = null;
            }
        }
    }

    // Method to dispose all models and free memory
    static async disposeAll() {
        await MLPipeline.disposeLLM();
        await MLPipeline.disposeSTT();
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

// Performance tracking for adaptive downgrading
const performanceStats = {
    audioProcessingTimes: [],
    llmProcessingTimes: [],
    mode: 'optimal' // 'optimal', 'balanced', 'minimal'
};

// Conversation turn management in worker
let conversationTurnManager = null;

const updatePerformanceMode = (time, type) => {
    const list = type === 'audio' ? performanceStats.audioProcessingTimes : performanceStats.llmProcessingTimes;
    list.push(time);
    if (list.length > 5) list.shift();

    const avg = list.reduce((a, b) => a + b, 0) / list.length;
    
    if (type === 'audio') {
        if (avg > 300) performanceStats.mode = 'minimal';
        else if (avg > 150) performanceStats.mode = 'balanced';
        else performanceStats.mode = 'optimal';
    }
};

// Initialize conversation turn manager
const initConversationTurnManager = () => {
    if (!conversationTurnManager) {
        conversationTurnManager = new ConversationTurnManager();
    }
    return conversationTurnManager;
};

let cachedSystemPrompt = { key: null, content: null };

/**
 * Validates coaching insights to prevent oversized or malformed data
 * @param {Object} insights - The coaching insights object to validate
 * @returns {Object|null} Validated insights or null if invalid/malformed
 */
const validateCoachingInsights = (insights) => {
  if (!insights) return null;

  // Check if it's a valid object
  if (typeof insights !== 'object' || Array.isArray(insights)) {
    console.warn('[Worker] Invalid coaching insights format, rejecting');
    return null;
  }

  // Limit the size of insights to prevent memory issues
  const serialized = JSON.stringify(insights);
  if (serialized.length > AppConfig.system.maxCoachingInsightsSize || serialized.length > 100000) { // 100KB limit
    console.warn('[Worker] Coaching insights too large, rejecting');
    return null;
  }

  // Validate structure
  if (insights.insights && !Array.isArray(insights.insights)) {
    console.warn('[Worker] Invalid insights array format, rejecting');
    return null;
  }

  if (insights.copingStrategies && !Array.isArray(insights.copingStrategies)) {
    console.warn('[Worker] Invalid coping strategies array format, rejecting');
    return null;
  }

  // Limit number of insights and strategies
  if (insights.insights && insights.insights.length > 20) {
    console.warn('[Worker] Too many insights, limiting to 20');
    insights.insights = insights.insights.slice(0, 20);
  }

  if (insights.copingStrategies && insights.copingStrategies.length > 20) {
    console.warn('[Worker] Too many coping strategies, limiting to 20');
    insights.copingStrategies = insights.copingStrategies.slice(0, 20);
  }

  return insights;
};

self.onmessage = async (event) => {
    const {
        type, audio, taskId, text: _text, persona, history,
        communicationProfile, insightCategoryScores, culturalContext,
        metadata, preferences, settings: _settings
    } = event.data;

    try {
        const pipelineManager = await MLPipeline.getInstance();

        // Determine effective settings (prefer passed settings, fallback to minimal if missing)
        const settings = _settings || {
            enablePersonalization: true,
            enableSpeakerDetection: true,
            enableSentimentAnalysis: true,
            privacyMode: false
        };

        if (type === 'load') {
            try {
                // Create progressive loading strategy based on device capabilities
                const loadingStrategy = createProgressiveLoadingStrategy(deviceCapabilities);

                console.log(`[Worker] Using ${loadingStrategy.initialLoad.length} initial models for ${deviceCapabilities.performanceTier} performance tier`);

                // Load initial models based on strategy
                if (loadingStrategy.initialLoad.includes('stt')) {
                    await pipelineManager.loadSTT((p) => throttledProgress(p, 'Speech Engine', taskId));
                }

                if (loadingStrategy.initialLoad.includes('llm')) {
                    await pipelineManager.loadLLM((p) => throttledProgress(p, 'Social Brain', taskId));
                }

                // For low-spec devices, only load STT initially and defer LLM loading
                if (loadingStrategy.initialLoad.includes('minimal_stt')) {
                    await pipelineManager.loadSTT((p) => throttledProgress(p, 'Speech Engine', taskId));
                    // LLM will be loaded later when needed
                    self.postMessage({
                        type: 'ready',
                        taskId,
                        status: 'Minimal mode: STT loaded, LLM will load on demand',
                        isLowSpec: true
                    });
                } else {
                    self.postMessage({ type: 'ready', taskId });
                }
            } catch (loadError) {
                console.error("Model loading failed:", loadError);
                self.postMessage({
                    type: 'error',
                    error: `Model loading failed: ${loadError.message || 'Unknown error'}`,
                    taskId
                });
                return;
            }
        }

        if (type === 'prewarm_llm') {
            try {
                await pipelineManager.loadLLM();
            } catch (prewarmError) {
                console.error("LLM prewarming failed:", prewarmError);
                self.postMessage({
                    type: 'error',
                    error: `LLM prewarming failed: ${prewarmError.message || 'Unknown error'}`,
                    taskId
                });
            }
        }

        if (type === 'performance_update') {
            performanceStats.mode = event.data.mode;
            console.log(`[Worker] Performance mode manually set to: ${performanceStats.mode} (Reason: ${event.data.reason})`);
        }

        if (type === 'stt') {
            try {
                if (!MLPipeline.stt) await pipelineManager.loadSTT();
                MLPipeline.lastUsed = Date.now();
                pipelineManager.resetInactivityTimer();

                const audioStartTime = performance.now();
                const audioData = audio instanceof Float32Array ? audio : new Float32Array(Object.values(audio));

                const sum = audioData.reduce((a, b) => a + b * b, 0);
                const rms = Math.sqrt(sum / audioData.length);
                const duration = audioData.length / 16000;

                const output = await MLPipeline.stt(audioData, {
                    chunk_length_s: AppConfig.models.stt.chunk_length_s,
                    stride_length_s: AppConfig.models.stt.stride_length_s,
                    return_timestamps: false,
                });

                const audioProcessingTime = performance.now() - audioStartTime;

                // Sanitize the output text to prevent potential XSS issues
                const sanitizedText = sanitizeText(output.text);

                // Process the text through conversation turn manager
                const turnManager = initConversationTurnManager();
                let turnInfo = null;
                let speakerDetectionTime = 0;

                // Only run speaker detection if enabled, NOT in minimal mode, and NOT in privacy mode
                if (performanceStats.mode !== 'minimal' &&
                    settings.enableSpeakerDetection !== false &&
                    !settings.privacyMode) {
                    const speakerDetectionStartTime = performance.now();
                    turnInfo = turnManager.processAudio(audioData, sanitizedText);
                    speakerDetectionTime = performance.now() - speakerDetectionStartTime;
                } else {
                    // Simplified turn management for minimal mode or when disabled
                    turnInfo = { turn: { speaker: 'user' }, isLikelyNewSpeaker: false };
                }

                updatePerformanceMode(audioProcessingTime, 'audio');

                // Send STT result back to main thread with performance metrics
                self.postMessage({
                    type: 'stt_result',
                    text: sanitizedText,
                    metadata: {
                        rms,
                        duration,
                        turnInfo,
                        performance: {
                            audioProcessingTime,
                            speakerDetectionTime,
                            mode: performanceStats.mode
                        }
                    },
                    taskId
                });
            } catch (sttError) {
                console.error("STT processing failed:", sttError);
                self.postMessage({
                    type: 'error',
                    error: `Speech recognition failed: ${sttError.message || 'Unknown error'}`,
                    taskId
                });
                return;
            }
        }

        if (type === 'llm') {
            try {
                const startTime = performance.now();

                // Check if LLM is loaded, and if not, load it (especially important for deferred loading)
                if (!MLPipeline.llm) {
                    // For low-spec devices, we may need to temporarily unload STT to make room
                    if (MLPipeline.stt && deviceCapabilities.capabilities.isLowSpec) {
                        console.log("Unloading STT temporarily to make room for LLM on low-spec device");
                        await MLPipeline.disposeSTT();
                    }

                    await pipelineManager.loadLLM((p) => throttledProgress(p, 'Social Brain', taskId));
                }

                if (!MLPipeline.llm) throw new Error("Social Brain failed to load or was deferred due to memory.");

                MLPipeline.lastUsed = Date.now();
                pipelineManager.resetInactivityTimer();

                const personaConfig = AppConfig.models.personas[persona] || AppConfig.models.personas.anxiety;
                const sanitizedText = _text.trim().substring(0, AppConfig.system.maxTranscriptLength);
                const emotionData = analyzeEmotion(sanitizedText);

                // Dynamic Resource Allocation based on Performance Mode and Device Capabilities
                const baseMaxTokens = MLPipeline.llmConfig ? MLPipeline.llmConfig.max_new_tokens : AppConfig.models.llm.max_new_tokens;
                const maxTokens = performanceStats.mode === 'minimal'
                    ? Math.min(32, baseMaxTokens)
                    : performanceStats.mode === 'balanced'
                        ? Math.min(64, baseMaxTokens)
                        : baseMaxTokens;

                // Deep Coaching Analysis Decision
                // We prioritize battery life and responsiveness over analysis depth in minimal mode.
                // Determines if Auto-Persona is enabled, indicating user preference for sophisticated AI assistance.
                const isPowerSavingMode = performanceStats.mode === 'minimal';
                const isAutoPersonaEnabled = _settings?.enableAutoPersona !== false;
                const shouldRunDeepAnalysis = !isPowerSavingMode;

                // Detect cultural context from the input text (moved earlier for use in deep analysis)
                const detectedCulturalContext = detectCulturalContext(sanitizedText, culturalContext);

                // Use detected cultural context if more specific than current context
                const effectiveCulturalContext = detectedCulturalContext.primaryCulture !== 'general'
                    ? detectedCulturalContext.primaryCulture
                    : culturalContext;

                // Perform coaching analysis based on persona - Skip if in power saving mode
                let relationshipInsights = null;
                let anxietyInsights = null;
                let professionalInsights = null;
                let meetingInsights = null;
                let languageLearningInsights = null;
                let coachingAnalysisTime = 0;

                if (shouldRunDeepAnalysis) {
                    const coachingStartTime = performance.now();

                    relationshipInsights = (persona === 'relationship')
                        ? analyzeRelationshipCoaching(sanitizedText, history, emotionData, insightCategoryScores)
                        : null;

                    anxietyInsights = (persona === 'anxiety')
                        ? analyzeAnxietyCoaching(sanitizedText, history, emotionData)
                        : null;

                    professionalInsights = (persona === 'professional')
                        ? analyzeProfessionalCoaching(sanitizedText, history, emotionData, insightCategoryScores)
                        : null;

                    meetingInsights = (persona === 'meeting')
                        ? analyzeMeetingCoaching(sanitizedText, history, emotionData, insightCategoryScores)
                        : null;

                    // Add language learning insights for language learning persona
                    if (persona === 'languagelearning') {
                        languageLearningInsights = provideContextualLanguageFeedback(sanitizedText, effectiveCulturalContext || 'general', history);
                    }

                    coachingAnalysisTime = performance.now() - coachingStartTime;

                    // Coordinate insights to handle potential conflicts between features
                    const allInsights = {
                        relationship: relationshipInsights,
                        anxiety: anxietyInsights,
                        professional: professionalInsights,
                        meeting: meetingInsights,
                        language: languageLearningInsights
                    };

                    // Resolve conflicts between different insights
                    const coordinatedInsights = resolveFeatureConflicts(allInsights, persona);

                    // Update the insight variables with coordinated versions
                    relationshipInsights = coordinatedInsights.relationship;
                    anxietyInsights = coordinatedInsights.anxiety;
                    professionalInsights = coordinatedInsights.professional;
                    meetingInsights = coordinatedInsights.meeting;
                    languageLearningInsights = coordinatedInsights.language;
                }

                // Cached System Prompt Generation
                const isSubtleMode = _settings?.isSubtleMode || preferences?.isSubtleMode;
                const profileHash = communicationProfile ? communicationProfile.length : 0;
                const promptKey = `${persona}-${culturalContext}-${preferences?.preferredLength}-${isSubtleMode ? 'subtle' : 'normal'}-${profileHash}`;
                if (cachedSystemPrompt.key !== promptKey) {
                    let contextInstruction = `Persona: ${personaConfig.label}. `;

                    // Add Communication Profile (Long-term memory)
                    if (communicationProfile) {
                        contextInstruction += `${communicationProfile} `;
                    }

                    // Add Cultural Context Tips
                    if (effectiveCulturalContext && effectiveCulturalContext !== 'general') {
                        contextInstruction += getCulturalPromptTips(effectiveCulturalContext);
                    }

                    // Add Social Nuance and High-Stakes Tips
                    const socialTips = getSocialNuanceTips(sanitizedText);
                    if (socialTips) {
                        contextInstruction += `Social Tips: ${socialTips} `;
                    }

                    if (persona === 'meeting' || persona === 'professional') {
                        const highStakesCategory = sanitizedText.toLowerCase().includes('negotiate') || sanitizedText.toLowerCase().includes('price')
                            ? 'negotiation'
                            : 'leadership';
                        contextInstruction += getHighStakesTips(highStakesCategory);
                    }

                    // Add Persona-specific Contextual Tips
                    if (persona === 'languagelearning') {
                        // Perform advanced language learning analysis
                        const languageAnalysis = analyzeLanguageLearningText(sanitizedText, effectiveCulturalContext || 'general');

                        // Add language learning prompt tips
                        contextInstruction += getLanguageLearningPromptTips(effectiveCulturalContext || 'english');

                        // Include specific grammar corrections if needed
                        if (languageAnalysis.grammarErrors.length > 0) {
                            const grammarTips = languageAnalysis.grammarErrors.map(error => error.explanation).join('; ');
                            contextInstruction += `Grammar correction: ${grammarTips}. `;
                        }

                        // Include vocabulary suggestions
                        if (languageAnalysis.vocabularySuggestions.length > 0) {
                            const vocabTips = languageAnalysis.vocabularySuggestions.map(suggestion => `Instead of "${suggestion.original}", consider "${suggestion.alternatives[0]}".`).join(' ');
                            contextInstruction += `Vocabulary tip: ${vocabTips} `;
                        }
                    } else if (persona === 'meeting' || persona === 'professional') {
                        contextInstruction += getProfessionalPromptTips(persona === 'meeting' ? 'business' : 'academic');
                    }

                    // Enhanced relationship coaching for relationship persona
                    if (relationshipInsights && persona === 'relationship') {
                        const relationshipPrompt = generateRelationshipCoachingPrompt(relationshipInsights, persona);
                        if (relationshipPrompt) {
                            contextInstruction += relationshipPrompt + " ";
                        }
                    }

                    // Enhanced anxiety coaching for anxiety persona
                    if (anxietyInsights && persona === 'anxiety') {
                        const anxietyPrompt = generateAnxietyCoachingPrompt(anxietyInsights);
                        if (anxietyPrompt) {
                            contextInstruction += anxietyPrompt + " ";
                        }
                    }

                    if (isSubtleMode) {
                        contextInstruction += "SUBTLE MODE ACTIVE: Provide ONLY extremely brief, context-aware Quick Cues (1-5 words). No full sentences. Examples: 'Pause', 'Smile', 'Ask', 'Consider', 'Hmm'. ";
                    } else if (preferences) {
                        contextInstruction += `Preference: ${preferences.preferredLength} length. `;
                    }

                    // Standardized Intent Tagging for Haptics & UI
                    contextInstruction += "IMPORTANT: Always include semantic tags in square brackets for specific cues: [conflict] for de-escalation, [action item] for follow-ups, [strategic] for negotiations, [social tip] for etiquette, [language tip] for phrasing, [empathy] for emotional support. [empathy] tags are especially important for relationship coaching. ";

                    cachedSystemPrompt = {
                        key: promptKey,
                        content: `${personaConfig.prompt} ${contextInstruction} Respond naturally.`
                    };
                }

                // Resource Governor: Throttling and conditional execution
                const isShortUtterance = sanitizedText.split(/\s+/).length < 3;
                const timeSinceLastLLM = Date.now() - (MLPipeline.lastLLMCallTime || 0);
                const isHighFrequency = timeSinceLastLLM < 2000;

                // Skip deep sentiment analysis for very short or high-frequency utterances
                // OR if we are in minimal performance mode
                // OR if sentiment analysis is disabled in settings
                // OR if privacy mode is enabled
                let conversationSentiment = { overallSentiment: 'neutral', emotionalTrend: 'stable' };
                let sentimentAnalysisTime = 0;

                if (performanceStats.mode !== 'minimal' &&
                    settings.enableSentimentAnalysis !== false &&
                    !settings.privacyMode &&
                    (!isShortUtterance || !isHighFrequency)) {
                    const sentimentAnalysisStartTime = performance.now();
                    conversationSentiment = analyzeConversationSentiment(history || []);
                    sentimentAnalysisTime = performance.now() - sentimentAnalysisStartTime;
                }

                MLPipeline.lastLLMCallTime = Date.now();

                // Dynamic Context (Not cached)
                let dynamicContext = "";
                if (metadata && !settings.privacyMode) {
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

                // Add emotional context (if not in privacy mode)
                if (!settings.privacyMode && emotionData.emotion !== 'neutral') {
                    dynamicContext += `Emotion: ${emotionData.emotion}. `;
                }

                // Add conversation sentiment context (if not in privacy mode)
                if (!settings.privacyMode && conversationSentiment.overallSentiment !== 'neutral') {
                    dynamicContext += `Overall conversation sentiment: ${conversationSentiment.overallSentiment}. `;
                    if (conversationSentiment.emotionalTrend !== 'stable') {
                        dynamicContext += `Trend: ${conversationSentiment.emotionalTrend}. `;
                    }
                }

                // Prepare conversation history with proper roles
                const conversationHistory = monitorAndOptimizeHistory((history || []).map(m => ({
                    role: m.role || 'user',
                    content: m.content
                })));

                // Performance monitoring for large histories
                const historySize = estimateConversationSize(conversationHistory);
                if (historySize > 10000) { // More than 10KB of history
                    console.warn(`Large conversation history detected: ${historySize} characters`);
                }

                // Create messages for the LLM
                const messages = [
                    { role: "system", content: `${cachedSystemPrompt.content} ${dynamicContext}` },
                    ...conversationHistory,
                    { role: "user", content: sanitizedText }
                ];

                const llmStartTime = performance.now();
                const streamer = new TextStreamer(MLPipeline.llm.tokenizer, {
                    skip_prompt: true,
                    skip_special_tokens: true,
                    callback_function: (chunk) => {
                        if (chunk) self.postMessage({ type: 'llm_chunk', text: chunk, taskId });
                    },
                });

                const output = await MLPipeline.llm(messages, {
                    max_new_tokens: maxTokens,
                    temperature: AppConfig.models.llm.temperature,
                    do_sample: AppConfig.models.llm.do_sample,
                    streamer,
                });

                let response = "";
                if (output[0]?.generated_text) {
                    const gen = output[0].generated_text;
                    response = Array.isArray(gen) ? gen[gen.length - 1].content : gen;
                }

                const llmProcessingTime = performance.now() - llmStartTime;

                // Log performance metrics for large histories
                logPerformanceMetric('llm_processing', llmStartTime, history);

                // Apply feature coordination to the final response
                const coordinatedResponse = coordinateFeaturesInResponse(response, {
                    relationship: relationshipInsights,
                    anxiety: anxietyInsights,
                    professional: professionalInsights,
                    meeting: meetingInsights,
                    language: languageLearningInsights
                }, persona);

                // Sanitize the response before sending it back
                const sanitizedResponse = sanitizeText(coordinatedResponse.trim());
                self.postMessage({
                  type: 'llm_result',
                  text: sanitizedResponse,
                  emotionData,
                  conversationSentiment, // Include conversation sentiment
                  coachingInsights: {
                    relationship: validateCoachingInsights(relationshipInsights),
                    anxiety: validateCoachingInsights(anxietyInsights),
                    professional: validateCoachingInsights(professionalInsights),
                    meeting: validateCoachingInsights(meetingInsights),
                    language: validateCoachingInsights(languageLearningInsights)
                  },
                  metadata: {
                    performance: {
                      llmProcessingTime,
                      coachingAnalysisTime,
                      totalTime: performance.now() - startTime,
                      historySize
                    }
                  },
                  taskId
                });
            } catch (llmError) {
                console.error("LLM processing failed:", llmError);
                self.postMessage({
                    type: 'error',
                    error: `AI response generation failed: ${llmError.message || 'Unknown error'}`,
                    taskId
                });
                return;
            }
        }

        if (type === 'cleanup') {
            await MLPipeline.disposeAll();
            self.postMessage({ type: 'cleanup_complete', taskId });
        }
    } catch (error) {
        console.error("Unexpected error in worker:", error);
        self.postMessage({
            type: 'error',
            error: `Unexpected error: ${error.message || 'Unknown error'}`,
            taskId: taskId || 'unknown'
        });
    }
};