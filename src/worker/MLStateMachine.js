/**
 * Formal State Machine for MLPipeline to manage model loading states
 *
 * NOTE: This state machine represents a critical architectural component that manages
 * the lifecycle of ML models in the ConvoCue application. It provides explicit paths
 * for failure recovery and graceful degradation, transforming the user experience
 * from "crash or work" to "adapt and recover".
 *
 * This implementation serves as a temporary but necessary solution to handle the
 * inherent unreliability of client-side ML model loading. In the long term, we may
 * want to explore more robust solutions such as server-side processing or more
 * sophisticated client-side resource management.
 *
 * FUTURE OPTIMIZATION: As the number of states and transitions grows, consider
 * refactoring the transition method to use a transition table approach for better
 * maintainability (e.g., a Map or object mapping (prevState, transition) => newState).
 */

// Define possible states
export const ML_STATES = {
  UNINITIALIZED: 'uninitialized',
  LOADING_STT: 'loading_stt',
  LOADING_LLM: 'loading_llm',
  READY: 'ready',
  ERROR: 'error',
  RETRYING_STT: 'retrying_stt',
  RETRYING_LLM: 'retrying_llm',
  LOW_MEMORY: 'low_memory',
  TEXT_ONLY_MODE: 'text_only_mode'
};

// Define possible transitions
export const ML_TRANSITIONS = {
  START_LOADING_STT: 'start_loading_stt',
  START_LOADING_LLM: 'start_loading_llm',
  STT_LOADED: 'stt_loaded',
  LLM_LOADED: 'llm_loaded',
  LOAD_ERROR: 'load_error',
  RETRY_STT: 'retry_stt',
  RETRY_LLM: 'retry_llm',
  RESET: 'reset',
  MEMORY_PRESSURE: 'memory_pressure',
  FALLBACK_SUCCESS: 'fallback_success'
};

// State machine class
export class MLStateMachine {
  constructor() {
    this.state = ML_STATES.UNINITIALIZED;
    this.transitions = [];
    this.context = {};
  }

  // Get current state
  getState() {
    return this.state;
  }

  // Check if in a specific state
  isInState(state) {
    return this.state === state;
  }

