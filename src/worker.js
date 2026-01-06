import { pipeline, env } from '@huggingface/transformers';

// Configuration for on-device execution
env.allowLocalModels = false;
env.useBrowserCache = true;

// Optimize threads based on hardware
const numThreads = self.navigator.hardwareConcurrency ? Math.min(4, self.navigator.hardwareConcurrency) : 1;
env.backends.onnx.wasm.numThreads = numThreads;
env.backends.onnx.wasm.simd = true;

console.log(`ML Worker script loaded with ${numThreads} threads`);

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
                // Using whisper-tiny.en with quantized weights if possible
                MLPipeline.stt = await pipeline('automatic-speech-recognition', 'onnx-community/whisper-tiny.en', {
                    progress_callback,
                    device: 'wasm',
                    dtype: 'fp32', // whisper-tiny.en on onnx-community is often fp32
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
    }
};

self.onmessage = async (event) => {
    const { type, audio, text, taskId } = event.data;
    const pipelineManager = await MLPipeline.getInstance();

    try {
        if (type === 'load') {
            self.postMessage({ type: 'status', status: 'Initializing models...', taskId });
            
            await pipelineManager.loadSTT((p) => throttledProgress(p, 'Loading Speech Engine', taskId));
            self.postMessage({ type: 'status', status: 'Speech Engine Ready. Loading AI Brain...', taskId });

            await pipelineManager.loadLLM((p) => throttledProgress(p, 'Loading AI Brain', taskId));
            
            self.postMessage({ type: 'ready', taskId });
        }

        if (type === 'stt') {
            if (!MLPipeline.stt) await pipelineManager.loadSTT();
            
            let audioData;
            if (audio instanceof Float32Array) {
                audioData = audio;
            } else if (audio.buffer instanceof ArrayBuffer) {
                // Handle cases where it might be passed as a TypedArray but lost its prototype during postMessage
                audioData = new Float32Array(audio.buffer);
            } else if (Array.isArray(audio)) {
                audioData = new Float32Array(audio);
            } else if (typeof audio === 'object' && audio !== null) {
                // Fallback for structured clone issues
                audioData = new Float32Array(Object.values(audio));
            } else {
                throw new Error("Invalid audio data format");
            }
            
            const output = await MLPipeline.stt(audioData, {
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
            console.log("LLM Result:", response);
            self.postMessage({ type: 'llm_result', text: response, taskId });
        }
    } catch (error) {
        console.error("Worker error:", error);
        self.postMessage({ type: 'error', error: error.message, taskId });
    }
};
