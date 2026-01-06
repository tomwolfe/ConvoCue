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

// Enhanced emotional analysis function for more nuanced emotional context
const analyzeEmotion = (text) => {
    if (!text || typeof text !== 'string') {
        return { emotion: 'neutral', confidence: 0 };
    }

    const emotionWords = {
        joy: ['happy', 'joy', 'excited', 'wonderful', 'amazing', 'fantastic', 'love', 'pleased', 'delighted', 'thrilled', 'cheerful', 'delighted', 'ecstatic', 'glad', 'jubilant', 'merry', 'overjoyed', 'pleased', 'tickled'],
        sadness: ['sad', 'depressed', 'unhappy', 'miserable', 'sorrow', 'gloomy', 'heartbroken', 'melancholy', 'despair', 'grief', 'mourn', 'sorrowful', 'tearful', 'tragic', 'upset', 'woeful'],
        anger: ['angry', 'mad', 'furious', 'irate', 'enraged', 'annoyed', 'irritated', 'offended', 'hostile', 'aggressive', 'infuriated', 'livid', 'outraged', 'resentful', 'seething', 'vexed'],
        fear: ['afraid', 'scared', 'frightened', 'anxious', 'nervous', 'worried', 'panicked', 'terrified', 'apprehensive', 'dread', 'fearful', 'horrified', 'petrified', 'startled', 'timid', 'trepidation'],
        surprise: ['surprised', 'shocked', 'amazed', 'astonished', 'astounded', 'stunned', 'flabbergasted', 'dumbfounded', 'speechless', 'unbelievable', 'incredible', 'unexpected', 'startled', 'wonder'],
        disgust: ['disgusted', 'revolted', 'nauseated', 'sickened', 'repulsed', 'horrified', 'appalled', 'grossed', 'offended', 'repugnant', 'sick', 'turned off', 'vile', 'wretched']
    };

    const words = text.toLowerCase().split(/\s+/);
    const emotionScores = {};

    // Calculate scores for each emotion
    for (const [emotion, wordList] of Object.entries(emotionWords)) {
        let score = 0;
        for (const word of words) {
            const cleanWord = word.replace(/[^\w\s]/g, '').trim();
            if (cleanWord && wordList.includes(cleanWord)) {
                score++;
            }
        }
        emotionScores[emotion] = score;
    }

    // Find the dominant emotion
    let dominantEmotion = 'neutral';
    let maxScore = 0;

    for (const [emotion, score] of Object.entries(emotionScores)) {
        if (score > maxScore) {
            maxScore = score;
            dominantEmotion = emotion;
        }
    }

    // If no strong emotion detected, use neutral
    if (maxScore === 0) {
        return { emotion: 'neutral', confidence: 0 };
    }

    // Calculate confidence based on the ratio of dominant emotion to total emotion words
    const totalEmotionWords = Object.values(emotionScores).reduce((sum, val) => sum + val, 0);
    const confidence = totalEmotionWords > 0 ? maxScore / totalEmotionWords : 0;

    return {
        emotion: dominantEmotion,
        confidence: Math.min(confidence, 1.0) // Cap at 1.0
    };
};

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