  // Transition to a new state based on transition type
  transition(transition, context = {}) {
    const prevState = this.state;
    this.context = { ...this.context, ...context };
    
    switch (prevState) {
      case ML_STATES.UNINITIALIZED:
        switch (transition) {
          case ML_TRANSITIONS.START_LOADING_STT:
            this.state = ML_STATES.LOADING_STT;
            break;
          case ML_TRANSITIONS.START_LOADING_LLM:
            this.state = ML_STATES.LOADING_LLM;
            break;
        }
        break;

      case ML_STATES.LOADING_STT:
        switch (transition) {
          case ML_TRANSITIONS.STT_LOADED:
            this.state = ML_STATES.READY;
            break;
          case ML_TRANSITIONS.LOAD_ERROR:
            this.state = ML_STATES.ERROR;
            break;
          case ML_TRANSITIONS.RETRY_STT:
            this.state = ML_STATES.RETRYING_STT;
            break;
        }
        break;

      case ML_STATES.LOADING_LLM:
        switch (transition) {
          case ML_TRANSITIONS.LLM_LOADED:
            this.state = ML_STATES.READY;
            break;
          case ML_TRANSITIONS.LOAD_ERROR:
            this.state = ML_STATES.ERROR;
            break;
          case ML_TRANSITIONS.RETRY_LLM:
            this.state = ML_STATES.RETRYING_LLM;
            break;
        }
        break;

      case ML_STATES.READY:
        switch (transition) {
          case ML_TRANSITIONS.START_LOADING_STT:
            this.state = ML_STATES.LOADING_STT;
            break;
          case ML_TRANSITIONS.START_LOADING_LLM:
            this.state = ML_STATES.LOADING_LLM;
            break;
          case ML_TRANSITIONS.MEMORY_PRESSURE:
            this.state = ML_STATES.LOW_MEMORY;
            break;
          case ML_TRANSITIONS.RETRY_STT:
            this.state = ML_STATES.RETRYING_STT;
            break;
          case ML_TRANSITIONS.RETRY_LLM:
            this.state = ML_STATES.RETRYING_LLM;
            break;
        }
        break;

      case ML_STATES.ERROR:
        switch (transition) {
          case ML_TRANSITIONS.RESET:
            this.state = ML_STATES.UNINITIALIZED;
            break;
          case ML_TRANSITIONS.RETRY_STT:
            this.state = ML_STATES.RETRYING_STT;
            break;
          case ML_TRANSITIONS.RETRY_LLM:
            this.state = ML_STATES.RETRYING_LLM;
            break;
          case ML_TRANSITIONS.FALLBACK_SUCCESS:
            this.state = ML_STATES.TEXT_ONLY_MODE;
            break;
        }
        break;

      case ML_STATES.RETRYING_STT:
        switch (transition) {
          case ML_TRANSITIONS.STT_LOADED:
            this.state = ML_STATES.READY;
            break;
          case ML_TRANSITIONS.LOAD_ERROR:
            this.state = ML_STATES.ERROR;
            break;
        }
        break;

      case ML_STATES.RETRYING_LLM:
        switch (transition) {
          case ML_TRANSITIONS.LLM_LOADED:
            this.state = ML_STATES.READY;
            break;
          case ML_TRANSITIONS.LOAD_ERROR:
            this.state = ML_STATES.ERROR;
            break;
        }
        break;

      case ML_STATES.LOW_MEMORY:
        switch (transition) {
          case ML_TRANSITIONS.START_LOADING_STT:
            this.state = ML_STATES.LOADING_STT;
            break;
          case ML_TRANSITIONS.START_LOADING_LLM:
            this.state = ML_STATES.LOADING_LLM;
            break;
          case ML_TRANSITIONS.RESET:
            this.state = ML_STATES.UNINITIALIZED;
            break;
        }
        break;

      case ML_STATES.TEXT_ONLY_MODE:
        switch (transition) {
          case ML_TRANSITIONS.START_LOADING_STT:
            this.state = ML_STATES.LOADING_STT;
            break;
          case ML_TRANSITIONS.START_LOADING_LLM:
            this.state = ML_STATES.LOADING_LLM;
            break;
          case ML_TRANSITIONS.RESET:
            this.state = ML_STATES.UNINITIALIZED;
            break;
        }
        break;
    }

    // Log transition for debugging
    this.transitions.push({
      from: prevState,
      to: this.state,
      transition,
      timestamp: Date.now(),
      context
    });

    return this.state;
  }

  // Get context information
  getContext() {
    return this.context;
  }

  // Reset the state machine
  reset() {
    this.state = ML_STATES.UNINITIALIZED;
    this.context = {};
    this.transitions = [];
  }

  // Get recent transitions for debugging
  getRecentTransitions(limit = 10) {
    return this.transitions.slice(-limit);
  }

  // Check if the pipeline is ready for processing
  isReadyForProcessing() {
    return this.state === ML_STATES.READY || this.state === ML_STATES.TEXT_ONLY_MODE;
  }

  /**
   * Check if a specific model is loaded
   * NOTE: This method reflects the actual model loading state rather than functionality.
   * In TEXT_ONLY_MODE, neither STT nor LLM models are considered loaded since this state
   * represents a fallback mode where the STT model has failed to load/function properly.
   * Only in READY state are models considered fully loaded and functional.
   */
  isModelLoaded(modelType) {
    if (modelType === 'stt') {
      return [ML_STATES.READY].includes(this.state);
    } else if (modelType === 'llm') {
      return [ML_STATES.READY].includes(this.state);
    }
    return false;
  }
}