import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DisplayArea from '../components/VAD/DisplayArea';

// Mock secure storage
vi.mock('../utils/encryption', () => ({
  secureLocalStorageGet: vi.fn((key, defaultValue) => Promise.resolve(defaultValue)),
  secureLocalStorageSet: vi.fn(() => Promise.resolve())
}));

describe('CoachingInsights functionality', () => {
  const mockCoachingInsights = {
    anxiety: {
      insights: [
        { category: 'anxiety_level', insight: 'Insight 1: You seem anxious.', priority: 'high' },
        { category: 'coping', insight: 'Insight 2: Try to breathe.', priority: 'medium' }
      ],
      copingStrategies: [
        { technique: '4-7-8 breathing' }
      ]
    },
    relationship: {
      insights: [
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
    expect(screen.getByText(/Not a substitute for professional advice/)).toBeInTheDocument();
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

  it('shows "All Caught Up" message when all insights are dismissed', async () => {
    const singleInsight = {
      anxiety: {
        insights: [{ category: 'anxiety', insight: 'Single insight', priority: 'high' }]
      }
    };

    render(
      <DisplayArea 
        persona="anxiety" 
        coachingInsights={singleInsight} 
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Single insight')).toBeInTheDocument();
    });
    
    const dismissBtn = screen.getByLabelText('Dismiss insight');
    await act(async () => {
      fireEvent.click(dismissBtn);
    });
    
    // Should now show the "All Caught Up" message instead of nothing
    expect(screen.getByText('All Caught Up')).toBeInTheDocument();
    expect(screen.getByText(/You've dismissed all current coaching insights/)).toBeInTheDocument();
    expect(screen.getByText(/Not a substitute for professional advice/)).toBeInTheDocument();
    expect(screen.queryByText('Single insight')).not.toBeInTheDocument();

    // Test dismissal of the "All Caught Up" card
    const hideBtn = screen.getByLabelText('Hide message');
    await act(async () => {
      fireEvent.click(hideBtn);
    });
    expect(screen.queryByText('All Caught Up')).not.toBeInTheDocument();
  });

  it('hides advanced controls in subtle insights mode', async () => {
    render(
      <DisplayArea 
        persona="anxiety" 
        coachingInsights={mockCoachingInsights} 
        settings={{ showSubtleCoaching: true }}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Insight 1: You seem anxious.')).toBeInTheDocument();
    });

    // Advanced controls should be hidden
    expect(screen.queryByTitle('Why am I seeing this?')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Helpful')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Not helpful')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Next insight')).not.toBeInTheDocument();
    
    // Core content should still be there
    expect(screen.getByText(/Tip: 4-7-8 breathing/)).toBeInTheDocument();
    expect(screen.getByLabelText('Dismiss insight')).toBeInTheDocument();
  });

  it('allows providing feedback in subtle mode via the adjust trigger', async () => {
    render(
      <DisplayArea 
        persona="anxiety" 
        coachingInsights={mockCoachingInsights} 
        settings={{ showSubtleCoaching: true, enablePersonalization: true }}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Insight 1: You seem anxious.')).toBeInTheDocument();
    });

    // Find and click the subtle trigger
    const adjustBtn = screen.getByLabelText('Adjust Coaching');
    await act(async () => {
      fireEvent.click(adjustBtn);
    });

    // Now feedback buttons should be visible
    const helpfulBtn = screen.getByTitle('Helpful');
    expect(helpfulBtn).toBeInTheDocument();
    
    // Click helpful
    await act(async () => {
      fireEvent.click(helpfulBtn);
    });

    // Adjust button should be back (or buttons gone)
    expect(screen.queryByTitle('Helpful')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Adjust Coaching')).toBeInTheDocument();
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
        insights: [
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

  it('hides insights when showCoachingInsights setting is false', async () => {
    render(
      <DisplayArea 
        persona="anxiety" 
        coachingInsights={mockCoachingInsights} 
        settings={{ showCoachingInsights: false }}
      />
    );
    
    // Should not show insight even if data is present
    // Wait for settling to avoid act warnings
    await waitFor(() => {
      expect(screen.queryByText('Anxiety Support')).not.toBeInTheDocument();
    });
    expect(screen.queryByText('Insight 1: You seem anxious.')).not.toBeInTheDocument();
  });

  it('shows skeleton while loading storage', async () => {
    // Mock a delayed response for storage
    const { secureLocalStorageGet } = await import('../utils/encryption');
    vi.mocked(secureLocalStorageGet).mockReturnValueOnce(
      new Promise(resolve => setTimeout(() => resolve([]), 50))
    );

    render(
      <DisplayArea 
        persona="anxiety" 
        coachingInsights={mockCoachingInsights} 
      />
    );
    
    // Skeleton should be visible initially
    expect(document.querySelector('.insight-skeleton')).toBeInTheDocument();
    
    // Wait for it to disappear and show content
    await waitFor(() => {
      expect(screen.getByText('Insight 1: You seem anxious.')).toBeInTheDocument();
    });
    expect(document.querySelector('.insight-skeleton')).not.toBeInTheDocument();
  });
});