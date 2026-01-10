import { pipeline, env, TextStreamer } from '@huggingface/transformers';
import { AppConfig } from './config';
import { analyzeEmotion } from './utils/emotion';
import { detectMultipleIntents } from './utils/intentRecognition';
import {
    getCulturalPromptTips,
    getLanguageLearningPromptTips,
    getProfessionalPromptTips,
    detectCulturalContext,
    getSocialNuanceTips,
    getHighStakesTips
} from './utils/culturalContext';
import {
    analyzeCulturalContext,
    generateCulturallyAppropriateResponses,
    validateCulturalAppropriateness
} from './utils/culturalIntelligence';
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
            const optimizedLLMConfig = getOptimalModelConfig('llm', deviceCapabilities);

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
                // Only dispose LLM if memory is tight or device is low-spec
                const memoryCheck = checkMemoryAdequacy(optimizedSTTConfig, MLPipeline.llmConfig || optimizedLLMConfig);
                if (!memoryCheck.isAdequate || deviceCapabilities.capabilities.isLowSpec) {
                    await MLPipeline.disposeLLM();
                }

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
                // Dispose STT only if memory is tight or device is low-spec
                const memoryCheck = checkMemoryAdequacy(
                    MLPipeline.sttConfig || getOptimalModelConfig('stt', deviceCapabilities),
                    optimizedLLMConfig
                );

                if (MLPipeline.stt && (!memoryCheck.isAdequate || deviceCapabilities.capabilities.isLowSpec)) {
                    console.log("Disposing STT to make room for LLM due to memory constraints");
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
                    MLPipeline.stt = null; // Ensure STT is marked as null
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

// Worker State Management
const WorkerState = {
    conversationTurnManager: null,
    highStakesCounter: 0,
    cachedSystemPrompt: { key: null, content: null },
    lastLLMCallTime: 0,
    performanceStats: {
        audioProcessingTimes: [],
        llmProcessingTimes: [],
        mode: 'optimal' // 'optimal', 'balanced', 'minimal'
    }
};

const HIGH_STAKES_THRESHOLD_TURNS = 2; // Required turns before lowering override threshold

/**
 * Initializes the conversation turn manager
 */

const updatePerformanceMode = (time, type) => {
    const list = type === 'audio' ? WorkerState.performanceStats.audioProcessingTimes : WorkerState.performanceStats.llmProcessingTimes;
    list.push(time);
    if (list.length > 5) list.shift();

    const avg = list.reduce((a, b) => a + b, 0) / list.length;
    
    if (type === 'audio') {
        if (avg > 300) WorkerState.performanceStats.mode = 'minimal';
        else if (avg > 150) WorkerState.performanceStats.mode = 'balanced';
        else WorkerState.performanceStats.mode = 'optimal';
    }
};

// Initialize conversation turn manager
const initConversationTurnManager = () => {
    if (!WorkerState.conversationTurnManager) {
        WorkerState.conversationTurnManager = new ConversationTurnManager();
    }
    return WorkerState.conversationTurnManager;
};

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
  if (serialized.length > (AppConfig.system.maxCoachingInsightsSize || 100000)) { 
    console.warn('[Worker] Coaching insights too large, rejecting');
    return null;
  }

  // Validate structure
  if (insights.insights && !Array.isArray(insights.insights)) {
    console.warn('[Worker] Invalid insights array format, rejecting');
    return null;
  }

  return insights;
};

/**
 * Generates cultural-specific prompt instructions
 */
const generateCulturalPrompt = (effectiveCulturalContext, detectedCulturalContext, settings, isPowerSavingMode) => {
    if (!effectiveCulturalContext || effectiveCulturalContext === 'general') return '';

    let prompt = getCulturalPromptTips(effectiveCulturalContext);
    const isAdvancedCulturalGuidanceEnabled = settings?.enableAdvancedCulturalGuidance !== false;

    if (!isPowerSavingMode && isAdvancedCulturalGuidanceEnabled && detectedCulturalContext?.recommendations) {
        const culturalRecommendations = detectedCulturalContext.recommendations
            .filter(rec => rec.priority === 'high')
            .map(rec => `💡 ${rec.suggestion}`)
            .join(' ');
        if (culturalRecommendations) {
            prompt += `Cultural Tips: ${culturalRecommendations} `;
        }
    }
    return prompt;
};

/**
 * Generates language learning specific prompt instructions
 */
