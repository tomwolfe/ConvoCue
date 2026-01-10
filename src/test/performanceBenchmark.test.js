import { describe, it, expect } from 'vitest';
import { validateSocialSuggestion } from '../utils/socialEthics';

describe('Social Ethics Performance Benchmark', () => {
  it('should handle large strings efficiently', () => {
    const largeSafeString = 'This is a very long but safe string. '.repeat(1000); // ~37,000 characters
    const start = Date.now();
    validateSocialSuggestion(largeSafeString);
    const end = Date.now();
    const duration = end - start;
    
    console.log(`[Benchmark] validateSocialSuggestion took ${duration}ms for ${largeSafeString.length} chars`);
    
    // Expect it to be under 50ms for 37k characters (Date.now has lower resolution)
    expect(duration).toBeLessThan(50);
  });

  it('should handle large strings with harmful patterns efficiently', () => {
    const largeHarmfulString = 'This is a safe string. '.repeat(500) + 'You should manipulate them. ' + 'Safe string. '.repeat(500);
    const start = Date.now();
    validateSocialSuggestion(largeHarmfulString);
    const end = Date.now();
    const duration = end - start;
    
    console.log(`[Benchmark] validateSocialSuggestion (harmful) took ${duration}ms for ${largeHarmfulString.length} chars`);
    
    expect(duration).toBeLessThan(50);
  });
});
