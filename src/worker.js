import { pipeline, env, TextStreamer } from '@huggingface/transformers';
import { AppConfig } from './config';

// Configuration for on-device execution
env.allowLocalModels = false;
env.useBrowserCache = true;

// Optimize threads based on hardware - be more conservative to save memory
env.backends.onnx.wasm.numThreads = AppConfig.worker.numThreads;
env.backends.onnx.wasm.simd = AppConfig.worker.simd;
env.backends.onnx.wasm.proxy = false; // Disable proxy to save one worker thread

// Use the same WASM assets as VAD to encourage browser cache sharing and reduce memory
if (AppConfig.vad.onnxWASMPaths) {
    env.backends.onnx.wasm.wasmPaths = AppConfig.vad.onnxWASMPaths;
}

console.log(`ML Worker script loaded. Using ${AppConfig.worker.numThreads} thread(s). SIMD: ${AppConfig.worker.simd}`);

class MLPipeline {
    static instance = null;
    static stt = null;
    static llm = null;
    static lastUsed = Date.now();

    static async getInstance() {
        if (!this.instance) {
            this.instance = new MLPipeline();
        }
        return this.instance;
    }

    async loadSTT(progress_callback) {
        if (!MLPipeline.stt) {
            console.log(`Loading STT model (${AppConfig.models.stt.name}, ${AppConfig.models.stt.dtype})...`);
            try {
                MLPipeline.stt = await pipeline('automatic-speech-recognition', AppConfig.models.stt.name, {
                    progress_callback,
                    device: AppConfig.models.stt.device,
                    dtype: AppConfig.models.stt.dtype,
                });
                console.log("STT model loaded successfully");
            } catch (err) {
                console.error("CRITICAL: Failed to load STT model:", err);
                throw new Error(`STT Load Failed: ${err.message}`);
            }
        }
        MLPipeline.lastUsed = Date.now();
    }

    async loadLLM(progress_callback) {
        if (!MLPipeline.llm) {
            console.log(`Loading LLM model (${AppConfig.models.llm.name}, ${AppConfig.models.llm.dtype})...`);
            try {
                self.postMessage({ type: 'status', status: 'Waking up Social Brain...', progress: 0 });
                MLPipeline.llm = await pipeline('text-generation', AppConfig.models.llm.name, {
                    progress_callback,
                    device: AppConfig.models.llm.device,
                    dtype: AppConfig.models.llm.dtype,
                });
                console.log("LLM model loaded successfully");
                self.postMessage({ type: 'status', status: 'Social Brain ready', progress: 100 });
            } catch (err) {
                console.error("CRITICAL: Failed to load LLM model:", err);
                throw new Error(`LLM Load Failed: ${err.message}`);
            }
        }
        MLPipeline.lastUsed = Date.now();
    }

    static async disposeLLM() {
        if (MLPipeline.llm) {
            console.log("Disposing LLM to free memory...");
            try {
                // In Transformers.js v3, we try to dispose the underlying session
                if (MLPipeline.llm.model && MLPipeline.llm.model.session) {
                    if (Array.isArray(MLPipeline.llm.model.session)) {
                        for (const s of MLPipeline.llm.model.session) {
                            if (s && typeof s.release === 'function') await s.release();
                        }
                    } else if (typeof MLPipeline.llm.model.session.release === 'function') {
                        await MLPipeline.llm.model.session.release();
                    }
                }
                MLPipeline.llm = null;
                console.log("LLM disposed");
            } catch (e) {
                console.warn("Error disposing LLM:", e);
                MLPipeline.llm = null; // Force null anyway
            }
        }
    }
}

// Memory management and cleanup functions
const cleanupModels = async () => {
    await MLPipeline.disposeLLM();
    if (MLPipeline.stt) {
        try {
            if (MLPipeline.stt.model && MLPipeline.stt.model.session) {
                if (Array.isArray(MLPipeline.stt.model.session)) {
                    for (const s of MLPipeline.stt.model.session) {
                        if (s && typeof s.release === 'function') await s.release();
                    }
                } else if (typeof MLPipeline.stt.model.session.release === 'function') {
                    await MLPipeline.stt.model.session.release();
                }
            }
            MLPipeline.stt = null;
            console.log("STT model cleaned up");
        } catch (e) {
            console.warn("Error cleaning up STT model:", e);
            MLPipeline.stt = null;
        }
    }
    // Attempt to force garbage collection if possible (non-standard but helpful in some environments)
    if (self.gc) self.gc();
};

