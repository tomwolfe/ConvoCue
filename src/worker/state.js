import { ConversationTurnManager } from '../utils/speakerDetection';

/**
 * @typedef {Object} PerformanceStats
 * @property {number[]} audioProcessingTimes - Recent audio processing times in ms
 * @property {number[]} llmProcessingTimes - Recent LLM inference times in ms
 * @property {'optimal'|'balanced'|'minimal'} mode - Current performance mode
 */

/**
 * @typedef {Object} WorkerState
 * @property {ConversationTurnManager|null} conversationTurnManager - Manager for speaker turns
 * @property {number} highStakesCounter - Counter for turns in high-stakes situations
 * @property {{key: string|null, content: string|null}} cachedSystemPrompt - Cached system prompt to avoid regeneration
 * @property {number} lastLLMCallTime - Timestamp of the last LLM call
 * @property {any} lastSentiment - Last detected sentiment
 * @property {PerformanceStats} performanceStats - Performance monitoring data
 */

/**
 * Global state for the ML Worker
 * @type {WorkerState}
 */
export const WorkerState = {
    conversationTurnManager: null,
    highStakesCounter: 0,
    cachedSystemPrompt: { key: null, content: null },
    lastLLMCallTime: 0,
    lastSentiment: { overallSentiment: 'neutral', emotionalTrend: 'stable' },
    sentimentPromise: null, 
    performanceStats: {
        audioProcessingTimes: [],
        llmProcessingTimes: [],
        mode: 'optimal'
    }
};

/**
 * Number of turns to consider a situation high-stakes
 * @type {number}
 */
export const HIGH_STAKES_THRESHOLD_TURNS = 2;

/**
 * Updates the performance mode based on recent processing times
 * @param {number} time - Processing time in milliseconds
 * @param {'audio'|'llm'} type - Type of processing
 */
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

/**
 * Initializes the ConversationTurnManager if not already present
 * @returns {ConversationTurnManager} The initialized turn manager
 */
export const initConversationTurnManager = () => {
    if (!WorkerState.conversationTurnManager) {
        WorkerState.conversationTurnManager = new ConversationTurnManager();
    }
    return WorkerState.conversationTurnManager;
};