const generateLanguageLearningPrompt = (effectiveCulturalContext, sanitizedText, settings) => {
    const nativeLanguage = settings?.nativeLanguage ||
        (AppConfig.culturalLanguageConfig?.languageLearningSettings?.nativeLanguage) ||
        'general';

    const languageAnalysis = analyzeLanguageLearningText(sanitizedText, nativeLanguage);
    let prompt = getLanguageLearningPromptTips(effectiveCulturalContext || 'english');

    if (languageAnalysis.grammarErrors.length > 0) {
        const grammarTips = languageAnalysis.grammarErrors.map(error => error.explanation).join('; ');
        prompt += `Grammar correction: ${grammarTips}. `;
    }

    if (languageAnalysis.vocabularySuggestions.length > 0) {
        const vocabTips = languageAnalysis.vocabularySuggestions.map(suggestion => `Instead of "${suggestion.original}", consider "${suggestion.alternatives[0]}".`).join(' ');
        prompt += `Vocabulary tip: ${vocabTips} `;
    }
    return prompt;
};

/**
 * Generates coaching-specific prompt instructions for relationship or anxiety personas
 */
const generateCoachingPrompt = (persona, relationshipInsights, anxietyInsights) => {
    let prompt = '';
    if (relationshipInsights && persona === 'relationship') {
        const relationshipPrompt = generateRelationshipCoachingPrompt(relationshipInsights, persona);
        if (relationshipPrompt) prompt += relationshipPrompt + " ";
    }

    if (anxietyInsights && persona === 'anxiety') {
        const anxietyPrompt = generateAnxietyCoachingPrompt(anxietyInsights);
        if (anxietyPrompt) prompt += anxietyPrompt + " ";
    }
    return prompt;
};

/**
 * Generates a comprehensive system prompt based on persona and context
 */
