import { describe, it, expect } from 'vitest';
import { MLStateMachine, ML_STATES, ML_TRANSITIONS } from '../src/worker/MLStateMachine';

describe('MLStateMachine', () => {
  let stateMachine;

  beforeEach(() => {
    stateMachine = new MLStateMachine();
  });

  describe('isModelLoaded', () => {
    it('should return true for both models when in READY state', () => {
      stateMachine.state = ML_STATES.READY;
      
      expect(stateMachine.isModelLoaded('stt')).toBe(true);
      expect(stateMachine.isModelLoaded('llm')).toBe(true);
    });

    it('should return false for both models when in TEXT_ONLY_MODE state', () => {
      stateMachine.state = ML_STATES.TEXT_ONLY_MODE;
      
      expect(stateMachine.isModelLoaded('stt')).toBe(false); // CRITICAL FIX: Was previously true
      expect(stateMachine.isModelLoaded('llm')).toBe(false);
    });

    it('should return false for both models when in ERROR state', () => {
      stateMachine.state = ML_STATES.ERROR;
      
      expect(stateMachine.isModelLoaded('stt')).toBe(false);
      expect(stateMachine.isModelLoaded('llm')).toBe(false);
    });

    it('should return false for both models when in LOADING_STT state', () => {
      stateMachine.state = ML_STATES.LOADING_STT;
      
      expect(stateMachine.isModelLoaded('stt')).toBe(false);
      expect(stateMachine.isModelLoaded('llm')).toBe(false);
    });

    it('should return false for both models when in LOADING_LLM state', () => {
      stateMachine.state = ML_STATES.LOADING_LLM;
      
      expect(stateMachine.isModelLoaded('stt')).toBe(false);
      expect(stateMachine.isModelLoaded('llm')).toBe(false);
    });

    it('should return false for both models when in UNINITIALIZED state', () => {
      stateMachine.state = ML_STATES.UNINITIALIZED;
      
      expect(stateMachine.isModelLoaded('stt')).toBe(false);
      expect(stateMachine.isModelLoaded('llm')).toBe(false);
    });

    it('should return false for both models when in LOW_MEMORY state', () => {
      stateMachine.state = ML_STATES.LOW_MEMORY;
      
      expect(stateMachine.isModelLoaded('stt')).toBe(false);
      expect(stateMachine.isModelLoaded('llm')).toBe(false);
    });

    it('should return false for both models when in RETRYING_STT state', () => {
      stateMachine.state = ML_STATES.RETRYING_STT;
      
      expect(stateMachine.isModelLoaded('stt')).toBe(false);
      expect(stateMachine.isModelLoaded('llm')).toBe(false);
    });

    it('should return false for both models when in RETRYING_LLM state', () => {
      stateMachine.state = ML_STATES.RETRYING_LLM;
      
      expect(stateMachine.isModelLoaded('stt')).toBe(false);
      expect(stateMachine.isModelLoaded('llm')).toBe(false);
    });

    it('should return false for invalid model types', () => {
      stateMachine.state = ML_STATES.READY;
      
      expect(stateMachine.isModelLoaded('invalid_model')).toBe(false);
      expect(stateMachine.isModelLoaded('')).toBe(false);
      expect(stateMachine.isModelLoaded(null)).toBe(false);
    });
  });

  describe('state transitions', () => {
    it('should transition from UNINITIALIZED to LOADING_STT', () => {
      stateMachine.transition(ML_TRANSITIONS.START_LOADING_STT);
      
      expect(stateMachine.getState()).toBe(ML_STATES.LOADING_STT);
    });

    it('should transition from LOADING_STT to READY when STT loads', () => {
      stateMachine.transition(ML_TRANSITIONS.START_LOADING_STT);
      stateMachine.transition(ML_TRANSITIONS.STT_LOADED);
      
      expect(stateMachine.getState()).toBe(ML_STATES.READY);
      expect(stateMachine.isModelLoaded('stt')).toBe(true);
      expect(stateMachine.isModelLoaded('llm')).toBe(true);
    });

    it('should transition from LOADING_STT to ERROR when load fails', () => {
      stateMachine.transition(ML_TRANSITIONS.START_LOADING_STT);
      stateMachine.transition(ML_TRANSITIONS.LOAD_ERROR);
      
      expect(stateMachine.getState()).toBe(ML_STATES.ERROR);
      expect(stateMachine.isModelLoaded('stt')).toBe(false);
      expect(stateMachine.isModelLoaded('llm')).toBe(false);
    });

    it('should transition from ERROR to TEXT_ONLY_MODE on fallback success', () => {
      stateMachine.transition(ML_TRANSITIONS.START_LOADING_STT);
      stateMachine.transition(ML_TRANSITIONS.LOAD_ERROR);
      stateMachine.transition(ML_TRANSITIONS.FALLBACK_SUCCESS);
      
      expect(stateMachine.getState()).toBe(ML_STATES.TEXT_ONLY_MODE);
      expect(stateMachine.isModelLoaded('stt')).toBe(false); // CRITICAL: Even in TEXT_ONLY_MODE, STT is not loaded
      expect(stateMachine.isModelLoaded('llm')).toBe(false);
    });
  });

  describe('isReadyForProcessing', () => {
    it('should return true in READY state', () => {
      stateMachine.state = ML_STATES.READY;
      expect(stateMachine.isReadyForProcessing()).toBe(true);
    });

    it('should return true in TEXT_ONLY_MODE state', () => {
      stateMachine.state = ML_STATES.TEXT_ONLY_MODE;
      expect(stateMachine.isReadyForProcessing()).toBe(true);
    });

    it('should return false in other states', () => {
      const states = [
        ML_STATES.UNINITIALIZED,
        ML_STATES.LOADING_STT,
        ML_STATES.LOADING_LLM,
        ML_STATES.ERROR,
        ML_STATES.RETRYING_STT,
        ML_STATES.RETRYING_LLM,
        ML_STATES.LOW_MEMORY
      ];

      states.forEach(state => {
        stateMachine.state = state;
        expect(stateMachine.isReadyForProcessing()).toBe(false);
      });
    });
  });
});