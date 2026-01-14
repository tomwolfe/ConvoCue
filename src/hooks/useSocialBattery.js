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

            // Different recovery rates based on how long user has been idle
            let recoveryRate = 0;
            if (idleTime > 45) {
                recoveryRate = 1.0; // Faster recovery after longer breaks
            } else if (idleTime > 20) {
                recoveryRate = 0.5; // Moderate recovery
            } else if (idleTime > 10) {
                recoveryRate = 0.2; // Slower recovery for shorter breaks
            }

            if (recoveryRate > 0) {
                setBattery(prev => {
                    const newVal = Math.min(100, prev + recoveryRate);
                    if (newVal > prev) {
                        setLastDrain({
                            amount: `+${recoveryRate.toFixed(1)}`,
                            reason: 'recovery'
                        });
                        setTimeout(() => setLastDrain(null), 3000);
                    }
                    return newVal;
                });
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

        // More nuanced word count calculation based on conversation length and intensity
        let adjustedWordCount;
        if (wordCount <= 3) {
            // Short phrases drain less
            adjustedWordCount = Math.sqrt(wordCount) * 1.5;
        } else if (wordCount <= 10) {
            // Medium length drains normally
            adjustedWordCount = Math.sqrt(wordCount) * 2;
        } else {
            // Longer responses drain more but with diminishing returns
            adjustedWordCount = Math.sqrt(wordCount) * 2.5;
        }

        const baseDeduction = adjustedWordCount * AppConfig.batteryDeduction.baseRate;

        // More nuanced intent multipliers for realistic drain
        const intentMultipliers = {
            ...AppConfig.batteryDeduction.multipliers,
            // Adjusted values for more realistic social battery drain
            social: 0.6,      // Less drain for social conversation
            professional: 1.0, // Normal drain for professional
            conflict: 2.5,     // Higher drain for conflict
            empathy: 0.8,      // Moderate drain for empathy
            positive: 0.3,     // Very low drain for positive
            general: 0.8       // Lower than before for general
        };

        const multiplier = intentMultipliers[intent] || 1.0;

        const personaConfig = AppConfig.personas[personaKey] || AppConfig.personas[AppConfig.defaultPersona];
        const drainRate = personaConfig.drainRate || 1.0;

        // Social Momentum: Rapid fire conversation drains more, but pauses help recover
        let momentumFactor = 1.0;
        if (timeSinceLast < 3) {
            momentumFactor = 1.8; // Very rapid conversation
        } else if (timeSinceLast < 5) {
            momentumFactor = 1.5; // Rapid conversation
        } else if (timeSinceLast > 15) {
            momentumFactor = 0.8; // Longer pause helps
        }

        // If intent is positive, we allow for a small recharge or reduced drain
        const isPositive = intent === 'positive';
        let totalDeduction = baseDeduction * multiplier * drainRate * sensitivity * momentumFactor;

        if (isPositive) {
            totalDeduction = -0.3; // Small recharge for positive sentiment
        } else {
            // Cap deductions to make them feel more realistic
            totalDeduction = Math.min(15, Math.max(0.3, totalDeduction));
        }

        // Add a minimum threshold to prevent tiny deductions that confuse users
        if (Math.abs(totalDeduction) < 0.2 && !isPositive) {
            totalDeduction = 0.2;
        }

        // Create more descriptive drain reasons for better user understanding
        let detailedReason = '';
        let severity = 'low'; // low, medium, high, surge
        
        if (intent !== 'general') {
            switch (intent) {
                case 'conflict':
                    detailedReason = 'Conflict detected';
                    severity = totalDeduction > 5 ? 'surge' : 'high';
                    break;
                case 'professional':
                    detailedReason = 'Work discussion';
                    severity = totalDeduction > 3 ? 'high' : 'medium';
                    break;
                case 'empathy':
                    detailedReason = 'Emotional topic';
                    severity = 'medium';
                    break;
                case 'social':
                    detailedReason = 'Casual conversation';
                    severity = 'low';
                    break;
                case 'positive':
                    detailedReason = 'Positive interaction';
                    severity = 'recovery';
                    break;
                default:
                    detailedReason = intent;
            }
        }

        setLastDrain({
            amount: isPositive ? `+${Math.abs(totalDeduction).toFixed(1)}` : `-${totalDeduction.toFixed(1)}`,
            reason: detailedReason,
            intent: intent,
            severity: severity,
            wordCount: Math.round(adjustedWordCount),
            multiplier: multiplier.toFixed(1)
        });

        if (drainTimeoutRef.current) clearTimeout(drainTimeoutRef.current);
        drainTimeoutRef.current = setTimeout(() => setLastDrain(null), 3000);

        setBattery(prev => {
            const newVal = Math.max(0, Math.min(100, prev - totalDeduction));
            batteryRef.current = newVal;
            return newVal;
        });

        return batteryRef.current;
    }, [isPaused, sensitivity]); // Removed transcript.length as it's not available in this hook

    const reset = useCallback(() => setBattery(100), []);
    const togglePause = useCallback(() => setIsPaused(p => !p), []);
    const recharge = useCallback((amount) => setBattery(prev => Math.min(100, prev + amount)), []);

    const isExhausted = battery < AppConfig.minBatteryThreshold;

    const setBatteryValue = useCallback((value) => {
        setBattery(value);
        batteryRef.current = value;
    }, []);

    return {
        battery, deduct, reset, batteryRef,
        sensitivity, setSensitivity,
        isPaused, togglePause,
        recharge, isExhausted, lastDrain,
        setBattery: setBatteryValue
    };
};
