import { pipeline, env } from '@huggingface/transformers';

// Configuration for on-device execution
env.allowLocalModels = false;
env.useBrowserCache = true;

// With v3, we can often rely on default paths, but let's ensure we are using a stable ORT backend
// We'll use 1.18.0 which is highly compatible with Transformers.js v3
const ORT_VERSION = '1.18.0';
env.backends.onnx.wasm.wasmPaths = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;

// Standard worker optimizations for stability
env.backends.onnx.wasm.numThreads = 1;
env.backends.onnx.wasm.simd = false;

console.log("ML Worker script loaded with @huggingface/transformers");

class MLPipeline {
    static instance = null;
    static stt = null;
    static llm = null;

    static async getInstance() {
        if (!this.instance) {
            this.instance = new MLPipeline();
        }
        return this.instance;
    }

    async loadSTT(progress_callback) {
        if (!MLPipeline.stt) {
            console.log("Loading STT model...");
            try {
                // Using onnx-community version for better v3 compatibility
                MLPipeline.stt = await pipeline('automatic-speech-recognition', 'onnx-community/whisper-tiny.en', {
                    progress_callback,
                    device: 'wasm',
                    dtype: 'fp32', // More stable in WASM than fp16/int8 for some whisper variants
                });
                console.log("STT model loaded successfully");
            } catch (err) {
                console.error("Failed to load STT model:", err);
                throw err;
            }
        }
    }

    async loadLLM(progress_callback) {
        if (!MLPipeline.llm) {
            console.log("Loading LLM model...");
            try {
                // Qwen3-0.6B is the latest optimized version
                MLPipeline.llm = await pipeline('text-generation', 'onnx-community/Qwen3-0.6B-ONNX', {
                    progress_callback,
                    device: 'wasm',
                    dtype: 'q4', // Quantized for performance
                });
                console.log("LLM model loaded successfully");
            } catch (err) {
                console.error("Failed to load LLM model:", err);
                throw err;
            }
        }
    }
}

let lastProgressTime = 0;
const PROGRESS_THROTTLE = 150;

const throttledProgress = (p, statusPrefix, taskId) => {
    if (p.status === 'progress') {
        const now = Date.now();
        if (now - lastProgressTime > PROGRESS_THROTTLE || p.progress === 100) {
            self.postMessage({ 
                type: 'status', 
                status: `${statusPrefix} (${p.file}): ${Math.round(p.progress ?? 0)}%`, 
                taskId 
            });
            lastProgressTime = now;
        }
    }
};

self.onmessage = async (event) => {
    const { type, audio, text, taskId } = event.data;
    const pipelineManager = await MLPipeline.getInstance();

    try {
        if (type === 'load') {
            console.log("Start loading pipelines...");
            self.postMessage({ type: 'status', status: 'Initializing models...', taskId });
            
            await pipelineManager.loadSTT((p) => throttledProgress(p, 'Loading Speech Engine', taskId));
            self.postMessage({ type: 'status', status: 'Speech Engine Ready. Loading AI Brain...', taskId });

            await pipelineManager.loadLLM((p) => throttledProgress(p, 'Loading AI Brain', taskId));
            
            console.log("All pipelines ready");
            self.postMessage({ type: 'ready', taskId });
        }

        if (type === 'stt') {
            if (!MLPipeline.stt) await pipelineManager.loadSTT();
            const output = await MLPipeline.stt(audio, {
                chunk_length_s: 30,
                stride_length_s: 5,
                language: 'english',
            });
            self.postMessage({ type: 'stt_result', text: output.text, taskId });
        }

        if (type === 'llm') {
            if (!MLPipeline.llm) await pipelineManager.loadLLM();
            
            const messages = [
                { role: "system", content: "You are a social coach. Give a 1-sentence validation and 1-sentence follow-up. Keep it short." },
                { role: "user", content: text },
            ];

            // Use the newer chat template application in v3
            const output = await MLPipeline.llm(messages, {
                max_new_tokens: 50,
                temperature: 0.7,
                do_sample: true,
            });

            const response = output[0].generated_text.at(-1).content.trim();
            self.postMessage({ type: 'llm_result', text: response, taskId });
        }
    } catch (error) {
        console.error("Worker error:", error);
        self.postMessage({ type: 'error', error: error.message, taskId });
    }
};