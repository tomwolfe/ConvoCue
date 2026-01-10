import { TextStreamer } from '@huggingface/transformers';
import { AppConfig } from './config';
import { analyzeEmotion } from './utils/emotion';
import { detectMultipleIntents } from './utils/intentRecognition';
import { analyzeCulturalContext } from './utils/culturalIntelligence';
import { analyzeConversationSentiment } from './utils/sentimentAnalysis';
import { analyzeRelationshipCoaching } from './utils/relationshipCoaching';
import { analyzeAnxietyCoaching } from './utils/anxietyCoaching';
import { analyzeProfessionalCoaching, analyzeMeetingCoaching } from './utils/professionalCoaching';
import { estimateConversationSize, logPerformanceMetric, monitorAndOptimizeHistory } from './utils/performanceMonitoring';
import { getOptimalModelConfig, createProgressiveLoadingStrategy, deviceCaps, checkMemoryAdequacy } from './utils/performanceOptimizer';
import { provideContextualLanguageFeedback } from './utils/languageLearning';
import { coordinateFeaturesInResponse, resolveFeatureConflicts } from './utils/featureCoordination';

// Modular Worker Components
import { MLPipeline } from './worker/MLPipeline';
import { ML_TRANSITIONS } from './worker/MLStateMachine';
import { WorkerState, updatePerformanceMode, initConversationTurnManager, HIGH_STAKES_THRESHOLD_TURNS } from './worker/state';
import { sanitizeText, throttledProgress, validateCoachingInsights } from './worker/utils';
import { generateSystemPrompt } from './worker/promptGenerator';
import { WorkerMessenger } from './worker/Messenger';

// Create a messenger instance for communication
const messenger = new WorkerMessenger();

// Listen for memory pressure events if the API is available
if (self.scheduler && self.scheduler.yield) {
    // For browsers that support the scheduler API
    // This is a more advanced approach to handle memory pressure
} else if ('memory' in self.performance) {
    // Set up periodic memory monitoring
    setInterval(() => {
        const mem = self.performance.memory;
        if (mem && mem.usagePercent > AppConfig.system.memory.modelUnloadThreshold) {
            // Handle memory pressure proactively
            MLPipeline.handleMemoryPressure();
        }
    }, 5000); // Check every 5 seconds
}

