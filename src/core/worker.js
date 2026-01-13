import { pipeline, env } from '@huggingface/transformers';

env.allowLocalModels = false;
env.useBrowserCache = true;

// Use absolute paths with origin to avoid 404s on some deployment platforms
const origin = self.location.origin;
env.backends.onnx.wasm.wasmPaths = {
    "ort-wasm-simd-threaded.wasm": `${origin}/ort-wasm-simd-threaded.wasm`,
    "ort-wasm-simd-threaded.mjs": `${origin}/ort-wasm-simd-threaded.mjs`,
    "ort-wasm-simd-threaded.jsep.wasm": `${origin}/ort-wasm-simd-threaded.jsep.wasm`,
    "ort-wasm-simd-threaded.jsep.mjs": `${origin}/ort-wasm-simd-threaded.jsep.mjs`,
};

let sttPipeline = null;
let llmPipeline = null;

const STT_MODEL = 'onnx-community/whisper-tiny.en';
const LLM_MODEL = 'HuggingFaceTB/SmolLM2-135M-Instruct';

self.onmessage = async (event) => {
    const { type, data, taskId } = event.data;

    try {
        switch (type) {
            case 'load':
                await loadModels(taskId);
                break;
            case 'stt':
                await handleSTT(data, taskId);
                break;
            case 'llm':
                await handleLLM(data, taskId);
                break;
        }
    } catch (error) {
        console.error(`[Worker] Error: ${error.message}`);
        self.postMessage({ type: 'error', error: error.message, taskId });
    }
};

async function loadModels(taskId) {
    self.postMessage({ type: 'status', status: 'Loading Models...', progress: 0 });

    if (!sttPipeline) {
        sttPipeline = await pipeline('automatic-speech-recognition', STT_MODEL, {
            device: 'wasm',
            dtype: 'q4',
            progress_callback: (p) => {
                if (p.status === 'progress') {
                    self.postMessage({ type: 'progress', progress: p.progress, model: 'stt', taskId });
                }
            }
        });
    }

    if (!llmPipeline) {
        llmPipeline = await pipeline('text-generation', LLM_MODEL, {
            device: 'wasm',
            dtype: 'q4',
            progress_callback: (p) => {
                if (p.status === 'progress') {
                    self.postMessage({ type: 'progress', progress: p.progress, model: 'llm', taskId });
                }
            }
        });
    }

    self.postMessage({ type: 'ready', taskId });
}

async function handleSTT(audio, taskId) {
    if (!sttPipeline) throw new Error('STT model not loaded');

    const result = await sttPipeline(audio, {
        chunk_length_s: 30,
        stride_length_s: 5,
        language: 'english',
    });

    self.postMessage({ type: 'stt_result', text: result.text, taskId });
}

async function handleLLM({ messages, personaPrompt }, taskId) {
    if (!llmPipeline) throw new Error('LLM model not loaded');

    const fullPrompt = `<|im_start|>system\n${personaPrompt}<|im_end|>\n` + 
        messages.map(m => `<|im_start|>${m.role}\n${m.content}<|im_end|>`).join('\n') +
        '\n<|im_start|>assistant\n';

    const output = await llmPipeline(fullPrompt, {
        max_new_tokens: 64,
        temperature: 0.7,
        do_sample: true,
        return_full_text: false,
    });

    const suggestion = output[0].generated_text.trim();
    self.postMessage({ type: 'llm_result', suggestion, taskId });
}
