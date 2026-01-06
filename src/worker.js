import { pipeline, env } from '@huggingface/transformers';

// Configuration for on-device execution
env.allowLocalModels = false;
env.useBrowserCache = true;

// Transformers.js v3 handles WASM paths automatically, but we can ensure stability
// by only setting threads if needed. SIMD should be enabled for modern browsers.
env.backends.onnx.wasm.numThreads = 1;
env.backends.onnx.wasm.simd = true; // Enable SIMD for significantly better performance

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
                // Using whisper-tiny.en which is lightweight
                MLPipeline.stt = await pipeline('automatic-speech-recognition', 'onnx-community/whisper-tiny.en', {
                    progress_callback,
                    device: 'wasm',
                    dtype: 'fp32',
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
                // Qwen2.5-0.5B-Instruct is very capable for its size
                MLPipeline.llm = await pipeline('text-generation', 'onnx-community/Qwen2.5-0.5B-Instruct', {
                    progress_callback,
                    device: 'wasm',
                    dtype: 'q4', 
                });
                console.log("LLM model loaded successfully");
            } catch (err) {
                console.error("Failed to load LLM model:", err);
                throw err;
            }
        }
    }
}

const throttledProgress = (p, statusPrefix, taskId) => {
    // Report progress for all statuses to avoid getting "stuck" at 100% 
    // while the next file is initiating or the model is compiling.
    if (p.status === 'progress') {
        self.postMessage({ 
            type: 'status', 
            status: `${statusPrefix} (${p.file}): ${Math.round(p.progress ?? 0)}%`, 
            taskId 
        });
    } else if (p.status === 'initiate') {
        self.postMessage({ 
            type: 'status', 
            status: `${statusPrefix}: Initializing ${p.file}...`, 
            taskId 
        });
    } else if (p.status === 'done') {
        self.postMessage({ 
            type: 'status', 
            status: `${statusPrefix}: Finished loading ${p.file}`, 
            taskId 
        });
    }
};

self.onmessage = async (event) => {
    const { type, audio, text, taskId } = event.data;
    const pipelineManager = await MLPipeline.getInstance();

    try {
        if (type === 'load') {
            console.log("Start loading pipelines...");
            self.postMessage({ type: 'status', status: 'Initializing models...', taskId });
            
            await pipelineManager.loadSTT((p) => throttledProgress(p, 'Speech Engine', taskId));
            self.postMessage({ type: 'status', status: 'Speech Engine Ready. Loading AI Brain...', taskId });

            await pipelineManager.loadLLM((p) => throttledProgress(p, 'AI Brain', taskId));
            
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
