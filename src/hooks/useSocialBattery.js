import { useState, useCallback, useRef, useEffect } from 'react';
import { AppConfig } from '../core/config';

export const useSocialBattery = () => {
    const [battery, setBattery] = useState(100);
    const [sensitivity, setSensitivity] = useState(AppConfig.agency.defaultSensitivity);
    const [isPaused, setIsPaused] = useState(false);
    
    const batteryRef = useRef(battery);
    const lastInteractionRef = useRef(Date.now());

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
        const baseDeduction = wordCount * AppConfig.batteryDeduction.baseRate;
        const multiplier = AppConfig.batteryDeduction.multipliers[intent] || 1.0;
        
        const personaConfig = AppConfig.personas[personaKey] || AppConfig.personas[AppConfig.defaultPersona];
        const drainRate = personaConfig.drainRate || 1.0;
        
        // Social Momentum: Rapid fire conversation drains 1.5x more
        const momentumFactor = timeSinceLast < 5 ? 1.5 : 1.0;
        
        const totalDeduction = Math.min(20, Math.max(1, baseDeduction * multiplier * drainRate * sensitivity * momentumFactor));
        
        setBattery(prev => {
            const newVal = Math.max(0, prev - totalDeduction);
            batteryRef.current = newVal;
            return newVal;
        });
        
        return batteryRef.current;
    }, [isPaused, sensitivity]);

    const reset = useCallback(() => setBattery(100), []);
    const togglePause = useCallback(() => setIsPaused(p => !p), []);
    const recharge = useCallback((amount) => setBattery(prev => Math.min(100, prev + amount)), []);

    return { 
        battery, deduct, reset, batteryRef, 
        sensitivity, setSensitivity, 
        isPaused, togglePause,
        recharge
    };
};
