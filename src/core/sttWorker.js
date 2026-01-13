import { pipeline, env } from '@huggingface/transformers';

env.allowLocalModels = false;
env.useBrowserCache = true;
env.backends.onnx.wasm.wasmPaths = "/";
const numThreads = Math.min(4, Math.max(1, (self.navigator.hardwareConcurrency || 2) - 1));
env.backends.onnx.wasm.numThreads = numThreads;

let sttPipeline = null;
const STT_MODEL = 'onnx-community/whisper-tiny.en';

self.onmessage = async (event) => {
    const { type, data, taskId } = event.data;

    try {
        switch (type) {
            case 'load':
                if (!sttPipeline) {
                    sttPipeline = await pipeline('automatic-speech-recognition', STT_MODEL, {
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
            case 'stt':
                if (!sttPipeline) throw new Error('STT model not loaded');
                const result = await sttPipeline(data, {
                    chunk_length_s: 15,
                    stride_length_s: 2,
                });
                self.postMessage({ type: 'stt_result', text: result.text, taskId });
                break;
        }
    } catch (error) {
        self.postMessage({ type: 'error', error: error.message, taskId });
    }
};
