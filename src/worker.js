import { pipeline, env, TextStreamer } from '@huggingface/transformers';
import { AppConfig } from './config';
import { analyzeEmotion } from './utils/emotion';

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
            self.postMessage({ type: 'stt_result', text: sanitizedText, metadata: { rms, duration }, taskId });
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
                if (culturalContext && culturalContext !== 'general') contextInstruction += `Cultural Context: ${culturalContext}. `;
                if (preferences) contextInstruction += `Preference: ${preferences.preferredLength} length. `;
                
                cachedSystemPrompt = {
                    key: promptKey,
                    content: `${personaConfig.prompt} ${contextInstruction} Respond naturally.`
                };
            }

            // Dynamic Context (Not cached)
            let dynamicContext = "";
            if (metadata) {
                const speechRate = sanitizedText.split(/\s+/).length / (metadata.duration || 1);
                if (metadata.rms > 0.01 && speechRate > 3) dynamicContext += "User sounds urgent. ";
            }
            if (emotionData.emotion !== 'neutral') dynamicContext += `Emotion: ${emotionData.emotion}. `;

            const messages = [
                { role: "system", content: `${cachedSystemPrompt.content} ${dynamicContext}` },
                ...(history || []).map(m => ({ role: m.role, content: m.content })),
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
            self.postMessage({ type: 'llm_result', text: sanitizedResponse, emotionData, taskId });
        }
        
        if (type === 'cleanup') {
            await MLPipeline.disposeLLM();
            self.postMessage({ type: 'cleanup_complete', taskId });
        }
    } catch (error) {
        self.postMessage({ type: 'error', error: error.message, taskId });
    }
};