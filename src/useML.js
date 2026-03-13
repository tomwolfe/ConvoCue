import { useState, useEffect, useRef, useCallback } from 'react';
import { detectIntent, shouldGenerateSuggestion, getPrecomputedSuggestion, detectTurnTake, detectSpeakerHint } from './core/intentEngine';
import { AppConfig, BRIDGE_PHRASES, QUICK_ACTIONS } from './core/config';
import { useSocialBattery } from './hooks/useSocialBattery';
import { useTranscript } from './hooks/useTranscript';
import { ReliabilityMonitor } from './core/reliabilityMonitor';

/**
 * Core ML hook for speech-to-text, intent detection, and suggestion generation.
 * @param {Object} [initialState=null] - Optional initial session state.
 * @returns {Object} ML session state and control functions.
 */
export const useML = (initialState = null) => {
    const [suggestion, setSuggestion] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [detectedIntent, setDetectedIntent] = useState('general');
    const [persona, setPersona] = useState(AppConfig.defaultPersona);
    const [sessionSummary, setSessionSummary] = useState(null);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [summaryError, setSummaryError] = useState(null);

    const {
        battery, deduct, reset: resetBattery, batteryRef, setBattery,
        sensitivity, setSensitivity, isPaused, togglePause, recharge, isExhausted, lastDrain
    } = useSocialBattery();
    const {
        transcript, addEntry, currentSpeaker, setCurrentSpeaker, toggleSpeaker: baseToggleSpeaker, clearTranscript,
        shouldPulse, nudgeSpeaker, consecutiveCount, trafficLightStatus, setTranscript
    } = useTranscript();

    // Track manual speaker overrides to prevent instant auto-detection flickering
    const lastManualToggleRef = useRef(0);

    const toggleSpeaker = useCallback(() => {
        lastManualToggleRef.current = Date.now();
        speakerConfidenceRef.current = { me: 0, them: 0 };
        baseToggleSpeaker();
    }, [baseToggleSpeaker]);

    // Track if a suggestion was recently shown to help with auto-speaker detection
    const lastSuggestionTimeRef = useRef(0);

    // Enhanced cache for frequently used suggestions to reduce LLM calls
    const suggestionCache = useRef(new Map());
    const intentHistory = useRef([]); // Track recent intents for context
    
    // Confidence-based speaker detection (80/20: Reduce flickering)
    const speakerConfidenceRef = useRef({ me: 0, them: 0 });

    // Add a fast lookup for common conversation starters to provide instant responses
    const fastLookupMap = useRef(new Map([
        // Common greetings
        ['hello', { intent: 'social', suggestion: 'Hi there! How are you doing today?' }],
        ['hi', { intent: 'social', suggestion: 'Hello! Nice to meet you.' }],
        ['hey', { intent: 'social', suggestion: 'Hey! What\'s up?' }],
        ['how are you', { intent: 'social', suggestion: 'I\'m doing well, thank you! How about yourself?' }],
        ['how\'s it going', { intent: 'social', suggestion: 'Pretty good! How about with you?' }],

        // Common questions
        ['what\'s up', { intent: 'social', suggestion: 'Not much, just taking it easy. How about you?' }],
        ['what are you up to', { intent: 'social', suggestion: 'Just relaxing. What about you?' }],
        ['how was your weekend', { intent: 'social', suggestion: 'It was relaxing, thanks! How about yours?' }],

        // Professional starters
        ['how is the project going', { intent: 'professional', suggestion: 'Making good progress. Any specific concerns?' }],
        ['what are the next steps', { intent: 'professional', suggestion: 'The priority is finalizing the proposal by Friday.' }],

        // Empathetic responses
        ['i had a rough day', { intent: 'empathy', suggestion: 'I\'m sorry to hear that. What happened?' }],
        ['i\'m feeling overwhelmed', { intent: 'empathy', suggestion: 'That sounds really challenging. How can I support you?' }],

        // Conflict de-escalation
        ['i don\'t agree', { intent: 'conflict', suggestion: 'I see where you\'re coming from. Can we find common ground?' }],
        ['that won\'t work', { intent: 'conflict', suggestion: 'I understand your concern. What would work better for you?' }]
    ]));

    // Initialize with initial state if provided (for loading sessions)
    useEffect(() => {
        if (initialState) {
            // Load session data using the functions from child hooks
            if (initialState.battery !== undefined) {
                setBattery(initialState.battery);
            }
            if (initialState.transcript) {
                setTranscript(initialState.transcript);
            }
            if (initialState.persona) {
                setPersona(initialState.persona);
            }
            // Note: We don't restore all state as some values are dynamic
        }
    }, [initialState]);

    const sttWorkerRef = useRef(null);
    const llmWorkerRef = useRef(null);
    const sttMonitorRef = useRef(null);
    const llmMonitorRef = useRef(null);
    const [sttRebootKey, setSttRebootKey] = useState(0);
    const [llmRebootKey, setLlmRebootKey] = useState(0);
    const messagesRef = useRef([]);
    const initialBatteryRef = useRef(100);
    const lastTaskId = useRef(0);
    const llmTimeoutsRef = useRef(new Map()); // Store timeouts for LLM requests
    const [sttReady, setSttReady] = useState(false);
    const [llmReady, setLlmReady] = useState(false);
    const [sttProgress, setSttProgress] = useState(0);
    const [llmProgress, setLlmProgress] = useState(0);
    const [sttLoadTime, setSttLoadTime] = useState(null);
    const [llmLoadTime, setLlmLoadTime] = useState(null);
    const [sttStage, setSttStage] = useState('initializing');
    const [llmStage, setLlmStage] = useState('initializing');

    const audioBufferRef = useRef([]);
    const flushTimeoutRef = useRef(null);

    const flushAudioBuffer = useCallback(() => {
        if (audioBufferRef.current.length === 0) return;
        
        const totalLength = audioBufferRef.current.reduce((acc, curr) => acc + curr.length, 0);
        const combined = new Float32Array(totalLength);
        let offset = 0;
        for (const buffer of audioBufferRef.current) {
            combined.set(buffer, offset);
            offset += buffer.length;
        }
        
        if (sttWorkerRef.current) {
            // Use Transferable Objects for efficiency
            sttWorkerRef.current.postMessage({ type: 'stt', data: combined }, [combined.buffer]);
        }
        audioBufferRef.current = [];
        if (flushTimeoutRef.current) {
            clearTimeout(flushTimeoutRef.current);
            flushTimeoutRef.current = null;
        }
    }, []);

    // Haptic Feedback for social cues
    const triggerSocialVibration = useCallback((type) => {
        if (!('vibrate' in navigator)) return;

        switch (type) {
            case 'conflict':
                navigator.vibrate([100, 50, 100]); // Double pulse for warning
                break;
            case 'exhausted':
                navigator.vibrate(200); // Long pulse for low battery
                break;
            case 'suggestion':
                navigator.vibrate(50); // Subtle tap for new suggestion
                break;
            default:
                navigator.vibrate(50);
        }
    }, []);

    const summarizeSession = useCallback(() => {
        if (!llmMonitorRef.current || transcript.length === 0) return;
        
        setIsSummarizing(true);
        setSummaryError(null);
        const stats = {
            totalCount: transcript.length,
            meCount: transcript.filter(t => t.speaker === 'me').length,
            themCount: transcript.filter(t => t.speaker === 'them').length,
            totalDrain: Math.round(initialBatteryRef.current - battery)
        };

        llmMonitorRef.current.postMessage({
            type: 'summarize',
            taskId: ++lastTaskId.current,
            data: {
                transcript,
                stats
            }
        }).catch(err => {
            console.error('[useML] Summary task failed:', err);
            setIsSummarizing(false);
            setSummaryError('Summarization timed out or failed.');
        });
    }, [transcript, battery]);

    const startNewSession = useCallback(() => {
        setSessionSummary(null);
        setSummaryError(null);
        clearTranscript();
        resetBattery();
        messagesRef.current = [];
        initialBatteryRef.current = 100;
        audioBufferRef.current = [];
        if (flushTimeoutRef.current) clearTimeout(flushTimeoutRef.current);
    }, [clearTranscript, resetBattery]);

    const closeSummary = useCallback(() => {
        setSessionSummary(null);
        setIsSummarizing(false);
        setSummaryError(null);
    }, []);

    const processText = useCallback((text) => {
        console.log('[useML] processText START - Input:', text.substring(0, 50));
        
        // Advanced Auto-Speaker Detection (80/20: Mind Reader Update)
        const speakerHint = detectSpeakerHint(text, currentSpeaker);
        const timeSinceLastSuggestion = Date.now() - lastSuggestionTimeRef.current;
        const timeSinceManualToggle = Date.now() - lastManualToggleRef.current;

        // Priority 0: Manual Override Protection
        // If the user just manually toggled the speaker, don't auto-switch for 3 seconds
        const isManualLockActive = timeSinceManualToggle < 3000;

        // Priority 1: Content-based hint with confidence threshold
        if (speakerHint && !isManualLockActive) {
            // Increase confidence for the hinted speaker
            speakerConfidenceRef.current[speakerHint] += text.length > 20 ? 2 : 1;

            // If we have strong confidence or consecutive hints, toggle
            if (speakerConfidenceRef.current[speakerHint] >= 2) {
                if (speakerHint !== currentSpeaker) {
                    console.log(`[useML] Speaker switched to: ${speakerHint} (confidence: ${speakerConfidenceRef.current[speakerHint]})`);
                    // Reset processing state when speaker changes
                    setIsProcessing(false);
                    // Clear suggestion when switching to avoid confusion
                    setSuggestion('');
                    setCurrentSpeaker(speakerHint);
                }
                // Reset confidence for both after a switch or confirming current
                speakerConfidenceRef.current = { me: 0, them: 0 };
            }
        } else if (!isManualLockActive) {
            // Decay confidence slowly if no hint
            speakerConfidenceRef.current.me = Math.max(0, speakerConfidenceRef.current.me - 0.5);
            speakerConfidenceRef.current.them = Math.max(0, speakerConfidenceRef.current.them - 0.5);
        }

        // Priority 2: Timing-based heuristic (Response to suggestion)
        // If 'them' speaks shortly after a suggestion was shown, and it sounds like a response
        if (currentSpeaker === 'them' && !isManualLockActive && timeSinceLastSuggestion < 10000 && timeSinceLastSuggestion > 500) {
            if (/^(i |my |that's )/i.test(text)) {
                setCurrentSpeaker('me');
                speakerConfidenceRef.current = { me: 0, them: 0 };
            }
        }

        // First, check for fast lookup responses for common phrases
        const normalizedText = text.toLowerCase().trim();
        const fastLookupResult = fastLookupMap.current.get(normalizedText);

        let intent, needsSuggestion;
        if (fastLookupResult) {
            // Use the fast lookup result
            intent = fastLookupResult.intent;
            needsSuggestion = true;
            setSuggestion(fastLookupResult.suggestion);
            triggerSocialVibration('suggestion');
            lastSuggestionTimeRef.current = Date.now();
            setIsProcessing(false);
        } else {
            // Fall back to normal processing
            intent = detectIntent(text);
            needsSuggestion = shouldGenerateSuggestion(text);

            setDetectedIntent(intent);

            // Haptic alert and cache invalidation for conflict detection
            if (intent === 'conflict') {
                triggerSocialVibration('conflict');
                // MISSION: Invalidate cache immediately when 'Conflict' is detected
                suggestionCache.current.clear();
            }

            // Update intent history for context
            intentHistory.current.push({ intent, timestamp: Date.now() });
            if (intentHistory.current.length > 5) {
                intentHistory.current.shift(); // Keep only last 5 intents
            }

            // Check for precomputed suggestions first (fastest response)
            const precomputed = getPrecomputedSuggestion(text);
            if (precomputed) {
                setSuggestion(precomputed.suggestion);
                triggerSocialVibration('suggestion');
                lastSuggestionTimeRef.current = Date.now();
                setIsProcessing(false);
            }
        }

        const currentBattery = deduct(text, intent, persona);

        // Haptic alert for low battery
        if (currentBattery < AppConfig.minBatteryThreshold && battery >= AppConfig.minBatteryThreshold) {
            triggerSocialVibration('exhausted');
        }

        addEntry(text, currentSpeaker, intent);
        nudgeSpeaker();

        // Predictive turn-taking for the NEXT segment
        if (detectTurnTake(text)) {
            // If they asked a question or invited a response, prepare for toggle
            setTimeout(() => {
                nudgeSpeaker(); // Pulse to indicate we suspect a speaker change
            }, 500);
        }

        const speakerLabel = currentSpeaker === 'me' ? 'Me' : 'Them';
        messagesRef.current.push({ role: 'user', content: `${speakerLabel}: ${text}` });
        if (messagesRef.current.length > 6) messagesRef.current.shift();

        // Fatigue-aware filtering: Increase threshold when battery is low
        const batteryThreshold = AppConfig.fatigueFilterThreshold;
        const isLowBattery = currentBattery < batteryThreshold;
        const shouldShowSuggestion = needsSuggestion &&
            (!isLowBattery || (isLowBattery && Math.random() < currentBattery / 100)); // Probability scales with battery level

        if (!shouldShowSuggestion || currentSpeaker === 'me') {
            setIsProcessing(false);
            if (currentSpeaker === 'me') setSuggestion('');
            return;
        }

        // Enhanced cache key with recent intent context
        const recentIntents = intentHistory.current
            .filter(item => Date.now() - item.timestamp < 30000) // Last 30 seconds
            .map(item => item.intent)
            .slice(-3) // Last 3 intents
            .join('_');

        const cacheKey = `${intent}_${recentIntents}_${persona}_${currentBattery > AppConfig.minBatteryThreshold ? 'normal' : 'exhausted'}`;
        const cachedSuggestion = suggestionCache.current.get(cacheKey);

        if (cachedSuggestion && Date.now() - cachedSuggestion.timestamp < 45000) { // Extended cache to 45s
            setSuggestion(cachedSuggestion.text);
            lastSuggestionTimeRef.current = Date.now();
            setIsProcessing(false);
            return;
        }

        // Instant reaction to reduce perceived latency
        setSuggestion(BRIDGE_PHRASES[intent] || BRIDGE_PHRASES.general);
        setIsProcessing(true);
        console.log(`[useML] Pipeline stage: VAD -> STT -> Intent: ${intent} -> Starting LLM generation`);
        
        const personaConfig = AppConfig.personas[persona];
        const taskId = ++lastTaskId.current;

        const contextData = {
            intent: intent.toUpperCase(),
            battery: Math.round(currentBattery),
            persona: personaConfig.label,
            isExhausted: currentBattery < AppConfig.minBatteryThreshold,
            recentIntents: recentIntents // Pass recent intent context to LLM
        };

        const instruction = contextData.isExhausted
            ? "URGENT: User is exhausted. Suggest a polite exit or minimal energy response."
            : personaConfig.prompt;

        // Store the taskId and timeout ID together for proper cleanup
        const timeoutId = setTimeout(() => {
            // If LLM takes too long, show a more specific bridge phrase
            if (isProcessing && (suggestion === BRIDGE_PHRASES[intent] || suggestion === BRIDGE_PHRASES.general)) {
                console.warn(`[useML] 4-second timeout triggered for taskId ${taskId} - LLM worker not responding, providing fallback`);
                // Pick a random quick action from the current intent as a fallback
                const fallbackActions = QUICK_ACTIONS[intent] || QUICK_ACTIONS.social;
                const randomAction = fallbackActions[Math.floor(Math.random() * fallbackActions.length)];
                setSuggestion(randomAction.text);
                setIsProcessing(false); // Stop "processing" if we provide a fallback

                // Clear the timeout from our map since we're handling it here
                llmTimeoutsRef.current.delete(taskId);

                // Also clear the detected intent if it's stuck on "UPDATING..."
                if (detectedIntent === 'UPDATING...') {
                    setDetectedIntent(intent || 'general');
                }
            }
        }, 4000); // 4 second timeout for fallback

        // Store timeout ID for cleanup
        llmTimeoutsRef.current.set(taskId, timeoutId);

        // Add a watchdog timeout to ensure the processing state is cleared even if worker fails silently
        const watchdogTimeoutId = setTimeout(() => {
            if (isProcessing) {
                console.warn(`[useML] Watchdog timeout triggered for taskId ${taskId} after 8 seconds - LLM worker failed to respond`);
                console.warn(`[useML] Pipeline stage: VAD -> STT -> Intent -> LLM Timeout`);
                setIsProcessing(false);
                if (suggestion === 'Refining...' || suggestion === 'UPDATING...') {
                    setSuggestion('Continue listening...');
                }
                if (detectedIntent === 'UPDATING...') {
                    setDetectedIntent(intent || 'general');
                }
                llmTimeoutsRef.current.delete(taskId);
            }
        }, 8000); // 8 second watchdog timeout

        // Store the watchdog timeout ID with a special prefix
        llmTimeoutsRef.current.set(`watchdog_${taskId}`, watchdogTimeoutId);

        // Add a global timeout to reset everything if the worker is completely unresponsive
        const globalTimeoutId = setTimeout(() => {
            if (isProcessing) {
                console.warn(`[useML] Global timeout triggered for taskId ${taskId}, forcing reset`);
                setIsProcessing(false);
                if (suggestion === 'Refining...' || suggestion === 'UPDATING...') {
                    setSuggestion('');
                }
                if (detectedIntent === 'UPDATING...') {
                    setDetectedIntent(intent || 'general');
                }

                // Clear all related timeouts
                if (llmTimeoutsRef.current.has(taskId)) {
                    clearTimeout(llmTimeoutsRef.current.get(taskId));
                    llmTimeoutsRef.current.delete(taskId);
                }
                if (llmTimeoutsRef.current.has(`watchdog_${taskId}`)) {
                    clearTimeout(llmTimeoutsRef.current.get(`watchdog_${taskId}`));
                    llmTimeoutsRef.current.delete(`watchdog_${taskId}`);
                }
                if (llmTimeoutsRef.current.has(`safeguard_${taskId}`)) {
                    clearTimeout(llmTimeoutsRef.current.get(`safeguard_${taskId}`));
                    llmTimeoutsRef.current.delete(`safeguard_${taskId}`);
                }
            }
        }, 15000); // 15 second global timeout

        // Store the global timeout ID with a special prefix
        llmTimeoutsRef.current.set(`global_${taskId}`, globalTimeoutId);

        if (llmMonitorRef.current) {
            // Add a safeguard timeout that will clear isProcessing regardless of worker response
            const safeguardTimeout = setTimeout(() => {
                if (isProcessing) {
                    console.warn(`[useML] Safeguard timeout triggered for taskId ${taskId}, clearing processing state`);
                    setIsProcessing(false);
                    // Provide fallback suggestion
                    setSuggestion('Continue listening...');
                    // Clean up any associated timeouts
                    if (llmTimeoutsRef.current.has(taskId)) {
                        clearTimeout(llmTimeoutsRef.current.get(taskId));
                        llmTimeoutsRef.current.delete(taskId);
                    }
                    if (llmTimeoutsRef.current.has(`watchdog_${taskId}`)) {
                        clearTimeout(llmTimeoutsRef.current.get(`watchdog_${taskId}`));
                        llmTimeoutsRef.current.delete(`watchdog_${taskId}`);
                    }
                    if (llmTimeoutsRef.current.has(`global_${taskId}`)) {
                        clearTimeout(llmTimeoutsRef.current.get(`global_${taskId}`));
                        llmTimeoutsRef.current.delete(`global_${taskId}`);
                    }
                }
            }, 10000); // 10 second safeguard timeout

            // Store the safeguard timeout
            llmTimeoutsRef.current.set(`safeguard_${taskId}`, safeguardTimeout);

            llmMonitorRef.current.postMessage({
                type: 'llm',
                taskId,
                data: {
                    messages: [...messagesRef.current],
                    context: contextData,
                    instruction: instruction
                }
            }).catch(err => {
                console.warn('[useML] LLM task failed or timed out:', err);
                // Fallback logic is already handled by setTimeout in processText
                // Clear all timeouts if there's an error
                if (llmTimeoutsRef.current.has(taskId)) {
                    clearTimeout(llmTimeoutsRef.current.get(taskId));
                    llmTimeoutsRef.current.delete(taskId);
                }
                if (llmTimeoutsRef.current.has(`watchdog_${taskId}`)) {
                    clearTimeout(llmTimeoutsRef.current.get(`watchdog_${taskId}`));
                    llmTimeoutsRef.current.delete(`watchdog_${taskId}`);
                }
                if (llmTimeoutsRef.current.has(`safeguard_${taskId}`)) {
                    clearTimeout(llmTimeoutsRef.current.get(`safeguard_${taskId}`));
                    llmTimeoutsRef.current.delete(`safeguard_${taskId}`);
                }
                if (llmTimeoutsRef.current.has(`global_${taskId}`)) {
                    clearTimeout(llmTimeoutsRef.current.get(`global_${taskId}`));
                    llmTimeoutsRef.current.delete(`global_${taskId}`);
                }
                setIsProcessing(false);
            });
        }
        
        console.log('[useML] processText END - Pipeline complete');
    }, [persona, deduct, addEntry, currentSpeaker, toggleSpeaker, nudgeSpeaker, suggestion, isProcessing]);


    // Handle LLM results and cache them
    const handleLlmResult = useCallback((sug, taskId) => {
        // Clear the timeout for this task ID
        if (taskId && llmTimeoutsRef.current.has(taskId)) {
            clearTimeout(llmTimeoutsRef.current.get(taskId));
            llmTimeoutsRef.current.delete(taskId);
        }

        // Also clear the watchdog timeout if it exists
        if (taskId && llmTimeoutsRef.current.has(`watchdog_${taskId}`)) {
            clearTimeout(llmTimeoutsRef.current.get(`watchdog_${taskId}`));
            llmTimeoutsRef.current.delete(`watchdog_${taskId}`);
        }

        // Also clear the safeguard timeout if it exists
        if (taskId && llmTimeoutsRef.current.has(`safeguard_${taskId}`)) {
            clearTimeout(llmTimeoutsRef.current.get(`safeguard_${taskId}`));
            llmTimeoutsRef.current.delete(`safeguard_${taskId}`);
        }

        // Also clear the global timeout if it exists
        if (taskId && llmTimeoutsRef.current.has(`global_${taskId}`)) {
            clearTimeout(llmTimeoutsRef.current.get(`global_${taskId}`));
            llmTimeoutsRef.current.delete(`global_${taskId}`);
        }

        // Enhanced caching with recent intent context
        const intent = detectedIntent;
        const recentIntents = intentHistory.current
            .filter(item => Date.now() - item.timestamp < 30000) // Last 30 seconds
            .map(item => item.intent)
            .slice(-3) // Last 3 intents
            .join('_');

        const cacheKey = `${intent}_${recentIntents}_${persona}_${battery > AppConfig.minBatteryThreshold ? 'normal' : 'exhausted'}`;
        suggestionCache.current.set(cacheKey, {
            text: sug,
            timestamp: Date.now()
        });

        // Also cache without recent intents for broader matching
        const basicCacheKey = `${intent}_${persona}_${battery > AppConfig.minBatteryThreshold ? 'normal' : 'exhausted'}`;
        if (!suggestionCache.current.has(basicCacheKey)) {
            suggestionCache.current.set(basicCacheKey, {
                text: sug,
                timestamp: Date.now()
            });
        }

        // Limit cache size to prevent memory issues
        if (suggestionCache.current.size > 75) { // Increased cache size
            // Remove oldest entries first
            const firstKey = suggestionCache.current.keys().next().value;
            suggestionCache.current.delete(firstKey);
        }

        setSuggestion(sug);
        lastSuggestionTimeRef.current = Date.now();

        // Clear the "Refining..." state
        setIsProcessing(false);

        // Clear the "UPDATING..." state if it's still showing
        if (detectedIntent === 'UPDATING...') {
            setDetectedIntent(intent || 'general');
        }
    }, [detectedIntent, persona, battery]);

    const refreshSuggestion = useCallback(() => {
        if (!llmWorkerRef.current || isProcessing) return;

        const intent = detectedIntent;
        const currentBattery = battery;
        const personaConfig = AppConfig.personas[persona];
        const taskId = ++lastTaskId.current;

        setIsProcessing(true);
        setSuggestion(BRIDGE_PHRASES[intent] || BRIDGE_PHRASES.general);

        const contextData = {
            intent: intent.toUpperCase(),
            battery: Math.round(currentBattery),
            persona: personaConfig.label,
            isExhausted: currentBattery < AppConfig.minBatteryThreshold,
            recentIntents: intentHistory.current
                .filter(item => Date.now() - item.timestamp < 30000)
                .map(item => item.intent)
                .slice(-3)
                .join('_')
        };

        const instruction = contextData.isExhausted
            ? "URGENT: User is exhausted. Suggest a polite exit or minimal energy response."
            : personaConfig.prompt;

        const timeoutId = setTimeout(() => {
            if (isProcessing && (suggestion === BRIDGE_PHRASES[intent] || suggestion === BRIDGE_PHRASES.general)) {
                setSuggestion(`Refreshing ${intent} suggestions...`);
            }
        }, 2000);

        llmTimeoutsRef.current.set(taskId, timeoutId);

        llmWorkerRef.current.postMessage({
            type: 'llm',
            taskId,
            data: {
                messages: [...messagesRef.current],
                context: contextData,
                instruction: instruction,
                retry: true
            }
        });
    }, [detectedIntent, battery, persona, isProcessing, suggestion]);

    const dismissSuggestion = useCallback(() => {
        setSuggestion('');
        setIsProcessing(false);
    }, []);

    const processTextRef = useRef(processText);
    useEffect(() => {
        processTextRef.current = processText;
    }, [processText]);

    // Adaptive resource detection and model loading
    const getDeviceInfo = () => {
        const hardwareConcurrency = navigator.hardwareConcurrency || 2;
        const memory = navigator.deviceMemory || 4; // Assume 4GB if not available
        const userAgent = navigator.userAgent.toLowerCase();

        // Determine if device is low-resource based on specs
        const isLowResource = hardwareConcurrency <= 2 || memory <= 4 ||
                             userAgent.includes('mobile') || userAgent.includes('android');

        return {
            hardwareConcurrency,
            memory,
            isLowResource,
            userAgent
        };
    };

    // Eager fetch model files to prime browser cache
    useEffect(() => {
        const deviceInfo = getDeviceInfo();

        // Select appropriate model based on device capabilities
        const modelFiles = deviceInfo.isLowResource ? [
            '/ort-wasm.wasm', // Fallback to simpler WASM if on low-resource device
            '/silero_vad_v5.onnx'
        ] : [
            '/ort-wasm-simd-threaded.jsep.mjs',
            '/ort-wasm-simd-threaded.jsep.wasm',
            '/ort-wasm-simd-threaded.mjs',
            '/ort-wasm-simd-threaded.wasm',
            '/silero_vad_v5.onnx'
        ];

        // Preload model files with progress tracking
        modelFiles.forEach(file => {
            fetch(file)
                .then(response => {
                    if (response.ok) {
                        console.log(`Pre-fetched ${file}`);
                    }
                })
                .catch(error => {
                    console.warn(`Failed to pre-fetch ${file}:`, error);
                });
        });

        // Initialize service worker for better caching if available
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('SW registered: ', registration);
                })
                .catch(registrationError => {
                    console.log('SW registration failed: ', registrationError);
                });
        }
    }, []);

    // Improved model loading status with progressive enhancement
    const getModelLoadStatus = () => {
        if (!sttReady && !llmReady) {
            if (sttProgress < 100 && llmProgress < 100) {
                return 'Loading AI models...';
            } else if (sttProgress < 100) {
                return 'Finishing speech-to-text model...';
            } else if (llmProgress < 100) {
                return 'Finishing language model...';
            }
        }
        if (!sttReady) return 'Loading speech-to-text model...';
        if (!llmReady) return 'Loading language model...';
        return 'Ready';
    };

    // Enhanced model loading status with more specific progress information
    const getDetailedModelLoadStatus = () => {
        const deviceInfo = getDeviceInfo();
        const resourceIndicator = deviceInfo.isLowResource ? ' (optimized for low-resource device)' : '';

        if (!sttReady && !llmReady) {
            if (sttProgress < 100 && llmProgress < 100) {
                return `Loading AI models (${Math.round((sttProgress + llmProgress) / 2)}%)... STT: ${sttStage}, LLM: ${llmStage}${resourceIndicator}`;
            } else if (sttProgress < 100) {
                return `Finishing speech-to-text model (${Math.round(sttProgress)}%) - ${sttStage}${resourceIndicator}`;
            } else if (llmProgress < 100) {
                return `Finishing language model (${Math.round(llmProgress)}%) - ${llmStage}${resourceIndicator}`;
            }
        }
        if (!sttReady) return `Loading speech-to-text model (${Math.round(sttProgress)}%) - ${sttStage}${resourceIndicator}`;
        if (!llmReady) return `Loading language model (${Math.round(llmProgress)}%) - ${llmStage}${resourceIndicator}`;
        return `All models loaded and ready! ${resourceIndicator}`.trim();
    };

    // Progressive readiness: STT ready = basic functionality, both ready = full functionality
    const getProgressiveReadiness = () => {
        if (sttReady && llmReady) return 'full';
        if (sttReady) return 'partial'; // STT ready = can transcribe, no suggestions yet
        return 'loading';
    };

    useEffect(() => {
        const sttWorker = new Worker(new URL('./core/sttWorker.js', import.meta.url), { type: 'module' });
        const llmWorker = new Worker(new URL('./core/llmWorker.js', import.meta.url), { type: 'module' });

        sttWorkerRef.current = sttWorker;
        llmWorkerRef.current = llmWorker;

        const sttMonitor = new ReliabilityMonitor(sttWorker, 'STT', {
            onFailure: () => setSttStage('error_timeout'),
            onRecovered: () => setSttStage('recovered'),
            rebootOnFailure: true,
            onReboot: () => {
                console.warn('Rebooting STT worker due to reliability failure');
                setSttRebootKey(prev => prev + 1);
            }
        });
        const llmMonitor = new ReliabilityMonitor(llmWorker, 'LLM', {
            onFailure: () => setLlmStage('error_timeout'),
            onRecovered: () => setLlmStage('recovered'),
            rebootOnFailure: true,
            onReboot: () => {
                console.warn('Rebooting LLM worker due to reliability failure');
                setLlmRebootKey(prev => prev + 1);
            }
        });

        sttMonitorRef.current = sttMonitor;
        llmMonitorRef.current = llmMonitor;

        // Set up a heartbeat to monitor worker responsiveness
        const heartbeatInterval = setInterval(() => {
            if (llmWorker && llmReady) {
                const heartbeatId = `hb_${Date.now()}`;
                const heartbeatTimeout = setTimeout(() => {
                    console.warn('[useML] LLM Worker heartbeat timeout - possible hang');
                    // If worker is unresponsive, clear processing states
                    if (isProcessing) {
                        setIsProcessing(false);
                        if (suggestion === 'Refining...') {
                            setSuggestion('');
                        }
                        if (detectedIntent === 'UPDATING...') {
                            setDetectedIntent('general');
                        }
                    }
                }, 5000); // 5 second timeout for heartbeat response

                llmWorker.postMessage({
                    type: 'heartbeat',
                    taskId: heartbeatId,
                    data: { timestamp: Date.now() }
                });

                // Store timeout to clear later if response comes
                llmTimeoutsRef.current.set(`heartbeat_${heartbeatId}`, heartbeatTimeout);
            }
        }, 10000); // Send heartbeat every 10 seconds

        sttWorker.onmessage = (event) => {
            if (sttMonitor.handleMessage(event)) return;

            const { type, text, progress, status: stat, error, taskId, loadTime, stage } = event.data;
            switch (type) {
                case 'progress':
                    setSttProgress(progress);
                    if (stage) setSttStage(stage);
                    break;
                case 'ready':
                    setSttReady(true);
                    if (loadTime !== undefined) setSttLoadTime(loadTime);
                    break;
                case 'stt_result':
                    console.log(`[useML] STT result received for taskId ${taskId}:`, text);
                    if (text) processTextRef.current(text);
                    break;
                case 'error': console.error('STT Worker error:', error); break;
            }
        };

        llmWorker.onmessage = (event) => {
            if (llmMonitor.handleMessage(event)) return;

            const { type, suggestion: sug, summary, progress, error, taskId, loadTime, stage } = event.data;
            if (taskId && taskId < lastTaskId.current && (type === 'llm_result' || type === 'summary_result' || type === 'error')) return;

            // Handle heartbeat responses
            if (type === 'heartbeat_ack') {
                const heartbeatKey = `heartbeat_${taskId}`;
                if (llmTimeoutsRef.current.has(heartbeatKey)) {
                    clearTimeout(llmTimeoutsRef.current.get(heartbeatKey));
                    llmTimeoutsRef.current.delete(heartbeatKey);
                }
                return;
            }

            switch (type) {
                case 'progress':
                    setLlmProgress(progress);
                    if (stage) setLlmStage(stage);
                    break;
                case 'ready':
                    setLlmReady(true);
                    if (loadTime !== undefined) setLlmLoadTime(loadTime);
                    break;
                case 'llm_result':
                    handleLlmResult(sug, taskId);
                    break;
                case 'summary_result':
                    setSessionSummary(summary);
                    setIsSummarizing(false);
                    setSummaryError(null);
                    break;
                case 'error':
                    // Clear the timeout for this task ID
                    if (taskId && llmTimeoutsRef.current.has(taskId)) {
                        clearTimeout(llmTimeoutsRef.current.get(taskId));
                        llmTimeoutsRef.current.delete(taskId);
                    }

                    // Also clear the watchdog timeout if it exists
                    if (taskId && llmTimeoutsRef.current.has(`watchdog_${taskId}`)) {
                        clearTimeout(llmTimeoutsRef.current.get(`watchdog_${taskId}`));
                        llmTimeoutsRef.current.delete(`watchdog_${taskId}`);
                    }

                    // Also clear the safeguard timeout if it exists
                    if (taskId && llmTimeoutsRef.current.has(`safeguard_${taskId}`)) {
                        clearTimeout(llmTimeoutsRef.current.get(`safeguard_${taskId}`));
                        llmTimeoutsRef.current.delete(`safeguard_${taskId}`);
                    }

                    // Also clear the global timeout if it exists
                    if (taskId && llmTimeoutsRef.current.has(`global_${taskId}`)) {
                        clearTimeout(llmTimeoutsRef.current.get(`global_${taskId}`));
                        llmTimeoutsRef.current.delete(`global_${taskId}`);
                    }

                    console.error('LLM Worker error:', error);
                    setIsProcessing(false);
                    setIsSummarizing(false);
                    setSummaryError(error);

                    // Clear the "Refining..." state if it's still showing
                    if (suggestion === 'Refining...') {
                        setSuggestion('');
                    }

                    // Clear the "UPDATING..." state if it's still showing
                    if (detectedIntent === 'UPDATING...') {
                        setDetectedIntent('general');
                    }
                    break;
            }
        };

        sttWorker.postMessage({ type: 'load' });
        llmWorker.postMessage({ type: 'load' });

        return () => {
            clearInterval(heartbeatInterval);
            sttMonitor.terminate();
            llmMonitor.terminate();
            sttWorker.terminate();
            llmWorker.terminate();
            setSttReady(false);
            setLlmReady(false);

            // Clear any remaining timeouts
            for (const [key, timeoutId] of llmTimeoutsRef.current.entries()) {
                clearTimeout(timeoutId);
            }
            llmTimeoutsRef.current.clear();
        };
    }, [sttRebootKey, llmRebootKey]);

    const isReady = sttReady && llmReady;
    const progressiveReadiness = getProgressiveReadiness();
    const progress = (sttProgress + llmProgress) / 2;
    const status = !isReady ? getDetailedModelLoadStatus() : isProcessing ? 'Processing...' : 'Ready';

    // Volume-based auto-diarization refs
    const meVolumeRef = useRef(0);
    const volumeHistoryRef = useRef([]); // 2-second moving average buffer
    const baselineVolumeRef = useRef(0); // Ambient noise baseline
    const VOLUME_THRESHOLD = 0.30; // 30% above baseline indicates local speaker

    const calculateVolume = (audioData) => {
        let sum = 0;
        for (let i = 0; i < audioData.length; i++) {
            sum += audioData[i] * audioData[i];
        }
        return Math.sqrt(sum / audioData.length);
    };

    const processAudio = useCallback((audioData) => {
        if (!sttReady || !sttWorkerRef.current) return;

        console.log('[useML] processAudio START - Audio data received, size:', audioData.length);

        // Enhanced 80/20 Auto-Diarization: Volume-based heuristic with 2-second moving average
        // Local speaker (Me) is usually significantly louder than distant speaker (Them)
        const currentVolume = calculateVolume(audioData);
        const timeSinceManualToggle = Date.now() - lastManualToggleRef.current;
        const isManualLockActive = timeSinceManualToggle < 3000;

        // Update volume history for 2-second moving average (assuming 16kHz sample rate)
        // Each audio chunk is ~100ms, so we keep ~20 chunks
        volumeHistoryRef.current.push(currentVolume);
        if (volumeHistoryRef.current.length > 20) {
            volumeHistoryRef.current.shift();
        }

        // Calculate 2-second moving average
        const movingAvg = volumeHistoryRef.current.reduce((a, b) => a + b, 0) / volumeHistoryRef.current.length;

        // Update ambient baseline slowly (only when no speech detected)
        if (currentVolume < 0.02) {
            baselineVolumeRef.current = baselineVolumeRef.current === 0
                ? 0.01
                : baselineVolumeRef.current * 0.99 + currentVolume * 0.01;
        }

        if (currentSpeaker === 'me') {
            // Update "Me" baseline when we know it's definitely the user
            meVolumeRef.current = meVolumeRef.current === 0
                ? currentVolume
                : meVolumeRef.current * 0.95 + currentVolume * 0.05;
        } else if (meVolumeRef.current > 0.01 && !isManualLockActive) {
            // If current speaker is 'them', and we have a valid baseline for 'me'
            // Check if current volume exceeds baseline by 30% (VOLUME_THRESHOLD)
            const volumeIncrease = (currentVolume - baselineVolumeRef.current) / baselineVolumeRef.current;
            
            if (volumeIncrease > VOLUME_THRESHOLD || currentVolume > meVolumeRef.current * 0.7) {
                // High probability it's the local user speaking
                console.log(`[useML] Auto-diarization: Volume spike detected (${(volumeIncrease * 100).toFixed(1)}% above baseline), switching to 'me'`);
                setCurrentSpeaker('me');
                speakerConfidenceRef.current = { me: 0, them: 0 };
            } else {
                // Slowly decay 'me' baseline when 'them' is speaking to adapt to environment changes
                meVolumeRef.current *= 0.999;
            }
        } else if (meVolumeRef.current === 0 && currentVolume > 0.05) {
            // Initialize baseline if it's the first time we hear anything substantial
            meVolumeRef.current = currentVolume;
            baselineVolumeRef.current = Math.min(baselineVolumeRef.current, currentVolume * 0.5);

            // If it's quite loud, assume it's the local user starting the conversation
            if (currentVolume > 0.1) {
                setCurrentSpeaker('me');
                speakerConfidenceRef.current = { me: 0, them: 0 };
            }
        }

        audioBufferRef.current.push(audioData);

        if (flushTimeoutRef.current) clearTimeout(flushTimeoutRef.current);

        const totalLength = audioBufferRef.current.reduce((acc, curr) => acc + curr.length, 0);
        // If buffer > 3s, flush immediately, otherwise wait 300ms for more speech
        if (totalLength > 48000) {
            flushAudioBuffer();
        } else {
            flushTimeoutRef.current = setTimeout(flushAudioBuffer, 300);
        }
        
        console.log('[useML] processAudio END - Audio processing complete');
    }, [sttReady, flushAudioBuffer, currentSpeaker, setCurrentSpeaker]);

    useEffect(() => {
        return () => {
            if (flushTimeoutRef.current) clearTimeout(flushTimeoutRef.current);
        };
    }, []);

    return {
        status, progress, sttProgress, llmProgress, transcript, suggestion, detectedIntent,
        persona, setPersona, isReady, battery, resetBattery,
        dismissSuggestion, refreshSuggestion, processAudio,
        isProcessing,
        currentSpeaker, toggleSpeaker, shouldPulse, consecutiveCount, trafficLightStatus,
        sensitivity, setSensitivity,
        isPaused, togglePause,
        recharge, isExhausted, lastDrain,
        summarizeSession, startNewSession, closeSummary, sessionSummary, isSummarizing, summaryError,
        initialBattery: initialBatteryRef.current,
        progressiveReadiness,
        sttStage, llmStage
    };
};