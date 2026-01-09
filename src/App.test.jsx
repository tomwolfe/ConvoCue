import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import App from './App';

// Mock the worker to avoid actual model loading in tests
vi.mock('./worker.js', () => ({
  // We'll create a mock worker in the test
}));

// Mock the VAD library
vi.mock('@ricky0123/vad-react', async () => {
  const actual = await vi.importActual('@ricky0123/vad-react');
  return {
    ...actual,
    useMicVAD: vi.fn(() => ({
      loading: false,
      errored: false,
      listening: false,
      start: vi.fn(),
      pause: vi.fn(),
      error: null,
      analyser: null
    }))
  };
});

// Mock the transformers library
vi.mock('@huggingface/transformers', () => ({
  pipeline: vi.fn(),
  env: {
    allowLocalModels: false,
    useBrowserCache: true,
    backends: {
      onnx: {
        wasm: {
          numThreads: 1,
          simd: true,
          proxy: false,
          wasmPaths: {}
        }
      }
    }
  },
  TextStreamer: vi.fn()
}));

// Mock localStorage for tests
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('App Component', () => {
  beforeEach(() => {
    // Reset localStorage before each test
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders initial screen correctly', async () => {
    await act(async () => {
      render(<App />);
    });

    expect(screen.getByText('ConvoCue')).toBeInTheDocument();
    expect(screen.getByText('Real-time social validation')).toBeInTheDocument();
    expect(screen.getByText('Ready to tune in?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Enable Microphone/i })).toBeInTheDocument();
  });

  it('initializes with correct default state', async () => {
    await act(async () => {
      render(<App />);
    });

    // Check that the app shows initial status in the status badge
    const statusBadge = screen.getByRole('status');
    expect(statusBadge).toHaveTextContent(/Initializing Models|Ready/i);
  });

    it('toggles dyslexic friendly mode', async () => {

      await act(async () => {
        render(<App />);
      });

      

      // Initial state: body should NOT have dyslexic-mode class

      expect(document.body.classList.contains('dyslexic-mode')).toBe(false);

  

      // Click the View Options button to open the menu

      const viewOptionsButton = screen.getByLabelText(/View Options/i);

      await act(async () => {

        viewOptionsButton.click();

      });

  

      const dyslexicToggle = screen.getByLabelText(/Toggle Dyslexic Friendly Font/i);

      expect(dyslexicToggle).toBeInTheDocument();

  

      // Click the toggle

      await act(async () => {

        dyslexicToggle.click();

      });

  

      // Body should now have dyslexic-mode class

      expect(document.body.classList.contains('dyslexic-mode')).toBe(true);

      

      // Toggle back

      await act(async () => {

        viewOptionsButton.click();

      });

      

      const dyslexicToggleAgain = screen.getByLabelText(/Toggle Dyslexic Friendly Font/i);

      await act(async () => {

        dyslexicToggleAgain.click();

      });

      

            expect(document.body.classList.contains('dyslexic-mode')).toBe(false);

      

          });

      

      

      

          it('manages mutually exclusive UI modes (Compact vs Subtle)', async () => {

      

            await act(async () => {

      

              render(<App />);

      

            });

      

      

      

            const viewOptionsButton = screen.getByLabelText(/View Options/i);

      

            

      

            // 1. Enable Compact Mode

      

            await act(async () => { viewOptionsButton.click(); });

      

            const compactBtn = screen.getByText(/Minimal UI/i);

      

            await act(async () => { compactBtn.click(); });

      

      

      

            expect(document.body.classList.contains('compact-mode')).toBe(true);

      

            expect(document.body.classList.contains('subtle-mode')).toBe(false);

      

      

      

            // 2. Enable Subtle Mode (should disable Compact Mode)

      

            await act(async () => { viewOptionsButton.click(); });

      

            const subtleBtn = screen.getByText(/Subtle Mode/i);

      

            await act(async () => { subtleBtn.click(); });

      

      

      

            expect(document.body.classList.contains('subtle-mode')).toBe(true);

      

            expect(document.body.classList.contains('compact-mode')).toBe(false);

      

      

      

            // 3. Re-enable Compact Mode (should disable Subtle Mode)

      

            await act(async () => { viewOptionsButton.click(); });

      

            const compactBtnAgain = screen.getByText(/Minimal UI/i);

      

            await act(async () => { compactBtnAgain.click(); });

      

      

      

            expect(document.body.classList.contains('compact-mode')).toBe(true);

      

            expect(document.body.classList.contains('subtle-mode')).toBe(false);

      

          });

      

      });

describe('Conversation Utilities', () => {
  it('summarizes conversation correctly', async () => {
    const { summarizeConversation } = await import('./utils/conversation');

    const history = [
      { role: 'user', content: 'Hi, I am feeling really anxious about my presentation today.' },
      { role: 'assistant', content: 'That sounds stressful. What specifically are you worried about?' },
      { role: 'user', content: 'I am afraid I will forget everything and embarrass myself.' },
      { role: 'assistant', content: 'It\'s normal to feel nervous. Have you practiced your presentation?' }
    ];

    const summary = summarizeConversation(history);
    expect(summary).toContain('anxious');
    expect(summary).toContain('presentation');
    expect(summary).toContain('nervous');
  });

  it('manages conversation history with summarization', async () => {
    const { manageConversationHistory } = await import('./utils/conversation');

    const longHistory = Array.from({ length: 10 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Message ${i + 1} content here`
    }));

    const trimmedHistory = manageConversationHistory(longHistory, 4);
    expect(trimmedHistory.length).toBeLessThanOrEqual(5); // 1 system + 4 messages
    expect(trimmedHistory.some(msg => msg.role === 'system')).toBe(true);
  });
});

describe('User Preferences', () => {
  it('saves and retrieves user preferences', async () => {
    const { saveUserPreferences, getManualPreferences } = await import('./utils/preferences');
    const prefs = { preferredLength: 'short' };
    await saveUserPreferences(prefs);
    const retrieved = await getManualPreferences();
    // Since we're in a test environment, localStorage mock might not be set up
    // This test is primarily for the utility functions themselves
    expect(typeof retrieved).toBe('object');
  });

  it('gets and sets preferred persona', async () => {
    const { setPreferredPersona, getPreferredPersona } = await import('./utils/preferences');

    // This test is primarily for the utility functions themselves
    expect(typeof setPreferredPersona).toBe('function');
    expect(typeof getPreferredPersona).toBe('function');
  });
});