
import { AppConfig } from '../config';
import { analyzeEmotion } from '../utils/emotion';
import { detectMultipleIntents } from '../utils/intentRecognition';
import { analyzeCulturalContext } from '../utils/culturalIntelligence';
import { analyzeConversationSentiment } from '../utils/sentimentAnalysis';
import { analyzeRelationshipCoaching } from '../utils/relationshipCoaching';
import { analyzeAnxietyCoaching } from '../utils/anxietyCoaching';
import { analyzeProfessionalCoaching, analyzeMeetingCoaching } from '../utils/professionalCoaching';
import { estimateConversationSize, monitorAndOptimizeHistory } from '../utils/performanceMonitoring';
import { createProgressiveLoadingStrategy, deviceCaps } from '../utils/performanceOptimizer';
import { provideContextualLanguageFeedback } from '../utils/languageLearning';
import { coordinateFeaturesInResponse, resolveFeatureConflicts } from '../utils/featureCoordination';
import { calculateSessionTone } from '../utils/personalization';
import { secureLocalStorageGet, secureLocalStorageSet } from '../utils/encryption';
import { TextStreamer } from '@huggingface/transformers';
import { getIntentRecognitionEngine } from '../utils/intentRecognitionEngine';

import { MLPipeline } from './MLPipeline';
import { ML_TRANSITIONS } from './MLStateMachine';
import { WorkerState, updatePerformanceMode, initConversationTurnManager, HIGH_STAKES_THRESHOLD_TURNS } from './state';
import { sanitizeText, throttledProgress, validateCoachingInsights } from './utils';
import { generateSystemPrompt, generateTurnSpecificContext } from './promptGenerator';
import { WorkerMessenger } from './Messenger';

const messenger = WorkerMessenger.getInstance();

export const handleLoad = async (data) => {
    const { taskId } = data;
    const pipelineManager = await MLPipeline.getInstance();
    try {
        const loadingStrategy = createProgressiveLoadingStrategy(deviceCaps);
        console.log(`[Worker] Using ${loadingStrategy.initialLoad.length} initial models for ${deviceCaps.performanceTier} performance tier`);

        if (loadingStrategy.initialLoad.includes('stt') || loadingStrategy.initialLoad.includes('minimal_stt')) {
            await pipelineManager.loadSTT((p) => throttledProgress(p, 'Speech Engine', taskId));
        }

        if (loadingStrategy.initialLoad.includes('llm')) {
            await pipelineManager.loadLLM((p) => throttledProgress(p, 'Social Brain', taskId));
        }

        if (loadingStrategy.initialLoad.includes('minimal_stt')) {
            messenger.postMessage({
                type: 'ready',
                taskId,
                status: 'Minimal mode: STT loaded, LLM will load on demand',
                isLowSpec: true
            });
        } else if (loadingStrategy.delayedLoad.includes('llm')) {
            messenger.postMessage({
                type: 'ready',
                taskId,
                status: 'STT loaded, Social Brain loading in background...'
            });
            try {
                await pipelineManager.loadLLM((p) => throttledProgress(p, 'Social Brain', taskId));
                messenger.postMessage({ type: 'status', status: 'Social Brain ready', taskId });
            } catch (llmLoadError) {
                console.warn("Background LLM loading failed:", llmLoadError);
            }
        } else {
            messenger.postMessage({ type: 'ready', taskId });
        }
    } catch (loadError) {
        console.error("Model loading failed:", loadError);
        messenger.postMessage({
            type: 'error',
            error: `Model loading failed: ${loadError.message || 'Unknown error'}`,
            taskId
        });
    }
};

