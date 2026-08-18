import { jest } from '@jest/globals';
import {
  detectIntent,
  shouldGenerateSuggestion,
  detectTurnTake,
  detectSpeakerHint,
  processTextIntent,
  getSuggestionCache,
  getIntentHistory,
  getLastSuggestionTime,
} from './useIntentDetection';

describe('detectIntent', () => {
  it('detects social intent', () => {
    expect(detectIntent('Hello, how are you doing today?')).toBe('social');
    expect(detectIntent('Nice weather we are having!')).toBe('social');
  });

  it('detects professional intent', () => {
    expect(detectIntent('What is the status of the project deadline?')).toBe('professional');
    expect(detectIntent('We need to sync on the quarterly goals.')).toBe('professional');
  });

  it('detects conflict intent', () => {
    expect(detectIntent('I totally disagree with that approach, it is wrong.')).toBe('conflict');
    expect(detectIntent('This is unacceptable and a huge mistake.')).toBe('conflict');
  });

  it('detects empathy intent', () => {
    expect(detectIntent('I understand how difficult this must be for you.')).toBe('empathy');
    expect(detectIntent('I am so sorry to hear about that, I am here to listen.')).toBe('empathy');
  });

  it('detects positive intent', () => {
    expect(detectIntent('That is wonderful news, I am so happy for you!')).toBe('positive');
    expect(detectIntent('Great job on the success!')).toBe('positive');
  });

  it('returns general for short or empty text', () => {
    expect(detectIntent('Hi')).toBe('general');
    expect(detectIntent('')).toBe('general');
    expect(detectIntent(null)).toBe('general');
  });

  it('handles negation correctly', () => {
    const result = detectIntent("I don't disagree with you.");
    expect(result).not.toBe('conflict');
  });
});

describe('shouldGenerateSuggestion', () => {
  it('returns true for questions', () => {
    expect(shouldGenerateSuggestion('What time is it?')).toBe(true);
    expect(shouldGenerateSuggestion('Do you agree?')).toBe(true);
  });

  it('returns false for backchannels', () => {
    expect(shouldGenerateSuggestion('Yeah')).toBe(false);
    expect(shouldGenerateSuggestion('Okay.')).toBe(false);
    expect(shouldGenerateSuggestion('No')).toBe(false);
    expect(shouldGenerateSuggestion('Mhmm')).toBe(false);
  });

  it('returns false for empty or null', () => {
    expect(shouldGenerateSuggestion('')).toBe(false);
    expect(shouldGenerateSuggestion(null)).toBe(false);
  });

  it('returns true for meaningful statements', () => {
    expect(shouldGenerateSuggestion('I think we should go to the park.')).toBe(true);
  });
});

describe('detectTurnTake', () => {
  it('detects questions', () => {
    expect(detectTurnTake('What do you think?')).toBe(true);
    expect(detectTurnTake('Right?')).toBe(true);
  });

  it('detects turn-taking phrases', () => {
    expect(detectTurnTake('Your turn.')).toBe(true);
    expect(detectTurnTake('Tell me more.')).toBe(true);
    expect(detectTurnTake('How about you?')).toBe(true);
  });

  it('returns false for statements without turn cues', () => {
    expect(detectTurnTake('The weather is nice.')).toBe(false);
  });

  it('returns false for short or empty text', () => {
    expect(detectTurnTake('')).toBe(false);
    expect(detectTurnTake('Hi')).toBe(false);
    expect(detectTurnTake(null)).toBe(false);
  });
});

describe('detectSpeakerHint', () => {
  it('identifies me for first-person statements', () => {
    expect(detectSpeakerHint('I think so', null)).toBe('me');
    expect(detectSpeakerHint("I'm feeling good", null)).toBe('me');
    expect(detectSpeakerHint('My opinion is', null)).toBe('me');
  });

  it('identifies them for second-person questions', () => {
    expect(detectSpeakerHint('What do you think?', null)).toBe('them');
    expect(detectSpeakerHint('How about you?', null)).toBe('them');
    expect(detectSpeakerHint('Can you help?', null)).toBe('them');
  });

  it('returns null for ambiguous text', () => {
    expect(detectSpeakerHint('The meeting is at 3', null)).toBeNull();
  });

  it('returns null for short or empty text', () => {
    expect(detectSpeakerHint('', null)).toBeNull();
    expect(detectSpeakerHint('Hi', null)).toBeNull();
    expect(detectSpeakerHint(null, null)).toBeNull();
  });

  it('handles short response speaker switching', () => {
    expect(detectSpeakerHint('Yeah.', 'them')).toBe('me');
    expect(detectSpeakerHint('Yeah.', 'me')).toBeNull();
  });
});

describe('processTextIntent', () => {
  it('returns fast lookup result for known phrases', () => {
    const result = processTextIntent('hello');
    expect(result.intent).toBe('social');
    expect(result.suggestion).toBeTruthy();
    expect(result.fromCache).toBe(true);
  });

  it('detects intent for unknown phrases', () => {
    const result = processTextIntent('This is a completely unknown sentence about random things.');
    expect(result).toHaveProperty('intent');
    expect(result).toHaveProperty('suggestion');
    expect(result).toHaveProperty('fromCache');
  });
});

describe('getSuggestionCache, getIntentHistory, getLastSuggestionTime', () => {
  it('getSuggestionCache returns a ref with a Map', () => {
    const ref = getSuggestionCache();
    expect(ref).toHaveProperty('current');
    expect(ref.current).toBeInstanceOf(Map);
  });

  it('getIntentHistory returns a ref with an array', () => {
    const ref = getIntentHistory();
    expect(ref).toHaveProperty('current');
    expect(Array.isArray(ref.current)).toBe(true);
  });

  it('getLastSuggestionTime returns a ref with a number', () => {
    const ref = getLastSuggestionTime();
    expect(ref).toHaveProperty('current');
    expect(typeof ref.current).toBe('number');
  });
});
