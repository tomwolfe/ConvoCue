import { useState, useEffect, useRef, useCallback } from 'react';
import { detectIntent } from './core/intentEngine';
import { AppConfig } from './core/config';
import { useSocialBattery } from './hooks/useSocialBattery';
import { useTranscript } from './hooks/useTranscript';

export const useML = () => {
    const [status, setStatus] = useState('Idle');
    const [progress, setProgress] = useState(0);
    const [suggestion, setSuggestion] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [detectedIntent, setDetectedIntent] = useState('general');
    const [persona, setPersona] = useState(AppConfig.defaultPersona);
    const [isReady, setIsReady] = useState(false);
    
    const { battery, deduct, reset: resetBattery, batteryRef } = useSocialBattery();
    const { transcript, addEntry, currentSpeaker, toggleSpeaker } = useTranscript();

    const workerRef = useRef(null);
    const messagesRef = useRef([]);

    const processText = useCallback((text) => {
        const intent = detectIntent(text);
        setDetectedIntent(intent);
        setIsProcessing(true);
        
        const currentBattery = deduct(text, intent);
        addEntry(text);

        messagesRef.current.push({ role: 'user', content: text });
        if (messagesRef.current.length > 10) messagesRef.current.shift();

        let personaPrompt = AppConfig.personas[persona].prompt;
        const contextInjection = `\n[Context: Intent=${intent.toUpperCase()}, Battery=${Math.round(currentBattery)}%]`;
        
        if (currentBattery < AppConfig.minBatteryThreshold) {
            personaPrompt += "\n[URGENT: User is socially exhausted. Prioritize exit strategies or minimal energy responses.]";
        }

        if (workerRef.current) {
            workerRef.current.postMessage({
                type: 'llm',
                data: {
                    messages: [...messagesRef.current],
                    personaPrompt: personaPrompt + contextInjection
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
        const worker = new Worker(new URL('./core/worker.js', import.meta.url), { type: 'module' });
        workerRef.current = worker;

        const handleMessage = (event) => {
            const { type, text, suggestion: sug, progress: prog, status: stat, error } = event.data;

            switch (type) {
                case 'status': setStatus(stat); break;
                case 'progress': setProgress(prog); break;
                case 'ready':
                    setStatus('Ready');
                    setIsReady(true);
                    setProgress(100);
                    break;
                case 'stt_result':
                    if (text) {
                        processTextRef.current(text);
                    }
                    break;
                case 'llm_result':
                    setSuggestion(sug);
                    setIsProcessing(false);
                    break;
                case 'error':
                    console.error('Worker error:', error);
                    setStatus(`Error: ${error}`);
                    setIsProcessing(false);
                    break;
            }
        };

        worker.onmessage = handleMessage;
        worker.postMessage({ type: 'load' });

        return () => {
            worker.terminate();
            workerRef.current = null;
        };
    }, []); // Empty dependency array means this only runs once on mount

    const processAudio = useCallback((audioData) => {
        if (!isReady || !workerRef.current) return;
        workerRef.current.postMessage({ type: 'stt', data: audioData });
    }, [isReady]);

    return {
        status, progress, transcript, suggestion, detectedIntent, 
        persona, setPersona, isReady, battery, resetBattery, 
        dismissSuggestion, processAudio,
        isProcessing,
        currentSpeaker, toggleSpeaker
    };
};