export const handleSTT = async (data) => {
    const { audio, taskId, settings: _settings } = data;
    const pipelineManager = await MLPipeline.getInstance();
    const settings = _settings || { enableSpeakerDetection: true, privacyMode: false };

    if (!MLPipeline.stt) {
        try {
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('STT model loading timed out')), AppConfig.system.processingTimeout);
            });
            await Promise.race([pipelineManager.loadSTT(), timeoutPromise]);
            if (!MLPipeline.stt || !MLPipeline.isVoiceInputFunctional()) {
                throw new Error("STT model failed to load after initialization attempt");
            }
        } catch (loadError) {
            messenger.postMessage({ type: 'error', error: `Speech recognition model failed to load: ${loadError.message}`, taskId });
            return;
        }
    }

    MLPipeline.lastUsed = Date.now();
    pipelineManager.resetInactivityTimer();

    const audioStartTime = performance.now();
    const audioData = audio instanceof Float32Array ? audio : new Float32Array(Object.values(audio));

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
        
        // Calculate audio metrics for mirroring baselines
        const rms = Math.sqrt(audioData.reduce((acc, val) => acc + val * val, 0) / audioData.length);
        const sampleRate = 16000; // Standard for Whisper/Silero
        const duration = audioData.length / sampleRate;

        messenger.postMessage({
            type: 'stt_result',
            text: sanitizedText,
            metadata: { 
                turnInfo, 
                rms, 
                duration,
                performance: { audioProcessingTime, mode: WorkerState.performanceStats.mode } 
            },
            taskId
        });
    } catch (processingError) {
        messenger.postMessage({ type: 'error', error: `STT processing failed: ${processingError.message}`, taskId });
    }
};

