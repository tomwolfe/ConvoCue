import { describe, it, expect } from 'vitest';
import { validateOrchestratorConfig } from '../utils/orchestratorValidator';

describe('Orchestrator Health Check', () => {
  it('should have no high-severity keyword overlaps between personas', () => {
    const conflicts = validateOrchestratorConfig();
    const highSeverity = conflicts.filter(c => c.severity === 'high' && c.type === 'keyword_overlap');
    
    if (highSeverity.length > 0) {
      console.warn('High severity conflicts found:', JSON.stringify(highSeverity, null, 2));
    }
    
    // We expect some overlap might exist, but ideally zero for distinct personas
    expect(highSeverity.length).toBe(0);
  });
});
