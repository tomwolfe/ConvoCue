import { describe, it, expect } from 'vitest';
import { detectIntent, shouldGenerateSuggestion, detectTurnTake, getPrecomputedSuggestion } from './intentEngine';

describe('Intent Engine', () => {
    describe('detectIntent', () => {
        it('should detect social intent', () => {
            expect(detectIntent('Hello, how are you doing today?')).toBe('social');
            expect(detectIntent('Nice weather we are having!')).toBe('social');
        });

        it('should detect professional intent', () => {
            expect(detectIntent('What is the status of the project deadline?')).toBe('professional');
            expect(detectIntent('We need to sync on the quarterly goals.')).toBe('professional');
        });

        it('should detect conflict intent', () => {
            expect(detectIntent('I totally disagree with that approach, it is wrong.')).toBe('conflict');
            expect(detectIntent('This is unacceptable and a huge mistake.')).toBe('conflict');
        });

        it('should detect empathy intent', () => {
            expect(detectIntent('I understand how difficult this must be for you.')).toBe('empathy');
            expect(detectIntent('I am so sorry to hear about that, I am here to listen.')).toBe('empathy');
        });

        it('should detect positive intent', () => {
            expect(detectIntent('That is wonderful news, I am so happy for you!')).toBe('positive');
            expect(detectIntent('Great job on the success!')).toBe('positive');
        });

        it('should return general for unknown or short text', () => {
            expect(detectIntent('Hi')).toBe('general');
            expect(detectIntent('')).toBe('general');
        });

        it('should handle negation correctly', () => {
            // "don't disagree" should NOT be conflict
            const result = detectIntent("I don't disagree with you.");
            expect(result).not.toBe('conflict');
        });
    });

    describe('shouldGenerateSuggestion', () => {
        it('should generate for questions', () => {
            expect(shouldGenerateSuggestion('What time is it?')).toBe(true);
        });

        it('should not generate for short backchannels', () => {
            expect(shouldGenerateSuggestion('Yeah')).toBe(false);
            expect(shouldGenerateSuggestion('Okay.')).toBe(false);
        });

        it('should generate for meaningful statements', () => {
            expect(shouldGenerateSuggestion('I think we should go to the park.')).toBe(true);
        });
    });

    describe('detectTurnTake', () => {
        it('should detect questions as turn-takes', () => {
            expect(detectTurnTake('What do you think?')).toBe(true);
            expect(detectTurnTake('Right?')).toBe(true);
        });

        it('should detect invitation phrases', () => {
            expect(detectTurnTake('Your turn.')).toBe(true);
            expect(detectTurnTake('Tell me more.')).toBe(true);
        });
    });

    describe('getPrecomputedSuggestion', () => {
        it('should return precomputed suggestion for common patterns', () => {
            const result = getPrecomputedSuggestion('How are you?');
            expect(result).not.toBeNull();
            expect(result.intent).toBe('social');
        });
    });
});
