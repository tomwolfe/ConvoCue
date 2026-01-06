import { pipeline, env, TextStreamer } from '@huggingface/transformers';
import { AppConfig } from './config';
import { analyzeEmotion } from './utils/emotion';
import { analyzeCulturalContext, getCulturalContextForFallback } from './utils/culturalContext';
import { adjustResponseForUser } from './utils/responseEnhancement';

// Sanitization functions for the worker context
const sanitizeText = (text) => {
  if (typeof text !== 'string') {
    return '';
  }

  // Remove potentially dangerous characters/sequences
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/&/g, '&amp;');
};

const sanitizeAndTruncate = (text, maxLength = 500) => {
  if (typeof text !== 'string') {
    return '';
  }

  const truncated = text.substring(0, maxLength);
  return sanitizeText(truncated);
};

// Error handling functions for the worker context
const createWorkerError = (message, context = 'worker') => {
  return {
    message: sanitizeText(message || 'Unknown error'),
    context: sanitizeText(context),
    timestamp: new Date().toISOString()
  };
};

const safeExecuteWorker = (fn, context = 'safeExecuteWorker') => {
  try {
    return {
      success: true,
      data: fn()
    };
  } catch (error) {
    return {
      success: false,
      error: createWorkerError(error.message || 'Unknown error', context)
    };
  }
};

// Configuration for on-device execution
env.allowLocalModels = false;
env.useBrowserCache = true;

// Optimize threads based on hardware - be more conservative to save memory
env.backends.onnx.wasm.numThreads = AppConfig.worker.numThreads;
env.backends.onnx.wasm.simd = AppConfig.worker.simd;
env.backends.onnx.wasm.proxy = false; // Disable proxy to save one worker thread

// Use the same WASM assets as VAD to encourage browser cache sharing and reduce memory
if (AppConfig.vad.onnxWASMPaths) {
    env.backends.onnx.wasm.wasmPaths = AppConfig.vad.onnxWASMPaths;
}

console.log(`ML Worker script loaded. Using ${AppConfig.worker.numThreads} thread(s). SIMD: ${AppConfig.worker.simd}`);

class MLPipeline {
    static instance = null;
    static stt = null;
    static llm = null;
    static lastUsed = Date.now();

    static async getInstance() {
        if (!this.instance) {
            this.instance = new MLPipeline();
        }
        return this.instance;
    }

    async loadSTT(progress_callback) {
        if (!MLPipeline.stt) {
            console.log(`Loading STT model (${AppConfig.models.stt.name}, ${AppConfig.models.stt.dtype})...`);
            try {
                MLPipeline.stt = await pipeline('automatic-speech-recognition', AppConfig.models.stt.name, {
                    progress_callback,
                    device: AppConfig.models.stt.device,
                    dtype: AppConfig.models.stt.dtype,
                });
                console.log("STT model loaded successfully");
            } catch (err) {
                console.error("CRITICAL: Failed to load STT model:", err);
                throw new Error(`STT Load Failed: ${err.message}`);
            }
        }
        MLPipeline.lastUsed = Date.now();
    }

    async loadLLM(progress_callback) {
        if (!MLPipeline.llm) {
            console.log(`Loading LLM model (${AppConfig.models.llm.name}, ${AppConfig.models.llm.dtype})...`);
            try {
                self.postMessage({ type: 'status', status: 'Waking up Social Brain...', progress: 0 });
                MLPipeline.llm = await pipeline('text-generation', AppConfig.models.llm.name, {
                    progress_callback,
                    device: AppConfig.models.llm.device,
                    dtype: AppConfig.models.llm.dtype,
                });
                console.log("LLM model loaded successfully");
                self.postMessage({ type: 'status', status: 'Social Brain ready', progress: 100 });
            } catch (err) {
                console.error("CRITICAL: Failed to load LLM model:", err);
                throw new Error(`LLM Load Failed: ${err.message}`);
            }
        }
        MLPipeline.lastUsed = Date.now();
    }

