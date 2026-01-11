import { pipeline, env } from '@huggingface/transformers';
import { AppConfig } from '../config';
import { getOptimalModelConfig, checkMemoryAdequacy, deviceCaps } from '../utils/performanceOptimizer';
import { WorkerMessenger } from './Messenger';
import { MLStateMachine, ML_STATES, ML_TRANSITIONS } from './MLStateMachine';

env.allowLocalModels = false;
env.useBrowserCache = true;

// Optimize threads based on hardware
env.backends.onnx.wasm.numThreads = deviceCaps.hardwareConcurrency || AppConfig.worker.numThreads;
env.backends.onnx.wasm.simd = AppConfig.worker.simd;
env.backends.onnx.wasm.proxy = false;

if (AppConfig.vad.onnxWASMPaths) {
    env.backends.onnx.wasm.wasmPaths = AppConfig.vad.onnxWASMPaths;
}

// Create a messenger instance for communication
const messenger = WorkerMessenger.getInstance();

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
    static stateMachine = new MLStateMachine();
    static sttLoadingPromise = null;
    static llmLoadingPromise = null;

    static async getInstance() {
        if (!this.instance) {
            this.instance = new MLPipeline();
        }
        return this.instance;
    }

    async loadSTT(progress_callback) {
        if (MLPipeline.sttLoadingPromise) return MLPipeline.sttLoadingPromise;
        
        MLPipeline.sttLoadingPromise = (async () => {
            try {
                // Check if already loaded
                if (MLPipeline.stt && MLPipeline.stateMachine.isVoiceInputFunctional()) {
                    return;
                }

                // Transition to loading state
                MLPipeline.transitionState(ML_TRANSITIONS.START_LOADING_STT);

            const optimizedSTTConfig = getOptimalModelConfig('stt', deviceCaps);
            const optimizedLLMConfig = getOptimalModelConfig('llm', deviceCaps);

            const mem = checkMemoryUsage();
            if (mem && mem.usagePercent > AppConfig.system.memory.modelUnloadThreshold) {
                console.warn("Memory too high to load STT:", mem.usagePercent);
                messenger.postMessage({
                    type: 'status',
                    status: 'Speech Engine deferred (Low Memory)',
                    isLowMemory: true
                });

                // Transition to low memory state
                MLPipeline.transitionState(ML_TRANSITIONS.MEMORY_PRESSURE);

                // Proactively free resources when entering low memory state
                await MLPipeline.disposeAll();
                return;
            }

            if (!MLPipeline.stt) {
                const memoryCheck = checkMemoryAdequacy(optimizedSTTConfig, MLPipeline.llmConfig || optimizedLLMConfig);
                if (!memoryCheck.isAdequate || deviceCaps.capabilities.isLowSpec) {
                    await MLPipeline.disposeLLM();
                }

                // Try loading with fallback options for low-end devices
                try {
                    MLPipeline.stt = await pipeline('automatic-speech-recognition', optimizedSTTConfig.name, {
                        progress_callback,
                        device: optimizedSTTConfig.device,
                        dtype: optimizedSTTConfig.dtype,
                    });

                    // Transition to STT loaded state
                    MLPipeline.transitionState(ML_TRANSITIONS.STT_LOADED);
                } catch (initialLoadError) {
                    console.warn("Initial STT load failed, attempting fallback with smaller model:", initialLoadError);

                    // Fallback: try loading a smaller model configuration
                    const fallbackConfig = {
                        ...optimizedSTTConfig,
                        dtype: 'q2', // More aggressive quantization
                        name: optimizedSTTConfig.name.replace('base', 'tiny').replace('small', 'base') // Try smaller variant if available
                    };

                    try {
                        MLPipeline.stt = await pipeline('automatic-speech-recognition', fallbackConfig.name, {
                            progress_callback,
                            device: fallbackConfig.device,
                            dtype: fallbackConfig.dtype,
                        });
                        console.log("Loaded fallback STT model successfully");

                        // Transition to STT loaded state
                        MLPipeline.transitionState(ML_TRANSITIONS.STT_LOADED);
                    } catch (fallbackError) {
                        console.error("Fallback STT load also failed:", fallbackError);

                        // Final fallback: try with minimal configuration
                        const minimalConfig = {
                            name: AppConfig.models.stt.fallbackModel || optimizedSTTConfig.name,
                            device: 'cpu',
                            dtype: 'q4'
                        };

                        try {
                            MLPipeline.stt = await pipeline('automatic-speech-recognition', minimalConfig.name, {
                                progress_callback,
                                device: minimalConfig.device,
                                dtype: minimalConfig.dtype,
                            });
                            console.log("Loaded minimal fallback STT model successfully");

                            // Transition to STT loaded state
                            MLPipeline.transitionState(ML_TRANSITIONS.STT_LOADED);
                        } catch (minimalError) {
                                                                                    // Transition to error state
                                                                                    MLPipeline.transitionState(ML_TRANSITIONS.LOAD_ERROR, { error: minimalError.message });
                                                                                    
                                                                                    // Transition to TEXT_ONLY_MODE since we allow graceful degradation
                                                                                    MLPipeline.transitionState(ML_TRANSITIONS.DEGRADE_TO_TEXT_ONLY);
                                                                                    
                                                                                    // Explicitly set to null to ensure consistent state                            MLPipeline.stt = null;

                            // Return early to prevent further processing
                            return;
                        }
                    }
                }

                MLPipeline.sttConfig = optimizedSTTConfig;
            }
            MLPipeline.lastUsed = Date.now();
            this.resetInactivityTimer();
        } catch (err) {
            console.error("STT Load Failed:", err);
            messenger.postMessage({
                type: 'error',
                error: `Speech recognition model failed to load: ${err.message || 'Unknown error'}`
            });

            // Transition to error state
            MLPipeline.transitionState(ML_TRANSITIONS.LOAD_ERROR, { error: err.message });

            // Ensure consistent state by setting to null on error
            MLPipeline.stt = null;
            throw err;
        } finally {
            MLPipeline.sttLoadingPromise = null;
        }
    })();
    return MLPipeline.sttLoadingPromise;
    }

    async loadLLM(progress_callback) {
        if (MLPipeline.llmLoadingPromise) return MLPipeline.llmLoadingPromise;

        MLPipeline.llmLoadingPromise = (async () => {
            try {
                // Check if already loaded
                if (MLPipeline.llm && MLPipeline.stateMachine.isReadyForProcessing()) {
                    return;
                }

                // Transition to loading state
                MLPipeline.transitionState(ML_TRANSITIONS.START_LOADING_LLM);

            const optimizedLLMConfig = getOptimalModelConfig('llm', deviceCaps);
            const memoryCheck = checkMemoryAdequacy(
                MLPipeline.sttConfig || getOptimalModelConfig('stt', deviceCaps),
                optimizedLLMConfig
            );

            const mem = checkMemoryUsage();
            if (mem && mem.usagePercent > AppConfig.system.memory.modelUnloadThreshold) {
                console.warn("Memory too high to load LLM:", mem.usagePercent);
                messenger.postMessage({
                    type: 'status',
                    status: 'Social Brain deferred (Low Memory)',
                    isLowMemory: true
                });

                // Transition to low memory state
                MLPipeline.transitionState(ML_TRANSITIONS.MEMORY_PRESSURE);

                // Proactively free resources when entering low memory state
                await MLPipeline.disposeAll();
                return;
            }

            if (!MLPipeline.llm) {
                // Attempt to make space for LLM loading
                if (MLPipeline.stt && (!memoryCheck.isAdequate || deviceCaps.capabilities.isLowSpec)) {
                    console.log("Disposing STT to make room for LLM due to memory constraints");
                    await MLPipeline.disposeSTT();
                }

                messenger.postMessage({ type: 'status', status: 'Loading Social Brain...' });

                // Try loading with fallback options for low-end devices
                try {
                    MLPipeline.llm = await pipeline('text-generation', optimizedLLMConfig.name, {
                        progress_callback,
                        device: optimizedLLMConfig.device,
                        dtype: optimizedLLMConfig.dtype,
                    });

                    // Transition to LLM loaded state
                    MLPipeline.transitionState(ML_TRANSITIONS.LLM_LOADED);
                } catch (initialLoadError) {
                    console.warn("Initial LLM load failed, attempting fallback with smaller model:", initialLoadError);

                    // Fallback: try loading a smaller model configuration
                    const fallbackConfig = {
                        ...optimizedLLMConfig,
                        dtype: 'q2', // More aggressive quantization
                        name: optimizedLLMConfig.name.replace('135M', '80M').replace('300M', '135M') // Try smaller variant if available
                    };

                    try {
                        MLPipeline.llm = await pipeline('text-generation', fallbackConfig.name, {
                            progress_callback,
                            device: fallbackConfig.device,
                            dtype: fallbackConfig.dtype,
                        });
                        console.log("Loaded fallback LLM model successfully");

                        // Transition to LLM loaded state
                        MLPipeline.transitionState(ML_TRANSITIONS.LLM_LOADED);
                    } catch (fallbackError) {
                        console.error("Fallback LLM load also failed:", fallbackError);

                        // Final fallback: try with minimal configuration
                        const minimalConfig = {
                            name: AppConfig.models.llm.fallbackModel || optimizedLLMConfig.name,
                            device: 'cpu',
                            dtype: 'q4'
                        };

                        try {
                            MLPipeline.llm = await pipeline('text-generation', minimalConfig.name, {
                                progress_callback,
                                device: minimalConfig.device,
                                dtype: minimalConfig.dtype,
                            });
                            console.log("Loaded minimal fallback LLM model successfully");

                            // Transition to LLM loaded state
                            MLPipeline.transitionState(ML_TRANSITIONS.LLM_LOADED);
                        } catch (minimalError) {
                            console.error("All LLM loading attempts failed:", minimalError);

                            // Send error but don't throw to allow graceful degradation
                            messenger.postMessage({
                                type: 'error',
                                error: `AI model failed to load after fallback attempts: ${minimalError.message || 'Unknown error'}`,
                                isFallbackFailed: true
                            });

                                                        // Transition to error state
                                                        MLPipeline.transitionState(ML_TRANSITIONS.LOAD_ERROR, { error: minimalError.message });
                                                        
                                                        // Transition to TEXT_ONLY_MODE since we allow graceful degradation
                                                        MLPipeline.transitionState(ML_TRANSITIONS.DEGRADE_TO_TEXT_ONLY);
                                                        
                                                        // Explicitly set to null to ensure consistent state                            MLPipeline.llm = null;

                            // Return early to prevent further processing
                            return;
                        }
                    }
                }

                MLPipeline.llmConfig = optimizedLLMConfig;
            }
            MLPipeline.lastUsed = Date.now();
            this.resetInactivityTimer();
        } catch (err) {
            console.error("LLM Load Failed:", err);
            messenger.postMessage({
                type: 'error',
                error: `AI model failed to load: ${err.message || 'Unknown error'}`
            });

            // Transition to error state
            MLPipeline.transitionState(ML_TRANSITIONS.LOAD_ERROR, { error: err.message });

            // Ensure consistent state by setting to null on error
            MLPipeline.llm = null;
            throw err;
        } finally {
            MLPipeline.llmLoadingPromise = null;
        }
    })();
    return MLPipeline.llmLoadingPromise;
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

    // State machine helper methods
    static getCurrentState() {
        return MLPipeline.stateMachine.getState();
    }

    static getMLStateData() {
        return {
            state: MLPipeline.stateMachine.getState(),
            context: MLPipeline.stateMachine.getContext()
        };
    }

    static isInState(state) {
        return MLPipeline.stateMachine.isInState(state);
    }

      static isReadyForProcessing() {
        return MLPipeline.stateMachine.isReadyForProcessing();
      }
    
      static isVoiceInputFunctional() {
        return MLPipeline.stateMachine.isVoiceInputFunctional();
      }
    
      static transitionState(transition, context = {}) {
        const newState = MLPipeline.stateMachine.transition(transition, context);
        // Sync state with main thread on every transition to ensure UI is always up to date
        // even during background loading or rapid state changes
        messenger.postMessage({
            type: 'ml_state_sync',
            mlState: newState,
            mlStateData: MLPipeline.getMLStateData()
        });
        return newState;
    }

    static resetStateMachine() {
        MLPipeline.stateMachine.reset();
    }

    // Proactive memory management function
    static async handleMemoryPressure() {
        console.log("Handling memory pressure proactively...");

        // Transition the state machine to LOW_MEMORY
        MLPipeline.transitionState(ML_TRANSITIONS.MEMORY_PRESSURE);

        // Dispose of all models to free memory
        await MLPipeline.disposeAll();

        // Post a message to notify the main thread about memory pressure handling
        messenger.postMessage({
            type: 'status',
            status: 'Memory pressure handled - models disposed',
            isLowMemory: true
        });
    }
}



