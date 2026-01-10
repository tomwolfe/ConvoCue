import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import IntentFilterSettings from './IntentFilterSettings';
import { TAG_METADATA } from '../utils/intentRecognition';

describe('IntentFilterSettings', () => {
  const mockOnSave = vi.fn();
  const defaultProps = {
    settings: {
      enabledIntents: ['social', 'question']
    },
    onSave: mockOnSave
  };

  beforeEach(() => {
    mockOnSave.mockClear();
  });

  test('renders intent toggles correctly', () => {
    render(<IntentFilterSettings {...defaultProps} />);
    
    // Check that all intent labels from TAG_METADATA are rendered
    Object.values(TAG_METADATA).forEach(metadata => {
      expect(screen.getByText(metadata.label)).toBeInTheDocument();
    });
  });

  test('shows correct initial state for enabled intents', () => {
    render(<IntentFilterSettings {...defaultProps} />);

    // Check that initially enabled intents are checked by finding by role and label text
    expect(screen.getByRole('checkbox', { name: /Social Tip/i })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Question/i })).toBeChecked();

    // Check that other intents are not checked
    expect(screen.getByRole('checkbox', { name: /Conflict Alert/i })).not.toBeChecked();
  });

  test('toggles individual intents', () => {
    render(<IntentFilterSettings {...defaultProps} />);

    const conflictCheckbox = screen.getByRole('checkbox', { name: /Conflict Alert/i });
    expect(conflictCheckbox).not.toBeChecked();

    fireEvent.click(conflictCheckbox);
    expect(conflictCheckbox).toBeChecked();
  });

  test('handles enable all button correctly', () => {
    const settingsWithEmptyIntents = {
      settings: { enabledIntents: [] },
      onSave: mockOnSave
    };

    render(<IntentFilterSettings {...settingsWithEmptyIntents} />);

    // Initially no intents should be enabled
    Object.keys(TAG_METADATA).forEach(intent => {
      const metadata = TAG_METADATA[intent];
      const checkbox = screen.queryByRole('checkbox', { name: new RegExp(metadata.label, 'i') });
      if (checkbox) {
        expect(checkbox).not.toBeChecked();
      }
    });

    const enableAllButton = screen.getByText('Enable All');
    fireEvent.click(enableAllButton);

    // After clicking "Enable All", all intents should be enabled
    Object.keys(TAG_METADATA).forEach(intent => {
      const metadata = TAG_METADATA[intent];
      const checkbox = screen.getByRole('checkbox', { name: new RegExp(metadata.label, 'i') });
      expect(checkbox).toBeChecked();
    });
  });

  test('handles disable all button correctly', () => {
    render(<IntentFilterSettings {...defaultProps} />);

    // Initially some intents should be enabled
    expect(screen.getByRole('checkbox', { name: /Social Tip/i })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Question/i })).toBeChecked();

    const disableAllButton = screen.getByText('Disable All');
    fireEvent.click(disableAllButton);

    // After clicking "Disable All", no intents should be enabled
    Object.keys(TAG_METADATA).forEach(intent => {
      const metadata = TAG_METADATA[intent];
      const checkbox = screen.getByRole('checkbox', { name: new RegExp(metadata.label, 'i') });
      expect(checkbox).not.toBeChecked();
    });
  });

  test('saves selected intents when save button is clicked', () => {
    render(<IntentFilterSettings {...defaultProps} />);

    // Toggle an intent
    fireEvent.click(screen.getByRole('checkbox', { name: /Conflict Alert/i }));

    // Click save
    fireEvent.click(screen.getByText('Save Intent Preferences'));

    // Verify that onSave was called with the correct intents
    expect(mockOnSave).toHaveBeenCalledWith({
      enabledIntents: ['social', 'question', 'conflict']
    });
  });

  test('does not default to ALL_INTENTS when settings.enabledIntents is an empty array', () => {
    const settingsWithEmptyArray = {
      settings: { enabledIntents: [] },
      onSave: mockOnSave
    };

    render(<IntentFilterSettings {...settingsWithEmptyArray} />);

    // When enabledIntents is an empty array, no intents should be checked initially
    Object.keys(TAG_METADATA).forEach(intent => {
      const metadata = TAG_METADATA[intent];
      const checkbox = screen.queryByRole('checkbox', { name: new RegExp(metadata.label, 'i') });
      if (checkbox) {
        expect(checkbox).not.toBeChecked();
      }
    });
  });

  test('does not default to ALL_INTENTS when settings.enabledIntents is undefined', () => {
    const settingsWithUndefinedIntents = {
      settings: {},
      onSave: mockOnSave
    };

    render(<IntentFilterSettings {...settingsWithUndefinedIntents} />);

    // When enabledIntents is undefined, no intents should be checked initially
    Object.keys(TAG_METADATA).forEach(intent => {
      const metadata = TAG_METADATA[intent];
      const checkbox = screen.queryByRole('checkbox', { name: new RegExp(metadata.label, 'i') });
      if (checkbox) {
        expect(checkbox).not.toBeChecked();
      }
    });
  });
});