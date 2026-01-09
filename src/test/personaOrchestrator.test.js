import { describe, it, expect, vi } from 'vitest';
import { orchestratePersona } from '../utils/personaOrchestrator';
import { AppConfig } from '../config';

describe('personaOrchestrator', () => {
  it('should suggest professional persona when discussing business keywords', () => {
    const input = "I need to discuss the new contract with my manager";
    const { suggestedPersona, confidence } = orchestratePersona(input, [], 'anxiety');
    expect(suggestedPersona).toBe('professional');
    expect(confidence).toBeGreaterThan(0.5);
  });

  it('should suggest anxiety persona when emotional keywords are present', () => {
    const input = "I am feeling very nervous about the presentation";
    const { suggestedPersona, confidence } = orchestratePersona(input, [], 'professional');
    expect(suggestedPersona).toBe('anxiety');
    expect(confidence).toBeGreaterThan(0.5);
  });

  it('should apply bias to the current persona', () => {
    // Input is neutral-ish but current is relationship
    const input = "What do you think?"; 
    const { suggestedPersona } = orchestratePersona(input, [], 'relationship');
    expect(suggestedPersona).toBe('relationship');
  });

  it('should implement negative reinforcement', () => {
    // Discussing contract (professional) but also mention "lesson" (languagelearning negative)
    // Professional has 'contract', languagelearning has 'lesson' as negative? 
    // Wait, let's check config.
    
    // In our config:
    // languagelearning negative: ['contract', 'deal', 'negotiate', 'strategy']
    const input = "Let's discuss the contract strategy";
    
    // Current is languagelearning
    const { suggestedPersona } = orchestratePersona(input, [], 'languagelearning');
    
    // It should definitely switch away from languagelearning
    expect(suggestedPersona).not.toBe('languagelearning');
    expect(suggestedPersona).toBe('professional');
  });

  it('should respect rejection dampening', () => {
    const input = "I need to discuss the contract";
    
    // Without dampening, it should switch to professional (score for contract is high)
    const result1 = orchestratePersona(input, [], 'anxiety');
    expect(result1.suggestedPersona).toBe('professional');

    // With heavy dampening on professional
    const result2 = orchestratePersona(input, [], 'anxiety', { rejectionDampening: 2.0 });
    expect(result2.suggestedPersona).toBe('anxiety'); // Should stay as is due to high threshold
  });
});
