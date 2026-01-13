import { pipeline, env } from '@huggingface/transformers';

env.allowLocalModels = false;
env.useBrowserCache = true;

// Check for WebGPU support and configure accordingly
const isWebGPUSupported = typeof navigator !== 'undefined' &&
                          navigator.gpu !== undefined;

if (isWebGPUSupported) {
    // WebGPU configuration
    env.backends.onnx.wasm.wasmPaths = "/";
} else {
    // Fallback to WASM configuration
    env.backends.onnx.wasm.wasmPaths = "/";
    const numThreads = Math.min(4, Math.max(1, (self.navigator.hardwareConcurrency || 2) - 1));
    env.backends.onnx.wasm.numThreads = numThreads;
}

let sttPipeline = null;
let isModelLoading = false;
let modelLoadStartTime = null;
const STT_MODEL = 'onnx-community/whisper-tiny.en';

self.onmessage = async (event) => {
    const { type, data, taskId } = event.data;

    try {
        switch (type) {
            case 'load':
                if (!sttPipeline && !isModelLoading) {
                    isModelLoading = true;
                    modelLoadStartTime = Date.now();

                    try {
                        // Use WebGPU if supported, otherwise fallback to WASM
                        const device = isWebGPUSupported ? 'webgpu' : 'wasm';

                        // Add more granular progress updates
                        sttPipeline = await pipeline('automatic-speech-recognition', STT_MODEL, {
                            device: device,
                            dtype: 'q4',
                            progress_callback: (p) => {
                                if (p.status === 'progress') {
                                    // Calculate estimated progress based on time if available
                                    let calculatedProgress = p.progress;

                                    if (p.file && p.file.downloadProgress !== undefined) {
                                        calculatedProgress = p.file.downloadProgress;
                                    }

                                    self.postMessage({ type: 'progress', progress: calculatedProgress, taskId });
                                } else if (p.status === 'downloading') {
                                    // Send more detailed progress for different stages
                                    self.postMessage({
                                        type: 'progress',
                                        progress: p.progress || 0,
                                        stage: p.file?.filename || 'model',
                                        taskId
                                    });
                                }
                            }
                        });

                        // Send timing information for analytics
                        const loadTime = Date.now() - modelLoadStartTime;
                        self.postMessage({ type: 'ready', taskId, loadTime });
                    } catch (loadError) {
                        isModelLoading = false;
                        // If WebGPU fails, try falling back to WASM
                        if (isWebGPUSupported) {
                            try {
                                sttPipeline = await pipeline('automatic-speech-recognition', STT_MODEL, {
                                    device: 'wasm',
                                    dtype: 'q4',
                                    progress_callback: (p) => {
                                        if (p.status === 'progress') {
                                            let calculatedProgress = p.progress;

                                            if (p.file && p.file.downloadProgress !== undefined) {
                                                calculatedProgress = p.file.downloadProgress;
                                            }

                                            self.postMessage({ type: 'progress', progress: calculatedProgress, taskId });
                                        }
                                    }
                                });

                                const loadTime = Date.now() - modelLoadStartTime;
                                self.postMessage({ type: 'ready', taskId, loadTime });
                            } catch (fallbackError) {
                                throw loadError; // Throw original error if fallback also fails
                            }
                        } else {
                            throw loadError;
                        }
                    }
                } else if (sttPipeline) {
                    // Model already loaded
                    self.postMessage({ type: 'ready', taskId });
                }
                break;
            case 'stt':
                if (!sttPipeline) throw new Error('STT model not loaded');

                // 80/20: Skip processing if audio is < 0.4s (6400 samples at 16kHz)
                // This avoids wasting cycles on coughs, door slams, or micro-noises.
                if (data.length < 6400) {
                    self.postMessage({ type: 'stt_result', text: '', taskId });
                    return;
                }

                // Optimized for shorter conversational bursts (< 10s typically)
                const result = await sttPipeline(data, {
                    chunk_length_s: 10,
                    stride_length_s: 1,
                    return_timestamps: false, // Don't need them, saves time
                });
                self.postMessage({ type: 'stt_result', text: result.text, taskId });
                break;
        }
    } catch (error) {
        isModelLoading = false;
        self.postMessage({ type: 'error', error: error.message, taskId });
    }
};