// Memory monitoring function
const checkMemoryUsage = () => {
    if (self.performance && self.performance.memory) {
        const memory = self.performance.memory;
        const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
        const totalMB = Math.round(memory.jsHeapSizeLimit / 1024 / 1024);
        const usagePercent = Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100);
        
        console.log(`Memory Usage: ${usedMB}MB / ${totalMB}MB (${usagePercent}%)`);
        
        return {
            usedMB,
            totalMB,
            usagePercent,
            isHighMemory: usagePercent > AppConfig.system.memory.modelUnloadThreshold
        };
    }
    return null;
};

// Simple sentiment analysis function for emotional context
const analyzeSentiment = (text) => {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like', 'happy', 'pleased', 'satisfied', 'thank', 'thanks', 'awesome', 'brilliant', 'perfect', 'right', 'correct', 'agree', 'yes', 'ok', 'okay', 'fine', 'well'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'sad', 'angry', 'frustrated', 'disappointed', 'wrong', 'no', 'not', 'never', 'hurt', 'difficult', 'hard', 'problem', 'issue', 'concern', 'worry', 'stressed', 'anxious', 'upset', 'mad', 'annoyed'];

    const words = text.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;

    for (const word of words) {
        if (positiveWords.includes(word)) positiveCount++;
        if (negativeWords.includes(word)) negativeCount++;
    }

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
};

