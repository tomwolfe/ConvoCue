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

let llmPipeline = null;
let isModelLoading = false;
let modelLoadStartTime = null;
const LLM_MODEL = 'HuggingFaceTB/SmolLM2-135M-Instruct';

// KV-Cache Management System for memory optimization
const KV_CACHE_CONFIG = {
    MAX_CACHE_SIZE: 6,
    MAX_CACHE_AGE_MS: 120000,
    MEMORY_THRESHOLD_MB: 800,
    CLEANUP_INTERVAL_MS: 30000
};

const cacheStats = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    cleanupsPerformed: 0,
    lastCleanupTime: 0
};

const messageCache = new Map();
let cleanupIntervalId = null;

const estimateMemoryUsage = () => {
    if (performance.memory) {
        return performance.memory.usedJSHeapSize / (1024 * 1024);
    }
    return messageCache.size * 0.5;
};

const cleanupCache = (force = false) => {
    const now = Date.now();
    const currentMemory = estimateMemoryUsage();
    const shouldCleanup = force || 
                          messageCache.size > KV_CACHE_CONFIG.MAX_CACHE_SIZE ||
                          currentMemory > KV_CACHE_CONFIG.MEMORY_THRESHOLD_MB;

    if (!shouldCleanup) return;

    console.log(`[llmWorker] Cache cleanup triggered. Size: ${messageCache.size}, Memory: ${currentMemory.toFixed(2)}MB`);

    for (const [key, value] of messageCache.entries()) {
        if (now - value.timestamp > KV_CACHE_CONFIG.MAX_CACHE_AGE_MS) {
            messageCache.delete(key);
        }
    }

    if (messageCache.size > KV_CACHE_CONFIG.MAX_CACHE_SIZE) {
        const entries = Array.from(messageCache.entries())
            .sort((a, b) => a[1].timestamp - b[1].timestamp);
        
        const toRemove = entries.slice(0, entries.length - KV_CACHE_CONFIG.MAX_CACHE_SIZE);
        toRemove.forEach(([key]) => messageCache.delete(key));
    }

    cacheStats.cleanupsPerformed++;
    cacheStats.lastCleanupTime = now;

    self.postMessage({
        type: 'cache_status',
        stats: {
            size: messageCache.size,
            memoryMB: currentMemory.toFixed(2),
            cleanups: cacheStats.cleanupsPerformed
        }
    });
};

const startCacheCleanup = () => {
    if (cleanupIntervalId) return;
    
    cleanupIntervalId = setInterval(() => {
        cleanupCache(false);
    }, KV_CACHE_CONFIG.CLEANUP_INTERVAL_MS);

    if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                cleanupCache(true);
            }
        });
    }
};

const getCachedResponse = (cacheKey) => {
    const cached = messageCache.get(cacheKey);
    if (!cached) {
        cacheStats.cacheMisses++;
        return null;
    }

    if (Date.now() - cached.timestamp > KV_CACHE_CONFIG.MAX_CACHE_AGE_MS) {
        messageCache.delete(cacheKey);
        cacheStats.cacheMisses++;
        return null;
    }

    cacheStats.cacheHits++;
    cacheStats.totalRequests++;
    return cached.response;
};

const cacheResponse = (cacheKey, response) => {
    messageCache.set(cacheKey, {
        response,
        timestamp: Date.now()
    });
    cacheStats.totalRequests++;

    if (messageCache.size > KV_CACHE_CONFIG.MAX_CACHE_SIZE) {
        cleanupCache(true);
    }
};

const generateCacheKey = (messages, context) => {
    const lastMessage = messages[messages.length - 1]?.content || '';
    const intent = context?.intent || 'general';
    const persona = context?.persona || 'default';
    return `${intent}_${persona}_${lastMessage.substring(0, 100)}`;
};