export const handleLLM = async (data) => {
    const { 
        taskId, text: _text, persona, history, communicationProfile, 
        insightCategoryScores, culturalContext, metadata, preferences, settings: _settings,
        mirroringBaselines
    } = data;
    
    const pipelineManager = await MLPipeline.getInstance();
    const settings = _settings || { enablePersonalization: true, enableSentimentAnalysis: true, privacyMode: false };

    try {
        const startTime = performance.now();

        if (!MLPipeline.llm) {
            if (MLPipeline.stt && deviceCaps.capabilities.isLowSpec) {
                await MLPipeline.disposeSTT();
            }
            await pipelineManager.loadLLM((p) => throttledProgress(p, 'Social Brain', taskId));
        }

        if (!MLPipeline.llm) throw new Error("Social Brain failed to load.");

        MLPipeline.lastUsed = Date.now();
        pipelineManager.resetInactivityTimer();

        const personaConfig = AppConfig.models.personas[persona] || AppConfig.models.personas.anxiety;
        const sanitizedText = _text.trim().substring(0, AppConfig.system.maxTranscriptLength);
        const emotionData = analyzeEmotion(sanitizedText);
        const sessionTone = calculateSessionTone(
            sanitizedText, 
            metadata, 
            emotionData, 
            mirroringBaselines, 
            settings,
            WorkerState.consecutiveUrgentTurns
        );

        // Update urgency counter
        if (sessionTone.shouldOverride) {
            WorkerState.consecutiveUrgentTurns = 0; // Reset after calming override
        } else if (sessionTone.isUrgent || sessionTone.urgencyScore > 2.0) {
            WorkerState.consecutiveUrgentTurns++;
        } else {
            WorkerState.consecutiveUrgentTurns = 0;
        }

        // Proactive De-escalation: Notify UI immediately to handle pacing/visuals
        // instead of blocking the entire worker thread.
        if (sessionTone.suggestedDelay > 0 || sessionTone.isDeEscalating || sessionTone.shouldOverride || sessionTone.isDisengaged || sessionTone.isVeryCalm) {
            messenger.postMessage({
                type: 'mirroring_status',
                sessionTone,
                taskId
            });
        }

        // Use enhanced intent detection with conversation context
        const intentEngine = getIntentRecognitionEngine({
          useML: false, // Start with heuristic approach, can be switched later
          fallbackEnabled: true,
          enableMultiIntent: true
        });
        const enhancedIntentResult = await intentEngine.detectIntentWithFullContext(sanitizedText, history || [], { enableMultiIntent: true });
        const intents = enhancedIntentResult.allIntents || detectMultipleIntents(sanitizedText, 0.4);

        const isPowerSavingMode = WorkerState.performanceStats.mode === 'minimal';
        const shouldRunDeepAnalysis = !isPowerSavingMode;

        let detectedCulturalContext = analyzeCulturalContext(
            sanitizedText, 
            culturalContext, 
            isPowerSavingMode ? [] : (history || []),
            {},
            settings.privacyMode
        );

        let culturalOverrideThreshold = _settings?.culturalOverrideThreshold || AppConfig.culturalIntelligenceConfig?.confidence?.overrideThreshold || 0.85;
        const hasHighStakesIntent = intents?.some(i => ['strategic', 'negotiation', 'leadership'].includes(i.intent));
        const hasSocialIntent = intents?.some(i => i.intent === 'social');

        if (hasHighStakesIntent) {
            WorkerState.highStakesCounter++;
        } else {
            WorkerState.highStakesCounter = Math.max(0, WorkerState.highStakesCounter - 1);
        }

        if (hasHighStakesIntent && WorkerState.highStakesCounter >= HIGH_STAKES_THRESHOLD_TURNS) {
            culturalOverrideThreshold = 0.7;
        } else if (hasSocialIntent) {
            culturalOverrideThreshold = 0.9;
            WorkerState.highStakesCounter = 0;
        }

        const effectiveCulturalContext = detectedCulturalContext.primaryCulture !== 'general' && detectedCulturalContext.confidence > culturalOverrideThreshold
            ? detectedCulturalContext.primaryCulture
            : culturalContext;

        let relationshipInsights = null, anxietyInsights = null, professionalInsights = null, meetingInsights = null, languageLearningInsights = null;
        let coachingAnalysisTime = 0, conversationSentiment = null, sentimentAnalysisTime = 0;

        if (shouldRunDeepAnalysis) {
            const coachingStartTime = performance.now();
            relationshipInsights = (persona === 'relationship') ? analyzeRelationshipCoaching(sanitizedText, history, emotionData, insightCategoryScores) : null;
            anxietyInsights = (persona === 'anxiety') ? analyzeAnxietyCoaching(sanitizedText, history, emotionData) : null;
            professionalInsights = (persona === 'professional') ? analyzeProfessionalCoaching(sanitizedText, history, emotionData, insightCategoryScores) : null;
            meetingInsights = (persona === 'meeting') ? analyzeMeetingCoaching(sanitizedText, history, emotionData, insightCategoryScores) : null;
            
            if (persona === 'languagelearning') {
                const nativeLanguage = _settings?.nativeLanguage || AppConfig.culturalLanguageConfig?.languageLearningSettings?.nativeLanguage || 'general';
                languageLearningInsights = provideContextualLanguageFeedback(sanitizedText, nativeLanguage, history);
            }
            coachingAnalysisTime = performance.now() - coachingStartTime;

            const coordinatedInsights = resolveFeatureConflicts({
                relationship: relationshipInsights,
                anxiety: anxietyInsights,
                professional: professionalInsights,
                meeting: meetingInsights,
                language: languageLearningInsights
            }, persona);

            relationshipInsights = coordinatedInsights.relationship;
            anxietyInsights = coordinatedInsights.anxiety;
            professionalInsights = coordinatedInsights.professional;
            meetingInsights = coordinatedInsights.meeting;
            languageLearningInsights = coordinatedInsights.language;
        }

        const isSubtleMode = _settings?.isSubtleMode || preferences?.isSubtleMode;
        
        // Caching: Base prompt depends on persona, culture, and static profile
        // Turn-specific context (social tips, coaching) is appended separately
        const promptKey = `${persona}-${culturalContext}-${communicationProfile ? communicationProfile.length : 0}`;

        if (WorkerState.cachedSystemPrompt.key !== promptKey) {
            WorkerState.cachedSystemPrompt = {
                key: promptKey,
                content: generateSystemPrompt({
                    persona, personaConfig, effectiveCulturalContext, communicationProfile,
                    detectedCulturalContext, isPowerSavingMode, settings
                })
            };
        }

        // Performance Optimization: Defer sentiment analysis until after LLM starts
        // We use the last known sentiment for the prompt to save critical path time
        const sentimentPromise = (WorkerState.performanceStats.mode !== 'minimal' && settings.enableSentimentAnalysis !== false && !settings.privacyMode)
            ? Promise.resolve().then(() => {
                const sStartTime = performance.now();
                const result = analyzeConversationSentiment(history || []);
                sentimentAnalysisTime = performance.now() - sStartTime;
                WorkerState.lastSentiment = result;
                return result;
            })
            : Promise.resolve(WorkerState.lastSentiment || { overallSentiment: 'neutral', emotionalTrend: 'stable' });

        // Build Turn-Specific Context (Fresh every turn)
        const turnSpecificContext = generateTurnSpecificContext({
            persona, sanitizedText, isSubtleMode, preferences,
            relationshipInsights, anxietyInsights, effectiveCulturalContext, settings,
            mirroringInstruction: sessionTone.mirroringInstruction
        });

        let dynamicContext = turnSpecificContext;
        if (metadata && !settings.privacyMode) {
            if (metadata.rms > 0.01 && (sanitizedText.split(/\s+/).length / (metadata.duration || 1)) > 3) dynamicContext += " User sounds urgent.";
            if (metadata?.turnInfo?.isLikelyNewSpeaker) dynamicContext += " Another person may be speaking now.";
        }
        if (!settings.privacyMode && emotionData.emotion !== 'neutral') dynamicContext += ` Emotion: ${emotionData.emotion}.`;

        // Use last known sentiment immediately to avoid blocking TTFT
        const conversationSentimentForPrompt = WorkerState.lastSentiment || { overallSentiment: 'neutral', emotionalTrend: 'stable' };
        if (!settings.privacyMode && conversationSentimentForPrompt.overallSentiment !== 'neutral') {
            dynamicContext += ` Overall conversation sentiment: ${conversationSentimentForPrompt.overallSentiment}. Trend: ${conversationSentimentForPrompt.emotionalTrend}.`;
        }

        const conversationHistory = monitorAndOptimizeHistory((history || []).map(m => ({ role: m.role || 'user', content: m.content })));
        const messages = [
            { role: "system", content: `${WorkerState.cachedSystemPrompt.content} ${dynamicContext}` },
            ...conversationHistory,
            { role: "user", content: sanitizedText }
        ];

        const llmStartTime = performance.now();
        const streamer = new TextStreamer(MLPipeline.llm.tokenizer, {
            skip_prompt: true, skip_special_tokens: true,
            callback_function: (chunk) => { if (chunk) messenger.postMessage({ type: 'llm_chunk', text: chunk, taskId }); },
        });

        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('LLM processing timed out')), AppConfig.system.processingTimeout);
        });

        const baseMaxTokens = MLPipeline.llmConfig ? MLPipeline.llmConfig.max_new_tokens : AppConfig.models.llm.max_new_tokens;
        const maxTokens = WorkerState.performanceStats.mode === 'minimal' ? Math.min(32, baseMaxTokens) : WorkerState.performanceStats.mode === 'balanced' ? Math.min(64, baseMaxTokens) : baseMaxTokens;

        const output = await Promise.race([
            MLPipeline.llm(messages, { max_new_tokens: maxTokens, temperature: AppConfig.models.llm.temperature, do_sample: AppConfig.models.llm.do_sample, streamer }),
            timeoutPromise
        ]);

        let response = "";
        if (output[0]?.generated_text) {
            const gen = output[0].generated_text;
            response = Array.isArray(gen) ? gen[gen.length - 1].content : gen;
        }

        const coordinatedResponse = coordinateFeaturesInResponse(response, {
            relationship: relationshipInsights, anxiety: anxietyInsights, professional: professionalInsights, meeting: meetingInsights, language: languageLearningInsights
        }, persona, sessionTone);

        // Store session tone in history for future tips
        const sessionToneHistory = await secureLocalStorageGet('convocue_session_tone_history', []);
        const updatedHistory = [sessionTone, ...sessionToneHistory.slice(0, 9)]; // Keep last 10 entries
        await secureLocalStorageSet('convocue_session_tone_history', updatedHistory);

        // Await sentiment only for the result metadata, not blocking LLM start
        conversationSentiment = await sentimentPromise;

        messenger.postMessage({
            type: 'llm_result',
            text: sanitizeText(coordinatedResponse.trim()),
            emotionData,
            conversationSentiment,
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
                    llmProcessingTime: performance.now() - llmStartTime,
                    coachingAnalysisTime,
                    sentimentAnalysisTime,
                    totalTime: performance.now() - startTime,
                    historySize: estimateConversationSize(conversationHistory)
                },
                sessionTone // Pass mirroring/de-escalation info to UI
            },
            taskId
        });
    } catch (error) {
        messenger.postMessage({ type: 'error', error: `LLM processing failed: ${error.message}`, taskId });
    }
};

