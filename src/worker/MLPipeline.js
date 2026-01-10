import { pipeline, env } from '@huggingface/transformers';
import { AppConfig } from '../config';
import { assessDeviceCapabilities, getOptimalModelConfig, checkMemoryAdequacy } from '../utils/performanceOptimizer';

// Configuration for on-device execution
const deviceCapabilities = assessDeviceCapabilities();

env.allowLocalModels = false;
env.useBrowserCache = true;

// Optimize threads based on hardware
env.backends.onnx.wasm.numThreads = deviceCapabilities.hardwareConcurrency || AppConfig.worker.numThreads;
env.backends.onnx.wasm.simd = AppConfig.worker.simd;
env.backends.onnx.wasm.proxy = false;

if (AppConfig.vad.onnxWASMPaths) {
    env.backends.onnx.wasm.wasmPaths = AppConfig.vad.onnxWASMPaths;
}

export const checkMemoryUsage = () => {
    if (self.performance && self.performance.memory) {
        const memory = self.performance.memory;
        return {
            usedMB: Math.round(memory.usedJSHeapSize / 1024 / 1024),
            usagePercent: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100)
        };
    }
    return null;
};

export class MLPipeline {
    static instance = null;
    static stt = null;
    static llm = null;
    static lastUsed = Date.now();
    static inactivityTimer = null;
    static sttConfig = null;
    static llmConfig = null;

    static async getInstance() {
        if (!this.instance) {
            this.instance = new MLPipeline();
        }
        return this.instance;
    }

    async loadSTT(progress_callback) {
        try {
            const optimizedSTTConfig = getOptimalModelConfig('stt', deviceCapabilities);
            const optimizedLLMConfig = getOptimalModelConfig('llm', deviceCapabilities);

            const mem = checkMemoryUsage();
            if (mem && mem.usagePercent > AppConfig.system.memory.modelUnloadThreshold) {
                console.warn("Memory too high to load STT:", mem.usagePercent);
                self.postMessage({
                    type: 'status',
                    status: 'Speech Engine deferred (Low Memory)',
                    isLowMemory: true
                });
                return;
            }

            if (!MLPipeline.stt) {
                const memoryCheck = checkMemoryAdequacy(optimizedSTTConfig, MLPipeline.llmConfig || optimizedLLMConfig);
                if (!memoryCheck.isAdequate || deviceCapabilities.capabilities.isLowSpec) {
                    await MLPipeline.disposeLLM();
                }

                MLPipeline.stt = await pipeline('automatic-speech-recognition', optimizedSTTConfig.name, {
                    progress_callback,
                    device: optimizedSTTConfig.device,
                    dtype: optimizedSTTConfig.dtype,
                });

                MLPipeline.sttConfig = optimizedSTTConfig;
            }
            MLPipeline.lastUsed = Date.now();
            this.resetInactivityTimer();
        } catch (err) {
            console.error("STT Load Failed:", err);
            self.postMessage({
                type: 'error',
                error: `Speech recognition model failed to load: ${err.message || 'Unknown error'}`
            });
            throw err;
        }
    }

    async loadLLM(progress_callback) {
        try {
            const optimizedLLMConfig = getOptimalModelConfig('llm', deviceCapabilities);
            const memoryCheck = checkMemoryAdequacy(
                MLPipeline.sttConfig || getOptimalModelConfig('stt', deviceCapabilities),
                optimizedLLMConfig
            );

            const mem = checkMemoryUsage();
            if (mem && mem.usagePercent > AppConfig.system.memory.modelUnloadThreshold) {
                console.warn("Memory too high to load LLM:", mem.usagePercent);
                self.postMessage({
                    type: 'status',
                    status: 'Social Brain deferred (Low Memory)',
                    isLowMemory: true
                });
                return;
            }

            if (!MLPipeline.llm) {
                if (MLPipeline.stt && (!memoryCheck.isAdequate || deviceCapabilities.capabilities.isLowSpec)) {
                    console.log("Disposing STT to make room for LLM due to memory constraints");
                    await MLPipeline.disposeSTT();
                }

                self.postMessage({ type: 'status', status: 'Loading Social Brain...' });

                MLPipeline.llm = await pipeline('text-generation', optimizedLLMConfig.name, {
                    progress_callback,
                    device: optimizedLLMConfig.device,
                    dtype: optimizedLLMConfig.dtype,
                });

                MLPipeline.llmConfig = optimizedLLMConfig;
            }
            MLPipeline.lastUsed = Date.now();
            this.resetInactivityTimer();
        } catch (err) {
            console.error("LLM Load Failed:", err);
            self.postMessage({
                type: 'error',
                error: `AI model failed to load: ${err.message || 'Unknown error'}`
            });
            throw err;
        }
    }

    resetInactivityTimer() {
        if (MLPipeline.inactivityTimer) clearTimeout(MLPipeline.inactivityTimer);
        MLPipeline.inactivityTimer = setTimeout(async () => {
            if (Date.now() - MLPipeline.lastUsed >= AppConfig.system.memory.llmInactivityTimeout) {
                await MLPipeline.disposeLLM();
            }
        }, AppConfig.system.memory.llmInactivityTimeout + 100);
    }

    static async disposeLLM() {
        if (MLPipeline.llm) {
            console.log("Disposing LLM to free memory...");
            try {
                if (MLPipeline.llm.model && MLPipeline.llm.model.session) {
                    const sessions = Array.isArray(MLPipeline.llm.model.session)
                        ? MLPipeline.llm.model.session
                        : [MLPipeline.llm.model.session];

                    for (const s of sessions) {
                        if (s && typeof s.release === 'function') {
                            try {
                                await s.release();
                            } catch (releaseErr) {
                                console.warn("Error releasing session:", releaseErr);
                            }
                        }
                    }
                }

                if (MLPipeline.llm.tokenizer && typeof MLPipeline.llm.tokenizer.release === 'function') {
                    try {
                        await MLPipeline.llm.tokenizer.release();
                    } catch (tokenizerErr) {
                        console.warn("Error releasing tokenizer:", tokenizerErr);
                    }
                }

                MLPipeline.llm = null;
            } catch (e) {
                console.error("Error during LLM disposal:", e);
                MLPipeline.llm = null;
            }
        }
    }

    static async disposeSTT() {
        if (MLPipeline.stt) {
            console.log("Disposing STT to free memory...");
            try {
                if (MLPipeline.stt.processor && MLPipeline.stt.processor.session) {
                    try {
                        await MLPipeline.stt.processor.session.release();
                    } catch (processorErr) {
                        console.warn("Error releasing processor session:", processorErr);
                    }
                }
                if (MLPipeline.stt.model && MLPipeline.stt.model.session) {
                    try {
                        await MLPipeline.stt.model.session.release();
                    } catch (modelErr) {
                        console.warn("Error releasing model session:", modelErr);
                    }
                }
                MLPipeline.stt = null;
            } catch (e) {
                console.error("Error during STT disposal:", e);
                MLPipeline.stt = null;
            }
        }
    }

    static async disposeAll() {
        await MLPipeline.disposeLLM();
        await MLPipeline.disposeSTT();
    }
}

export const deviceCaps = deviceCapabilities;