self.onmessage = async (event) => {
    const {
        type, audio, taskId, text: _text, persona, history,
        communicationProfile, insightCategoryScores, culturalContext,
        metadata, preferences, settings: _settings
    } = event.data;

    try {
        const pipelineManager = await MLPipeline.getInstance();
        const settings = _settings || {
            enablePersonalization: true,
            enableSpeakerDetection: true,
            enableSentimentAnalysis: true,
            privacyMode: false
        };

        if (type === 'load') {
            try {
                // Create progressive loading strategy based on device capabilities
                const loadingStrategy = createProgressiveLoadingStrategy(deviceCaps);

                console.log(`[Worker] Using ${loadingStrategy.initialLoad.length} initial models for ${deviceCaps.performanceTier} performance tier`);

                // Load initial models based on strategy
                if (loadingStrategy.initialLoad.includes('stt') || loadingStrategy.initialLoad.includes('minimal_stt')) {
                    await pipelineManager.loadSTT((p) => throttledProgress(p, 'Speech Engine', taskId));
                }

                if (loadingStrategy.initialLoad.includes('llm')) {
                    await pipelineManager.loadLLM((p) => throttledProgress(p, 'Social Brain', taskId));
                }

                // For low-spec devices, only load STT initially and defer LLM loading
                if (loadingStrategy.initialLoad.includes('minimal_stt')) {
                    await pipelineManager.loadSTT((p) => throttledProgress(p, 'Speech Engine', taskId));
                    // LLM will be loaded later when needed
                    messenger.postMessage({
                        type: 'ready',
                        taskId,
                        status: 'Minimal mode: STT loaded, LLM will load on demand',
                        isLowSpec: true,
                        mlStateData: MLPipeline.getMLStateData()
                    });
                } else {
                    // For other devices, initiate background LLM loading if specified in delayedLoad
                    if (loadingStrategy.delayedLoad.includes('llm')) {
                        // Send initial ready message but continue loading LLM in background
                        messenger.postMessage({
                            type: 'ready',
                            taskId,
                            status: 'STT loaded, Social Brain loading in background...',
                            mlStateData: MLPipeline.getMLStateData()
                        });

                        // Load LLM in background without blocking the ready state
                        try {
                            await pipelineManager.loadLLM((p) => throttledProgress(p, 'Social Brain', taskId));
                        } catch (llmLoadError) {
                            console.warn("Background LLM loading failed:", llmLoadError);
                            // Still consider worker ready since STT is loaded
                        }
                    } else {
                        // Both models loaded upfront
                        messenger.postMessage({
                            type: 'ready',
                            taskId,
                            mlStateData: MLPipeline.getMLStateData()
                        });
                    }
                }
            } catch (loadError) {
                console.error("Model loading failed:", loadError);
                messenger.postMessage({
                    type: 'error',
                    error: `Model loading failed: ${loadError.message || 'Unknown error'}`,
                    mlStateData: MLPipeline.getMLStateData(),
                    taskId
                });
                return;
            }
        }

        if (type === 'prewarm_llm') {
            await pipelineManager.loadLLM();
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
                    detectedCulturalContext: null,
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

        if (type === 'retry_stt_load') {
            try {
                // Explicitly transition to retry state
                MLPipeline.transitionState(ML_TRANSITIONS.RETRY_STT);

                // Attempt to load STT model with proper error handling
                if (!MLPipeline.stt) {
                    // Add timeout for STT loading on resource-constrained devices
                    const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('STT model loading timed out')), AppConfig.system.processingTimeout);
                    });

                    const loadPromise = pipelineManager.loadSTT((p) => throttledProgress(p, 'Speech Engine', taskId));

                    // Race between loading and timeout
                    await Promise.race([loadPromise, timeoutPromise]);

                    // Double-check that STT was actually loaded after the call
                    if (!MLPipeline.stt || !MLPipeline.isModelLoaded('stt')) {
                        throw new Error("STT model failed to load after initialization attempt");
                    }

                    // Notify success
                    messenger.postMessage({
                        type: 'status',
                        status: 'Speech Engine loaded successfully',
                        mlStateData: MLPipeline.getMLStateData(),
                        taskId
                    });
                } else {
                    // STT is already loaded, notify ready
                    messenger.postMessage({
                        type: 'ready',
                        taskId,
                        status: 'Speech Engine already loaded',
                        mlStateData: MLPipeline.getMLStateData()
                    });
                }
            } catch (loadError) {
                console.error("Retry STT load failed:", loadError);

                // Categorize error types for more specific messaging
                let specificErrorMessage = "Speech recognition model failed to load";
                if (loadError.message.includes('timeout')) {
                    specificErrorMessage = "Network timeout occurred while loading speech engine. Please check your connection.";
                } else if (loadError.message.includes('memory') || loadError.message.includes('OOM')) {
                    specificErrorMessage = "Insufficient memory to load speech engine. Please close other tabs or restart the browser.";
                } else if (loadError.message.includes('network') || loadError.message.includes('fetch')) {
                    specificErrorMessage = "Network error occurred while loading speech engine. Please check your internet connection.";
                } else if (loadError.message.includes('corrupt') || loadError.message.includes('invalid')) {
                    specificErrorMessage = "Speech engine model appears corrupted. Please refresh the page to reload.";
                } else if (loadError.message.includes('abort')) {
                    specificErrorMessage = "Speech engine loading was interrupted. Please try again.";
                }

                messenger.postMessage({
                    type: 'error',
                    error: `${specificErrorMessage}: ${loadError.message || 'Unknown error'}`,
                    mlStateData: MLPipeline.getMLStateData(),
                    taskId
                });
            }
        }

        if (type === 'retry_llm_load') {
            try {
                // Explicitly transition to retry state
                MLPipeline.transitionState(ML_TRANSITIONS.RETRY_LLM);

                // Attempt to load LLM model with proper error handling
                if (!MLPipeline.llm) {
                    // Add timeout for LLM loading on resource-constrained devices
                    const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('LLM model loading timed out')), AppConfig.system.processingTimeout);
                    });

                    const loadPromise = pipelineManager.loadLLM((p) => throttledProgress(p, 'Social Brain', taskId));

                    // Race between loading and timeout
                    await Promise.race([loadPromise, timeoutPromise]);

                    // Double-check that LLM was actually loaded after the call
                    if (!MLPipeline.llm || !MLPipeline.isModelLoaded('llm')) {
                        throw new Error("LLM model failed to load after initialization attempt");
                    }

                    // Notify success
                    messenger.postMessage({
                        type: 'status',
                        status: 'Social Brain loaded successfully',
                        mlStateData: MLPipeline.getMLStateData(),
                        taskId
                    });
                } else {
                    // LLM is already loaded, notify ready
                    messenger.postMessage({
                        type: 'ready',
                        taskId,
                        status: 'Social Brain already loaded',
                        mlStateData: MLPipeline.getMLStateData()
                    });
                }
            } catch (loadError) {
                console.error("Retry LLM load failed:", loadError);

                // Categorize error types for more specific messaging
                let specificErrorMessage = "AI model failed to load";
                if (loadError.message.includes('timeout')) {
                    specificErrorMessage = "Network timeout occurred while loading AI model. Please check your connection.";
                } else if (loadError.message.includes('memory') || loadError.message.includes('OOM')) {
                    specificErrorMessage = "Insufficient memory to load AI model. Please close other tabs or restart the browser.";
                } else if (loadError.message.includes('network') || loadError.message.includes('fetch')) {
                    specificErrorMessage = "Network error occurred while loading AI model. Please check your internet connection.";
                } else if (loadError.message.includes('corrupt') || loadError.message.includes('invalid')) {
                    specificErrorMessage = "AI model appears corrupted. Please refresh the page to reload.";
                } else if (loadError.message.includes('abort')) {
                    specificErrorMessage = "AI model loading was interrupted. Please try again.";
                }

                messenger.postMessage({
                    type: 'error',
                    error: `${specificErrorMessage}: ${loadError.message || 'Unknown error'}`,
                    mlStateData: MLPipeline.getMLStateData(),
                    taskId
                });
            }
        }

        if (type === 'stt') {
            // Ensure STT is loaded with proper error handling
            if (!MLPipeline.stt) {
                try {
                    // Add timeout for STT loading on resource-constrained devices
                    const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('STT model loading timed out')), AppConfig.system.processingTimeout);
                    });

                    const loadPromise = pipelineManager.loadSTT();

                    // Race between loading and timeout
                    await Promise.race([loadPromise, timeoutPromise]);

                    // Double-check that STT was actually loaded after the call
                    if (!MLPipeline.stt || !MLPipeline.isModelLoaded('stt')) {
                        throw new Error("STT model failed to load after initialization attempt");
                    }
                } catch (loadError) {
                    console.error("Failed to load STT model:", loadError);

                    // Categorize error types for more specific messaging
                    let specificErrorMessage = "Speech recognition model failed to load";
                    if (loadError.message.includes('timeout')) {
                        specificErrorMessage = "Network timeout occurred while loading speech engine. Please check your connection.";
                    } else if (loadError.message.includes('memory') || loadError.message.includes('OOM')) {
                        specificErrorMessage = "Insufficient memory to load speech engine. Please close other tabs or restart the browser.";
                    } else if (loadError.message.includes('network') || loadError.message.includes('fetch')) {
                        specificErrorMessage = "Network error occurred while loading speech engine. Please check your internet connection.";
                    } else if (loadError.message.includes('corrupt') || loadError.message.includes('invalid')) {
                        specificErrorMessage = "Speech engine model appears corrupted. Please refresh the page to reload.";
                    } else if (loadError.message.includes('abort')) {
                        specificErrorMessage = "Speech engine loading was interrupted. Please try again.";
                    }

                    messenger.postMessage({
                        type: 'error',
                        error: `${specificErrorMessage}: ${loadError.message || 'Unknown error'}`,
                        mlStateData: MLPipeline.getMLStateData(),
                        taskId
                    });
                    return;
                }
            }

            MLPipeline.lastUsed = Date.now();
            pipelineManager.resetInactivityTimer();

            const audioStartTime = performance.now();
            const audioData = audio instanceof Float32Array ? audio : new Float32Array(Object.values(audio));

            if (!MLPipeline.stt) {
                console.error("STT model is unexpectedly null during processing");
                messenger.postMessage({
                    type: 'error',
                    error: 'Speech recognition model is not available',
                    mlStateData: MLPipeline.getMLStateData(),
                    taskId
                });
                return;
            }

            // Add timeout for STT processing as well
            try {
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('STT processing timed out')), AppConfig.system.processingTimeout);
                });

                const processPromise = MLPipeline.stt(audioData, {
                    chunk_length_s: AppConfig.models.stt.chunk_length_s,
                    stride_length_s: AppConfig.models.stt.stride_length_s,
                    return_timestamps: false,
                });

                const output = await Promise.race([processPromise, timeoutPromise]);

                const audioProcessingTime = performance.now() - audioStartTime;
                const sanitizedText = sanitizeText(output.text);
                const turnManager = initConversationTurnManager();
                const turnInfo = (WorkerState.performanceStats.mode !== 'minimal' && settings.enableSpeakerDetection !== false && !settings.privacyMode)
                    ? turnManager.processAudio(audioData, sanitizedText)
                    : { turn: { speaker: 'user' }, isLikelyNewSpeaker: false };

                updatePerformanceMode(audioProcessingTime, 'audio');
                messenger.postMessage({
                    type: 'stt_result',
                    text: sanitizedText,
                    metadata: { turnInfo, performance: { audioProcessingTime, mode: WorkerState.performanceStats.mode } },
                    taskId
                });
            } catch (processingError) {
                console.error("STT processing failed:", processingError);

                // Categorize error types for more specific messaging
                let specificErrorMessage = "Speech recognition processing failed";
                if (processingError.message.includes('timeout')) {
                    specificErrorMessage = "Processing timed out. The audio may be too long or your device too slow.";
                } else if (processingError.message.includes('memory') || processingError.message.includes('OOM')) {
                    specificErrorMessage = "Insufficient memory for speech processing. Please close other tabs or restart the browser.";
                } else if (processingError.message.includes('network') || processingError.message.includes('fetch')) {
                    specificErrorMessage = "Network error during processing. Please check your internet connection.";
                } else if (processingError.message.includes('abort')) {
                    specificErrorMessage = "Processing was interrupted. Please try again.";
                }

                messenger.postMessage({
                    type: 'error',
                    error: `${specificErrorMessage}: ${processingError.message || 'Unknown error'}`,
                    mlStateData: MLPipeline.getMLStateData(),
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
                    if (MLPipeline.stt && deviceCaps.capabilities.isLowSpec) {
                        console.log("Unloading STT temporarily to make room for LLM on low-spec device");
                        await MLPipeline.disposeSTT();
                    }

                    // Check memory adequacy before loading LLM
                    const memoryCheck = checkMemoryAdequacy(
                        MLPipeline.sttConfig || getOptimalModelConfig('stt', deviceCaps),
                        getOptimalModelConfig('llm', deviceCaps)
                    );

                    if (!memoryCheck.isAdequate && deviceCaps.performanceTier === 'low') {
                        console.warn(`[Worker] Insufficient memory for full LLM on low-spec device. Available: ${memoryCheck.availableMemoryMB}MB, Required: ${memoryCheck.totalMemoryMB}MB`);
                        // For now, we'll proceed with the standard load but with awareness of constraints
                    }

                    await pipelineManager.loadLLM((p) => throttledProgress(p, 'Social Brain', taskId));

                    // Double-check that LLM was actually loaded after the call
                    if (!MLPipeline.llm || !MLPipeline.isModelLoaded('llm')) {
                        throw new Error("LLM model failed to load after initialization attempt");
                    }
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
                        // Update the last sentiment in the global state
                        WorkerState.lastSentiment = result;
                        return result;
                    })
                    : Promise.resolve(WorkerState.lastSentiment || { overallSentiment: 'neutral', emotionalTrend: 'stable' });

                // Store the current sentiment promise in the global state to track it
                WorkerState.sentimentPromise = sentimentPromise;

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
                        if (chunk) messenger.postMessage({ type: 'llm_chunk', text: chunk, taskId });
                    },
                });

                try {
                    // Add timeout for LLM processing as well
                    const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('LLM processing timed out')), AppConfig.system.processingTimeout);
                    });

                    const processPromise = MLPipeline.llm(messages, {
                        max_new_tokens: maxTokens,
                        temperature: AppConfig.models.llm.temperature,
                        do_sample: AppConfig.models.llm.do_sample,
                        streamer,
                    });

                    const output = await Promise.race([processPromise, timeoutPromise]);

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
                    messenger.postMessage({
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
                } catch (processingError) {
                    console.error("LLM processing failed:", processingError);

                    // Categorize error types for more specific messaging
                    let specificErrorMessage = "AI response generation failed";
                    if (processingError.message.includes('timeout')) {
                        specificErrorMessage = "AI processing timed out. The response may be too complex or your device too slow.";
                    } else if (processingError.message.includes('memory') || processingError.message.includes('OOM')) {
                        specificErrorMessage = "Insufficient memory for AI processing. Please close other tabs or restart the browser.";
                    } else if (processingError.message.includes('network') || processingError.message.includes('fetch')) {
                        specificErrorMessage = "Network error during AI processing. Please check your internet connection.";
                    } else if (processingError.message.includes('abort')) {
                        specificErrorMessage = "AI processing was interrupted. Please try again.";
                    }

                    messenger.postMessage({
                        type: 'error',
                        error: `${specificErrorMessage}: ${processingError.message || 'Unknown error'}`,
                        mlStateData: MLPipeline.getMLStateData(),
                        taskId
                    });
                    return;
                }
            } catch (outerProcessingError) {
                console.error("General LLM processing failed:", outerProcessingError);
                messenger.postMessage({
                    type: 'error',
                    error: `General LLM processing failed: ${outerProcessingError.message || 'Unknown error'}`,
                    mlStateData: MLPipeline.getMLStateData(),
                    taskId
                });
                return;
            }
        }

        if (type === 'cleanup') {
            await MLPipeline.disposeAll();
            messenger.postMessage({ type: 'cleanup_complete', taskId });
        }

        // Handle worker termination request
        if (type === 'terminate') {
            await MLPipeline.disposeAll();
            self.close(); // Close the worker
        }
        } catch (error) {
            messenger.postMessage({ type: 'error', error: error.message, taskId: taskId || 'unknown' });
        }
    };
