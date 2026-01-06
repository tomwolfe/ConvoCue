import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import App from './App';

// Mock Worker
vi.stubGlobal('Worker', vi.fn().mockImplementation(function() {
  this.postMessage = vi.fn();
  this.terminate = vi.fn();
  this.onmessage = vi.fn();
}));

// Mock URL.createObjectURL and revokeObjectURL
window.URL.createObjectURL = vi.fn();
window.URL.revokeObjectURL = vi.fn();

// Mock navigator.mediaDevices
vi.stubGlobal('navigator', {
  ...window.navigator,
  mediaDevices: {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    }),
  },
});

test('renders ConvoCue heading', () => {
  render(<App />);
  const headingElements = screen.getAllByText(/ConvoCue/i);
  expect(headingElements[0]).toBeInTheDocument();
});

test('renders Enable Microphone button', () => {
  render(<App />);
  const buttonElement = screen.getByRole('button', { name: /Enable Microphone/i });
  expect(buttonElement).toBeInTheDocument();
});
