import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocialBattery } from './hooks/useSocialBattery';
import { useTranscript } from './hooks/useTranscript';

import * as STT from './hooks/useSTT';
import * as Intent from './hooks/useIntentDetection';
import * as Suggestion from './hooks/useSuggestion';
import * as Speaker from './hooks/useSpeakerDetection';

import { AppConfig, BRIDGE_PHRASES, QUICK_ACTIONS } from './core/config';

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
        shouldPulse, nudgeSpeaker, consecutiveCount, setTranscript
    } = useTranscript();

    // === Module initialization ===
    useEffect(() => { STT.initSTT(); }, []);
    useEffect(() => { Suggestion.initLLMWorker(); }, []);

    // === Speaker detection (delegated to Speaker module) ===
    const processSpeakerHint = (text) => Speaker.processIntentHint(text, currentSpeaker);
    const handleManualToggle = () => {
        Speaker.toggleSpeakerIntent();
        baseToggleSpeaker();
    };

    // === processText: orchestrated from module calls ===
    const processText = useCallback((text) => {
        // 1. Speaker hint detection
        const speakerHint = processSpeakerHint(text);
        const timeSinceLastSuggestion = Date.now() - Intent.getLastSuggestionTime().current;
        const timeSinceManualToggle = Date.now() - Intent.getLastManualToggle().current;
        const isManualLockActive = timeSinceManualToggle < 3000;

        // 2. Priority 0: Fast lookup for common phrases (Intent module)
        const normalizedText = text.toLowerCase().trim();
        const fastLookupResult = Intent.getFastLookupMap().current.get(normalizedText);

        let intent, needsSuggestion;
        if (fastLookupResult) {
            intent = fastLookupResult.intent;
            needsSuggestion = true;
            setSuggestion(fastLookupResult.suggestion);
            Intent.getLastSuggestionTime().current = Date.now();
            setIsProcessing(false);
        } else {
            // 3. Fall back to normal intent detection (Intent module)
            intent = Intent.detectIntent(text);
            needsSuggestion = Intent.shouldGenerateSuggestion(text);

            setDetectedIntent(intent);

            // Cache invalidation for conflict detection (Intent module)
            if (intent === 'conflict') {
                Intent.getSuggestionCache().current.clear();
            }

            // Update intent history (Intent module)
            const his = Intent.getIntentHistory().current;
            his.push({ intent, timestamp: Date.now() });
            if (his.length > 5) his.shift();

            // Check for precomputed suggestions (Intent module)
            const precomputed = Intent.getPrecomputedSuggestion(text);
            if (precomputed) {
                setSuggestion(precomputed.suggestion);
                Intent.getLastSuggestionTime().current = Date.now();
                setIsProcessing(false);
            }
        }

        // 4. Battery deduction (useSocialBattery)
        const currentBattery = deduct(text, intent, persona);

        // Haptic alert for low battery (delegated elsewhere)

        // 5. Add to transcript (useTranscript)
        addEntry(text, currentSpeaker, intent);
        nudgeSpeaker();

        // 6. Turn-taking prediction (Intent module)
        if (Intent.detectTurnTake(text)) {
            setTimeout(() => { nudgeSpeaker(); }, 500);
        }

        const speakerLabel = currentSpeaker === 'me' ? 'Me' : 'Them';
        const transcriptRef = useTranscript();
        transcriptRef.current.push({ role: 'user', content: `${speakerLabel}: ${text}` });
        if (transcriptRef.current.length > 6) transcriptRef.current.shift();

        // 7. Fatigue-aware filtering
        const batteryThreshold = AppConfig.fatigueFilterThreshold;
        const isLowBattery = currentBattery < batteryThreshold;
        const shouldShowSuggestion = needsSuggestion &&
            (!isLowBattery || (isLowBattery && Math.random() < currentBattery / 100));

        if (!shouldShowSuggestion || currentSpeaker === 'me') {
            setIsProcessing(false);
            if (currentSpeaker === 'me') setSuggestion('');
            return;
        }

        // 8. Cache check with recent intents (Intent + Suggestion modules)
        const recentIntents = Intent.getIntentHistory().current
            .filter(item => Date.now() - item.timestamp < 30000)
            .map(item => item.intent)
            .slice(-3)
            .join('_');

        const cacheKey = `${intent}_${recentIntents}_${persona}_${currentBattery > AppConfig.minBatteryThreshold ? 'normal' : 'exhausted'}`;
        const cachedSuggestion = Intent.getSuggestionCache().current.get(cacheKey);

        if (cachedSuggestion && Date.now() - cachedSuggestion.timestamp < 45000) {
            setSuggestion(cachedSuggestion.text);
            Intent.getLastSuggestionTime().current = Date.now();
            setIsProcessing(false);
            return;
        }

        // 9. Instant reaction to reduce perceived latency
        setSuggestion(BRIDGE_PHRASES[intent] || BRIDGE_PHRASES.general);
        setIsProcessing(true);
        const personaConfig = AppConfig.personas[persona];
        const taskId = Date.now();

        const contextData = {
            intent: intent.toUpperCase(),
            battery: Math.round(currentBattery),
            persona: personaConfig.label,
            isExhausted: currentBattery < AppConfig.minBatteryThreshold,
            recentIntents: recentIntents
        };

        const instruction = contextData.isExhausted
            ? "URGENT: User is exhausted. Suggest a polite exit or minimal energy response."
            : personaConfig.prompt;

        // 10. Timeout for fallback (4s)
        const timeoutId = setTimeout(() => {
            if (isProcessing && (suggestion === BRIDGE_PHRASES[intent] || suggestion === BRIDGE_PHRASES.general)) {
                const fallbackActions = QUICK_ACTIONS[intent] || QUICK_ACTIONS.social;
                const randomAction = fallbackActions[Math.floor(Math.random() * fallbackActions.length)];
                setSuggestion(randomAction.text);
                setIsProcessing(false);
            }
        }, 4000);

        // Store timeout ID for cleanup (Suggestion module)
        Suggestion.getTimeoutsRef().current.set(taskId, timeoutId);

        // 11. Dispatch to LLM worker (Suggestion module)
        const worker = Suggestion.getWorkerRef();
        if (worker) {
            worker.postMessage({
                type: 'llm',
                taskId,
                data: {
                    messages: [...transcriptRef.current].slice(-6),
                    context: contextData,
                    instruction: instruction
                }
            }).catch(err => {
                console.warn('[useML] LLM task failed or timed out:', err);
            });
        }
    }, [
        persona, deduct, addEntry, currentSpeaker, baseToggleSpeaker,
        nudgeSpeaker, suggestion, isProcessing,
        Intent, Suggestion, Speaker,
        useTranscript
    ]);

    // === handleLlmResult: orchestrated from Suggestion module ===
    const handleLlmResult = useCallback((sug, taskId) => {
        if (taskId && Suggestion.getTimeoutsRef().current.has(taskId)) {
            clearTimeout(Suggestion.getTimeoutsRef().current.get(taskId));
            Suggestion.getTimeoutsRef().current.delete(taskId);
        }

        // Enhanced caching
        const intent = detectedIntent;
        const recentIntents = Intent.getIntentHistory().current
            .filter(item => Date.now() - item.timestamp < 30000)
            .map(item => item.intent)
            .slice(-3)
            .join('_');

        const cacheKey = `${intent}_${recentIntents}_${persona}_${battery > AppConfig.minBatteryThreshold ? 'normal' : 'exhausted'}`;
        Suggestion.getSuggestionCache().current.set(cacheKey, {
            text: sug,
            timestamp: Date.now()
        });

        // Also cache without recent intents for broader matching
        const basicCacheKey = `${intent}_${persona}_${battery > AppConfig.minBatteryThreshold ? 'normal' : 'exhausted'}`;
        if (!Suggestion.getSuggestionCache().current.has(basicCacheKey)) {
            Suggestion.getSuggestionCache().current.set(basicCacheKey, {
                text: sug,
                timestamp: Date.now()
            });
        }

        // Limit cache size
        if (Suggestion.getSuggestionCache().current.size > 75) {
            const firstKey = Suggestion.getSuggestionCache().current.keys().next().value;
            Suggestion.getSuggestionCache().current.delete(firstKey);
        }

        setSuggestion(sug);
        Intent.getLastSuggestionTime().current = Date.now();
        setIsProcessing(false);
    }, [detectedIntent, persona, battery]);

    // === refreshSuggestion ===
    const refreshSuggestion = useCallback(() => {
        if (!Suggestion.getWorkerRef() || isProcessing) return;

        const intent = detectedIntent;
        const currentBattery = battery;
        const personaConfig = AppConfig.personas[persona];
        const taskId = Date.now();

        setIsProcessing(true);
        setSuggestion(BRIDGE_PHRASES[intent.toLowerCase()] || BRIDGE_PHRASES.general);

        const recentIntents = Intent.getIntentHistory().current
            .filter(item => Date.now() - item.timestamp < 30000)
            .map(item => item.intent)
            .slice(-3)
            .join('_');

        const contextData = {
            intent: intent.toUpperCase(),
            battery: Math.round(currentBattery),
            persona: personaConfig.label,
            isExhausted: currentBattery < AppConfig.minBatteryThreshold,
            recentIntents: recentIntents
        };

        const instruction = contextData.isExhausted
            ? "URGENT: User is exhausted. Suggest a polite exit or minimal energy response."
            : personaConfig.prompt;

        const timeoutId = setTimeout(() => {
            if (isProcessing && (suggestion === BRIDGE_PHRASES[intent.toLowerCase()] || suggestion === BRIDGE_PHRASES.general)) {
                // Keep current suggestion or add indicator
            }
        }, 2000);

        Suggestion.getTimeoutsRef().current.set(taskId, timeoutId);

        const worker = Suggestion.getWorkerRef();
        if (worker) {
            worker.postMessage({
                type: 'llm',
                taskId,
                data: {
                    messages: [...useTranscript().current].slice(-6),
                    context: contextData,
                    instruction: instruction,
                    retry: true
                }
            });
        }
    }, [detectedIntent, battery, persona, isProcessing]);

    // === dismissSuggestion ===
    const dismissSuggestion = useCallback(() => {
        setSuggestion('');
        setIsProcessing(false);
    }, []);

    // === summarizeSession ===
    const summarizeSession = useCallback(() => {
        if (!Suggestion.getWorkerRef() || transcript.length === 0) return;

        setIsSummarizing(true);
        setSummaryError(null);
        const stats = {
            totalCount: transcript.length,
            meCount: transcript.filter(t => t.speaker === 'me').length,
            themCount: transcript.filter(t => t.speaker === 'them').length,
            totalDrain: Math.round(initialBatteryRef.current - battery)
        };

        const worker = Suggestion.getWorkerRef();
        if (worker) {
            worker.postMessage({
                type: 'summarize',
                taskId: Date.now(),
                data: { transcript, stats }
            }).catch(err => {
                console.error('[useML] Summary task failed:', err);
                setIsSummarizing(false);
                setSummaryError('Summarization timed out or failed.');
            });
        }
    }, [transcript, battery]);

    // === startNewSession ===
    const startNewSession = useCallback(() => {
        setSessionSummary(null);
        setSummaryError(null);
        clearTranscript();
        resetBattery();
        STT.terminateSTT();
        Suggestion.terminateLLMWorker();
    }, [clearTranscript, resetBattery]);

    // === closeSummary ===
    const closeSummary = useCallback(() => {
        setSessionSummary(null);
        setIsSummarizing(false);
        setSummaryError(null);
    }, []);

    // === Audio buffer and processAudio ===
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

        if (STT.getSTTWorkerRef()) {
            STT.getSTTWorkerRef().postMessage({ type: 'stt', data: combined }, [combined.buffer]);
        }
        audioBufferRef.current = [];
        if (flushTimeoutRef.current) {
            clearTimeout(flushTimeoutRef.current);
            flushTimeoutRef.current = null;
        }
    }, []);

    const processAudio = useCallback((audioData) => {
        if (STT.sttReady() && STT.getSTTWorkerRef()) {
            audioBufferRef.current.push(audioData);

            if (flushTimeoutRef.current) clearTimeout(flushTimeoutRef.current);

            const totalLength = audioBufferRef.current.reduce((acc, curr) => acc + curr.length, 0);
            if (totalLength > 48000) {
                flushAudioBuffer();
            } else {
                flushTimeoutRef.current = setTimeout(flushAudioBuffer, 300);
            }
        }
    }, []);

    // === VAD effect ===
    useEffect(() => {
        const sttWorker = STT.getSTTWorkerRef();
        if (!sttWorker) return;

        sttWorker.onmessage = (event) => {
            const { type, text, progress, status: stat, error, taskId, loadTime, stage } = event.data;
            switch (type) {
                case 'progress':
                    // STT progress tracked by module
                    break;
                case 'ready':
                    // STT ready tracked by module
                    break;
                case 'stt_result':
                    if (text) processText(text);
                    break;
                case 'error': console.error('STT Worker error:', error); break;
            }
        };

        sttWorker.postMessage({ type: 'load' });

        return () => {
            STT.terminateSTT();
        };
    }, [processText]);

    // === messagesRef for session management ===
    const messagesRef = useRef([]);

    // === Derived state ===
    const sttState = STT.getSTTState();
    const { intentDetectionState } = Intent.getIntentDetectionState();

    const isReady = sttState.sttReady;
    const progressiveReadiness = () => {
        if (sttState.sttReady) return 'partial';
        return 'loading';
    };

    const progress = (sttState.sttProgress + 50) / 2;

    const status = !isReady ? (
        sttState.sttProgress < 100 && 50 < 100 ? 'Loading AI models...' :
        sttState.sttProgress < 100 ? 'Finishing speech-to-text model...' :
        50 < 100 ? 'Finishing language model...' :
        'Ready'
    ) : isProcessing ? 'Processing...' : 'Ready';

    // === Return the same public API as the original -----
    return {
        status, progress, sttProgress: sttState.sttProgress, llmProgress: 50,
        transcript, suggestion, detectedIntent,
        persona, setPersona, isReady, battery, resetBattery,
        dismissSuggestion, refreshSuggestion, processAudio,
        isProcessing,
        currentSpeaker, toggleSpeaker: handleManualToggle, shouldPulse, consecutiveCount,
        sensitivity, setSensitivity,
        isPaused, togglePause,
        recharge, isExhausted, lastDrain,
        summarizeSession, startNewSession, closeSummary, sessionSummary, isSummarizing, summaryError,
        initialBattery: batteryRef.current,
        progressiveReadiness,
        sttStage: sttState.sttStage, llmStage: 0
    };
};