// Periodic memory check for mobile
if (AppConfig.isMobile) {
    setInterval(async () => {
        const memoryInfo = checkMemoryUsage();
        if (memoryInfo && memoryInfo.usagePercent > AppConfig.system.memory.modelUnloadThreshold) {
            console.warn("Periodic check: High memory usage on mobile, performing emergency cleanup");
            await MLPipeline.disposeLLM();
        }
    }, AppConfig.system.memory.gcInterval);
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
    const { type, audio, taskId, text: _text } = event.data; // text is only used in LLM processing
    const pipelineManager = await MLPipeline.getInstance();

    // Check memory usage and log if high
    const memoryInfo = checkMemoryUsage();
    if (memoryInfo && memoryInfo.isHighMemory) {
        console.warn(`High memory usage detected: ${memoryInfo.usedMB}MB (${memoryInfo.usagePercent}%)`);
        
        // If memory is very high (>90%), try to dispose LLM if it's not being used for this task
        if (memoryInfo.usagePercent > 90 && type !== 'llm') {
            await MLPipeline.disposeLLM();
        }

        self.postMessage({
            type: 'memory_warning',
            memoryInfo,
            taskId
        });
    }

    try {
        if (type === 'load') {
            console.log("Worker: Starting load sequence");
            self.postMessage({ type: 'status', status: 'Waking up Speech Engine...', taskId });

            await pipelineManager.loadSTT((p) => throttledProgress(p, 'Speech Engine', taskId));
            
            // Check if we should pre-warm the LLM based on memory
            const mem = checkMemoryUsage();
            const shouldPrewarm = !AppConfig.isMobile || (mem && mem.usagePercent < 50);

            if (shouldPrewarm) {
                console.log("Worker: Pre-warming LLM as memory is sufficient");
                await pipelineManager.loadLLM((p) => throttledProgress(p, 'Social Brain', taskId));
            } else {
                console.log("Worker: Skipping LLM pre-warm to save memory");
            }

            console.log("Worker: Initialization complete");
            self.postMessage({ type: 'ready', taskId });
        }

        if (type === 'prewarm_llm') {
            if (!MLPipeline.llm) {
                console.log("Worker: Explicit pre-warm request for LLM");
                await pipelineManager.loadLLM((p) => throttledProgress(p, 'Social Brain', taskId));
            }
            self.postMessage({ type: 'prewarm_complete', taskId });
        }

        if (type === 'stt') {
            if (!MLPipeline.stt) await pipelineManager.loadSTT();
            MLPipeline.lastUsed = Date.now();

            let audioData;
            if (audio instanceof Float32Array) {
                audioData = audio;
            } else if (audio.buffer instanceof ArrayBuffer) {
                audioData = new Float32Array(audio.buffer);
            } else if (Array.isArray(audio)) {
                audioData = new Float32Array(audio);
            } else if (typeof audio === 'object' && audio !== null) {
                audioData = new Float32Array(Object.values(audio));
            } else {
                throw new Error("Invalid audio data format");
            }

            if (!audioData || audioData.length === 0) {
                throw new Error("Audio data is empty");
            }

            const output = await MLPipeline.stt(audioData, {
                chunk_length_s: AppConfig.models.stt.chunk_length_s,
                stride_length_s: AppConfig.models.stt.stride_length_s,
                return_timestamps: false, // Save memory by not returning timestamps
            });
            
            if (!output || typeof output.text !== 'string') {
                throw new Error("Invalid STT output format");
            }

            // Immediately clear audio data from memory
            audioData = null;
            
            self.postMessage({ type: 'stt_result', text: output.text, taskId });
        }

        if (type === 'llm') {
            const { text, persona = 'social', history = [] } = event.data;
            
            // If memory is very tight, we might want to check again before loading LLM
            const preLLMMemory = checkMemoryUsage();
            if (preLLMMemory && preLLMMemory.usagePercent > AppConfig.system.memory.modelUnloadThreshold) {
                console.warn("Memory too high to load LLM comfortably, attempting cleanup...");
            }

            // Lazy load LLM if not present
            if (!MLPipeline.llm) {
                self.postMessage({ type: 'status', status: 'Waking up Social Brain...', taskId });
                await pipelineManager.loadLLM((p) => throttledProgress(p, 'Social Brain', taskId));
            }
            MLPipeline.lastUsed = Date.now();

            if (typeof text !== 'string' || text.trim().length === 0) {
                throw new Error("Invalid input text for LLM processing");
            }

            const personaConfig = AppConfig.models.personas[persona] || AppConfig.models.personas.social;
            const sanitizedText = text.trim().substring(0, AppConfig.system.maxTranscriptLength);

            // Process history and ensure we don't duplicate the current message
            const processedHistory = [];
            for (const msg of history) {
                if (msg.role === 'system' && msg.content.startsWith('Previous conversation summary:')) {
                    processedHistory.push({
                        role: "system",
                        content: `Context from earlier conversation: ${msg.content.substring('Previous conversation summary: '.length)}`
                    });
                } else {
                    processedHistory.push({ role: msg.role, content: msg.content });
                }
            }

            // Analyze emotional tone for emotional support persona
            let emotionalContext = '';
            if (persona === 'emotional') {
                const sentiment = analyzeSentiment(sanitizedText);
                emotionalContext = `Emotional analysis: The user's tone seems ${sentiment}. Please respond with appropriate empathy and emotional support.`;
            }

            // Construct messages array, ensuring the latest user message is present exactly once
            const messages = [
                { role: "system", content: personaConfig.prompt + (emotionalContext ? ` ${emotionalContext}` : '') },
                ...processedHistory,
            ];

            // If the latest message in processedHistory is not the current sanitizedText, add it
            const lastHistoryMessage = processedHistory.length > 0 ? processedHistory[processedHistory.length - 1] : null;
            if (!lastHistoryMessage || lastHistoryMessage.role !== 'user' || lastHistoryMessage.content !== sanitizedText) {
                messages.push({ role: "user", content: sanitizedText });
            }

            console.log(`Starting LLM generation for mode: ${persona} with ${messages.length} total messages`);

            try {
                const streamer = new TextStreamer(MLPipeline.llm.tokenizer, {
                    skip_prompt: true,
                    skip_special_tokens: true,
                    callback_function: (chunk) => {
                        if (typeof chunk === 'string' && chunk.length > 0) {
                            self.postMessage({ type: 'llm_chunk', text: chunk, taskId });
                        }
                    },
                });

                const output = await MLPipeline.llm(messages, {
                    max_new_tokens: AppConfig.models.llm.max_new_tokens,
                    temperature: AppConfig.models.llm.temperature,
                    do_sample: AppConfig.models.llm.do_sample,
                    streamer,
                });

                if (!output || !Array.isArray(output) || output.length === 0) {
                    throw new Error("Invalid LLM output format");
                }

                // In Transformers.js v3, the output format might vary depending on the model
                // Try to extract the response properly
                let response = '';

                // First, try to get the generated text from the output
                if (output[0] && output[0].generated_text) {
                    // If it's a chat format with multiple messages
                    if (Array.isArray(output[0].generated_text)) {
                        const resultMessages = output[0].generated_text;
                        // Find the last assistant message that's not the original input
                        for (let i = resultMessages.length - 1; i >= 0; i--) {
                            if (resultMessages[i].role === 'assistant') {
                                response = resultMessages[i].content.trim();
                                break;
                            }
                        }
                    } else {
                        // If it's a simple text response
                        response = output[0].generated_text.trim();
                    }
                } else if (typeof output[0] === 'string') {
                    // If the output is just a string
                    response = output[0].trim();
                }

                // If we still don't have a response, try alternative extraction methods
                if (!response && output[0] && typeof output[0] === 'object') {
                    if (output[0].response) {
                        response = output[0].response.trim();
                    } else if (output[0].text) {
                        response = output[0].text.trim();
                    }
                }

                if (!response) {
                    console.warn("LLM failed to generate a distinct response, using fallback");
                    throw new Error("Empty response");
                }

                // Check if the response is just echoing the input
                if (response.toLowerCase().includes(sanitizedText.toLowerCase()) ||
                    sanitizedText.toLowerCase().includes(response.toLowerCase())) {
                    console.warn("LLM echoed the input, triggering fallback");
                    throw new Error("Echo detected");
                }

                console.log("LLM Generation complete. Response length:", response.length);
                self.postMessage({ type: 'llm_result', text: response, taskId });
            } catch (llmError) {
                console.error("LLM generation failed:", llmError);

                // Provide a fallback response based on the selected persona
                const fallbackResponses = {
                    social: "That sounds interesting. Could you tell me more about that?",
                    professional: "Thank you for sharing. What are the next steps?",
                    friendly: "I understand. How are you feeling about all this?",
                    concise: ["Interesting", "Tell me more", "That makes sense"],
                    crosscultural: "That's a thoughtful point. How does this align with your cultural perspective?",
                    languagelearning: "I understand. The grammar looks good, but you could also say it this way...",
                    meeting: "That's an important point. Should we discuss this further in our agenda?",
                    emotional: "I hear you. That sounds challenging. How can I support you?"
                };

                const fallbackResponse = fallbackResponses[persona] || fallbackResponses.social;
                let fallbackText;
                if (typeof fallbackResponse === 'string') {
                    fallbackText = fallbackResponse;
                } else if (Array.isArray(fallbackResponse)) {
                    // For concise persona, join the options with " | " as specified in the prompt
                    fallbackText = persona === 'concise' ? fallbackResponse.join(' | ') : fallbackResponse.join(', ');
                } else {
                    fallbackText = String(fallbackResponse);
                }

                self.postMessage({
                    type: 'llm_result',
                    text: fallbackText,
                    taskId
                });
            }

            // Set a timeout to potentially unload LLM after inactivity to save memory
            setTimeout(async () => {
                const now = Date.now();
                if (now - MLPipeline.lastUsed >= AppConfig.system.memory.llmInactivityTimeout && MLPipeline.llm) {
                    await MLPipeline.disposeLLM();
                }
            }, AppConfig.system.memory.llmInactivityTimeout + 1000);
        }
        
        if (type === 'cleanup') {
            console.log("Received cleanup command");
            await cleanupModels();
            self.postMessage({ type: 'cleanup_complete', taskId });
        }
    } catch (error) {
        console.error("Worker error:", error);
        self.postMessage({ type: 'error', error: error.message, taskId });
    }
};

// Handle worker termination to clean up resources
self.onterminate = () => {
    console.log("Worker terminating, cleaning up models...");
    cleanupModels();
};