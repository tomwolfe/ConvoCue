import { AppConfig } from './config';
import { MLPipeline } from './worker/MLPipeline';
import { WorkerState } from './worker/state';
import { yieldToMain } from './worker/utils';
import { WorkerMessenger } from './worker/Messenger';
import * as handlers from './worker/messageHandlers';

// Create a messenger instance for communication
const messenger = WorkerMessenger.getInstance();

// Queue for sequential processing of worker messages
const messageQueue = [];
let isProcessingQueue = false;

// Enhance messenger to automatically include ML state data in every message
const originalPostMessage = messenger.postMessage.bind(messenger);
messenger.postMessage = (message) => {
    originalPostMessage({
        ...message,
        mlStateData: MLPipeline.getMLStateData()
    });
};

// Listen for memory pressure events if the API is available
let memoryInterval = null;
if ('memory' in self.performance) {
    memoryInterval = setInterval(() => {
        const mem = self.performance.memory;
        if (mem && (mem.usedJSHeapSize / mem.jsHeapSizeLimit) > (AppConfig.system.memory.modelUnloadThreshold / 100)) {
            MLPipeline.handleMemoryPressure();
        }
    }, 5000);
}

self.onmessage = async (event) => {
    messageQueue.push(event);
    if (isProcessingQueue) return;
    
    isProcessingQueue = true;
    while (messageQueue.length > 0) {
        const currentEvent = messageQueue.shift();
        await processMessage(currentEvent);
        await yieldToMain();
    }
    isProcessingQueue = false;
};

const processMessage = async (event) => {
    const { type, taskId } = event.data;

    try {
        const handlerMap = {
            'load': handlers.handleLoad,
            'stt': handlers.handleSTT,
            'llm': handlers.handleLLM,
            'generate_summary': handlers.handleGenerateSummary,
            'prewarm_llm': handlers.handlePrewarmLLM,
            'prewarm_system_prompt': handlers.handlePrewarmSystemPrompt,
            'retry_stt_load': handlers.handleRetrySTTLoad,
            'retry_llm_load': handlers.handleRetryLLMLoad,
            'cleanup': handlers.handleCleanup,
            'terminate': (data) => handlers.handleTerminate(data, memoryInterval)
        };

        const handler = handlerMap[type];
        if (handler) {
            await handler(event.data);
        } else {
            console.warn(`[Worker] Unknown message type: ${type}`);
        }
    } catch (error) {
        console.error(`[Worker] Error processing message ${type}:`, error);
        messenger.postMessage({ 
            type: 'error', 
            error: error.message, 
            taskId: taskId || 'unknown' 
        });
    }
};