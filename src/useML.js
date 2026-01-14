import { useState, useEffect, useRef, useCallback } from 'react';
import { detectIntent, shouldGenerateSuggestion, getPrecomputedSuggestion } from './core/intentEngine';
import { AppConfig, BRIDGE_PHRASES, SILENCE_BREAKERS } from './core/config';
import { useSocialBattery } from './hooks/useSocialBattery';
import { useTranscript } from './hooks/useTranscript';

export const useML = (initialState = null) => {
    // 1. Refs (Declared first to avoid Temporal Dead Zone)
    const sttWorkerRef = useRef(null);
    const llmWorkerRef = useRef(null);
    const messagesRef = useRef([]);
    const initialBatteryRef = useRef(100);
    const lastTaskId = useRef(0);
    const llmTimeoutsRef = useRef(new Map());
    const audioBufferRef = useRef([]);
    const flushTimeoutRef = useRef(null);
    const suggestionCache = useRef(new Map());
    const intentHistory = useRef([]);
    
    // Feature Refs
    const lastActivityRef = useRef(Date.now());
    const userVolumeRef = useRef(0.15);
    const themVolumeRef = useRef(0.05);
    const manualTogglesRef = useRef(0);
    const silenceTriggeredRef = useRef(false);
    
    // 2. State
    const [suggestion, setSuggestion] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [detectedIntent, setDetectedIntent] = useState('general');
    const [persona, setPersona] = useState(AppConfig.defaultPersona);
    const [sessionSummary, setSessionSummary] = useState(null);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [summaryError, setSummaryError] = useState(null);

    const [sttReady, setSttReady] = useState(false);
    const [llmReady, setLlmReady] = useState(false);
    const [sttProgress, setSttProgress] = useState(0);
    const [llmProgress, setLlmProgress] = useState(0);
    const [sttLoadTime, setSttLoadTime] = useState(null);
    const [llmLoadTime, setLlmLoadTime] = useState(null);
    const [sttStage, setSttStage] = useState('initializing');
    const [llmStage, setLlmStage] = useState('initializing');

    // 3. Hooks
    const {
        battery, deduct, reset: resetBattery, batteryRef, setBattery,
        sensitivity, setSensitivity, isPaused, togglePause, recharge, isExhausted, lastDrain
    } = useSocialBattery();
    const {
        transcript, addEntry, currentSpeaker, toggleSpeaker: baseToggleSpeaker, clearTranscript,
        shouldPulse, nudgeSpeaker, consecutiveCount, setTranscript
    } = useTranscript();

    // 4. Callbacks
    const toggleSpeaker = useCallback(() => {
        manualTogglesRef.current += 1;
        baseToggleSpeaker();
    }, [baseToggleSpeaker]);

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
            sttWorkerRef.current.postMessage({ type: 'stt', data: combined });
        }
        audioBufferRef.current = [];
        if (flushTimeoutRef.current) {
            clearTimeout(flushTimeoutRef.current);
            flushTimeoutRef.current = null;
        }
    }, []);

    const handleLlmResult = useCallback((sug, taskId) => {
        if (taskId && llmTimeoutsRef.current.has(taskId)) {
            clearTimeout(llmTimeoutsRef.current.get(taskId));
            llmTimeoutsRef.current.delete(taskId);
        }

        const intent = detectedIntent;
        const recentIntents = intentHistory.current
            .filter(item => Date.now() - item.timestamp < 30000)
            .map(item => item.intent)
            .slice(-3)
            .join('_');

        const cacheKey = `${intent}_${recentIntents}_${persona}_${battery > AppConfig.minBatteryThreshold ? 'normal' : 'exhausted'}`;
        suggestionCache.current.set(cacheKey, { text: sug, timestamp: Date.now() });

        if (suggestionCache.current.size > 75) {
            const firstKey = suggestionCache.current.keys().next().value;
            suggestionCache.current.delete(firstKey);
        }

        setSuggestion(sug);
        setIsProcessing(false);
    }, [detectedIntent, persona, battery]);

    const processText = useCallback((text) => {
        lastActivityRef.current = Date.now();
        silenceTriggeredRef.current = false;

        const normalizedText = text.toLowerCase().trim();
        
        // Fast lookup for common greetings/questions
        const fastLookupMap = new Map([
            ['hello', { intent: 'social', suggestion: 'Hi there! How are you doing today?' }],
            ['hi', { intent: 'social', suggestion: 'Hello! Nice to meet you.' }],
            ['how are you', { intent: 'social', suggestion: 'I\'m doing well, thank you! How about yourself?' }]
        ]);
        
        const fastLookupResult = fastLookupMap.get(normalizedText);

        let intent, needsSuggestion;
        if (fastLookupResult) {
            intent = fastLookupResult.intent;
            needsSuggestion = true;
            setSuggestion(fastLookupResult.suggestion);
            setIsProcessing(false);
        } else {
            intent = detectIntent(text);
            needsSuggestion = shouldGenerateSuggestion(text);
            setDetectedIntent(intent);

            intentHistory.current.push({ intent, timestamp: Date.now() });
            if (intentHistory.current.length > 5) intentHistory.current.shift();

            const precomputed = getPrecomputedSuggestion(text);
            if (precomputed) {
                setSuggestion(precomputed.suggestion);
                setIsProcessing(false);
            }
        }

        const currentBattery = deduct(text, intent, persona);
        addEntry(text, currentSpeaker, intent);
        nudgeSpeaker();

        const speakerLabel = currentSpeaker === 'me' ? 'Me' : 'Them';
        messagesRef.current.push({ role: 'user', content: `${speakerLabel}: ${text}` });
        if (messagesRef.current.length > 6) messagesRef.current.shift();

        const isLowBattery = currentBattery < AppConfig.fatigueFilterThreshold;
        const shouldShowSuggestion = needsSuggestion &&
            (!isLowBattery || (isLowBattery && Math.random() < currentBattery / 100));

        if (!shouldShowSuggestion || currentSpeaker === 'me') {
            if (!fastLookupResult && !getPrecomputedSuggestion(text)) {
                setIsProcessing(false);
                setSuggestion('');
            }
            return;
        }

        const recentIntents = intentHistory.current
            .filter(item => Date.now() - item.timestamp < 30000)
            .map(item => item.intent)
            .slice(-3)
            .join('_');

        const cacheKey = `${intent}_${recentIntents}_${persona}_${currentBattery > AppConfig.minBatteryThreshold ? 'normal' : 'exhausted'}`;
        const cachedSuggestion = suggestionCache.current.get(cacheKey);

        if (cachedSuggestion && Date.now() - cachedSuggestion.timestamp < 45000) {
            setSuggestion(cachedSuggestion.text);
            setIsProcessing(false);
            return;
        }

        setSuggestion(BRIDGE_PHRASES[intent] || BRIDGE_PHRASES.general);
        setIsProcessing(true);
        const taskId = ++lastTaskId.current;

        const contextData = {
            intent: intent.toUpperCase(),
            battery: Math.round(currentBattery),
            persona: AppConfig.personas[persona].label,
            isExhausted: currentBattery < AppConfig.minBatteryThreshold,
            recentIntents
        };

        const timeoutId = setTimeout(() => {
            if (isProcessing) setSuggestion(`Still thinking about ${intent}...`);
        }, 3000);

        llmTimeoutsRef.current.set(taskId, timeoutId);

        if (llmWorkerRef.current) {
            llmWorkerRef.current.postMessage({
                type: 'llm',
                taskId,
                data: {
                    messages: [...messagesRef.current],
                    context: contextData,
                    instruction: contextData.isExhausted 
                        ? "URGENT: User is exhausted. Suggest a polite exit."
                        : AppConfig.personas[persona].prompt
                }
            });
        }
    }, [persona, deduct, addEntry, currentSpeaker, nudgeSpeaker]);

    const processAudio = useCallback((audioData, metadata) => {
        if (!sttReady || !sttWorkerRef.current) return;

        lastActivityRef.current = Date.now();
        silenceTriggeredRef.current = false;

        if (metadata && metadata.rms) {
            const { rms } = metadata;
            const distMe = Math.abs(rms - userVolumeRef.current);
            const distThem = Math.abs(rms - themVolumeRef.current);
            const guessedSpeaker = distMe < distThem ? 'me' : 'them';
            
            if (guessedSpeaker !== currentSpeaker) {
                if (manualTogglesRef.current < 3 || Math.random() < 0.3) {
                    toggleSpeaker();
                }
            }
            
            if (currentSpeaker === 'me') {
                userVolumeRef.current = userVolumeRef.current * 0.9 + rms * 0.1;
            } else {
                themVolumeRef.current = themVolumeRef.current * 0.9 + rms * 0.1;
            }
        }

        audioBufferRef.current.push(audioData);
        if (flushTimeoutRef.current) clearTimeout(flushTimeoutRef.current);
        const totalLength = audioBufferRef.current.reduce((acc, curr) => acc + curr.length, 0);
        
        if (totalLength > 48000) {
            flushAudioBuffer();
        } else {
            flushTimeoutRef.current = setTimeout(flushAudioBuffer, 300);
        }
    }, [sttReady, flushAudioBuffer, currentSpeaker, toggleSpeaker]);

    const summarizeSession = useCallback(() => {
        if (!llmWorkerRef.current || transcript.length === 0) return;
        setIsSummarizing(true);
        setSummaryError(null);
        llmWorkerRef.current.postMessage({
            type: 'summarize',
            taskId: ++lastTaskId.current,
            data: {
                transcript,
                stats: {
                    totalCount: transcript.length,
                    meCount: transcript.filter(t => t.speaker === 'me').length,
                    themCount: transcript.filter(t => t.speaker === 'them').length,
                    totalDrain: Math.round(initialBatteryRef.current - battery)
                }
            }
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

    const dismissSuggestion = useCallback(() => {
        setSuggestion('');
        setIsProcessing(false);
    }, []);

    // 5. Effects
    useEffect(() => {
        if (initialState) {
            if (initialState.battery !== undefined) setBattery(initialState.battery);
            if (initialState.transcript) setTranscript(initialState.transcript);
            if (initialState.persona) setPersona(initialState.persona);
        }
    }, [initialState, setBattery, setTranscript]);

    useEffect(() => {
        const interval = setInterval(() => {
            const isReady = sttReady && llmReady;
            if (!isReady || isPaused || isProcessing) return;

            if (Date.now() - lastActivityRef.current > 8000 && !silenceTriggeredRef.current && transcript.length > 0) {
                silenceTriggeredRef.current = true;
                deduct("...", "general", persona);
                const breakers = SILENCE_BREAKERS[persona] || SILENCE_BREAKERS.anxiety;
                setSuggestion(`[Silence Breaker] ${breakers[Math.floor(Math.random() * breakers.length)]}`);
                setDetectedIntent('social');
            }
        }, 2000);
        return () => clearInterval(interval);
    }, [sttReady, llmReady, isPaused, isProcessing, transcript.length, persona, deduct]);

    useEffect(() => {
        const sttWorker = new Worker(new URL('./core/sttWorker.js', import.meta.url), { type: 'module' });
        const llmWorker = new Worker(new URL('./core/llmWorker.js', import.meta.url), { type: 'module' });
        sttWorkerRef.current = sttWorker;
        llmWorkerRef.current = llmWorker;

        const processTextRef = { current: processText };

        sttWorker.onmessage = (e) => {
            const { type, text, progress, loadTime, stage, error } = e.data;
            if (type === 'progress') { setSttProgress(progress); if (stage) setSttStage(stage); }
            else if (type === 'ready') { setSttReady(true); if (loadTime) setSttLoadTime(loadTime); }
            else if (type === 'stt_result') { if (text) processTextRef.current(text); }
            else if (type === 'error') console.error(error);
        };

        llmWorker.onmessage = (e) => {
            const { type, suggestion: sug, summary, progress, taskId, loadTime, stage, error } = e.data;
            if (taskId && taskId < lastTaskId.current) return;
            if (type === 'progress') { setLlmProgress(progress); if (stage) setLlmStage(stage); }
            else if (type === 'ready') { setLlmReady(true); if (loadTime) setLlmLoadTime(loadTime); }
            else if (type === 'llm_result') handleLlmResult(sug, taskId);
            else if (type === 'summary_result') { setSessionSummary(summary); setIsSummarizing(false); }
            else if (type === 'error') { setIsProcessing(false); setIsSummarizing(false); setSummaryError(error); }
        };

        sttWorker.postMessage({ type: 'load' });
        llmWorker.postMessage({ type: 'load' });

        return () => {
            sttWorker.terminate();
            llmWorker.terminate();
            llmTimeoutsRef.current.forEach(clearTimeout);
        };
    }, [handleLlmResult, processText]);

    const isReady = sttReady && llmReady;
    const progress = (sttProgress + llmProgress) / 2;
    const status = !isReady 
        ? `Loading... ${Math.round(progress)}% (STT: ${sttStage}, LLM: ${llmStage})` 
        : isProcessing ? 'Processing...' : 'Ready';

    return {
        status, progress, sttProgress, llmProgress, transcript, suggestion, detectedIntent,
        persona, setPersona, isReady, battery, resetBattery,
        dismissSuggestion, processAudio,
        isProcessing,
        currentSpeaker, toggleSpeaker, shouldPulse, consecutiveCount,
        sensitivity, setSensitivity,
        isPaused, togglePause,
        recharge, isExhausted, lastDrain,
        summarizeSession, startNewSession, closeSummary, sessionSummary, isSummarizing, summaryError,
        initialBattery: initialBatteryRef.current,
        progressiveReadiness: sttReady && llmReady ? 'full' : sttReady ? 'partial' : 'loading',
        sttStage, llmStage
    };
};