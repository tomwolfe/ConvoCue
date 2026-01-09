import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DisplayArea from '../components/VAD/DisplayArea';

// Mock secure storage
vi.mock('../utils/encryption', () => ({
  secureLocalStorageGet: vi.fn(() => Promise.resolve([])),
  secureLocalStorageSet: vi.fn(() => Promise.resolve())
}));

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

  it('renders the first insight by default after loading storage', async () => {
    render(
      <DisplayArea 
        persona="anxiety" 
        coachingInsights={mockCoachingInsights} 
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Insight 1: You seem anxious.')).toBeInTheDocument();
    });
    expect(screen.getByText('Anxiety Support')).toBeInTheDocument();
  });

  it('allows navigating between insights', async () => {
    render(
      <DisplayArea 
        persona="anxiety" 
        coachingInsights={mockCoachingInsights} 
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Insight 1: You seem anxious.')).toBeInTheDocument();
    });

    const nextBtn = screen.getByLabelText('Next insight');
    await act(async () => {
      fireEvent.click(nextBtn);
    });
    
    expect(screen.getByText('Insight 2: Try to breathe.')).toBeInTheDocument();
    
    const prevBtn = screen.getByLabelText('Previous insight');
    await act(async () => {
      fireEvent.click(prevBtn);
    });
    
    expect(screen.getByText('Insight 1: You seem anxious.')).toBeInTheDocument();
  });

  it('allows dismissing an insight', async () => {
    render(
      <DisplayArea 
        persona="anxiety" 
        coachingInsights={mockCoachingInsights} 
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Insight 1: You seem anxious.')).toBeInTheDocument();
    });
    
    const dismissBtn = screen.getByLabelText('Dismiss insight');
    await act(async () => {
      fireEvent.click(dismissBtn);
    });
    
    // Should now show the second insight
    expect(screen.getByText('Insight 2: Try to breathe.')).toBeInTheDocument();
    expect(screen.queryByText('Insight 1: You seem anxious.')).not.toBeInTheDocument();
  });

  it('toggles logic info when info button is clicked', async () => {
    render(
      <DisplayArea 
        persona="anxiety" 
        coachingInsights={mockCoachingInsights} 
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Insight 1: You seem anxious.')).toBeInTheDocument();
    });

    const infoBtn = screen.getByTitle('Why am I seeing this?');
    await act(async () => {
      fireEvent.click(infoBtn);
    });
    
    expect(screen.getByText(/Logic: Based on anxiety_level pattern/)).toBeInTheDocument();
    
    await act(async () => {
      fireEvent.click(infoBtn);
    });
    expect(screen.getByText('Insight 1: You seem anxious.')).toBeInTheDocument();
  });

  it('allows cycling through multiple coping tips', async () => {
    const multiCopingInsights = {
      anxiety: {
        anxietySpecificInsights: [
          { category: 'anxiety', insight: 'You seem stressed.', priority: 'high' }
        ],
        copingStrategies: [
          { technique: 'Deep Breathing' },
          { technique: 'Grounding Exercise' }
        ]
      }
    };

    render(
      <DisplayArea 
        persona="anxiety" 
        coachingInsights={multiCopingInsights} 
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Tip: Deep Breathing')).toBeInTheDocument();
    });

    const nextTipBtn = screen.getByLabelText('Next tip');
    await act(async () => {
      fireEvent.click(nextTipBtn);
    });
    
    expect(screen.getByText('Tip: Grounding Exercise')).toBeInTheDocument();
    
    await act(async () => {
      fireEvent.click(nextTipBtn);
    });
    expect(screen.getByText('Tip: Deep Breathing')).toBeInTheDocument();
  });

  it('renders professional insights correctly', async () => {
    const profInsights = {
      professional: {
        insights: [
          { category: 'Negotiation', insight: 'Price talk detected.', priority: 'high' }
        ]
      }
    };

    render(
      <DisplayArea 
        persona="professional" 
        coachingInsights={profInsights} 
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Price talk detected.')).toBeInTheDocument();
      expect(screen.getByText('Professional Insight')).toBeInTheDocument();
    });
  });
});