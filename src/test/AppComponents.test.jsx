import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

// Mock the hooks and modules that are not relevant to component rendering
vi.mock('../hooks/useMLWorker', () => ({
  useMLWorker: () => ({
    status: 'Initializing...',
    progress: 50,
    isReady: false,
    isLowMemory: false,
    error: null,
    transcript: '',
    suggestion: '',
    detectedIntent: null,
    emotionData: {},
    isProcessing: false,
    processingStep: null,
    processAudio: vi.fn(),
    prewarmLLM: vi.fn(),
    refreshSuggestion: vi.fn(),
    setTranscript: vi.fn(),
    setSuggestion: vi.fn(),
    setStatus: vi.fn(),
    resetWorker: vi.fn(),
    conversationTurns: [],
    persona: 'anxiety',
    setPersona: vi.fn(),
    culturalContext: {},
    setCulturalContext: vi.fn(),
    clearHistory: vi.fn(),
    settings: {}
  })
}));

vi.mock('../components/VADContent', () => ({
  default: () => <div data-testid="vad-content">VAD Content</div>
}));

vi.mock('../components/Tutorial', () => ({
  default: ({ onComplete }) => (
    <div data-testid="tutorial">
      <button onClick={onComplete}>Complete Tutorial</button>
    </div>
  )
}));

vi.mock('../components/PersonaCustomization', () => ({
  default: () => <div data-testid="persona-customization">Persona Customization</div>
}));

vi.mock('../components/PrivacyConsent', () => ({
  default: ({ onConsentGiven }) => (
    <div data-testid="privacy-consent">
      <button onClick={onConsentGiven}>Give Consent</button>
    </div>
  )
}));

vi.mock('../components/Settings', () => ({
  default: () => <div data-testid="settings">Settings</div>
}));

vi.mock('../utils/preferences', () => ({
  getMergedPersonas: vi.fn().mockResolvedValue({
    anxiety: {
      id: 'anxiety',
      label: 'Social Anxiety',
      description: 'Gentle, supportive cues'
    }
  })
}));

vi.mock('../utils/encryption', async () => {
  const actual = await vi.importActual('../utils/encryption');
  return {
    ...actual,
    secureLocalStorageGet: vi.fn().mockResolvedValue(null),
    secureLocalStorageSet: vi.fn().mockResolvedValue(undefined)
  };
});

vi.mock('../utils/diagnostics', () => ({
  checkAssets: vi.fn().mockResolvedValue({ allOk: true, missing: [] })
}));

vi.mock('../utils/privacyHardening', () => ({
  handleSessionEnd: vi.fn()
}));

describe('App Component - New UI Components', () => {
  beforeEach(() => {
    // Reset localStorage before each test
    window.localStorage.clear();
  });

  describe('Loading Hint Component', () => {
    it('renders the loading hint with correct content and accessibility attributes', () => {
      render(<App />);

      // Check that the loading hint exists with the correct role and aria-label
      const loadingHint = screen.getByRole('note', { name: /loading tip/i });
      expect(loadingHint).toBeInTheDocument();

      // Check that the hint contains the correct text
      expect(loadingHint).toHaveTextContent(/Tip: ConvoCue runs entirely on your device for privacy. Initial setup may take a moment./i);

      // Check that the info icon is present
      const infoIcon = loadingHint.querySelector('.hint-icon');
      expect(infoIcon).toBeInTheDocument();
      expect(infoIcon).toHaveAttribute('aria-hidden', 'true');
    });

    it('displays the current status in the loading step', () => {
      render(<App />);

      // Check that the status is displayed in the loading-step paragraph
      expect(screen.getByText(/Initializing\.\.\./i, { selector: '.loading-step' })).toBeInTheDocument();
    });

    it('correctly passes the status prop from useMLWorker to the loading-step element', () => {
      // The mock at the top sets status to 'Initializing...', so we verify it's passed through
      render(<App />);

      // Check that the status from the hook is displayed in the loading-step paragraph
      expect(screen.getByText('Initializing...', { selector: '.loading-step' })).toBeInTheDocument();
    });
  });

  describe('Setup Tips Component', () => {
    it('renders the setup tips section with correct heading and accessibility attributes', () => {
      render(<App />);

      // Check that the setup tips section exists with correct role
      const setupTipsSection = screen.getByRole('complementary');
      expect(setupTipsSection).toBeInTheDocument();

      // Check that the heading exists
      const heading = screen.getByText(/What to expect:/i);
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveAttribute('id', 'setup-tips-title');
    });

    it('displays all three setup tips with correct content and accessibility attributes', () => {
      render(<App />);

      // Check for the first tip: Real-time conversation suggestions
      const realTimeSuggestionsTip = screen.getByLabelText(/real-time conversation suggestions/i);
      expect(realTimeSuggestionsTip).toBeInTheDocument();
      expect(realTimeSuggestionsTip).toHaveTextContent(/Real-time conversation suggestions/i);

      // Check for the second tip: 100% on-device privacy
      const privacyTip = screen.getByLabelText(/100% on-device privacy/i);
      expect(privacyTip).toBeInTheDocument();
      expect(privacyTip).toHaveTextContent(/100% on-device privacy/i);

      // Check for the third tip: Adaptive to your communication style
      const adaptiveTip = screen.getByLabelText(/adaptive to your communication style/i);
      expect(adaptiveTip).toBeInTheDocument();
      expect(adaptiveTip).toHaveTextContent(/Learns your preferred response length over time/i);
    });

    it('includes the correct icons in the setup tips', () => {
      render(<App />);

      // Check for the presence of the icons by checking the structure
      const setupTipsList = screen.getByLabelText(/ConvoCue features and capabilities/i);
      const listItems = setupTipsList.querySelectorAll('li');

      // Each list item should contain an SVG icon
      expect(listItems.length).toBe(3);

      // Check that each list item has an SVG icon with the correct class
      const zapListItem = screen.getByLabelText(/real-time conversation suggestions/i);
      const zapIcon = zapListItem.querySelector('svg');
      expect(zapIcon).toBeInTheDocument();
      expect(zapIcon).toHaveClass('lucide-zap');

      const shieldListItem = screen.getByLabelText(/100% on-device privacy/i);
      const shieldIcon = shieldListItem.querySelector('svg');
      expect(shieldIcon).toBeInTheDocument();
      expect(shieldIcon).toHaveClass('lucide-shield-alert');

      const activityListItem = screen.getByLabelText(/adaptive to your communication style/i);
      const activityIcon = activityListItem.querySelector('svg');
      expect(activityIcon).toBeInTheDocument();
      expect(activityIcon).toHaveClass('lucide-activity');
    });
  });

});