self.onmessage = async (event) => {
    const { type, data, taskId } = event.data;

    try {
        switch (type) {
            case 'load':
                if (!llmPipeline && !isModelLoading) {
                    isModelLoading = true;
                    modelLoadStartTime = Date.now();
                    try {
                        const device = isWebGPUSupported ? 'webgpu' : 'wasm';

                        llmPipeline = await pipeline('text-generation', LLM_MODEL, {
                            device: device,
                            dtype: 'q4',
                            progress_callback: (p) => {
                                if (p.status === 'progress') {
                                    let calculatedProgress = p.progress;
                                    if (p.file && p.file.downloadProgress !== undefined) {
                                        calculatedProgress = p.file.downloadProgress;
                                    }
                                    self.postMessage({ type: 'progress', progress: calculatedProgress, taskId });
                                } else if (p.status === 'downloading') {
                                    self.postMessage({
                                        type: 'progress',
                                        progress: p.progress || 0,
                                        stage: p.file?.filename || 'model',
                                        taskId
                                    });
                                }
                            }
                        });

                        startCacheCleanup();

                        const loadTime = Date.now() - modelLoadStartTime;
                        self.postMessage({ type: 'ready', taskId, loadTime });
                    } catch (loadError) {
                        isModelLoading = false;
                        console.error('LLM Model loading error:', loadError);

                        if (isWebGPUSupported) {
                            try {
                                self.postMessage({
                                    type: 'progress',
                                    progress: 0,
                                    stage: 'falling back to WASM',
                                    taskId
                                });

                                llmPipeline = await pipeline('text-generation', LLM_MODEL, {
                                    device: 'wasm',
                                    dtype: 'q4',
                                    progress_callback: (p) => {
                                        if (p.status === 'progress') {
                                            let calculatedProgress = p.progress;
                                            if (p.file && p.file.downloadProgress !== undefined) {
                                                calculatedProgress = p.file.downloadProgress;
                                            }
                                            self.postMessage({ type: 'progress', progress: calculatedProgress, taskId });
                                        } else if (p.status === 'downloading') {
                                            self.postMessage({
                                                type: 'progress',
                                                progress: p.progress || 0,
                                                stage: p.file?.filename || 'model fallback',
                                                taskId
                                            });
                                        }
                                    }
                                });

                                startCacheCleanup();

                                const loadTime = Date.now() - modelLoadStartTime;
                                self.postMessage({ type: 'ready', taskId, loadTime });
                            } catch (fallbackError) {
                                console.error('LLM Model fallback error:', fallbackError);
                                self.postMessage({
                                    type: 'error',
                                    error: `LLM model failed to load. Primary error: ${loadError.message}. Fallback error: ${fallbackError.message}`,
                                    taskId
                                });
                                return;
                            }
                        } else {
                            self.postMessage({
                                type: 'error',
                                error: `LLM model failed to load: ${loadError.message}`,
                                taskId
                            });
                            return;
                        }
                    }
                } else if (llmPipeline) {
                    self.postMessage({ type: 'ready', taskId });
                }
                break;

            case 'llm':
                if (!llmPipeline) {
                    console.warn('[llmWorker] LLM model not loaded');
                    self.postMessage({ type: 'error', error: 'LLM model not loaded', taskId });
                    return;
                }

                try {
                    const { messages, context, instruction, retry, useCache = true } = data;
                    console.log(`[llmWorker] LLM request received for taskId ${taskId}, context:`, { intent: context.intent, battery: context.battery });

                    const validatedContext = {
                        persona: context.persona || 'General Assistant',
                        intent: context.intent || 'general',
                        battery: context.battery || 100,
                        recentIntents: context.recentIntents || '',
                        isExhausted: context.isExhausted || false
                    };

                    if (useCache && !retry) {
                        const cacheKey = generateCacheKey(messages, validatedContext);
                        const cachedResponse = getCachedResponse(cacheKey);
                        
                        if (cachedResponse) {
                            console.log(`[llmWorker] Cache hit for taskId ${taskId}`);
                            self.postMessage({ type: 'llm_result', suggestion: cachedResponse, taskId, fromCache: true });
                            return;
                        }
                    }

                    const recentIntentsStr = validatedContext.recentIntents ? ` Recent intents: ${validatedContext.recentIntents}.` : '';
                    const systemPrompt = `Role:${validatedContext.persona}. Intent:${validatedContext.intent}.${recentIntentsStr} Battery:${validatedContext.battery}%. Goal:${instruction}. Context: Provide a relevant, concise suggestion based on the conversation history.`;

                    const fullPrompt = `\`\`system\n${systemPrompt}\nRules:
- Provide ONE suggestion as 3-5 keyword chips
- NO full sentences, NO preamble
- Format: "Keyword1 Keyword2 Keyword3"
- Consider the conversation context, intent, and recent conversation flow
- If exhausted, suggest exit strategies\`\`\n` +
                        messages.map(m => `\`\`user\n${m.content}\`\``).join('\n') +
                        '\n\`\`assistant\n';

                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 5000);

                    try {
                        const output = await llmPipeline(fullPrompt, {
                            max_new_tokens: 24,
                            temperature: retry ? 0.85 : 0.6,
                            do_sample: true,
                            top_k: 40,
                            return_full_text: false,
                            signal: controller.signal
                        });

                        clearTimeout(timeoutId);

                        const suggestion = output[0].generated_text.trim();
                        console.log(`[llmWorker] LLM processing successful for taskId ${taskId}, suggestion:`, suggestion);

                        if (useCache) {
                            const cacheKey = generateCacheKey(messages, validatedContext);
                            cacheResponse(cacheKey, suggestion);
                        }

                        self.postMessage({ type: 'llm_result', suggestion, taskId });
                    } catch (pipelineError) {
                        clearTimeout(timeoutId);
                        console.error(`[llmWorker] LLM processing failed for taskId ${taskId}:`, pipelineError);

                        if (pipelineError.name === 'AbortError') {
                            self.postMessage({ type: 'error', error: 'LLM request timed out after 5 seconds', taskId });
                        } else {
                            self.postMessage({ type: 'error', error: `LLM processing failed: ${pipelineError.message}`, taskId });
                        }
                    }
                } catch (error) {
                    console.error(`[llmWorker] LLM worker error for taskId ${taskId}:`, error);
                    self.postMessage({ type: 'error', error: `LLM processing error: ${error.message}`, taskId });
                }
                break;

            case 'summarize':
                if (!llmPipeline) throw new Error('LLM model not loaded');
                const { transcript, stats } = data;

                const transcriptText = transcript
                    .map(t => `[${t.speaker.toUpperCase()}] ${t.text}`)
                    .join('\n');

                const summaryPrompt = `Analyze this conversation transcript and stats to provide a concise social battery summary.
Stats:
- Total Messages: ${stats.totalCount}
- My Messages: ${stats.meCount}
- Their Messages: ${stats.themCount}
- Battery Drain: ${stats.totalDrain}%

Transcript:
${transcriptText}

Output exactly 3 bullet points:
1. **Reflection**: A one-sentence insight into the conversation's tone.
2. **Energy Drain**: Why it was taxing (e.g., one-sided, high conflict, long).
3. **Tip**: One specific social skill tip for next time.
Tone: Supportive, clinical yet empathetic. Max 80 words total.`;

                const summaryFullPrompt = `\`\`system\nYou are an expert social intelligence analyst. Provide brief, structured feedback.\`\`\n\`\`user\n${summaryPrompt}\`\`\n\`\`assistant\n`;

                const summaryOutput = await llmPipeline(summaryFullPrompt, {
                    max_new_tokens: 150,
                    temperature: 0.5,
                    do_sample: true,
                    return_full_text: false,
                });

                const summary = summaryOutput[0].generated_text.trim();
                self.postMessage({ type: 'summary_result', summary, taskId });
                break;
            
            case 'cache_cleanup':
                cleanupCache(true);
                self.postMessage({ 
                    type: 'cache_cleanup_result', 
                    stats: { size: messageCache.size, cleanups: cacheStats.cleanupsPerformed },
                    taskId 
                });
                break;
            
            case 'cache_stats':
                self.postMessage({
                    type: 'cache_stats_result',
                    stats: { ...cacheStats, size: messageCache.size, memoryMB: estimateMemoryUsage().toFixed(2) },
                    taskId
                });
                break;

            case 'heartbeat':
                self.postMessage({ type: 'heartbeat_ack', timestamp: data?.timestamp, taskId });
                break;
        }
    } catch (error) {
        isModelLoading = false;
        self.postMessage({ type: 'error', error: error.message, taskId });
    }
};
