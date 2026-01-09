import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import VADContent from '../components/VADContent';

// Mock the useMicVAD hook
vi.mock('@ricky0123/vad-react', () => ({
  useMicVAD: vi.fn(() => ({
    loading: false,
    loaded: true,
    listening: false,
    errored: false,
    error: null,
    start: vi.fn(),
    pause: vi.fn(),
    analyser: null,
  })),
}));

// Mock the AppConfig
vi.mock('../config', () => ({
  AppConfig: {
    vad: {
      workletURL: '/vad.worklet.bundle.min.js',
      modelURL: '/silero_vad_v5.onnx',
      model: 'v5',
      onnxWASMPaths: {},
      positiveSpeechThreshold: 0.6,
      negativeSpeechThreshold: 0.4,
      minSpeechFrames: 3,
    },
    models: {
      personas: {
        anxiety: { id: 'anxiety', label: 'Social Anxiety', description: 'Confidence boosts' },
        professional: { id: 'professional', label: 'Professional', description: 'Workplace-appropriate' },
        relationship: { id: 'relationship', label: 'EQ Coach', description: 'Empathy and listening' },
      },
    },
    system: {
      maxTranscriptLength: 500,
      maxSuggestionLength: 250,
    },
    isMobile: false,
  },
}));

describe('VADContent Component', () => {
  const defaultProps = {
    status: 'Ready',
    isReady: true,
    transcript: '',
    suggestion: '',
    isProcessing: false,
    processingStep: 'none',
    processAudio: vi.fn(),
    refreshSuggestion: vi.fn(),
    setTranscript: vi.fn(),
    setSuggestion: vi.fn(),
    setStatus: vi.fn(),
    initialError: null,
    persona: 'anxiety',
    setPersona: vi.fn(),
    culturalContext: 'general',
    setCulturalContext: vi.fn(),
    clearHistory: vi.fn(),
    isCompactMode: false,
    isSubtleMode: false,
    onReset: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', async () => {
    await act(async () => {
      render(<VADContent {...defaultProps} />);
    });

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  it('displays transcript when provided', async () => {
    await act(async () => {
      render(<VADContent {...defaultProps} transcript="Hello, how are you?" />);
    });

    expect(screen.getByText('Hello, how are you?')).toBeInTheDocument();
  });

  it('displays suggestion when provided', async () => {
    await act(async () => {
      render(<VADContent {...defaultProps} suggestion="That sounds great!" />);
    });

    expect(screen.getByText('That sounds great!')).toBeInTheDocument();
  });

  it('allows persona selection', async () => {
    await act(async () => {
      render(<VADContent {...defaultProps} />);
    });

    const personaButton = screen.getByText('Professional');
    await act(async () => {
      fireEvent.click(personaButton);
    });

    expect(defaultProps.setPersona).toHaveBeenCalledWith('professional');
  });

  it('shows cultural context selector for crosscultural persona', async () => {
    await act(async () => {
      render(<VADContent {...defaultProps} persona="crosscultural" />);
    });

    expect(screen.getByLabelText('Cultural Context:')).toBeInTheDocument();
  });

  it('calls clearHistory when clear button is clicked', async () => {
    await act(async () => {
      render(<VADContent {...defaultProps} transcript="Test transcript" />);
    });

    const clearButton = screen.getByTitle('Clear Context');
    await act(async () => {
      fireEvent.click(clearButton);
    });

    expect(defaultProps.clearHistory).toHaveBeenCalled();
  });

  it('calls refreshSuggestion when refresh button is clicked', async () => {
    await act(async () => {
      render(<VADContent {...defaultProps} transcript="Test transcript" suggestion="Test suggestion" />);
    });

    const refreshButton = screen.getByTitle('New suggestion');
    await act(async () => {
      fireEvent.click(refreshButton);
    });

    expect(defaultProps.refreshSuggestion).toHaveBeenCalled();
  });

  it('copies suggestion to clipboard when copy button is clicked', async () => {
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    await act(async () => {
      render(<VADContent {...defaultProps} transcript="Test transcript" suggestion="Test suggestion" />);
    });

    const copyButton = screen.getByTitle('Copy to clipboard');
    await act(async () => {
      fireEvent.click(copyButton);
    });

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Test suggestion');
    });
  });

  it('disables controls when not ready', async () => {
    await act(async () => {
      render(<VADContent {...defaultProps} isReady={false} />);
    });

    const pulseButton = screen.getByTitle('Manual Mode: Tap to analyze specific moments');
    const heartbeatButton = screen.getByTitle('Continuous Mode: AI listens and updates in real-time');

    expect(pulseButton).toBeDisabled();
    expect(heartbeatButton).toBeDisabled();
  });

  it('shows error recovery when VAD error occurs', async () => {
    await act(async () => {
      render(<VADContent {...defaultProps} initialError="Microphone access denied" />);
    });

    expect(screen.getByText('Microphone access denied')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
