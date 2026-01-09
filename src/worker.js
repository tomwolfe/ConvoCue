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
            self.postMessage({ 
                type: 'status', 
                status: 'Social Brain deferred (Low Memory)', 
                isLowMemory: true 
            });
            return;
        }

        if (!MLPipeline.llm) {
            try {
                // Signal that we are starting to load heavy model
                self.postMessage({ type: 'status', status: 'Loading Social Brain...' });
                
                MLPipeline.llm = await pipeline('text-generation', AppConfig.models.llm.name, {
                    progress_callback,
                    device: AppConfig.models.llm.device,
                    dtype: AppConfig.models.llm.dtype,
                });
            } catch (err) {
                console.error("LLM Load Failed:", err);
                // Try to recover by clearing cache or signaling error
                self.postMessage({ type: 'error', error: 'Social Brain failed to load. Try refreshing.' });
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
    const pipelineManager = await MLPipeline.getInstance();

    // Determine effective settings (prefer passed settings, fallback to minimal if missing)
    const settings = _settings || {
        enablePersonalization: true,
        enableSpeakerDetection: true,
        enableSentimentAnalysis: true,
        privacyMode: false
    };

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
        }

        if (type === 'llm') {
            if (!MLPipeline.llm) await pipelineManager.loadLLM((p) => throttledProgress(p, 'Social Brain', taskId));
            if (!MLPipeline.llm) throw new Error("Social Brain failed to load or was deferred due to memory.");

            MLPipeline.lastUsed = Date.now();
            pipelineManager.resetInactivityTimer();

            const personaConfig = AppConfig.models.personas[persona] || AppConfig.models.personas.anxiety;
            const sanitizedText = _text.trim().substring(0, AppConfig.system.maxTranscriptLength);
            const emotionData = analyzeEmotion(sanitizedText);

            // Existing relationship coaching analysis
            const relationshipInsights = (persona === 'relationship')
                ? analyzeRelationshipCoaching(sanitizedText, history, emotionData, insightCategoryScores)
                : null;

            // Enhanced anxiety coaching analysis for anxiety persona
            const anxietyInsights = persona === 'anxiety'
                ? analyzeAnxietyCoaching(sanitizedText, history, emotionData)
                : null;

            // Enhanced professional coaching analysis
            const professionalInsights = (persona === 'professional')
                ? analyzeProfessionalCoaching(sanitizedText, history, emotionData, insightCategoryScores)
                : null;
            
            const meetingInsights = (persona === 'meeting')
                ? analyzeMeetingCoaching(sanitizedText, history, emotionData, insightCategoryScores)
                : null;

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
                    contextInstruction += getLanguageLearningPromptTips(effectiveCulturalContext || 'english');
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

            const llmProcessingTime = performance.now() - llmStartTime;

            // Log performance metrics for large histories
            logPerformanceMetric('llm_processing', llmStartTime, history);

            // Sanitize the response before sending it back
            const sanitizedResponse = sanitizeText(response.trim());
            self.postMessage({
              type: 'llm_result',
              text: sanitizedResponse,
              emotionData,
              conversationSentiment, // Include conversation sentiment
              coachingInsights: {
                relationship: validateCoachingInsights(relationshipInsights),
                anxiety: validateCoachingInsights(anxietyInsights),
                professional: validateCoachingInsights(professionalInsights),
                meeting: validateCoachingInsights(meetingInsights)
              },
              metadata: {
                performance: {
                  llmProcessingTime,
                  sentimentAnalysisTime,
                  historySize
                }
              },
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