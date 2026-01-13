import { pipeline, env } from '@huggingface/transformers';

env.allowLocalModels = false;
env.useBrowserCache = true;
env.backends.onnx.wasm.wasmPaths = "/";
const numThreads = Math.min(4, Math.max(1, (self.navigator.hardwareConcurrency || 2) - 1));
env.backends.onnx.wasm.numThreads = numThreads;

let llmPipeline = null;
const LLM_MODEL = 'HuggingFaceTB/SmolLM2-135M-Instruct';

self.onmessage = async (event) => {
    const { type, data, taskId } = event.data;

    try {
        switch (type) {
            case 'load':
                if (!llmPipeline) {
                    llmPipeline = await pipeline('text-generation', LLM_MODEL, {
                        device: 'wasm',
                        dtype: 'q4',
                        progress_callback: (p) => {
                            if (p.status === 'progress') {
                                self.postMessage({ type: 'progress', progress: p.progress, taskId });
                            }
                        }
                    });
                }
                self.postMessage({ type: 'ready', taskId });
                break;
            case 'llm':
                if (!llmPipeline) throw new Error('LLM model not loaded');
                const { messages, context, instruction } = data;
                
                const systemPrompt = `Role: ${context.persona}. Intent: ${context.intent}. Battery: ${context.battery}%. 
Goal: Provide 1 punchy suggestion (<15 words). No preamble. 
Focus: ${instruction}`;

                const fullPrompt = `<|im_start|>system\n${systemPrompt}<|im_end|>\n` + 
                    messages.map(m => `<|im_start|>${m.role}\n${m.content}<|im_end|>`).join('\n') +
                    '\n<|im_start|>assistant\n';

                const output = await llmPipeline(fullPrompt, {
                    max_new_tokens: 48,
                    temperature: 0.7,
                    do_sample: true,
                    return_full_text: false,
                });

                const suggestion = output[0].generated_text.trim();
                self.postMessage({ type: 'llm_result', suggestion, taskId });
                break;
        }
    } catch (error) {
        self.postMessage({ type: 'error', error: error.message, taskId });
    }
};