    static async disposeLLM() {
        if (MLPipeline.llm) {
            console.log("Disposing LLM to free memory...");
            try {
                if (MLPipeline.llm.model && MLPipeline.llm.model.session) {
                    if (Array.isArray(MLPipeline.llm.model.session)) {
                        for (const s of MLPipeline.llm.model.session) {
                            if (s && typeof s.release === 'function') await s.release();
                        }
                    } else if (typeof MLPipeline.llm.model.session.release === 'function') {
                        await MLPipeline.llm.model.session.release();
                    }
                }
                MLPipeline.llm = null;
                console.log("LLM disposed");
            } catch (e) {
                console.warn("Error disposing LLM:", e);
                MLPipeline.llm = null;
            }
        }
    }
}

// Memory management and cleanup functions
const cleanupModels = async () => {
    await MLPipeline.disposeLLM();
    if (MLPipeline.stt) {
        try {
            if (MLPipeline.stt.model && MLPipeline.stt.model.session) {
                if (Array.isArray(MLPipeline.stt.model.session)) {
                    for (const s of MLPipeline.stt.model.session) {
                        if (s && typeof s.release === 'function') await s.release();
                    }
                } else if (typeof MLPipeline.stt.model.session.release === 'function') {
                    await MLPipeline.stt.model.session.release();
                }
            }
            MLPipeline.stt = null;
            console.log("STT model cleaned up");
        } catch (e) {
            console.warn("Error cleaning up STT model:", e);
            MLPipeline.stt = null;
        }
    }
    if (self.gc) self.gc();
};

// Memory monitoring function
const checkMemoryUsage = () => {
    if (self.performance && self.performance.memory) {
        const memory = self.performance.memory;
        const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
        const totalMB = Math.round(memory.jsHeapSizeLimit / 1024 / 1024);
        const usagePercent = Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100);
        
        console.log(`Memory Usage: ${usedMB}MB / ${totalMB}MB (${usagePercent}%)`);
        
        return {
            usedMB,
            totalMB,
            usagePercent,
            isHighMemory: usagePercent > AppConfig.system.memory.modelUnloadThreshold
        };
    }
    return null;
};

// Periodic memory check for mobile
if (AppConfig.isMobile) {
    setInterval(async () => {
        const memoryInfo = checkMemoryUsage();
        if (memoryInfo && memoryInfo.usagePercent > AppConfig.system.memory.modelUnloadThreshold) {
            console.warn("Periodic check: High memory usage on mobile, performing emergency cleanup");
            await MLPipeline.disposeLLM();
        }
    }, AppConfig.system.memory.gcInterval);
}

const throttledProgress = (p, statusPrefix, taskId) => {
    if (p.status === 'progress') {
        self.postMessage({
            type: 'status',
            status: `${statusPrefix}: ${Math.round(p.progress ?? 0)}%`,
            progress: p.progress,
            taskId
        });
    } else if (p.status === 'initiate') {
        self.postMessage({
            type: 'status',
            status: `${statusPrefix}: Initializing...`,
            taskId
        });
    } else if (p.status === 'done') {
        self.postMessage({
            type: 'status',
            status: `${statusPrefix}: Ready`,
            taskId
        });
    }
};

