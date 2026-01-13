import { useState, useCallback, useRef, useEffect } from 'react';
import { AppConfig } from '../core/config';

export const useSocialBattery = () => {
    const [battery, setBattery] = useState(100);
    const [sensitivity, setSensitivity] = useState(AppConfig.agency.defaultSensitivity);
    const [isPaused, setIsPaused] = useState(false);
    const [lastDrain, setLastDrain] = useState(null);
    
    const batteryRef = useRef(battery);
    const lastInteractionRef = useRef(Date.now());
    const drainTimeoutRef = useRef(null);

    useEffect(() => {
        batteryRef.current = battery;
    }, [battery]);

    // Passive recovery mechanism (80/20: small code, big feel improvement)
    useEffect(() => {
        const interval = setInterval(() => {
            if (isPaused) return;
            const now = Date.now();
            const idleTime = (now - lastInteractionRef.current) / 1000;
            
            if (idleTime > 30) { // After 30s of silence
                setBattery(prev => Math.min(100, prev + 0.1)); // Very slow passive recharge
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [isPaused]);

    const deduct = useCallback((text, intent, personaKey = 'anxiety') => {
        if (isPaused) return batteryRef.current;
        
        const now = Date.now();
        const timeSinceLast = (now - lastInteractionRef.current) / 1000;
        lastInteractionRef.current = now;

        const wordCount = text.trim().split(/\s+/).length;
        // Use a slight dampening on word count to be more natural (logarithmic-ish)
        const adjustedWordCount = Math.sqrt(wordCount) * 2; 
        const baseDeduction = adjustedWordCount * AppConfig.batteryDeduction.baseRate;
        const multiplier = AppConfig.batteryDeduction.multipliers[intent] || 1.0;
        
        const personaConfig = AppConfig.personas[personaKey] || AppConfig.personas[AppConfig.defaultPersona];
        const drainRate = personaConfig.drainRate || 1.0;
        
        // Social Momentum: Rapid fire conversation drains 1.5x more
        const momentumFactor = timeSinceLast < 5 ? 1.5 : 1.0;
        
        // If intent is positive, we allow for a very small recharge or zero drain
        const isPositive = intent === 'positive';
        let totalDeduction = baseDeduction * multiplier * drainRate * sensitivity * momentumFactor;
        
        if (isPositive) {
            totalDeduction = -0.5; // Fixed small recharge for positive sentiment
        } else {
            totalDeduction = Math.min(20, Math.max(0.5, totalDeduction));
        }
        
        setLastDrain({
            amount: isPositive ? '+0.5' : `-${totalDeduction.toFixed(1)}`,
            reason: intent !== 'general' ? intent : ''
        });

        if (drainTimeoutRef.current) clearTimeout(drainTimeoutRef.current);
        drainTimeoutRef.current = setTimeout(() => setLastDrain(null), 3000);

        setBattery(prev => {
            const newVal = Math.max(0, Math.min(100, prev - totalDeduction));
            batteryRef.current = newVal;
            return newVal;
        });
        
        return batteryRef.current;
    }, [isPaused, sensitivity]);

    const reset = useCallback(() => setBattery(100), []);
    const togglePause = useCallback(() => setIsPaused(p => !p), []);
    const recharge = useCallback((amount) => setBattery(prev => Math.min(100, prev + amount)), []);

    const isExhausted = battery < AppConfig.minBatteryThreshold;

    return { 
        battery, deduct, reset, batteryRef, 
        sensitivity, setSensitivity, 
        isPaused, togglePause,
        recharge, isExhausted, lastDrain
    };
};
