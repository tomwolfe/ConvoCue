import { pipeline, env } from '@xenova/transformers';

// Configuration for on-device execution
env.allowLocalModels = false;
env.useBrowserCache = true;

// Point to CDN for WASM files to avoid local path issues
env.backends.onnx.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.19.0/dist/';

console.log("ML Worker script loaded");

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
            MLPipeline.stt = await pipeline('automatic-speech-recognition', 'Xenova/distil-whisper-tiny.en', {
                progress_callback,
            });
        }
    }

    async loadLLM(progress_callback) {
        if (!MLPipeline.llm) {
            MLPipeline.llm = await pipeline('text-generation', 'Xenova/SmolLM2-360M-Instruct', {
                progress_callback,
                model_file_name: 'model_q4.onnx', // Use quantized version
            });
        }
    }
}

self.onmessage = async (event) => {
    const { type, audio, text, taskId } = event.data;
    const pipelineManager = await MLPipeline.getInstance();

    try {
        if (type === 'load') {
            await pipelineManager.loadSTT((p) => {
                if (p.status === 'progress') {
                    self.postMessage({ type: 'status', status: `Loading Speech Engine: ${Math.round(p.progress ?? 0)}%`, taskId });
                }
            });
            await pipelineManager.loadLLM((p) => {
                if (p.status === 'progress') {
                    self.postMessage({ type: 'status', status: `Loading AI Brain: ${Math.round(p.progress ?? 0)}%`, taskId });
                }
            });
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
                { role: "system", content: "You are a social coach. Provide 1 brief validation and 1 short follow-up based on the transcript. Keep it under 20 words. No sarcasm." },
                { role: "user", content: text },
            ];

            const prompt = MLPipeline.llm.tokenizer.apply_chat_template(messages, {
                tokenize: false,
                add_generation_prompt: true,
            });

            const output = await MLPipeline.llm(prompt, {
                max_new_tokens: 50,
                temperature: 0.7,
                do_sample: true,
                top_k: 50,
            });

            const response = output[0].generated_text.split('<|assistant|>').pop().trim();
            self.postMessage({ type: 'llm_result', text: response, taskId });
        }
    } catch (error) {
        self.postMessage({ type: 'error', error: error.message, taskId });
    }
};
