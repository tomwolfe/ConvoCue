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

self.onmessage = async (event) => {
    const { type, data, taskId } = event.data;

    try {
        switch (type) {
            case 'load':
                if (!llmPipeline && !isModelLoading) {
                    isModelLoading = true;
                    modelLoadStartTime = Date.now();
                    try {
                        // Use WebGPU if supported, otherwise fallback to WASM
                        const device = isWebGPUSupported ? 'webgpu' : 'wasm';

                        llmPipeline = await pipeline('text-generation', LLM_MODEL, {
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
                        console.error('LLM Model loading error:', loadError);

                        // If WebGPU fails, try falling back to WASM
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
                    // Model already loaded
                    self.postMessage({ type: 'ready', taskId });
                }
                break;
            case 'llm':
                if (!llmPipeline) throw new Error('LLM model not loaded');
                const { messages, context, instruction, retry } = data;

                // Enhanced prompt with more specific contextual cues
                const recentIntentsStr = context.recentIntents ? ` Recent intents: ${context.recentIntents}.` : '';
                const systemPrompt = `Role:${context.persona}. Intent:${context.intent}.${recentIntentsStr} Battery:${context.battery}%. Goal:${instruction}. Context: Provide a relevant, concise suggestion based on the conversation history.`;

                // Enhanced prompt with more specific instructions and context
                const fullPrompt = `\`\`system\n${systemPrompt}\nRules:
- Provide ONE suggestion as 3-5 keyword chips
- NO full sentences, NO preamble
- Format: "Keyword1 Keyword2 Keyword3"
- Consider the conversation context, intent, and recent conversation flow
- Be contextually relevant and actionable
- If exhausted, suggest exit strategies\`\`\n` +
                    messages.map(m => `\`\`user\n${m.content}\`\``).join('\n') +
                    '\n\`\`assistant\n';

                const output = await llmPipeline(fullPrompt, {
                    max_new_tokens: 24, // Optimized from 32 for speed
                    temperature: retry ? 0.85 : 0.6,
                    do_sample: true,
                    top_k: 40,
                    return_full_text: false,
                });

                const suggestion = output[0].generated_text.trim();

                self.postMessage({ type: 'llm_result', suggestion, taskId });
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
        }
    } catch (error) {
        isModelLoading = false;
        self.postMessage({ type: 'error', error: error.message, taskId });
    }
};