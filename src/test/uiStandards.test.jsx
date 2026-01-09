
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import PersonaSelector from '../components/VAD/PersonaSelector';
import ControlPanel from '../components/VAD/ControlPanel';

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Mic: () => <div data-testid="mic-icon" />,
  Heart: () => <div data-testid="heart-icon" />,
  Sparkles: () => <div data-testid="sparkles-icon" />,
  Undo: () => <div data-testid="undo-icon" />
}));

describe('UI Standards Compliance', () => {
  describe('PersonaSelector Accessibility', () => {
    const mockPersonas = [
      { id: 'p1', label: 'Persona 1', description: 'Description 1' },
      { id: 'p2', label: 'Persona 2', description: 'Description 2' }
    ];

    it('uses aria-pressed to indicate the active persona', () => {
      const { rerender } = render(
        <PersonaSelector 
          persona="p1" 
          availablePersonas={mockPersonas} 
          setPersona={() => {}}
        />
      );

      const p1Btn = screen.getByRole('button', { name: /Persona 1/i });
      const p2Btn = screen.getByRole('button', { name: /Persona 2/i });

      expect(p1Btn.getAttribute('aria-pressed')).toBe('true');
      expect(p2Btn.getAttribute('aria-pressed')).toBe('false');

      rerender(
        <PersonaSelector 
          persona="p2" 
          availablePersonas={mockPersonas} 
          setPersona={() => {}}
        />
      );

      expect(p1Btn.getAttribute('aria-pressed')).toBe('false');
      expect(p2Btn.getAttribute('aria-pressed')).toBe('true');
    });

    it('provides tooltips/titles for persona buttons', () => {
      render(
        <PersonaSelector 
          persona="p1" 
          availablePersonas={mockPersonas} 
          setPersona={() => {}}
        />
      );

      const p1Btn = screen.getByRole('button', { name: /Persona 1/i });
      expect(p1Btn.getAttribute('title')).toBe('Description 1');
    });
  });

  describe('ControlPanel Accessibility', () => {
    it('has proper aria-labels and roles for controls', () => {
      render(
        <ControlPanel 
          isReady={true}
          isVADMode={false}
          handleManualTrigger={() => {}}
          toggleVAD={() => {}}
        />
      );

      const controlsGroup = screen.getByRole('group', { name: /Control buttons/i });
      expect(controlsGroup).toBeDefined();

      const pulseBtn = screen.getByTitle(/Manual Trigger/i);
      const heartbeatBtn = screen.getByTitle(/Continuous Mode/i);

      expect(pulseBtn).toBeDefined();
      expect(heartbeatBtn).toBeDefined();
    });

    it('indicates active state for continuous mode', () => {
      const { rerender } = render(
        <ControlPanel 
          isReady={true}
          isVADMode={true}
          handleManualTrigger={() => {}}
          toggleVAD={() => {}}
        />
      );

      const heartbeatBtn = screen.getByTitle(/Continuous Mode/i);
      expect(heartbeatBtn.classList.contains('active')).toBe(true);

      rerender(
        <ControlPanel 
          isReady={true}
          isVADMode={false}
          handleManualTrigger={() => {}}
          toggleVAD={() => {}}
        />
      );
      expect(heartbeatBtn.classList.contains('active')).toBe(false);
    });

    it('should be focusable for keyboard navigation', () => {
      render(
        <ControlPanel 
          isReady={true}
          isVADMode={false}
          handleManualTrigger={() => {}}
          toggleVAD={() => {}}
        />
      );

      const pulseBtn = screen.getByTitle(/Manual Trigger/i);
      const heartbeatBtn = screen.getByTitle(/Continuous Mode/i);

      pulseBtn.focus();
      expect(document.activeElement).toBe(pulseBtn);

      heartbeatBtn.focus();
      expect(document.activeElement).toBe(heartbeatBtn);
    });
  });
});
