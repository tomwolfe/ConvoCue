import { useState, useCallback } from 'react';

export const useTranscript = () => {
    const [transcript, setTranscript] = useState([]);
    const [currentSpeaker, setCurrentSpeaker] = useState('them');
    const [shouldPulse, setShouldPulse] = useState(false);
    const [consecutiveCount, setConsecutiveCount] = useState(0);

    const nudgeSpeaker = useCallback(() => {
        setShouldPulse(true);
        setTimeout(() => setShouldPulse(false), 2000);
    }, []);

    const addEntry = useCallback((text, speaker = currentSpeaker) => {
        setTranscript(prev => {
            const lastEntry = prev[prev.length - 1];
            if (lastEntry && lastEntry.speaker === speaker) {
                setConsecutiveCount(c => c + 1);
            } else {
                setConsecutiveCount(1);
            }
            
            return [...prev, { 
                text, 
                speaker, 
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
            }];
        });
    }, [currentSpeaker]);

    const toggleSpeaker = useCallback(() => {
        setCurrentSpeaker(prev => prev === 'me' ? 'them' : 'me');
        setConsecutiveCount(0);
    }, []);

    const clearTranscript = useCallback(() => {
        setTranscript([]);
        setConsecutiveCount(0);
    }, []);

    return { transcript, addEntry, currentSpeaker, setCurrentSpeaker, toggleSpeaker, clearTranscript, shouldPulse, nudgeSpeaker, consecutiveCount };
};
