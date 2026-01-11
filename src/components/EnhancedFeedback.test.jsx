import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import EnhancedFeedback from './EnhancedFeedback';

// Mock the feedback utility
vi.mock('../utils/feedback', () => ({
  submitFeedback: vi.fn(() => Promise.resolve())
}));

// Mock the encryption utility
vi.mock('../utils/encryption', () => ({
  secureLocalStorageGet: vi.fn(() => Promise.resolve([])),
  secureLocalStorageSet: vi.fn(() => Promise.resolve())
}));

describe('EnhancedFeedback', () => {
  const defaultProps = {
    suggestion: 'This is a test suggestion',
    persona: 'anxiety',
    culturalContext: 'general',
    transcript: 'Test transcript',
    originalInput: 'Test input'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders inline feedback buttons', () => {
    render(<EnhancedFeedback {...defaultProps} />);
    
    expect(screen.getByTitle('This suggestion was helpful')).toBeInTheDocument();
    expect(screen.getByTitle('This suggestion was not helpful')).toBeInTheDocument();
    expect(screen.getByTitle('Provide detailed feedback')).toBeInTheDocument();
  });

  it('opens detailed feedback modal when detailed feedback button is clicked', async () => {
    render(<EnhancedFeedback {...defaultProps} />);
    
    // Click the detailed feedback button
    const detailedBtn = screen.getByTitle('Provide detailed feedback');
    fireEvent.click(detailedBtn);
    
    // Wait for modal to appear
    await waitFor(() => {
      expect(screen.getByText('How was this suggestion?')).toBeInTheDocument();
    });
    
    expect(screen.getByText('"This is a test suggestion"')).toBeInTheDocument();
  });

  it('allows rating selection', async () => {
    render(<EnhancedFeedback {...defaultProps} />);
    
    // Open modal first
    const detailedBtn = screen.getByTitle('Provide detailed feedback');
    fireEvent.click(detailedBtn);
    
    await waitFor(() => {
      expect(screen.getByText('How was this suggestion?')).toBeInTheDocument();
    });
    
    // Click on a star
    const stars = screen.getAllByLabelText(/Rate \d stars/);
    fireEvent.click(stars[2]); // Click the third star
    
    // Verify the star is selected
    expect(stars[2]).toHaveClass('active');
  });

  it('allows feedback type selection', async () => {
    render(<EnhancedFeedback {...defaultProps} />);

    // Open modal first
    const detailedBtn = screen.getByTitle('Provide detailed feedback');
    fireEvent.click(detailedBtn);

    await waitFor(() => {
      expect(screen.getByText('How was this suggestion?')).toBeInTheDocument();
    });

    // Click on a feedback type
    const veryHelpfulBtn = screen.getByText('Very Helpful');
    fireEvent.click(veryHelpfulBtn);

    // Verify the button is selected
    expect(veryHelpfulBtn).toHaveClass('selected');
  });

  it('allows detailed feedback text input', async () => {
    render(<EnhancedFeedback {...defaultProps} />);
    
    // Open modal first
    const detailedBtn = screen.getByTitle('Provide detailed feedback');
    fireEvent.click(detailedBtn);
    
    await waitFor(() => {
      expect(screen.getByText('How was this suggestion?')).toBeInTheDocument();
    });
    
    // Enter text in the textarea
    const textarea = screen.getByPlaceholderText('What could we improve? What did you like? Any specific aspects?');
    fireEvent.change(textarea, { target: { value: 'This is detailed feedback' } });
    
    expect(textarea.value).toBe('This is detailed feedback');
  });

  it('submits feedback when submit button is clicked', async () => {
    const { submitFeedback } = await import('../utils/feedback');
    render(<EnhancedFeedback {...defaultProps} />);
    
    // Open modal first
    const detailedBtn = screen.getByTitle('Provide detailed feedback');
    fireEvent.click(detailedBtn);
    
    await waitFor(() => {
      expect(screen.getByText('How was this suggestion?')).toBeInTheDocument();
    });
    
    // Select a rating
    const stars = screen.getAllByLabelText(/Rate \d stars/);
    fireEvent.click(stars[4]); // Click the fifth star
    
    // Select feedback type
    const veryHelpfulBtn = screen.getByText('Very Helpful');
    fireEvent.click(veryHelpfulBtn);
    
    // Enter detailed feedback
    const textarea = screen.getByPlaceholderText('What could we improve? What did you like? Any specific aspects?');
    fireEvent.change(textarea, { target: { value: 'This is detailed feedback' } });
    
    // Click submit
    const submitBtn = screen.getByText('Submit Feedback');
    fireEvent.click(submitBtn);
    
    await waitFor(() => {
      expect(submitFeedback).toHaveBeenCalledWith(
        'This is a test suggestion',
        'very_helpful',
        'anxiety',
        'general',
        'Test transcript',
        'Test input'
      );
    });
  });

  it('shows success message after feedback submission', async () => {
    render(<EnhancedFeedback {...defaultProps} />);
    
    // Open modal first
    const detailedBtn = screen.getByTitle('Provide detailed feedback');
    fireEvent.click(detailedBtn);
    
    await waitFor(() => {
      expect(screen.getByText('How was this suggestion?')).toBeInTheDocument();
    });
    
    // Select feedback type
    const veryHelpfulBtn = screen.getByText('Very Helpful');
    fireEvent.click(veryHelpfulBtn);
    
    // Click submit
    const submitBtn = screen.getByText('Submit Feedback');
    fireEvent.click(submitBtn);
    
    await waitFor(() => {
      expect(screen.getByText('Thank you for your feedback!')).toBeInTheDocument();
    });
  });

  it('handles simple like feedback', async () => {
    const { submitFeedback } = await import('../utils/feedback');
    render(<EnhancedFeedback {...defaultProps} />);
    
    // Click like button
    const likeBtn = screen.getByTitle('This suggestion was helpful');
    fireEvent.click(likeBtn);
    
    await waitFor(() => {
      expect(submitFeedback).toHaveBeenCalledWith(
        'This is a test suggestion',
        'like',
        'anxiety',
        'general',
        'Test transcript',
        'Test input'
      );
    });
  });

  it('handles simple dislike feedback', async () => {
    const { submitFeedback } = await import('../utils/feedback');
    render(<EnhancedFeedback {...defaultProps} />);
    
    // Click dislike button
    const dislikeBtn = screen.getByTitle('This suggestion was not helpful');
    fireEvent.click(dislikeBtn);
    
    await waitFor(() => {
      expect(submitFeedback).toHaveBeenCalledWith(
        'This is a test suggestion',
        'dislike',
        'anxiety',
        'general',
        'Test transcript',
        'Test input'
      );
    });
  });
});