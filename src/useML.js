import { useState, useEffect, useRef, useCallback } from 'react';
import { detectIntent, shouldGenerateSuggestion } from './core/intentEngine';
import { AppConfig, BRIDGE_PHRASES } from './core/config';
import { useSocialBattery } from './hooks/useSocialBattery';
import { useTranscript } from './hooks/useTranscript';

export const useML = () => {
    const [suggestion, setSuggestion] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [detectedIntent, setDetectedIntent] = useState('general');
    const [persona, setPersona] = useState(AppConfig.defaultPersona);
    const [sessionSummary, setSessionSummary] = useState(null);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [summaryError, setSummaryError] = useState(null);
    
    const { 
        battery, deduct, reset: resetBattery, batteryRef,
        sensitivity, setSensitivity, isPaused, togglePause, recharge, isExhausted, lastDrain
    } = useSocialBattery();
    const { 
        transcript, addEntry, currentSpeaker, toggleSpeaker, clearTranscript, 
        shouldPulse, nudgeSpeaker, consecutiveCount
    } = useTranscript();

    const sttWorkerRef = useRef(null);
    const llmWorkerRef = useRef(null);
    const messagesRef = useRef([]);
    const initialBatteryRef = useRef(100);
    const lastTaskId = useRef(0);
    const [sttReady, setSttReady] = useState(false);
    const [llmReady, setLlmReady] = useState(false);
    const [sttProgress, setSttProgress] = useState(0);
    const [llmProgress, setLlmProgress] = useState(0);

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
            sttWorkerRef.current.postMessage({ type: 'stt', data: combined });
        }
        audioBufferRef.current = [];
        if (flushTimeoutRef.current) {
            clearTimeout(flushTimeoutRef.current);
            flushTimeoutRef.current = null;
        }
    }, []);

    const summarizeSession = useCallback(() => {
        if (!llmWorkerRef.current || transcript.length === 0) return;
        
        setIsSummarizing(true);
        setSummaryError(null);
        const stats = {
            totalCount: transcript.length,
            meCount: transcript.filter(t => t.speaker === 'me').length,
            themCount: transcript.filter(t => t.speaker === 'them').length,
            totalDrain: Math.round(initialBatteryRef.current - battery)
        };

        llmWorkerRef.current.postMessage({
            type: 'summarize',
            taskId: ++lastTaskId.current,
            data: {
                transcript,
                stats
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

    const closeSummary = useCallback(() => {
        setSessionSummary(null);
        setIsSummarizing(false);
        setSummaryError(null);
    }, []);

    const processText = useCallback((text) => {
        const intent = detectIntent(text);
        const needsSuggestion = shouldGenerateSuggestion(text);

        setDetectedIntent(intent);

        const currentBattery = deduct(text, intent, persona);
        addEntry(text);
        nudgeSpeaker();

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
            setSuggestion('');
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
            isExhausted: currentBattery < AppConfig.minBatteryThreshold
        };

        const instruction = contextData.isExhausted
            ? "URGENT: User is exhausted. Suggest a polite exit or minimal energy response."
            : personaConfig.prompt;

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
    }, [persona, deduct, addEntry, currentSpeaker]);

    const dismissSuggestion = useCallback(() => {
        setSuggestion('');
        setIsProcessing(false);
    }, []);

    const processTextRef = useRef(processText);
    useEffect(() => {
        processTextRef.current = processText;
    }, [processText]);

    // Eager fetch model files to prime browser cache
    useEffect(() => {
        const modelFiles = [
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
    }, []);

    // Improved model loading status
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

    useEffect(() => {
        const sttWorker = new Worker(new URL('./core/sttWorker.js', import.meta.url), { type: 'module' });
        const llmWorker = new Worker(new URL('./core/llmWorker.js', import.meta.url), { type: 'module' });
        sttWorkerRef.current = sttWorker;
        llmWorkerRef.current = llmWorker;

        sttWorker.onmessage = (event) => {
            const { type, text, progress, status: stat, error, taskId } = event.data;
            switch (type) {
                case 'progress': setSttProgress(progress); break;
                case 'ready': setSttReady(true); break;
                case 'stt_result':
                    if (text) processTextRef.current(text);
                    break;
                case 'error': console.error('STT Worker error:', error); break;
            }
        };

        llmWorker.onmessage = (event) => {
            const { type, suggestion: sug, summary, progress, error, taskId } = event.data;
            if (taskId && taskId < lastTaskId.current && (type === 'llm_result' || type === 'summary_result' || type === 'error')) return;

            switch (type) {
                case 'progress': setLlmProgress(progress); break;
                case 'ready': setLlmReady(true); break;
                case 'llm_result':
                    setSuggestion(sug);
                    setIsProcessing(false);
                    break;
                case 'summary_result':
                    setSessionSummary(summary);
                    setIsSummarizing(false);
                    setSummaryError(null);
                    break;
                case 'error':
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
        };
    }, []);

    const isReady = sttReady && llmReady;
    const progress = (sttProgress + llmProgress) / 2;
    const status = !isReady ? getModelLoadStatus() : isProcessing ? 'Processing...' : 'Ready';

    const processAudio = useCallback((audioData) => {
        if (!sttReady || !sttWorkerRef.current) return;
        
        audioBufferRef.current.push(audioData);
        
        if (flushTimeoutRef.current) clearTimeout(flushTimeoutRef.current);
        
        const totalLength = audioBufferRef.current.reduce((acc, curr) => acc + curr.length, 0);
        // If buffer > 3s, flush immediately, otherwise wait 300ms for more speech
        if (totalLength > 48000) { 
            flushAudioBuffer();
        } else {
            flushTimeoutRef.current = setTimeout(flushAudioBuffer, 300);
        }
    }, [sttReady, flushAudioBuffer]);

    useEffect(() => {
        return () => {
            if (flushTimeoutRef.current) clearTimeout(flushTimeoutRef.current);
        };
    }, []);

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
        initialBattery: initialBatteryRef.current
    };
};