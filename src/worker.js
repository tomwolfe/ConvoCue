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
    }

    async loadLLM(progress_callback) {
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
    }

    static async disposeLLM() {
        if (MLPipeline.llm) {
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
            } catch (e) {
                MLPipeline.llm = null;
            }
        }
    }
}

const checkMemoryUsage = () => {
    if (self.performance && self.performance.memory) {
        const memory = self.performance.memory;
        const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
        const usagePercent = Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100);
        return { usedMB, usagePercent, isHighMemory: usagePercent > AppConfig.system.memory.modelUnloadThreshold };
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

self.onmessage = async (event) => {
    const { type, audio, taskId, text: _text, persona, history, culturalContext, metadata, preferences } = event.data;
    const pipelineManager = await MLPipeline.getInstance();

    try {
        if (type === 'load') {
            await pipelineManager.loadSTT((p) => throttledProgress(p, 'Speech Engine', taskId));
            const mem = checkMemoryUsage();
            if (!AppConfig.isMobile || (mem && mem.usagePercent < 50)) {
                await pipelineManager.loadLLM((p) => throttledProgress(p, 'Social Brain', taskId));
            }
            self.postMessage({ type: 'ready', taskId });
        }

        if (type === 'stt') {
            if (!MLPipeline.stt) await pipelineManager.loadSTT();
            MLPipeline.lastUsed = Date.now();
            const audioData = audio instanceof Float32Array ? audio : new Float32Array(Object.values(audio));
            
            let sum = 0;
            for (let i = 0; i < audioData.length; i++) sum += audioData[i] * audioData[i];
            const rms = Math.sqrt(sum / audioData.length);
            const duration = audioData.length / 16000;

            const output = await MLPipeline.stt(audioData, {
                chunk_length_s: AppConfig.models.stt.chunk_length_s,
                stride_length_s: AppConfig.models.stt.stride_length_s,
                return_timestamps: false,
            });
            
            self.postMessage({ type: 'stt_result', text: output.text, metadata: { rms, duration }, taskId });
        }

        if (type === 'llm') {
            if (!MLPipeline.llm) await pipelineManager.loadLLM((p) => throttledProgress(p, 'Social Brain', taskId));
            MLPipeline.lastUsed = Date.now();

            const personaConfig = AppConfig.models.personas[persona] || AppConfig.models.personas.anxiety;
            const sanitizedText = _text.trim().substring(0, AppConfig.system.maxTranscriptLength);
            const emotionData = analyzeEmotion(sanitizedText);

            // Build an "Intelligent Context" string
            let contextInstruction = `Persona: ${personaConfig.label}. `;
            if (metadata) {
              const speechRate = sanitizedText.split(/\s+/).length / (metadata.duration || 1);
              if (metadata.rms > 0.01 && speechRate > 3) contextInstruction += "The user sounds urgent. ";
            }
            if (emotionData.emotion !== 'neutral') contextInstruction += `User Emotion: ${emotionData.emotion}. `;
            if (culturalContext && culturalContext !== 'general') contextInstruction += `Cultural Context: ${culturalContext}. `;
            if (preferences) {
              contextInstruction += `Preference: ${preferences.preferredLength} length, ${preferences.preferredTone} tone. `;
            }

            const messages = [
                { role: "system", content: `${personaConfig.prompt} ${contextInstruction} Respond naturally.` },
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

            self.postMessage({ type: 'llm_result', text: response.trim(), emotionData, taskId });

            setTimeout(async () => {
                if (Date.now() - MLPipeline.lastUsed >= AppConfig.system.memory.llmInactivityTimeout) {
                    await MLPipeline.disposeLLM();
                }
            }, AppConfig.system.memory.llmInactivityTimeout + 100);
        }
        
        if (type === 'cleanup') {
            await MLPipeline.disposeLLM();
            self.postMessage({ type: 'cleanup_complete', taskId });
        }
    } catch (error) {
        self.postMessage({ type: 'error', error: error.message, taskId });
    }
};