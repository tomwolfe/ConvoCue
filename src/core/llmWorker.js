import { pipeline, env } from '@huggingface/transformers';

env.allowLocalModels = false;
env.useBrowserCache = true;
env.backends.onnx.wasm.wasmPaths = "/";
const numThreads = Math.min(4, Math.max(1, (self.navigator.hardwareConcurrency || 2) - 1));
env.backends.onnx.wasm.numThreads = numThreads;

let llmPipeline = null;
let isModelLoading = false;
const LLM_MODEL = 'HuggingFaceTB/SmolLM2-135M-Instruct';

self.onmessage = async (event) => {
    const { type, data, taskId } = event.data;

    try {
        switch (type) {
            case 'load':
                if (!llmPipeline && !isModelLoading) {
                    isModelLoading = true;
                    try {
                        llmPipeline = await pipeline('text-generation', LLM_MODEL, {
                            device: 'wasm',
                            dtype: 'q4',
                            progress_callback: (p) => {
                                if (p.status === 'progress') {
                                    self.postMessage({ type: 'progress', progress: p.progress, taskId });
                                }
                            }
                        });
                        self.postMessage({ type: 'ready', taskId });
                    } catch (loadError) {
                        isModelLoading = false;
                        throw loadError;
                    }
                } else if (llmPipeline) {
                    // Model already loaded
                    self.postMessage({ type: 'ready', taskId });
                }
                break;
            case 'llm':
                if (!llmPipeline) throw new Error('LLM model not loaded');
                const { messages, context, instruction } = data;

                // Enhanced prompt with more specific contextual cues
                const systemPrompt = `Role:${context.persona}. Intent:${context.intent}. Battery:${context.battery}%. Goal:${instruction}. Context: Provide a relevant, concise suggestion based on the conversation history.`;

                // Enhanced prompt with more specific instructions and context
                const fullPrompt = `\`\`system\n${systemPrompt}\nRules:
- Provide ONE suggestion as 3-5 keyword chips
- NO full sentences, NO preamble
- Format: "Keyword1 Keyword2 Keyword3"
- Consider the conversation context and intent
- Be contextually relevant and actionable
- If exhausted, suggest exit strategies\`\`\n` +
                    messages.map(m => `\`\`user\n${m.content}\`\``).join('\n') +
                    '\n\`\`assistant\n';

                const output = await llmPipeline(fullPrompt, {
                    max_new_tokens: 24, // Optimized from 32 for speed
                    temperature: 0.6,
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