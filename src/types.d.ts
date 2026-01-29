/**
 * ConvoCue 2 Type Definitions
 */

/**
 * Valid conversation intents detected by the IntentEngine.
 */
export type IntentType = 'social' | 'professional' | 'conflict' | 'empathy' | 'positive' | 'general';

/**
 * Valid battery states for exhaustion mode tracking.
 */
export type BatteryState = 'normal' | 'exhausted';

/**
 * Configuration for a specific conversation persona.
 */
export interface PersonaConfig {
    label: string;
    prompt: string;
    drainRate: number;
    description: string;
}

/**
 * Payload sent to the LLM worker for suggestion generation.
 */
export interface IntentPayload {
    intent: IntentType;
    battery: number;
    persona: string;
    isExhausted: boolean;
    recentIntents: string;
}

/**
 * Message format for worker communication.
 */
export interface WorkerMessage {
    type: 'stt' | 'llm' | 'summarize' | 'load' | 'heartbeat';
    taskId?: number;
    data?: any;
    instruction?: string;
}

/**
 * Result returned from workers.
 */
export interface WorkerResult {
    type: 'stt_result' | 'llm_result' | 'summary_result' | 'progress' | 'ready' | 'error' | 'heartbeat_ack';
    text?: string;
    suggestion?: string;
    summary?: any;
    progress?: number;
    status?: string;
    error?: string;
    taskId?: number;
    loadTime?: number;
    stage?: string;
}

/**
 * Social battery drain event details.
 */
export interface DrainEvent {
    amount: string;
    reason: string;
    intent?: IntentType;
    severity?: 'low' | 'medium' | 'high' | 'surge' | 'recovery';
    wordCount?: number;
    multiplier?: string;
}