export const handlePrewarmLLM = async (_data) => {
    const pipelineManager = await MLPipeline.getInstance();
    await pipelineManager.loadLLM();
};

export const handlePrewarmSystemPrompt = async (data) => {
    const { persona, culturalContext, communicationProfile, settings } = data;
    const personaConfig = AppConfig.models.personas[persona] || AppConfig.models.personas.anxiety;
    const promptKey = `${persona}-${culturalContext}-${communicationProfile ? communicationProfile.length : 0}`;

    WorkerState.cachedSystemPrompt = {
        key: promptKey,
        content: generateSystemPrompt({
            persona, personaConfig, effectiveCulturalContext: culturalContext, communicationProfile,
            detectedCulturalContext: null, isPowerSavingMode: WorkerState.performanceStats.mode === 'minimal',
            settings
        })
    };
};

export const handleRetrySTTLoad = async (data) => {
    const { taskId } = data;
    const pipelineManager = await MLPipeline.getInstance();
    try {
        await MLPipeline.transitionState(ML_TRANSITIONS.RETRY_STT);
        if (!MLPipeline.stt) {
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('STT model loading timed out')), AppConfig.system.processingTimeout);
            });
            await Promise.race([pipelineManager.loadSTT((p) => throttledProgress(p, 'Speech Engine', taskId)), timeoutPromise]);
            if (!MLPipeline.stt || !MLPipeline.isVoiceInputFunctional()) throw new Error("STT model failed to load");
            messenger.postMessage({ type: 'status', status: 'Speech Engine loaded successfully', taskId });
        } else {
            messenger.postMessage({ type: 'ready', taskId, status: 'Speech Engine already loaded' });
        }
    } catch (error) {
        messenger.postMessage({ type: 'error', error: `STT retry failed: ${error.message}`, taskId });
    }
};

