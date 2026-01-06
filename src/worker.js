import { pipeline, env, TextStreamer } from '@huggingface/transformers';

// Configuration for on-device execution
env.allowLocalModels = false;
env.useBrowserCache = true;

// Optimize threads based on hardware - be more conservative to save memory
const numThreads = 1; 
env.backends.onnx.wasm.numThreads = numThreads;
env.backends.onnx.wasm.simd = true;

// Force specific WASM paths if needed, but for now just log
console.log(`ML Worker script loaded. Using ${numThreads} thread(s).`);

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
            console.log("Loading STT model (whisper-tiny.en, q4) from Hugging Face...");
            try {
                MLPipeline.stt = await pipeline('automatic-speech-recognition', 'onnx-community/whisper-tiny.en', {
                    progress_callback,
                    device: 'wasm',
                    dtype: 'q4', 
                });
                console.log("STT model loaded successfully");
            } catch (err) {
                console.error("CRITICAL: Failed to load STT model:", err);
                throw new Error(`STT Load Failed: ${err.message}`);
            }
        }
    }

    async loadLLM(progress_callback) {
        if (!MLPipeline.llm) {
            console.log("Loading LLM model (HuggingFaceTB/SmolLM2-135M-Instruct, q4) from Hugging Face...");
            try {
                MLPipeline.llm = await pipeline('text-generation', 'HuggingFaceTB/SmolLM2-135M-Instruct', {
                    progress_callback,
                    device: 'wasm',
                    dtype: 'q4', 
                });
                console.log("LLM model loaded successfully");
            } catch (err) {
                console.error("CRITICAL: Failed to load LLM model:", err);
                throw new Error(`LLM Load Failed: ${err.message}`);
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

    // Log memory usage if available
    if (self.performance && self.performance.memory) {
        console.log(`Worker memory usage: ${Math.round(self.performance.memory.usedJSHeapSize / 1024 / 1024)}MB / ${Math.round(self.performance.memory.jsHeapSizeLimit / 1024 / 1024)}MB`);
    }

    try {
        if (type === 'load') {
            console.log("Worker: Starting load sequence");
            self.postMessage({ type: 'status', status: 'Waking up AI engines...', taskId });
            
            await pipelineManager.loadSTT((p) => throttledProgress(p, 'Speech Engine', taskId));
            self.postMessage({ type: 'status', status: 'Speech Engine Ready. Loading Social Brain...', taskId });

            await pipelineManager.loadLLM((p) => throttledProgress(p, 'Social Brain', taskId));
            
            console.log("Worker: Fully initialized");
            if (self.performance && self.performance.memory) {
                console.log(`Worker memory after load: ${Math.round(self.performance.memory.usedJSHeapSize / 1024 / 1024)}MB`);
            }
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
            });
            self.postMessage({ type: 'stt_result', text: output.text, taskId });
        }

        if (type === 'llm') {
            if (!MLPipeline.llm) await pipelineManager.loadLLM();
            
            const messages = [
                { role: "system", content: "You are a social coach. Give a 1-sentence validation and 1-sentence follow-up. Keep it short." },
                { role: "user", content: text },
            ];

            console.log("Starting LLM generation with streaming...");
            
            const streamer = new TextStreamer(MLPipeline.llm.tokenizer, {
                skip_prompt: true,
                skip_special_tokens: true,
                callback_function: (text) => {
                    self.postMessage({ type: 'llm_chunk', text, taskId });
                },
            });

            const output = await MLPipeline.llm(messages, {
                max_new_tokens: 128,
                temperature: 0.7,
                do_sample: true,
                streamer,
            });

            const response = output[0].generated_text.at(-1).content.trim();
            console.log("LLM Generation complete");
            self.postMessage({ type: 'llm_result', text: response, taskId });
        }
    } catch (error) {
        console.error("Worker error:", error);
        self.postMessage({ type: 'error', error: error.message, taskId });
    }
};
