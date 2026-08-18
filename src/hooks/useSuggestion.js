/**
 * useSuggestion - LLM worker lifecycle, suggestion generation, caching, timeouts, refresh
 * Exported functions for useML.js to call.
 * Self-contained - no references to useML.
 */

// Module-owned refs
const suggestionCacheRef = { current: new Map() };
const llmTimeoutsRef = { current: new Map() };
const lastTaskIdRef = { current: 0 };

const suggestionRef = { current: '' };
const isProcessingRef = { current: false };
const detectedIntentRef = { current: 'general' };

const BRIDGE_PHRASES = {
    social: "That's a good point, let me think...",
    professional: "I see, let me consider the best way to approach that...",
    conflict: "I hear you, let's find the right words here...",
    empathy: "I understand how you feel, give me a moment...",
    positive: "That's great! Let me think of a good follow-up...",
    general: "Thinking of a good response..."
};

const QUICK_ACTIONS = {
    social: [
        { label: "Tell me more", text: "That's interesting, tell me more about that?" },
        { label: "Good question", text: "That's a great question, let me think about that for a second." },
        { label: "Valid", text: "I totally see what you mean, that makes a lot of sense." }
    ],
    professional: [
        { label: "Next steps?", text: "What do you think are the most important next steps here?" },
        { label: "Confirm", text: "Just to make sure I'm on the same page, you're saying...?" },
        { label: "Goal", text: "What is the primary goal we're trying to achieve with this?" }
    ],
    conflict: [
        { label: "De-escalate", text: "I hear that you're frustrated, and I want to understand your perspective better." },
        { label: "Pause", text: "I think I need a minute to process that before I respond. Can we take a quick break?" },
        { label: "Bridge", text: "We seem to have different views here. How can we find a middle ground?" }
    ],
    empathy: [
        { label: "Support", text: "That sounds really tough. Is there anything I can do to support you right now?" },
        { label: "Validate", text: "It's completely understandable that you feel that way." },
        { label: "Listen", text: "I'm here to listen. Take all the time you need." }
    ],
    exhausted: [
        { label: "Soft Exit", text: "It's been great chatting, but I'm starting to hit a wall. Mind if we wrap this up?" },
        { label: "Hard Exit", text: "I've actually got to head out now, but let's catch up again soon!" },
        { label: "Raincheck", text: "I'm feeling a bit drained right now. Can we continue this conversation another time?" }
]
};

// LLM worker reference (set by useML.js)
let llmWorkerRef = null;

export const initLLMWorker = (worker) => {
    llmWorkerRef = worker;
};

export const terminateLLMWorker = () => {
    llmWorkerRef = null;
};

export const processSuggestion = (messages, contextData, instruction) => {
    const taskId = ++lastTaskIdRef.current;

    isProcessingRef.current = true;
    suggestionRef.current = BRIDGE_PHRASES[contextData.intent.toLowerCase()] || BRIDGE_PHRASES.general;

    const timeoutId = setTimeout(() => {
        if (isProcessingRef.current && (suggestionRef.current === BRIDGE_PHRASES[contextData.intent.toLowerCase()] || suggestionRef.current === BRIDGE_PHRASES.general)) {
            const fallbackActions = QUICK_ACTIONS[contextData.intent.toLowerCase()] || QUICK_ACTIONS.social;
            const randomAction = fallbackActions[Math.floor(Math.random() * fallbackActions.length)];
            suggestionRef.current = randomAction.text;
            isProcessingRef.current = false;
        }
    }, 4000);

    llmTimeoutsRef.current.set(taskId, timeoutId);

    if (llmWorkerRef) {
        llmWorkerRef.postMessage({
            type: 'llm',
            taskId,
            data: { messages, context: contextData, instruction }
        });
    }

    return taskId;
};

export const handleLlmResult = (sug, taskId) => {
    if (taskId && llmTimeoutsRef.current.has(taskId)) {
        clearTimeout(llmTimeoutsRef.current.get(taskId));
        llmTimeoutsRef.current.delete(taskId);
    }

    // Enhanced caching with size limit
    if (suggestionCacheRef.current.size > 75) {
        const firstKey = suggestionCacheRef.current.keys().next().value;
        suggestionCacheRef.current.delete(firstKey);
    }
    suggestionCacheRef.current.set('latest', {
        text: sug,
        timestamp: Date.now()
    });

    suggestionRef.current = sug;
    isProcessingRef.current = false;
};

export const refreshSuggestion = () => {
    if (!llmWorkerRef || isProcessingRef.current) return;

    const intent = detectedIntentRef.current;
    const taskId = ++lastTaskIdRef.current;

    isProcessingRef.current = true;
    suggestionRef.current = BRIDGE_PHRASES[intent.toLowerCase()] || BRIDGE_PHRASES.general;

    const timeoutId = setTimeout(() => {
        if (isProcessingRef.current && (suggestionRef.current === BRIDGE_PHRASES[intent.toLowerCase()] || suggestionRef.current === BRIDGE_PHRASES.general)) {
            // Keep current, timeout handled
        }
    }, 2000);

    llmTimeoutsRef.current.set(taskId, timeoutId);

    if (llmWorkerRef) {
        llmWorkerRef.postMessage({
            type: 'llm',
            taskId,
            data: {
                messages: [],
                context: {
                    intent,
                    battery: 50,
                    persona: 'Anxiety Coach',
                    isExhausted: false,
                    recentIntents: ''
                },
                retry: true
            }
        });
    }
};

export const dismissSuggestion = () => {
    isProcessingRef.current = false;
    suggestionRef.current = '';
};

export const getSuggestion = () => suggestionRef.current;

export const getIsProcessing = () => isProcessingRef.current;

export const getDetectedIntent = () => detectedIntentRef.current;

export const setDetectedIntent = (intent) => {
    detectedIntentRef.current = intent;
};

export const getSuggestionCache = () => suggestionCacheRef;

export const getTimeoutsRef = () => llmTimeoutsRef;

export const getWorkerRef = () => llmWorkerRef;