self.onmessage = async (event) => {
    const { type, audio, taskId, text: _text } = event.data;
    const pipelineManager = await MLPipeline.getInstance();

    const memoryInfo = checkMemoryUsage();
    if (memoryInfo && memoryInfo.isHighMemory) {
        console.warn(`High memory usage detected: ${memoryInfo.usedMB}MB (${memoryInfo.usagePercent}%)`);
        if (memoryInfo.usagePercent > 90 && type !== 'llm') {
            await MLPipeline.disposeLLM();
        }
        self.postMessage({ type: 'memory_warning', memoryInfo, taskId });
    }

    try {
        if (type === 'load') {
            console.log("Worker: Starting load sequence");
            self.postMessage({ type: 'status', status: 'Waking up Speech Engine...', taskId });
            await pipelineManager.loadSTT((p) => throttledProgress(p, 'Speech Engine', taskId));
            const mem = checkMemoryUsage();
            const shouldPrewarm = !AppConfig.isMobile || (mem && mem.usagePercent < 50);
            if (shouldPrewarm) {
                console.log("Worker: Pre-warming LLM as memory is sufficient");
                await pipelineManager.loadLLM((p) => throttledProgress(p, 'Social Brain', taskId));
            }
            console.log("Worker: Initialization complete");
            self.postMessage({ type: 'ready', taskId });
        }

        if (type === 'prewarm_llm') {
            if (!MLPipeline.llm) {
                console.log("Worker: Explicit pre-warm request for LLM");
                await pipelineManager.loadLLM((p) => throttledProgress(p, 'Social Brain', taskId));
            }
            self.postMessage({ type: 'prewarm_complete', taskId });
        }

        if (type === 'stt') {
            if (!MLPipeline.stt) await pipelineManager.loadSTT();
            MLPipeline.lastUsed = Date.now();

            let audioData;
            if (audio instanceof Float32Array) audioData = audio;
            else if (audio.buffer instanceof ArrayBuffer) audioData = new Float32Array(audio.buffer);
            else if (Array.isArray(audio)) audioData = new Float32Array(audio);
            else if (typeof audio === 'object' && audio !== null) audioData = new Float32Array(Object.values(audio));
            else throw new Error("Invalid audio data format");

            if (!audioData || audioData.length === 0) throw new Error("Audio data is empty");

            let sum = 0;
            for (let i = 0; i < audioData.length; i++) sum += audioData[i] * audioData[i];
            const rms = Math.sqrt(sum / audioData.length);
            const duration = audioData.length / 16000;

            const output = await MLPipeline.stt(audioData, {
                chunk_length_s: AppConfig.models.stt.chunk_length_s,
                stride_length_s: AppConfig.models.stt.stride_length_s,
                return_timestamps: false,
            });
            
            if (!output || typeof output.text !== 'string') throw new Error("Invalid STT output format");
            audioData = null;
            const sanitizedText = sanitizeAndTruncate(output.text, AppConfig.system.maxTranscriptLength);
            self.postMessage({ type: 'stt_result', text: sanitizedText, metadata: { rms, duration }, taskId });
        }

        if (type === 'llm') {
            const { text, persona = 'social', history = [], culturalContext = 'general', metadata = {}, preferences = {} } = event.data;

            const preLLMMemory = checkMemoryUsage();
            if (preLLMMemory && preLLMMemory.usagePercent > AppConfig.system.memory.modelUnloadThreshold) {
                console.warn("Memory too high to load LLM comfortably, attempting cleanup...");
                self.postMessage({ type: 'status', status: 'Optimizing memory...', taskId });
            }

            if (!MLPipeline.llm) {
                self.postMessage({ type: 'status', status: 'Waking up Social Brain...', taskId });
                await pipelineManager.loadLLM((p) => throttledProgress(p, 'Social Brain', taskId));
            }
            MLPipeline.lastUsed = Date.now();

            if (typeof text !== 'string' || text.trim().length === 0) throw new Error("Invalid input text for LLM processing");

            self.postMessage({ type: 'status', status: 'Analyzing context...', taskId });

            const personaConfig = AppConfig.models.personas[persona] || AppConfig.models.personas.anxiety;
            const sanitizedText = text.trim().substring(0, AppConfig.system.maxTranscriptLength);

            let speechPatternContext = '';
            if (metadata.rms !== undefined && metadata.duration !== undefined) {
                const wordsCount = sanitizedText.split(/\s+/).length;
                const speechRate = wordsCount / metadata.duration;
                const isLoud = metadata.rms > AppConfig.system.speechAnalysis.volumeThreshold;
                const isFast = speechRate > AppConfig.system.speechAnalysis.tempoThreshold;

                if (isLoud && isFast) speechPatternContext = ' The user sounds very energetic or urgent.';
                else if (isLoud) speechPatternContext = ' The user is speaking clearly and with emphasis.';
                else if (isFast) speechPatternContext = ' The user is speaking quickly, possibly excited or rushed.';
                else if (metadata.rms < 0.005) speechPatternContext = ' The user is speaking very softly or tentatively.';
            }

            const processedHistory = history.map(msg => 
                msg.role === 'system' && msg.content.startsWith('Previous conversation summary:') 
                ? { role: "system", content: `Context from earlier conversation: ${msg.content.substring('Previous conversation summary: '.length)}` }
                : { role: msg.role, content: msg.content }
            );

            let emotionalContext = '';
            const emotionResult = analyzeEmotion(sanitizedText);
            if (emotionResult.emotion !== 'neutral' && emotionResult.confidence > 0.3) {
                const valenceDesc = emotionResult.valence > 0.7 ? 'very positive' : emotionResult.valence > 0.5 ? 'somewhat positive' : emotionResult.valence > 0.3 ? 'somewhat negative' : 'very negative';
                const arousalDesc = emotionResult.arousal > 0.7 ? 'highly energetic' : emotionResult.arousal > 0.5 ? 'moderately energetic' : emotionResult.arousal > 0.3 ? 'calm' : 'very calm';
                const dominanceDesc = emotionResult.dominance > 0.7 ? 'very assertive' : emotionResult.dominance > 0.5 ? 'moderately assertive' : emotionResult.dominance > 0.3 ? 'somewhat submissive' : 'very submissive';
                emotionalContext = ` Emotional analysis: The user's tone seems to express ${emotionResult.emotion} with ${Math.round(emotionResult.confidence * 100)}% confidence. Valence: ${valenceDesc}. Arousal: ${arousalDesc}. Dominance: ${dominanceDesc}.`;
            }

            let culturalContextAnalysis = '';
            if (['crosscultural', 'languagelearning', 'meeting'].includes(persona)) {
                culturalContextAnalysis = analyzeCulturalContext(sanitizedText, culturalContext);
            }

            const systemPrompt = personaConfig.prompt + speechPatternContext + emotionalContext + (culturalContextAnalysis ? ` ${culturalContextAnalysis}` : '');
            const messages = [{ role: "system", content: systemPrompt }, ...processedHistory];

            const lastHistoryMessage = processedHistory.length > 0 ? processedHistory[processedHistory.length - 1] : null;
            if (!lastHistoryMessage || lastHistoryMessage.role !== 'user' || lastHistoryMessage.content !== sanitizedText) {
                messages.push({ role: "user", content: sanitizedText });
            }

            console.log(`Starting LLM generation for mode: ${persona}`);
            self.postMessage({ type: 'status', status: 'Polishing cue...', taskId });

            try {
                const streamer = new TextStreamer(MLPipeline.llm.tokenizer, {
                    skip_prompt: true,
                    skip_special_tokens: true,
                    callback_function: (chunk) => {
                        if (typeof chunk === 'string' && chunk.length > 0) {
                            const sanitizedChunk = sanitizeText(chunk);
                            self.postMessage({ type: 'llm_chunk', text: sanitizedChunk, taskId });
                        }
                    },
                });

                const output = await MLPipeline.llm(messages, {
                    max_new_tokens: AppConfig.models.llm.max_new_tokens,
                    temperature: AppConfig.models.llm.temperature,
                    do_sample: AppConfig.models.llm.do_sample,
                    streamer,
                });

                let response = '';
                if (output[0] && output[0].generated_text) {
                    if (Array.isArray(output[0].generated_text)) {
                        const resultMessages = output[0].generated_text;
                        for (let i = resultMessages.length - 1; i >= 0; i--) {
                            if (resultMessages[i].role === 'assistant') {
                                response = resultMessages[i].content.trim();
                                break;
                            }
                        }
                    } else response = output[0].generated_text.trim();
                } else if (typeof output[0] === 'string') response = output[0].trim();

                if (!response || response.toLowerCase().includes(sanitizedText.toLowerCase())) throw new Error("Invalid or echo response");

                const enhancedResponse = adjustResponseForUser(response, persona, emotionResult, preferences);
                const sanitizedResponse = sanitizeAndTruncate(enhancedResponse, AppConfig.system.maxSuggestionLength);

                self.postMessage({ type: 'llm_result', text: sanitizedResponse, taskId, emotionData: emotionResult });
            } catch (llmError) {
                console.error("LLM generation failed:", llmError);
                const enhancedFallbackResponses = {
                    anxiety: ["That sounds interesting. Tell me more.", "I understand. What's on your mind?", "That's a thoughtful point. How do you feel?"],
                    professional: ["Thank you for sharing. What are the next steps?", "That's an important consideration. How should we proceed?"],
                    relationship: ["I understand. How are you feeling about this?", "That sounds meaningful. How did that impact you?"],
                    concise: [["Interesting", "Tell me more"], ["Got it", "Thanks"]],
                    crosscultural: ["That's a thoughtful point. How does this align with your cultural perspective?"],
                    languagelearning: ["I understand. Here's a more natural way to say it..."],
                    meeting: ["That's an important point. Should we discuss this further?"]
                };

                const personaFallbacks = enhancedFallbackResponses[persona] || enhancedFallbackResponses.anxiety;
                let fallbackText = Array.isArray(personaFallbacks[0]) 
                    ? (persona === 'concise' ? personaFallbacks[0].join(' | ') : personaFallbacks[0].join(', '))
                    : personaFallbacks[Math.floor(Math.random() * personaFallbacks.length)];

                if (emotionResult.emotion !== 'neutral' && emotionResult.confidence > 0.5) {
                    const emotionalPrefixes = {
                        joy: "That sounds wonderful!", sadness: "I'm sorry to hear that.", anger: "I can sense your frustration.",
                        fear: "I understand your concern.", surprise: "That's unexpected!", disgust: "I understand your reaction."
                    };
                    fallbackText = `${emotionalPrefixes[emotionResult.emotion] || "I hear you."} ${fallbackText}`;
                }

                if (persona === 'crosscultural' && culturalContext !== 'general') {
                    fallbackText += ` ${getCulturalContextForFallback(culturalContext)}`;
                }

                const sanitizedFallback = sanitizeAndTruncate(fallbackText, AppConfig.system.maxSuggestionLength);
                self.postMessage({ type: 'llm_result', text: sanitizedFallback, taskId });
            }

            setTimeout(async () => {
                if (Date.now() - MLPipeline.lastUsed >= AppConfig.system.memory.llmInactivityTimeout && MLPipeline.llm) {
                    await MLPipeline.disposeLLM();
                }
            }, AppConfig.system.memory.llmInactivityTimeout + 1000);
        }
        
        if (type === 'cleanup') {
            await cleanupModels();
            self.postMessage({ type: 'cleanup_complete', taskId });
        }
    } catch (error) {
        console.error("Worker error:", error);
        const sanitizedError = sanitizeText(error.message || 'Unknown error');
        self.postMessage({ type: 'error', error: sanitizedError, taskId });
    }
};

self.onterminate = cleanupModels;

self.addEventListener('error', (event) => {
    console.error('Unhandled worker error:', event.error);
    try {
        self.postMessage({ type: 'error', error: `Unhandled: ${event.error?.message || 'Unknown'}`, taskId: `error-${Date.now()}` });
    } catch (e) {}
});