// Enhanced emotional analysis function for more nuanced emotional context
const analyzeEmotion = (text) => {
    const emotionWords = {
        joy: ['happy', 'joy', 'excited', 'wonderful', 'amazing', 'fantastic', 'love', 'pleased', 'delighted', 'thrilled', 'cheerful', 'delighted', 'ecstatic', 'glad', 'jubilant', 'merry', 'overjoyed', 'pleased', 'tickled'],
        sadness: ['sad', 'depressed', 'unhappy', 'miserable', 'sorrow', 'gloomy', 'heartbroken', 'melancholy', 'despair', 'grief', 'mourn', 'sorrowful', 'tearful', 'tragic', 'upset', 'woeful'],
        anger: ['angry', 'mad', 'furious', 'irate', 'enraged', 'annoyed', 'irritated', 'offended', 'hostile', 'aggressive', 'infuriated', 'livid', 'outraged', 'resentful', 'seething', 'vexed'],
        fear: ['afraid', 'scared', 'frightened', 'anxious', 'nervous', 'worried', 'panicked', 'terrified', 'apprehensive', 'dread', 'fearful', 'horrified', 'petrified', 'startled', 'timid', 'trepidation'],
        surprise: ['surprised', 'shocked', 'amazed', 'astonished', 'astounded', 'stunned', 'flabbergasted', 'dumbfounded', 'speechless', 'unbelievable', 'incredible', 'unexpected', 'startled', 'wonder'],
        disgust: ['disgusted', 'revolted', 'nauseated', 'sickened', 'repulsed', 'horrified', 'appalled', 'grossed', 'offended', 'repugnant', 'sick', 'turned off', 'vile', 'wretched']
    };

    const words = text.toLowerCase().split(/\s+/);
    const emotionScores = {};

    // Calculate scores for each emotion
    for (const [emotion, wordList] of Object.entries(emotionWords)) {
        let score = 0;
        for (const word of words) {
            if (wordList.includes(word)) {
                score++;
            }
        }
        emotionScores[emotion] = score;
    }

    // Find the dominant emotion
    let dominantEmotion = 'neutral';
    let maxScore = 0;

    for (const [emotion, score] of Object.entries(emotionScores)) {
        if (score > maxScore) {
            maxScore = score;
            dominantEmotion = emotion;
        }
    }

    // If no strong emotion detected, use neutral
    if (maxScore === 0) {
        return { emotion: 'neutral', confidence: 0 };
    }

    // Calculate confidence based on the ratio of dominant emotion to total emotion words
    const totalEmotionWords = Object.values(emotionScores).reduce((sum, val) => sum + val, 0);
    const confidence = totalEmotionWords > 0 ? maxScore / totalEmotionWords : 0;

    return {
        emotion: dominantEmotion,
        confidence: Math.min(confidence, 1.0) // Cap at 1.0
    };
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

            const personaConfig = AppConfig.models.personas[persona] || AppConfig.models.personas.anxiety;
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

            // Analyze emotional tone for emotional support persona and other relevant personas
            let emotionalContext = '';
            const emotionResult = analyzeEmotion(sanitizedText);
            if (emotionResult.emotion !== 'neutral' && emotionResult.confidence > 0.3) {
                emotionalContext = `Emotional analysis: The user's tone seems to express ${emotionResult.emotion} with ${Math.round(emotionResult.confidence * 100)}% confidence. Please respond with appropriate empathy and emotional awareness.`;
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

                // Enhanced fallback responses with more context awareness
                const enhancedFallbackResponses = {
                    anxiety: [
                        "That sounds interesting. Could you tell me more about that?",
                        "I can understand why that might feel overwhelming. What's on your mind?",
                        "That's a thoughtful point. How does that make you feel?",
                        "I hear you. Would you like to explore that further?"
                    ],
                    professional: [
                        "Thank you for sharing. What are the next steps?",
                        "That's an important consideration. How should we move forward?",
                        "I appreciate your input. What's your perspective on the timeline?",
                        "That's valuable feedback. What are your recommendations?"
                    ],
                    relationship: [
                        "I understand. How are you feeling about all this?",
                        "That sounds meaningful. How did that impact you?",
                        "I can see this matters to you. What would support look like?",
                        "That's significant. How can I best support you right now?"
                    ],
                    concise: [
                        ["Interesting", "Tell me more", "That makes sense"],
                        ["Got it", "Thanks", "I see"],
                        ["Hmm", "Really?", "Wow"],
                        ["Yes", "Agreed", "Exactly"]
                    ],
                    crosscultural: [
                        "That's a thoughtful point. How does this align with your cultural perspective?",
                        "I appreciate that cultural insight. How might this be approached differently?",
                        "That's culturally nuanced. What context should I be aware of?",
                        "Thank you for sharing that perspective. How does it relate to your background?"
                    ],
                    languagelearning: [
                        "I understand. The grammar looks good, but you could also say it this way...",
                        "That's clear. In more natural English, you might say...",
                        "Good attempt! Here's a more idiomatic way to express that...",
                        "I follow you. Another way to say that would be..."
                    ],
                    meeting: [
                        "That's an important point. Should we discuss this further in our agenda?",
                        "That's worth noting. How does this impact our timeline?",
                        "I see your point. What are the action items from this?",
                        "That's relevant. Should we allocate time for this in our next discussion?"
                    ]
                };

                // Select a random fallback response for more natural variation
                const personaFallbacks = enhancedFallbackResponses[persona] || enhancedFallbackResponses.anxiety;
                let fallbackText;

                if (Array.isArray(personaFallbacks)) {
                    const randomFallback = personaFallbacks[Math.floor(Math.random() * personaFallbacks.length)];
                    if (Array.isArray(randomFallback)) {
                        // For concise persona, join the options with " | " as specified in the prompt
                        fallbackText = persona === 'concise' ? randomFallback.join(' | ') : randomFallback.join(', ');
                    } else {
                        fallbackText = randomFallback;
                    }
                } else {
                    fallbackText = String(personaFallbacks);
                }

                // Add emotional context to fallback if available
                const emotionResult = analyzeEmotion(sanitizedText);
                if (emotionResult.emotion !== 'neutral' && emotionResult.confidence > 0.5) {
                    fallbackText += ` (I sense you're feeling ${emotionResult.emotion})`;
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