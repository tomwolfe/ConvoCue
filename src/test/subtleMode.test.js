import { describe, it, expect } from 'vitest';
import { enhanceResponse } from '../utils/responseEnhancement';

describe('Subtle Mode (Quick Cues)', () => {
  const mockHistory = [
    { role: 'user', content: 'How are you?' },
    { role: 'assistant', content: 'I am doing well, thank you.' }
  ];

  it('generates a quick cue in subtle mode', async () => {
    const response = 'You should try to be more mindful of your breathing when you feel anxious.';
    const input = 'I am feeling a bit nervous about the meeting.';
    
    const result = await enhanceResponse(response, 'anxiety', null, input, mockHistory, { isSubtleMode: true });
    
    // Result should be a single word or very short phrase from the curated list
    expect(result.split(' ').length).toBeLessThanOrEqual(5);
    // Based on input 'nervous', it should probably pick an 'emotion' or 'uncertainty' cue
    const expectedCues = ['Calm', 'Breathe', 'Relax', 'Focus', 'Center', 'Ground', 'Quiet', 'Hmm', 'Unsure', 'Thoughtful', 'Reflect', 'Consider', 'Ponder', 'Wonder'];
    expect(expectedCues).toContain(result);
  });

  it('detects conflict and provides a de-escalation cue', async () => {
    const response = 'I disagree with your point and I think you are wrong.';
    const input = 'No, you are completely wrong and I disagree.';
    
    const result = await enhanceResponse(response, 'professional', null, input, mockHistory, { isSubtleMode: true });
    
    const conflictCues = ['De-escalate', 'Validate first', 'Soft tone', 'Find common ground', 'Listen more', 'Neutral stance', 'Breathe'];
    expect(conflictCues).toContain(result);
  });

  it('detects strategic situations', async () => {
    const response = 'You should negotiate for a higher salary.';
    const input = 'I have an important interview with my boss tomorrow.';
    
    const result = await enhanceResponse(response, 'professional', null, input, mockHistory, { isSubtleMode: true });
    
    const strategicCues = ['Lean in', 'Hold eye contact', 'Lower volume', 'Slow down', 'Wait for silence', 'Mirror', 'Pause for effect'];
    expect(strategicCues).toContain(result);
  });

  it('detects questions and suggests asking/clarifying', async () => {
    const response = 'I can explain that to you if you want.';
    const input = 'What do you mean by that?';
    
    const result = await enhanceResponse(response, 'professional', null, input, mockHistory, { isSubtleMode: true });
    
    const questionCues = ['Ask', 'Clarify', 'Follow up', 'Probe', 'Inquire', 'Investigate', 'Query'];
    expect(questionCues).toContain(result);
  });
});
