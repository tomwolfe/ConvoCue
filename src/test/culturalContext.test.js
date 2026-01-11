import { describe, it, expect } from 'vitest';
import {
  getCommunicationStyleForCulture,
  validateCulturalAppropriateness
} from '../utils/culturalIntelligence';

describe('Cultural Context Utilities', () => {
  it('should get appropriate communication style for culture', () => {
    const japanStyle = getCommunicationStyleForCulture('japan');
    expect(japanStyle.context).toBe('high-context');
    expect(japanStyle.directness).toBe('very-indirect');

    const usaStyle = getCommunicationStyleForCulture('usa');
    expect(usaStyle.context).toBe('low-context');
    expect(usaStyle.directness).toBe('direct');

    const chinaStyle = getCommunicationStyleForCulture('china');
    expect(chinaStyle.context).toBe('high-context');
    expect(chinaStyle.directness).toBe('indirect');
  });

  it('should validate cultural appropriateness correctly', () => {
    const eastAsianStyle = getCommunicationStyleForCulture('east-asian');
    const result = validateCulturalAppropriateness('You must do this now', { communicationStyle: eastAsianStyle });
    expect(result.isValid).toBe(false);
    expect(result.issues).toContain('Direct imperative language detected');
  });
});