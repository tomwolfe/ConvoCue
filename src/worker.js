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
import { getOptimalModelConfig } from './utils/performanceOptimizer';
import { provideContextualLanguageFeedback } from './utils/languageLearning';
import { coordinateFeaturesInResponse, resolveFeatureConflicts } from './utils/featureCoordination';

// Modular Worker Components
import { MLPipeline, deviceCaps, checkMemoryUsage } from './worker/MLPipeline';
import { WorkerState, updatePerformanceMode, initConversationTurnManager, HIGH_STAKES_THRESHOLD_TURNS } from './worker/state';
import { sanitizeText, throttledProgress, validateCoachingInsights } from './worker/utils';
import { generateSystemPrompt } from './worker/promptGenerator';

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
                // Simplified loading strategy for brevity in entry point
                await pipelineManager.loadSTT((p) => throttledProgress(p, 'Speech Engine', taskId));
                await pipelineManager.loadLLM((p) => throttledProgress(p, 'Social Brain', taskId));
                self.postMessage({ type: 'ready', taskId });
            } catch (loadError) {
                self.postMessage({ type: 'error', error: loadError.message, taskId });
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

        if (type === 'stt') {
            if (!MLPipeline.stt) await pipelineManager.loadSTT();
            MLPipeline.lastUsed = Date.now();
            pipelineManager.resetInactivityTimer();

            const audioStartTime = performance.now();
            const audioData = audio instanceof Float32Array ? audio : new Float32Array(Object.values(audio));

            const output = await MLPipeline.stt(audioData, {
                chunk_length_s: AppConfig.models.stt.chunk_length_s,
                stride_length_s: AppConfig.models.stt.stride_length_s,
                return_timestamps: false,
            });

            const audioProcessingTime = performance.now() - audioStartTime;
            const sanitizedText = sanitizeText(output.text);
            const turnManager = initConversationTurnManager();
            const turnInfo = (WorkerState.performanceStats.mode !== 'minimal' && settings.enableSpeakerDetection !== false && !settings.privacyMode)
                ? turnManager.processAudio(audioData, sanitizedText)
                : { turn: { speaker: 'user' }, isLikelyNewSpeaker: false };

            updatePerformanceMode(audioProcessingTime, 'audio');
            self.postMessage({
                type: 'stt_result',
                text: sanitizedText,
                metadata: { turnInfo, performance: { audioProcessingTime, mode: WorkerState.performanceStats.mode } },
                taskId
            });
        }

        if (type === 'llm') {
            const startTime = performance.now();
            if (!MLPipeline.llm) await pipelineManager.loadLLM((p) => throttledProgress(p, 'Social Brain', taskId));
            if (!MLPipeline.llm) throw new Error("Social Brain failed to load.");

            MLPipeline.lastUsed = Date.now();
            pipelineManager.resetInactivityTimer();

            const personaConfig = AppConfig.models.personas[persona] || AppConfig.models.personas.anxiety;
            const sanitizedText = _text.trim().substring(0, AppConfig.system.maxTranscriptLength);
            const emotionData = analyzeEmotion(sanitizedText);
            const intents = detectMultipleIntents(sanitizedText, 0.4);

            // Dynamic Thresholds & Context
            let culturalOverrideThreshold = settings?.culturalOverrideThreshold || 0.85;
            const hasHighStakesIntent = intents?.some(i => ['strategic', 'negotiation', 'leadership'].includes(i.intent));
            if (hasHighStakesIntent) WorkerState.highStakesCounter++;
            else WorkerState.highStakesCounter = Math.max(0, WorkerState.highStakesCounter - 1);

            if (hasHighStakesIntent && WorkerState.highStakesCounter >= HIGH_STAKES_THRESHOLD_TURNS) culturalOverrideThreshold = 0.7;

            const isPowerSavingMode = WorkerState.performanceStats.mode === 'minimal';
            const detectedCulturalContext = analyzeCulturalContext(sanitizedText, culturalContext, isPowerSavingMode ? [] : (history || []));
            const effectiveCulturalContext = (detectedCulturalContext.primaryCulture !== 'general' && detectedCulturalContext.confidence > culturalOverrideThreshold)
                ? detectedCulturalContext.primaryCulture : culturalContext;

            // Analysis
            let relationshipInsights = null, anxietyInsights = null, professionalInsights = null, meetingInsights = null, languageLearningInsights = null;
            let coachingAnalysisTime = 0;
            let conversationSentiment = WorkerState.lastSentiment || { overallSentiment: 'neutral', emotionalTrend: 'stable' };

            if (!isPowerSavingMode) {
                const coachingStartTime = performance.now();
                relationshipInsights = (persona === 'relationship') ? analyzeRelationshipCoaching(sanitizedText, history, emotionData, insightCategoryScores) : null;
                anxietyInsights = (persona === 'anxiety') ? analyzeAnxietyCoaching(sanitizedText, history, emotionData) : null;
                professionalInsights = (persona === 'professional') ? analyzeProfessionalCoaching(sanitizedText, history, emotionData, insightCategoryScores) : null;
                meetingInsights = (persona === 'meeting') ? analyzeMeetingCoaching(sanitizedText, history, emotionData, insightCategoryScores) : null;
                if (persona === 'languagelearning') languageLearningInsights = provideContextualLanguageFeedback(sanitizedText, settings?.nativeLanguage || 'general', history);

                const coordinated = resolveFeatureConflicts({ relationship: relationshipInsights, anxiety: anxietyInsights, professional: professionalInsights, meeting: meetingInsights, language: languageLearningInsights }, persona);
                relationshipInsights = coordinated.relationship; anxietyInsights = coordinated.anxiety; professionalInsights = coordinated.professional; meetingInsights = coordinated.meeting; languageLearningInsights = coordinated.language;
                coachingAnalysisTime = performance.now() - coachingStartTime;
            }

            // Parallel Sentiment
            const sentimentPromise = (WorkerState.performanceStats.mode !== 'minimal' && settings.enableSentimentAnalysis !== false && !settings.privacyMode)
                ? Promise.resolve().then(() => {
                    const result = analyzeConversationSentiment(history || []);
                    WorkerState.lastSentiment = result;
                    return result;
                }) : Promise.resolve(conversationSentiment);

            // Prompt
            const isSubtleMode = settings?.isSubtleMode || preferences?.isSubtleMode;
            const profileHash = communicationProfile ? communicationProfile.length : 0;
            const promptKey = `${persona}-${culturalContext}-${preferences?.preferredLength}-${isSubtleMode ? 'subtle' : 'normal'}-${profileHash}`;
            
            if (WorkerState.cachedSystemPrompt.key !== promptKey) {
                WorkerState.cachedSystemPrompt = {
                    key: promptKey,
                    content: generateSystemPrompt({ persona, personaConfig, effectiveCulturalContext, communicationProfile, detectedCulturalContext, sanitizedText, isPowerSavingMode, isSubtleMode, preferences, relationshipInsights, anxietyInsights, settings })
                };
            }

            let dynamicContext = "";
            if (metadata && !settings.privacyMode) {
                if (metadata.rms > 0.01 && (sanitizedText.split(/\s+/).length / (metadata.duration || 1)) > 3) dynamicContext += "User sounds urgent. ";
                if (metadata?.turnInfo?.isLikelyNewSpeaker) dynamicContext += "Another person may be speaking. ";
            }
            if (!settings.privacyMode && emotionData.emotion !== 'neutral') dynamicContext += `Emotion: ${emotionData.emotion}. `;
            if (!settings.privacyMode && conversationSentiment.overallSentiment !== 'neutral') dynamicContext += `Context: ${conversationSentiment.overallSentiment} vibe. `;

            const conversationHistory = monitorAndOptimizeHistory((history || []).map(m => ({ role: m.role || 'user', content: m.content })));
            const messages = [{ role: "system", content: `${WorkerState.cachedSystemPrompt.content} ${dynamicContext}` }, ...conversationHistory, { role: "user", content: sanitizedText }];

            const streamer = new TextStreamer(MLPipeline.llm.tokenizer, {
                skip_prompt: true, skip_special_tokens: true,
                callback_function: (chunk) => { if (chunk) self.postMessage({ type: 'llm_chunk', text: chunk, taskId }); }
            });

            const maxTokens = isPowerSavingMode ? 32 : (WorkerState.performanceStats.mode === 'balanced' ? 64 : 128);
            const output = await MLPipeline.llm(messages, { max_new_tokens: maxTokens, temperature: AppConfig.models.llm.temperature, do_sample: AppConfig.models.llm.do_sample, streamer });

            let response = "";
            if (output[0]?.generated_text) {
                const gen = output[0].generated_text;
                response = Array.isArray(gen) ? gen[gen.length - 1].content : gen;
            }

            const coordinatedResponse = coordinateFeaturesInResponse(response, { relationship: relationshipInsights, anxiety: anxietyInsights, professional: professionalInsights, meeting: meetingInsights, language: languageLearningInsights }, persona);
            const finalSentiment = await sentimentPromise;

            self.postMessage({
                type: 'llm_result',
                text: sanitizeText(coordinatedResponse.trim()),
                emotionData,
                conversationSentiment: finalSentiment,
                coachingInsights: {
                    relationship: validateCoachingInsights(relationshipInsights),
                    anxiety: validateCoachingInsights(anxietyInsights),
                    professional: validateCoachingInsights(professionalInsights),
                    meeting: validateCoachingInsights(meetingInsights),
                    language: validateCoachingInsights(languageLearningInsights),
                    cultural: detectedCulturalContext
                },
                metadata: { performance: { llmProcessingTime: performance.now() - startTime, historySize: estimateConversationSize(conversationHistory) } },
                taskId
            });
        }

        if (type === 'cleanup') {
            await MLPipeline.disposeAll();
            self.postMessage({ type: 'cleanup_complete', taskId });
        }
    } catch (error) {
        self.postMessage({ type: 'error', error: error.message, taskId: taskId || 'unknown' });
    }
};
