import { describe, it, expect, beforeEach } from 'vitest';
import { MLStateMachine, ML_STATES, ML_TRANSITIONS } from '../src/worker/MLStateMachine';

describe('MLStateMachine', () => {
  let stateMachine;

  beforeEach(() => {
    stateMachine = new MLStateMachine(3);
  });

  describe('isModelLoaded', () => {
    it('should return true when in READY state', () => {
      stateMachine.state = ML_STATES.READY;
      
      expect(stateMachine.isModelLoaded('stt')).toBe(true);
      expect(stateMachine.isModelLoaded('llm')).toBe(true);
    });

    it('should return false when in TEXT_ONLY_MODE state', () => {
      stateMachine.state = ML_STATES.TEXT_ONLY_MODE;
      
      expect(stateMachine.isModelLoaded('stt')).toBe(false);
      expect(stateMachine.isModelLoaded('llm')).toBe(false);
    });

    it('should return false in other states', () => {
      stateMachine.state = ML_STATES.LOADING_STT;
      expect(stateMachine.isModelLoaded('stt')).toBe(false);
      
      stateMachine.state = ML_STATES.ERROR;
      expect(stateMachine.isModelLoaded('stt')).toBe(false);
    });
  });

  describe('state transitions', () => {
    it('should transition from UNINITIALIZED to LOADING_STT', () => {
      stateMachine.transition(ML_TRANSITIONS.START_LOADING_STT);
      expect(stateMachine.getState()).toBe(ML_STATES.LOADING_STT);
    });

    it('should transition to READY when loading succeeds', () => {
      stateMachine.transition(ML_TRANSITIONS.START_LOADING_STT);
      stateMachine.transition(ML_TRANSITIONS.STT_LOADED);
      expect(stateMachine.getState()).toBe(ML_STATES.READY);
    });

    it('should handle invalid transitions gracefully', () => {
      stateMachine.transition(ML_TRANSITIONS.STT_LOADED); // Invalid from UNINITIALIZED
      expect(stateMachine.getState()).toBe(ML_STATES.UNINITIALIZED);
    });
  });

  describe('retry logic', () => {
    it('should increment retryCount on RETRY_STT', () => {
      stateMachine.transition(ML_TRANSITIONS.START_LOADING_STT);
      stateMachine.transition(ML_TRANSITIONS.LOAD_ERROR);
      
      expect(stateMachine.getContext().retryCount).toBe(0);
      
      stateMachine.transition(ML_TRANSITIONS.RETRY_STT);
      expect(stateMachine.getState()).toBe(ML_STATES.RETRYING_STT);
      expect(stateMachine.getContext().retryCount).toBe(1);
    });

    it('should reset retryCount on success', () => {
      stateMachine.transition(ML_TRANSITIONS.START_LOADING_STT);
      stateMachine.transition(ML_TRANSITIONS.LOAD_ERROR);
      stateMachine.transition(ML_TRANSITIONS.RETRY_STT);
      
      expect(stateMachine.getContext().retryCount).toBe(1);
      
      stateMachine.transition(ML_TRANSITIONS.STT_LOADED);
      expect(stateMachine.getContext().retryCount).toBe(0);
    });

    it('should allow multiple retries', () => {
      stateMachine.state = ML_STATES.ERROR;
      
      stateMachine.transition(ML_TRANSITIONS.RETRY_STT);
      stateMachine.transition(ML_TRANSITIONS.LOAD_ERROR);
      stateMachine.transition(ML_TRANSITIONS.RETRY_STT);
      
      expect(stateMachine.getContext().retryCount).toBe(2);
    });
  });

  describe('isReadyForProcessing', () => {
    it('should return true in READY or TEXT_ONLY_MODE', () => {
      stateMachine.state = ML_STATES.READY;
      expect(stateMachine.isReadyForProcessing()).toBe(true);
      
      stateMachine.state = ML_STATES.TEXT_ONLY_MODE;
      expect(stateMachine.isReadyForProcessing()).toBe(true);
      
      stateMachine.state = ML_STATES.LOADING_STT;
      expect(stateMachine.isReadyForProcessing()).toBe(false);
    });
  });
});
