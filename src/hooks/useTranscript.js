import { useState, useCallback, useRef, useEffect } from 'react';

export const useTranscript = () => {
    const [transcript, setTranscript] = useState([]);
    const [currentSpeaker, setCurrentSpeaker] = useState('them');
    const [shouldPulse, setShouldPulse] = useState(false);
    const [consecutiveCount, setConsecutiveCount] = useState(0);
    const [trafficLightStatus, setTrafficLightStatus] = useState('green');
    const speakerStartTimeRef = useRef(null);

    // Update traffic light status based on duration
    useEffect(() => {
        if (!speakerStartTimeRef.current || currentSpeaker !== 'me') {
            setTrafficLightStatus('green');
            return;
        }

        const interval = setInterval(() => {
            const duration = (Date.now() - speakerStartTimeRef.current) / 1000;
            if (duration >= 120) {
                setTrafficLightStatus('red');
            } else if (duration >= 60) {
                setTrafficLightStatus('yellow');
            } else {
                setTrafficLightStatus('green');
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [currentSpeaker]);

    const nudgeSpeaker = useCallback(() => {
        setShouldPulse(true);
        setTimeout(() => setShouldPulse(false), 2000);
    }, []);

    const addEntry = useCallback((text, speaker = currentSpeaker, intent = null) => {
        setTranscript(prev => {
            const lastEntry = prev[prev.length - 1];
            if (lastEntry && lastEntry.speaker === speaker) {
                setConsecutiveCount(c => c + 1);
            } else {
                setConsecutiveCount(1);
                // Reset start time if speaker changes
                if (speaker === 'me') {
                    speakerStartTimeRef.current = Date.now();
                } else {
                    speakerStartTimeRef.current = null;
                }
            }

            // Also ensure speakerStartTime is set if it was null and speaker is 'me'
            if (speaker === 'me' && !speakerStartTimeRef.current) {
                speakerStartTimeRef.current = Date.now();
            }

            return [...prev, {
                text,
                speaker,
                intent,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }];
        });
    }, [currentSpeaker]);

    const toggleSpeaker = useCallback(() => {
        setCurrentSpeaker(prev => {
            const next = prev === 'me' ? 'them' : 'me';
            if (next === 'me') {
                speakerStartTimeRef.current = Date.now();
            } else {
                speakerStartTimeRef.current = null;
            }
            return next;
        });
        setConsecutiveCount(0);
        setTrafficLightStatus('green');
    }, []);

    const clearTranscript = useCallback(() => {
        setTranscript([]);
        setConsecutiveCount(0);
        speakerStartTimeRef.current = null;
        setTrafficLightStatus('green');
    }, []);

    const setTranscriptValue = useCallback((value) => {
        setTranscript(value);
    }, []);

    return { 
        transcript, 
        addEntry, 
        currentSpeaker, 
        setCurrentSpeaker, 
        toggleSpeaker, 
        clearTranscript, 
        shouldPulse, 
        nudgeSpeaker, 
        consecutiveCount, 
        trafficLightStatus,
        setTranscript: setTranscriptValue 
    };
};
