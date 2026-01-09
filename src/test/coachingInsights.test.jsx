import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DisplayArea from '../components/VAD/DisplayArea';

describe('CoachingInsights functionality', () => {
  const mockCoachingInsights = {
    anxiety: {
      anxietySpecificInsights: [
        { category: 'anxiety_level', insight: 'Insight 1: You seem anxious.', priority: 'high' },
        { category: 'coping', insight: 'Insight 2: Try to breathe.', priority: 'medium' }
      ],
      copingStrategies: [
        { technique: '4-7-8 breathing' }
      ]
    },
    relationship: {
      relationshipInsights: [
        { category: 'empathy', insight: 'Insight 1: Show empathy.', priority: 'high' }
      ]
    }
  };

  it('renders the first insight by default', () => {
    render(
      <DisplayArea 
        persona="anxiety" 
        coachingInsights={mockCoachingInsights} 
      />
    );
    
    expect(screen.getByText('Insight 1: You seem anxious.')).toBeInTheDocument();
    expect(screen.getByText('Anxiety Support')).toBeInTheDocument();
  });

  it('allows navigating between insights', () => {
    render(
      <DisplayArea 
        persona="anxiety" 
        coachingInsights={mockCoachingInsights} 
      />
    );
    
    const nextBtn = screen.getByLabelText('Next insight');
    fireEvent.click(nextBtn);
    
    expect(screen.getByText('Insight 2: Try to breathe.')).toBeInTheDocument();
    
    const prevBtn = screen.getByLabelText('Previous insight');
    fireEvent.click(prevBtn);
    
    expect(screen.getByText('Insight 1: You seem anxious.')).toBeInTheDocument();
  });

  it('allows dismissing an insight', () => {
    render(
      <DisplayArea 
        persona="anxiety" 
        coachingInsights={mockCoachingInsights} 
      />
    );
    
    expect(screen.getByText('Insight 1: You seem anxious.')).toBeInTheDocument();
    
    const dismissBtn = screen.getByLabelText('Dismiss insight');
    fireEvent.click(dismissBtn);
    
    // Should now show the second insight
    expect(screen.getByText('Insight 2: Try to breathe.')).toBeInTheDocument();
    expect(screen.queryByText('Insight 1: You seem anxious.')).not.toBeInTheDocument();
  });

  it('toggles logic info when info button is clicked', () => {
    render(
      <DisplayArea 
        persona="anxiety" 
        coachingInsights={mockCoachingInsights} 
      />
    );
    
    const infoBtn = screen.getByTitle('Why am I seeing this?');
    fireEvent.click(infoBtn);
    
    expect(screen.getByText(/Logic: Based on anxiety_level pattern/)).toBeInTheDocument();
    
    fireEvent.click(infoBtn);
    expect(screen.getByText('Insight 1: You seem anxious.')).toBeInTheDocument();
  });

  it('shows coping tip for anxiety persona', () => {
    render(
      <DisplayArea 
        persona="anxiety" 
        coachingInsights={mockCoachingInsights} 
      />
    );
    
    expect(screen.getByText('Tip: 4-7-8 breathing')).toBeInTheDocument();
  });
});
