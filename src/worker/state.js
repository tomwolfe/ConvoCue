import { ConversationTurnManager } from '../utils/speakerDetection';

export const WorkerState = {
    conversationTurnManager: null,
    highStakesCounter: 0,
    cachedSystemPrompt: { key: null, content: null },
    lastLLMCallTime: 0,
    lastSentiment: null,
    performanceStats: {
        audioProcessingTimes: [],
        llmProcessingTimes: [],
        mode: 'optimal' // 'optimal', 'balanced', 'minimal'
    }
};

export const HIGH_STAKES_THRESHOLD_TURNS = 2;

export const updatePerformanceMode = (time, type) => {
    const list = type === 'audio' ? WorkerState.performanceStats.audioProcessingTimes : WorkerState.performanceStats.llmProcessingTimes;
    list.push(time);
    if (list.length > 5) list.shift();

    const avg = list.reduce((a, b) => a + b, 0) / list.length;
    
    if (type === 'audio') {
        if (avg > 300) WorkerState.performanceStats.mode = 'minimal';
        else if (avg > 150) WorkerState.performanceStats.mode = 'balanced';
        else WorkerState.performanceStats.mode = 'optimal';
    }
};

export const initConversationTurnManager = () => {
    if (!WorkerState.conversationTurnManager) {
        WorkerState.conversationTurnManager = new ConversationTurnManager();
    }
    return WorkerState.conversationTurnManager;
};