const generateSystemPrompt = (config) => {
    const {
        persona,
        personaConfig,
        effectiveCulturalContext,
        communicationProfile,
        detectedCulturalContext,
        sanitizedText,
        isPowerSavingMode,
        isSubtleMode,
        preferences,
        relationshipInsights,
        anxietyInsights,
        settings
    } = config;

    let contextInstruction = `Persona: ${personaConfig.label}. `;

    if (communicationProfile) contextInstruction += `${communicationProfile} `;

    contextInstruction += generateCulturalPrompt(effectiveCulturalContext, detectedCulturalContext, settings, isPowerSavingMode);

    const socialTips = getSocialNuanceTips(sanitizedText);
    if (socialTips) contextInstruction += `Social Tips: ${socialTips} `;

    if (persona === 'meeting' || persona === 'professional') {
        const highStakesCategory = sanitizedText.toLowerCase().includes('negotiate') || sanitizedText.toLowerCase().includes('price')
            ? 'negotiation'
            : 'leadership';
        contextInstruction += getHighStakesTips(highStakesCategory);
        contextInstruction += getProfessionalPromptTips(persona === 'meeting' ? 'business' : 'academic');
    }

    if (persona === 'languagelearning') {
        contextInstruction += generateLanguageLearningPrompt(effectiveCulturalContext, sanitizedText, settings);
    }

    contextInstruction += generateCoachingPrompt(persona, relationshipInsights, anxietyInsights);

    if (isSubtleMode) {
        contextInstruction += "SUBTLE MODE ACTIVE: Provide ONLY extremely brief, context-aware Quick Cues (1-5 words). No full sentences. ";
    } else if (preferences) {
        contextInstruction += `Preference: ${preferences.preferredLength} length. `;
    }

    contextInstruction += "IMPORTANT: Always include semantic tags in square brackets for specific cues: [conflict], [action item], [strategic], [social tip], [language tip], [empathy]. ";

    return `${personaConfig.prompt} ${contextInstruction} Respond naturally.`;
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

        if (type === 'prewarm_system_prompt') {
            const { persona, culturalContext, preferences, communicationProfile, settings } = event.data;
            const personaConfig = AppConfig.models.personas[persona] || AppConfig.models.personas.anxiety;
            const isSubtleMode = settings?.isSubtleMode || preferences?.isSubtleMode;
            const profileHash = communicationProfile ? communicationProfile.length : 0;
            const promptKey = `${persona}-${culturalContext}-${preferences?.preferredLength}-${isSubtleMode ? 'subtle' : 'normal'}-${profileHash}`;

            WorkerState.cachedSystemPrompt = {
                key: promptKey,
                content: generateSystemPrompt({
                    persona,
                    personaConfig,
                    effectiveCulturalContext: culturalContext,
                    communicationProfile,
                    detectedCulturalContext: null, // Initial prewarm doesn't have live context
                    sanitizedText: "",
                    isPowerSavingMode: WorkerState.performanceStats.mode === 'minimal',
                    isSubtleMode,
                    preferences,
                    relationshipInsights: null,
                    anxietyInsights: null,
                    settings
                })
            };
        }

        if (type === 'performance_update') {
            WorkerState.performanceStats.mode = event.data.mode;
            console.log(`[Worker] Performance mode manually set to: ${WorkerState.performanceStats.mode} (Reason: ${event.data.reason})`);
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
                if (WorkerState.performanceStats.mode !== 'minimal' &&
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
                            mode: WorkerState.performanceStats.mode
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

                    // Check memory adequacy before loading LLM
                    const memoryCheck = checkMemoryAdequacy(
                        MLPipeline.sttConfig || getOptimalModelConfig('stt', deviceCapabilities),
                        getOptimalModelConfig('llm', deviceCapabilities)
                    );

                    if (!memoryCheck.isAdequate && deviceCapabilities.performanceTier === 'low') {
                        console.warn(`[Worker] Insufficient memory for full LLM on low-spec device. Available: ${memoryCheck.availableMemoryMB}MB, Required: ${memoryCheck.totalMemoryMB}MB`);
                        // Use a lighter configuration for low-spec devices
                        const lightLLMConfig = {
                            ...getOptimalModelConfig('llm', deviceCapabilities),
                            name: 'Xenova/distilbert-base-uncased' // Use a smaller model if available
                        };
                        // For now, we'll proceed with the standard load but with awareness of constraints
                    }

                    await pipelineManager.loadLLM((p) => throttledProgress(p, 'Social Brain', taskId));
                }

                if (!MLPipeline.llm) throw new Error("Social Brain failed to load or was deferred due to memory.");

                MLPipeline.lastUsed = Date.now();
                pipelineManager.resetInactivityTimer();

                const personaConfig = AppConfig.models.personas[persona] || AppConfig.models.personas.anxiety;
                const sanitizedText = _text.trim().substring(0, AppConfig.system.maxTranscriptLength);
                const emotionData = analyzeEmotion(sanitizedText);
                const intents = detectMultipleIntents(sanitizedText, 0.4);

                // Dynamic Resource Allocation based on Performance Mode and Device Capabilities
                const baseMaxTokens = MLPipeline.llmConfig ? MLPipeline.llmConfig.max_new_tokens : AppConfig.models.llm.max_new_tokens;
                const maxTokens = WorkerState.performanceStats.mode === 'minimal'
                    ? Math.min(32, baseMaxTokens)
                    : WorkerState.performanceStats.mode === 'balanced'
                        ? Math.min(64, baseMaxTokens)
                        : baseMaxTokens;

                // Deep Coaching Analysis Decision
                // We prioritize battery life and responsiveness over analysis depth in minimal mode.
                // Determines if Auto-Persona is enabled, indicating user preference for sophisticated AI assistance.
                const isPowerSavingMode = WorkerState.performanceStats.mode === 'minimal';
                const isAutoPersonaEnabled = _settings?.enableAutoPersona !== false;
                const shouldRunDeepAnalysis = !isPowerSavingMode;

                // Detect cultural context from the input text using advanced cultural intelligence
                // In power saving mode, reduce the frequency of cultural analysis or use simplified analysis
                let detectedCulturalContext;
                if (isPowerSavingMode) {
                    // In power saving mode, only analyze current text without history to reduce computation
                    detectedCulturalContext = analyzeCulturalContext(sanitizedText, culturalContext, []);
                } else {
                    detectedCulturalContext = analyzeCulturalContext(sanitizedText, culturalContext, history || []);
                }

                // Use detected cultural context if more specific than current context AND if confidence is high enough
                // The threshold is dynamic: it can be provided by user settings, or falls back to AppConfig/CulturalIntelligenceConfig
                let culturalOverrideThreshold = _settings?.culturalOverrideThreshold || 
                                                 AppConfig.culturalIntelligenceConfig?.confidence?.overrideThreshold || 
                                                 0.85;

                // Cycle 2: Cultural Intelligence Tuning (Robust Refinement)
                // Dynamically adjust threshold based on persistent intent intensity.
                // We require multiple consecutive turns of high-stakes intent before lowering 
                // the threshold to ensure it's not a misclassification.
                const hasHighStakesIntent = intents?.some(i => ['strategic', 'negotiation', 'leadership'].includes(i.intent));
                const hasSocialIntent = intents?.some(i => i.intent === 'social');

                if (hasHighStakesIntent) {
                    WorkerState.highStakesCounter++;
                } else {
                    WorkerState.highStakesCounter = Math.max(0, WorkerState.highStakesCounter - 1);
                }

                if (hasHighStakesIntent && WorkerState.highStakesCounter >= HIGH_STAKES_THRESHOLD_TURNS) {
                    culturalOverrideThreshold = 0.7; // Be more aggressive in persistent high-stakes context
                } else if (hasSocialIntent) {
                    culturalOverrideThreshold = 0.9; // Be more conservative in social context to avoid jitter
                    WorkerState.highStakesCounter = 0; // Reset counter in social context
                } else {
                    // Standard threshold
                    culturalOverrideThreshold = _settings?.culturalOverrideThreshold || 
                                               AppConfig.culturalIntelligenceConfig?.confidence?.overrideThreshold || 
                                               0.85;
                }

                const effectiveCulturalContext = detectedCulturalContext.primaryCulture !== 'general' &&
                                                detectedCulturalContext.confidence > culturalOverrideThreshold
                    ? detectedCulturalContext.primaryCulture
                    : culturalContext;

                // Perform coaching analysis based on persona - Skip if in power saving mode
                let relationshipInsights = null;
                let anxietyInsights = null;
                let professionalInsights = null;
                let meetingInsights = null;
                let languageLearningInsights = null;
                let coachingAnalysisTime = 0;
                let conversationSentiment = null;
                let sentimentAnalysisTime = 0;

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
                        // Get user's native language from settings (separate from cultural context)
                        const nativeLanguage = _settings?.nativeLanguage ||
                                              (AppConfig.culturalLanguageConfig?.languageLearningSettings?.nativeLanguage) ||
                                              'general';
                        languageLearningInsights = provideContextualLanguageFeedback(sanitizedText, nativeLanguage, history);
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
                
                if (WorkerState.cachedSystemPrompt.key !== promptKey) {
                    WorkerState.cachedSystemPrompt = {
                        key: promptKey,
                        content: generateSystemPrompt({
                            persona,
                            personaConfig,
                            effectiveCulturalContext,
                            communicationProfile,
                            detectedCulturalContext,
                            sanitizedText,
                            isPowerSavingMode,
                            isSubtleMode,
                            preferences,
                            relationshipInsights,
                            anxietyInsights,
                            settings
                        })
                    };
                }

                // Resource Governor: Throttling and conditional execution
                const isShortUtterance = sanitizedText.split(/\s+/).length < 3;
                const timeSinceLastLLM = Date.now() - (WorkerState.lastLLMCallTime || 0);
                const isHighFrequency = timeSinceLastLLM < 2000;

                // Launch LLM and Sentiment Analysis in parallel
                // Sentiment analysis is secondary and shouldn't block LLM start, but we want it for the prompt
                const sentimentPromise = (WorkerState.performanceStats.mode !== 'minimal' &&
                    settings.enableSentimentAnalysis !== false &&
                    !settings.privacyMode &&
                    (!isShortUtterance || !isHighFrequency))
                    ? Promise.resolve().then(() => {
                        const sStartTime = performance.now();
                        const result = analyzeConversationSentiment(history || []);
                        sentimentAnalysisTime = performance.now() - sStartTime;
                        return result;
                    })
                    : Promise.resolve({ overallSentiment: 'neutral', emotionalTrend: 'stable' });

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

                // Wait for sentiment to complete so we can include it in the current prompt
                // Given the new caching, this should be extremely fast (< 2ms)
                const finalSentiment = await sentimentPromise;
                conversationSentiment = finalSentiment;

                // Add conversation sentiment context (if not in privacy mode)
                if (!settings.privacyMode && finalSentiment.overallSentiment !== 'neutral') {
                    dynamicContext += `Overall conversation sentiment: ${finalSentiment.overallSentiment}. `;
                    if (finalSentiment.emotionalTrend !== 'stable') {
                        dynamicContext += `Trend: ${finalSentiment.emotionalTrend}. `;
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
                    { role: "system", content: `${WorkerState.cachedSystemPrompt.content} ${dynamicContext}` },
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
                    language: validateCoachingInsights(languageLearningInsights),
                    cultural: detectedCulturalContext
                  },
                  metadata: {
                    performance: {
                      llmProcessingTime,
                      coachingAnalysisTime,
                      sentimentAnalysisTime,
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