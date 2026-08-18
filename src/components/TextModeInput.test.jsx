import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import TextModeInput from './TextModeInput';

describe('TextModeInput', () => {
  const defaultProps = {
    onTextSubmit: jest.fn(),
    isModelLoading: false,
  };

  beforeEach(() => {
    defaultProps.onTextSubmit.mockClear();
  });

  it('renders the toggle button', () => {
    render(<TextModeInput {...defaultProps} />);
    expect(screen.getByText('Type Instead')).toBeInTheDocument();
  });

  it('shows textarea and submit button when expanded', () => {
    render(<TextModeInput {...defaultProps} />);
    fireEvent.click(screen.getByText('Type Instead'));

    expect(screen.getByPlaceholderText('Type what was said...')).toBeInTheDocument();
    expect(screen.getByText('Get Suggestion')).toBeInTheDocument();
  });

  it('shows loading badge when isModelLoading is true', () => {
    render(<TextModeInput {...defaultProps} isModelLoading={true} />);
    fireEvent.click(screen.getByText('Type Instead'));

    expect(screen.getByText('Try while models load')).toBeInTheDocument();
  });

  it('does not show loading badge when isModelLoading is false', () => {
    render(<TextModeInput {...defaultProps} isModelLoading={false} />);
    fireEvent.click(screen.getByText('Type Instead'));

    expect(screen.queryByText('Try while models load')).not.toBeInTheDocument();
  });

  it('shows speaker toggle with Me/Them labels', () => {
    render(<TextModeInput {...defaultProps} />);
    fireEvent.click(screen.getByText('Type Instead'));

    expect(screen.getByText('Me')).toBeInTheDocument();
  });

  it('toggles speaker between Me and Them', () => {
    render(<TextModeInput {...defaultProps} />);
    fireEvent.click(screen.getByText('Type Instead'));

    fireEvent.click(screen.getByText('Me'));
    expect(screen.getByText('Them')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Them'));
    expect(screen.getByText('Me')).toBeInTheDocument();
  });

  it('calls onTextSubmit with text and speaker', () => {
    render(<TextModeInput {...defaultProps} />);
    fireEvent.click(screen.getByText('Type Instead'));

    const textarea = screen.getByPlaceholderText('Type what was said...');
    fireEvent.change(textarea, { target: { value: 'Hello world' } });
    fireEvent.click(screen.getByText('Get Suggestion'));

    expect(defaultProps.onTextSubmit).toHaveBeenCalledWith('Hello world', 'me');
  });

  it('clears textarea after submit', () => {
    render(<TextModeInput {...defaultProps} />);
    fireEvent.click(screen.getByText('Type Instead'));

    const textarea = screen.getByPlaceholderText('Type what was said...');
    fireEvent.change(textarea, { target: { value: 'Hello world' } });
    fireEvent.click(screen.getByText('Get Suggestion'));

    expect(textarea.value).toBe('');
  });
});
