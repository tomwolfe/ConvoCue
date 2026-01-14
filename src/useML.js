import { useState, useEffect, useRef, useCallback } from 'react';
import { detectIntent, shouldGenerateSuggestion, getPrecomputedSuggestion, detectTurnTake, detectSpeakerHint } from './core/intentEngine';
import { AppConfig, BRIDGE_PHRASES } from './core/config';
import { useSocialBattery } from './hooks/useSocialBattery';
import { useTranscript } from './hooks/useTranscript';

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
        transcript, addEntry, currentSpeaker, setCurrentSpeaker, toggleSpeaker, clearTranscript,
        shouldPulse, nudgeSpeaker, consecutiveCount, setTranscript
    } = useTranscript();

    // Track if a suggestion was recently shown to help with auto-speaker detection
    const lastSuggestionTimeRef = useRef(0);

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

    const processText = useCallback((text) => {
        // Advanced Auto-Speaker Detection (80/20: Mind Reader Update)
        const speakerHint = detectSpeakerHint(text, currentSpeaker);
        const timeSinceLastSuggestion = Date.now() - lastSuggestionTimeRef.current;
        
        // Priority 1: Content-based hint with confidence threshold
        if (speakerHint) {
            // Increase confidence for the hinted speaker
            speakerConfidenceRef.current[speakerHint] += text.length > 20 ? 2 : 1;
            
            // If we have strong confidence or consecutive hints, toggle
            if (speakerConfidenceRef.current[speakerHint] >= 2) {
                if (speakerHint !== currentSpeaker) {
                    setCurrentSpeaker(speakerHint);
                }
                // Reset confidence for both after a switch or confirming current
                speakerConfidenceRef.current = { me: 0, them: 0 };
            }
        } else {
            // Decay confidence slowly if no hint
            speakerConfidenceRef.current.me = Math.max(0, speakerConfidenceRef.current.me - 0.5);
            speakerConfidenceRef.current.them = Math.max(0, speakerConfidenceRef.current.them - 0.5);
        }

        // Priority 2: Timing-based heuristic (Response to suggestion)
        // If 'them' speaks shortly after a suggestion was shown, and it sounds like a response
        if (currentSpeaker === 'them' && timeSinceLastSuggestion < 10000 && timeSinceLastSuggestion > 500) {
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
            
            // Haptic alert for conflict detection
            if (intent === 'conflict') {
                triggerSocialVibration('conflict');
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
                // Pick a random quick action from the current intent as a fallback
                const fallbackActions = QUICK_ACTIONS[intent] || QUICK_ACTIONS.social;
                const randomAction = fallbackActions[Math.floor(Math.random() * fallbackActions.length)];
                setSuggestion(randomAction.text);
                setIsProcessing(false); // Stop "processing" if we provide a fallback
            }
        }, 4000); // 4 second timeout for fallback

        // Store timeout ID for cleanup
        llmTimeoutsRef.current.set(taskId, timeoutId);

        if (llmWorkerRef.current) {
            llmWorkerRef.current.postMessage({
                type: 'llm',
                taskId,
                data: {
                    messages: [...messagesRef.current],
                    context: contextData,
                    instruction: instruction
                }
            });
        }
    }, [persona, deduct, addEntry, currentSpeaker, toggleSpeaker, nudgeSpeaker, suggestion, isProcessing]);


    // Handle LLM results and cache them
    const handleLlmResult = useCallback((sug, taskId) => {
        // Clear the timeout for this task ID
        if (taskId && llmTimeoutsRef.current.has(taskId)) {
            clearTimeout(llmTimeoutsRef.current.get(taskId));
            llmTimeoutsRef.current.delete(taskId);
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
        setIsProcessing(false);
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

        sttWorker.onmessage = (event) => {
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
                    if (text) processTextRef.current(text);
                    break;
                case 'error': console.error('STT Worker error:', error); break;
            }
        };

        llmWorker.onmessage = (event) => {
            const { type, suggestion: sug, summary, progress, error, taskId, loadTime, stage } = event.data;
            if (taskId && taskId < lastTaskId.current && (type === 'llm_result' || type === 'summary_result' || type === 'error')) return;

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
                    console.error('LLM Worker error:', error);
                    setIsProcessing(false);
                    setIsSummarizing(false);
                    setSummaryError(error);
                    break;
            }
        };

        sttWorker.postMessage({ type: 'load' });
        llmWorker.postMessage({ type: 'load' });

        return () => {
            sttWorker.terminate();
            llmWorker.terminate();

            // Clear any remaining timeouts
            for (const timeoutId of llmTimeoutsRef.current.values()) {
                clearTimeout(timeoutId);
            }
            llmTimeoutsRef.current.clear();
        };
    }, []);

    const isReady = sttReady && llmReady;
    const progressiveReadiness = getProgressiveReadiness();
    const progress = (sttProgress + llmProgress) / 2;
    const status = !isReady ? getDetailedModelLoadStatus() : isProcessing ? 'Processing...' : 'Ready';

    const meVolumeRef = useRef(0);
    
    const calculateVolume = (audioData) => {
        let sum = 0;
        for (let i = 0; i < audioData.length; i++) {
            sum += audioData[i] * audioData[i];
        }
        return Math.sqrt(sum / audioData.length);
    };

    const processAudio = useCallback((audioData) => {
        if (!sttReady || !sttWorkerRef.current) return;

        // 80/20 Auto-Diarization: Volume-based heuristic
        // Local speaker (Me) is usually significantly louder than distant speaker (Them)
        const currentVolume = calculateVolume(audioData);
        if (currentSpeaker === 'me') {
            // Update "Me" baseline when we know it's definitely the user
            meVolumeRef.current = meVolumeRef.current === 0 
                ? currentVolume 
                : meVolumeRef.current * 0.95 + currentVolume * 0.05;
        } else if (meVolumeRef.current > 0.01) { // Only if we have a valid baseline
            // If current volume is close to or louder than our "Me" baseline
            if (currentVolume > meVolumeRef.current * 0.8) {
                // High probability it's the local user speaking
                setCurrentSpeaker('me');
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
        currentSpeaker, toggleSpeaker, shouldPulse, consecutiveCount,
        sensitivity, setSensitivity,
        isPaused, togglePause,
        recharge, isExhausted, lastDrain,
        summarizeSession, startNewSession, closeSummary, sessionSummary, isSummarizing, summaryError,
        initialBattery: initialBatteryRef.current,
        progressiveReadiness,
        sttStage, llmStage
    };
};