import { pipeline, env, TextStreamer } from '@huggingface/transformers';
import { AppConfig } from './config';

// Configuration for on-device execution
env.allowLocalModels = false;
env.useBrowserCache = true;

// Optimize threads based on hardware - be more conservative to save memory
env.backends.onnx.wasm.numThreads = AppConfig.worker.numThreads;
env.backends.onnx.wasm.simd = AppConfig.worker.simd;

// Use the same WASM assets as VAD to encourage browser cache sharing and reduce memory
if (AppConfig.vad.onnxWASMPaths) {
    env.backends.onnx.wasm.wasmPaths = AppConfig.vad.onnxWASMPaths;
}

console.log(`ML Worker script loaded. Using ${AppConfig.worker.numThreads} thread(s).`);

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
                MLPipeline.llm = await pipeline('text-generation', AppConfig.models.llm.name, {
                    progress_callback,
                    device: AppConfig.models.llm.device,
                    dtype: AppConfig.models.llm.dtype,
                });
                console.log("LLM model loaded successfully");
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
                // In Transformers.js v3, we try to dispose the underlying session
                if (MLPipeline.llm.model && MLPipeline.llm.model.session) {
                    await MLPipeline.llm.model.session.release();
                }
                MLPipeline.llm = null;
                console.log("LLM disposed");
            } catch (e) {
                console.warn("Error disposing LLM:", e);
                MLPipeline.llm = null; // Force null anyway
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
                await MLPipeline.stt.model.session.release();
            }
            MLPipeline.stt = null;
            console.log("STT model cleaned up");
        } catch (e) {
            console.warn("Error cleaning up STT model:", e);
            MLPipeline.stt = null;
        }
    }
};

// Memory monitoring function
const checkMemoryUsage = () => {
    if (self.performance && self.performance.memory) {
        const memory = self.performance.memory;
        const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
        const totalMB = Math.round(memory.jsHeapSizeLimit / 1024 / 1024);
        const usagePercent = Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100);
        
        console.log(`Memory Usage: ${usedMB}MB / ${totalMB}MB (${usagePercent}%)`);
        
        // Return memory usage info for potential optimization decisions
        return {
            usedMB,
            totalMB,
            usagePercent,
            isHighMemory: usagePercent > 80
        };
    }
    return null;
};

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
    const { type, audio, text, taskId } = event.data;
    const pipelineManager = await MLPipeline.getInstance();

    // Check memory usage and log if high
    const memoryInfo = checkMemoryUsage();
    if (memoryInfo && memoryInfo.isHighMemory) {
        console.warn(`High memory usage detected: ${memoryInfo.usedMB}MB (${memoryInfo.usagePercent}%)`);
        
        // If memory is very high (>90%), try to dispose LLM if it's not being used for this task
        if (memoryInfo.usagePercent > 90 && type !== 'llm') {
            await MLPipeline.disposeLLM();
        }

        self.postMessage({
            type: 'memory_warning',
            memoryInfo,
            taskId
        });
    }

    try {
        if (type === 'load') {
            console.log("Worker: Starting load sequence (STT only for now)");
            self.postMessage({ type: 'status', status: 'Waking up Speech Engine...', taskId });

            await pipelineManager.loadSTT((p) => throttledProgress(p, 'Speech Engine', taskId));
            
            console.log("Worker: STT initialized. LLM will lazy load.");
            self.postMessage({ type: 'ready', taskId });
        }

        if (type === 'stt') {
            if (!MLPipeline.stt) await pipelineManager.loadSTT();
            MLPipeline.lastUsed = Date.now();

            let audioData;
            if (audio instanceof Float32Array) {
                audioData = audio;
            } else if (audio.buffer instanceof ArrayBuffer) {
                audioData = new Float32Array(audio.buffer);
            } else if (Array.isArray(audio)) {
                audioData = new Float32Array(audio);
            } else if (typeof audio === 'object' && audio !== null) {
                audioData = new Float32Array(Object.values(audio));
            } else {
                throw new Error("Invalid audio data format");
            }

            if (!audioData || audioData.length === 0) {
                throw new Error("Audio data is empty");
            }

            const output = await MLPipeline.stt(audioData, {
                chunk_length_s: AppConfig.models.stt.chunk_length_s,
                stride_length_s: AppConfig.models.stt.stride_length_s,
            });
            
            if (!output || typeof output.text !== 'string') {
                throw new Error("Invalid STT output format");
            }
            
            self.postMessage({ type: 'stt_result', text: output.text, taskId });
        }

        if (type === 'llm') {
            // Lazy load LLM if not present
            if (!MLPipeline.llm) {
                self.postMessage({ type: 'status', status: 'Waking up Social Brain...', taskId });
                await pipelineManager.loadLLM((p) => throttledProgress(p, 'Social Brain', taskId));
            }
            MLPipeline.lastUsed = Date.now();

            if (typeof text !== 'string' || text.trim().length === 0) {
                throw new Error("Invalid input text for LLM processing");
            }

            const sanitizedText = text.trim().substring(0, 1000);

            const messages = [
                { role: "system", content: "You are a social coach. Give a 1-sentence validation and 1-sentence follow-up. Keep it short." },
                { role: "user", content: sanitizedText },
            ];

            console.log("Starting LLM generation with streaming...");

            const streamer = new TextStreamer(MLPipeline.llm.tokenizer, {
                skip_prompt: true,
                skip_special_tokens: true,
                callback_function: (chunk) => {
                    if (typeof chunk === 'string') {
                        self.postMessage({ type: 'llm_chunk', text: chunk, taskId });
                    }
                },
            });

            const output = await MLPipeline.llm(messages, {
                max_new_tokens: AppConfig.models.llm.max_new_tokens,
                temperature: AppConfig.models.llm.temperature,
                do_sample: AppConfig.models.llm.do_sample,
                streamer,
            });

            if (!output || !Array.isArray(output) || output.length === 0) {
                throw new Error("Invalid LLM output format");
            }

            const response = output[0].generated_text.at(-1)?.content?.trim() || '';
            
            if (typeof response !== 'string') {
                throw new Error("Invalid LLM response format");
            }

            console.log("LLM Generation complete");
            self.postMessage({ type: 'llm_result', text: response, taskId });

            // Set a timeout to potentially unload LLM after inactivity to save memory
            // 2 minutes of inactivity (reduced from 5 for mobile)
            setTimeout(async () => {
                const now = Date.now();
                if (now - MLPipeline.lastUsed >= 120000 && MLPipeline.llm) {
                    await MLPipeline.disposeLLM();
                }
            }, 121000);
        }
        
        if (type === 'cleanup') {
            console.log("Received cleanup command");
            await cleanupModels();
            self.postMessage({ type: 'cleanup_complete', taskId });
        }
    } catch (error) {
        console.error("Worker error:", error);
        self.postMessage({ type: 'error', error: error.message, taskId });
    }
};

// Handle worker termination to clean up resources
self.onterminate = () => {
    console.log("Worker terminating, cleaning up models...");
    cleanupModels();
};