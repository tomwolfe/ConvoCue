import { useState, useEffect, useRef, useCallback } from 'react';
import { detectIntent } from './core/intentEngine';
import { AppConfig } from './core/config';
import { useSocialBattery } from './hooks/useSocialBattery';
import { useTranscript } from './hooks/useTranscript';

export const useML = () => {
    const [suggestion, setSuggestion] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [detectedIntent, setDetectedIntent] = useState('general');
    const [persona, setPersona] = useState(AppConfig.defaultPersona);
    
    const { 
        battery, deduct, reset: resetBattery, batteryRef,
        sensitivity, setSensitivity, isPaused, togglePause, recharge
    } = useSocialBattery();
    const { transcript, addEntry, currentSpeaker, toggleSpeaker } = useTranscript();

    const sttWorkerRef = useRef(null);
    const llmWorkerRef = useRef(null);
    const messagesRef = useRef([]);
    const lastTaskId = useRef(0);
    const [sttReady, setSttReady] = useState(false);
    const [llmReady, setLlmReady] = useState(false);
    const [sttProgress, setSttProgress] = useState(0);
    const [llmProgress, setLlmProgress] = useState(0);

    const processText = useCallback((text) => {
        const intent = detectIntent(text);
        setDetectedIntent(intent);
        setIsProcessing(true);
        
        const currentBattery = deduct(text, intent, persona);
        addEntry(text);

        messagesRef.current.push({ role: 'user', content: text });
        if (messagesRef.current.length > 10) messagesRef.current.shift();

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
    }, [persona, deduct, addEntry]);

    const dismissSuggestion = useCallback(() => {
        setSuggestion('');
        setIsProcessing(false);
    }, []);

    const processTextRef = useRef(processText);
    useEffect(() => {
        processTextRef.current = processText;
    }, [processText]);

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
            const { type, suggestion: sug, progress, error, taskId } = event.data;
            if (taskId && taskId < lastTaskId.current && type === 'llm_result') return;

            switch (type) {
                case 'progress': setLlmProgress(progress); break;
                case 'ready': setLlmReady(true); break;
                case 'llm_result':
                    setSuggestion(sug);
                    setIsProcessing(false);
                    break;
                case 'error': console.error('LLM Worker error:', error); break;
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
    const status = !isReady ? 'Loading Models...' : isProcessing ? 'Processing...' : 'Ready';

    const processAudio = useCallback((audioData) => {
        if (!sttReady || !sttWorkerRef.current) return;
        sttWorkerRef.current.postMessage({ type: 'stt', data: audioData });
    }, [sttReady]);

    return {
        status, progress, transcript, suggestion, detectedIntent, 
        persona, setPersona, isReady, battery, resetBattery, 
        dismissSuggestion, processAudio,
        isProcessing,
        currentSpeaker, toggleSpeaker,
        sensitivity, setSensitivity, 
        isPaused, togglePause,
        recharge
    };
};