export const handleRetryLLMLoad = async (data) => {
    const { taskId } = data;
    const pipelineManager = await MLPipeline.getInstance();
    try {
        await MLPipeline.transitionState(ML_TRANSITIONS.RETRY_LLM);
        if (!MLPipeline.llm) {
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('LLM model loading timed out')), AppConfig.system.processingTimeout);
            });
            await Promise.race([pipelineManager.loadLLM((p) => throttledProgress(p, 'Social Brain', taskId)), timeoutPromise]);
            if (!MLPipeline.llm || !MLPipeline.isVoiceInputFunctional()) throw new Error("LLM model failed to load");
            messenger.postMessage({ type: 'status', status: 'Social Brain loaded successfully', taskId });
        } else {
            messenger.postMessage({ type: 'ready', taskId, status: 'Social Brain already loaded' });
        }
    } catch (error) {
        messenger.postMessage({ type: 'error', error: `LLM retry failed: ${error.message}`, taskId });
    }
};

export const handleCleanup = async (data) => {
    await MLPipeline.disposeAll();
    messenger.postMessage({ type: 'cleanup_complete', taskId: data.taskId });
};

export const handleTerminate = async (data, memoryInterval) => {
    if (memoryInterval) clearInterval(memoryInterval);
    await MLPipeline.disposeAll();
    messenger.postMessage({ type: 'cleanup_complete', taskId: data.taskId });
    setTimeout(() => self.close(), 50);
};
