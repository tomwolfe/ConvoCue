import { describe, it, expect } from 'vitest';
import { analyzeProfessionalCoaching, analyzeMeetingCoaching } from './professionalCoaching';

describe('analyzeProfessionalCoaching', () => {
  it('detects negotiation keywords and returns appropriate insights', () => {
    const text = "We need to discuss the budget and the final price of the project.";
    const result = analyzeProfessionalCoaching(text);
    
    expect(result).not.toBeNull();
    const categories = result.insights.map(i => i.category);
    expect(categories).toContain('Negotiation');
    
    const negotiationInsight = result.insights.find(i => i.category === 'Negotiation');
    expect(negotiationInsight.insight).toContain('value focus');
  });

  it('detects leadership and decision making keywords', () => {
    const text = "We should decide on a plan and choose one of these options.";
    const result = analyzeProfessionalCoaching(text);
    
    expect(result).not.toBeNull();
    const categories = result.insights.map(i => i.category);
    expect(categories).toContain('Leadership');
    
    const leadershipInsight = result.insights.find(i => i.category === 'Leadership');
    expect(leadershipInsight.insight).toContain('collaborative decision-making');
  });

  it('detects clarity and alignment keywords', () => {
    const text = "I want to make sure I understand the objective and our goal.";
    const result = analyzeProfessionalCoaching(text);
    
    expect(result).not.toBeNull();
    const categories = result.insights.map(i => i.category);
    expect(categories).toContain('Alignment');
  });

  it('detects action oriented keywords', () => {
    const text = "What are the next steps and follow up actions?";
    const result = analyzeProfessionalCoaching(text);
    
    expect(result).not.toBeNull();
    const categories = result.insights.map(i => i.category);
    expect(categories).toContain('Action');
  });

  it('returns multiple insights if multiple categories are triggered', () => {
    const text = "Let's decide on the budget and then discuss the next steps.";
    const result = analyzeProfessionalCoaching(text);
    
    expect(result).not.toBeNull();
    expect(result.insights.length).toBeGreaterThan(1);
    const categories = result.insights.map(i => i.category);
    expect(categories).toContain('Negotiation');
    expect(categories).toContain('Leadership');
    expect(categories).toContain('Action');
  });

  it('incorporates emotional context into insights', () => {
    const text = "The price is too high and I am very angry about this budget.";
    const emotionData = { emotion: 'anger', confidence: 0.8 };
    const result = analyzeProfessionalCoaching(text, [], emotionData);
    
    expect(result).not.toBeNull();
    const categories = result.insights.map(i => i.category);
    expect(categories).toContain('Negotiation');
    expect(categories).toContain('Professionalism');
    
    const negotiationInsight = result.insights.find(i => i.category === 'Negotiation');
    expect(negotiationInsight.insight).toContain('Tension detected');
    
    const profInsight = result.insights.find(i => i.category === 'Professionalism');
    expect(profInsight.insight).toContain('Strong emotions detected');
  });

  it('returns null if no keywords are found', () => {
    const text = "The weather is nice today.";
    const result = analyzeProfessionalCoaching(text);
    
    expect(result).toBeNull();
  });

  it('is case insensitive', () => {
    const text = "BUDGET and PLAN";
        const result = analyzeProfessionalCoaching(text);
        
        expect(result).not.toBeNull();
        const categories = result.insights.map(i => i.category);
        expect(categories).toContain('Negotiation');
        expect(categories).toContain('Execution');
      });
    
      it('adjusts priority based on category scores', () => {
        const text = "We should decide on a plan.";
        const categoryScores = { 'Leadership': 5 };
        const result = analyzeProfessionalCoaching(text, [], {}, categoryScores);
        
        expect(result).not.toBeNull();
        const leadershipInsight = result.insights.find(i => i.category === 'Leadership');
        expect(leadershipInsight.priority).toBe('high');
      });
    });
    
    describe('analyzeMeetingCoaching', () => {
      it('detects meeting dynamics and participation cues', () => {
        const text = "Does anyone have questions about the plan?";
        const result = analyzeMeetingCoaching(text);
        
        expect(result).not.toBeNull();
        const categories = result.insights.map(i => i.category);
        expect(categories).toContain('Participation');
      });
    
      it('provides turn-taking advice based on history', () => {
        const history = [
          { role: 'user', content: 'Turn 1' },
          { role: 'user', content: 'Turn 2' },
          { role: 'user', content: 'Turn 3' },
          { role: 'user', content: 'Turn 4' },
          { role: 'assistant', content: 'Bot response' },
          { role: 'user', content: 'Turn 5' }
        ];
        const text = "I am still talking.";
        const result = analyzeMeetingCoaching(text, history);
        
        expect(result).not.toBeNull();
        const categories = result.insights.map(i => i.category);
        expect(categories).toContain('Turn-taking');
      });
    
      it('detects agenda and action items', () => {
        const text = "Let's assign this task to Sarah and set a deadline.";
        const result = analyzeMeetingCoaching(text);
        
        expect(result).not.toBeNull();
        const categories = result.insights.map(i => i.category);
        expect(categories).toContain('Agenda');
      });
    
      it('incorporates meeting-specific emotional context', () => {
        const text = "I am very frustrated with this meeting.";
        const emotionData = { emotion: 'frustration', confidence: 0.8 };
        const result = analyzeMeetingCoaching(text, [], emotionData);
        
        expect(result).not.toBeNull();
        const categories = result.insights.map(i => i.category);
        expect(categories).toContain('Meeting Tone');
      });
    
      it('adjusts priority based on category scores', () => {
        const text = "Does anyone have questions?";
        const categoryScores = { 'Participation': 5 };
        const result = analyzeMeetingCoaching(text, [], {}, categoryScores);
        
        expect(result).not.toBeNull();
        const insight = result.insights.find(i => i.category === 'Participation');
        expect(insight.priority).toBe('medium'); // low -> medium
      });
    });
    