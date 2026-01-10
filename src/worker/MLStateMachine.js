/**
 * Formal State Machine for MLPipeline to manage model loading states
 *
 * NOTE: This state machine represents a critical architectural component that manages
 * the lifecycle of ML models in the ConvoCue application. It provides explicit paths
 * for failure recovery and graceful degradation, transforming the user experience
 * from "crash or work" to "adapt and recover".
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

/**
 * Transition Table defining valid state movements
 * (prevState, transition) => newState
 */
const TRANSITION_TABLE = {
  [ML_STATES.UNINITIALIZED]: {
    [ML_TRANSITIONS.START_LOADING_STT]: ML_STATES.LOADING_STT,
    [ML_TRANSITIONS.START_LOADING_LLM]: ML_STATES.LOADING_LLM,
  },
  [ML_STATES.LOADING_STT]: {
    [ML_TRANSITIONS.STT_LOADED]: ML_STATES.READY,
    [ML_TRANSITIONS.LOAD_ERROR]: ML_STATES.ERROR,
    [ML_TRANSITIONS.RETRY_STT]: ML_STATES.RETRYING_STT,
  },
  [ML_STATES.LOADING_LLM]: {
    [ML_TRANSITIONS.LLM_LOADED]: ML_STATES.READY,
    [ML_TRANSITIONS.LOAD_ERROR]: ML_STATES.ERROR,
    [ML_TRANSITIONS.RETRY_LLM]: ML_STATES.RETRYING_LLM,
  },
  [ML_STATES.READY]: {
    [ML_TRANSITIONS.START_LOADING_STT]: ML_STATES.LOADING_STT,
    [ML_TRANSITIONS.START_LOADING_LLM]: ML_STATES.LOADING_LLM,
    [ML_TRANSITIONS.MEMORY_PRESSURE]: ML_STATES.LOW_MEMORY,
    [ML_TRANSITIONS.RETRY_STT]: ML_STATES.RETRYING_STT,
    [ML_TRANSITIONS.RETRY_LLM]: ML_STATES.RETRYING_LLM,
  },
  [ML_STATES.ERROR]: {
    [ML_TRANSITIONS.START_LOADING_STT]: ML_STATES.LOADING_STT,
    [ML_TRANSITIONS.START_LOADING_LLM]: ML_STATES.LOADING_LLM,
    [ML_TRANSITIONS.RESET]: ML_STATES.UNINITIALIZED,
    [ML_TRANSITIONS.RETRY_STT]: ML_STATES.RETRYING_STT,
    [ML_TRANSITIONS.RETRY_LLM]: ML_STATES.RETRYING_LLM,
    [ML_TRANSITIONS.FALLBACK_SUCCESS]: ML_STATES.TEXT_ONLY_MODE,
  },
  [ML_STATES.RETRYING_STT]: {
    [ML_TRANSITIONS.STT_LOADED]: ML_STATES.READY,
    [ML_TRANSITIONS.LOAD_ERROR]: ML_STATES.ERROR,
  },
  [ML_STATES.RETRYING_LLM]: {
    [ML_TRANSITIONS.LLM_LOADED]: ML_STATES.READY,
    [ML_TRANSITIONS.LOAD_ERROR]: ML_STATES.ERROR,
  },
  [ML_STATES.LOW_MEMORY]: {
    [ML_TRANSITIONS.START_LOADING_STT]: ML_STATES.LOADING_STT,
    [ML_TRANSITIONS.START_LOADING_LLM]: ML_STATES.LOADING_LLM,
    [ML_TRANSITIONS.RESET]: ML_STATES.UNINITIALIZED,
  },
  [ML_STATES.TEXT_ONLY_MODE]: {
    [ML_TRANSITIONS.START_LOADING_STT]: ML_STATES.LOADING_STT,
    [ML_TRANSITIONS.START_LOADING_LLM]: ML_STATES.LOADING_LLM,
    [ML_TRANSITIONS.RESET]: ML_STATES.UNINITIALIZED,
  }
};

// State machine class
export class MLStateMachine {
  constructor(maxRetries = 3) {
    this.state = ML_STATES.UNINITIALIZED;
    this.transitions = [];
    this.context = {
      retryCount: 0,
      maxRetries: maxRetries,
      errors: []
    };
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
  transition(transition, contextUpdate = {}) {
    const prevState = this.state;
    const nextState = TRANSITION_TABLE[prevState]?.[transition];

    if (!nextState) {
      console.warn(`Invalid transition: ${transition} from state: ${prevState}`);
      return this.state;
    }

    // Handle context updates and side effects
    this.context = { ...this.context, ...contextUpdate };

    // Reset retry count on successful load
    if (transition === ML_TRANSITIONS.STT_LOADED || transition === ML_TRANSITIONS.LLM_LOADED) {
      this.context.retryCount = 0;
    }

    // Increment retry count on retry transitions
    if (transition === ML_TRANSITIONS.RETRY_STT || transition === ML_TRANSITIONS.RETRY_LLM) {
      this.context.retryCount++;
      
      // If we've exceeded max retries, we might want to force an error state
      // but for now we follow the table which transitions to RETRYING_*
      if (this.context.retryCount > this.context.maxRetries) {
         console.warn(`Max retries exceeded (${this.context.retryCount}/${this.context.maxRetries})`);
         // We could transition to ERROR here if we wanted to enforce it in the FSM
      }
    }

    // Capture error in context if provided
    if (transition === ML_TRANSITIONS.LOAD_ERROR && contextUpdate.error) {
      this.context.errors.push({
        state: prevState,
        error: contextUpdate.error,
        timestamp: Date.now()
      });
    }

    this.state = nextState;

    // Log transition for debugging
    this.transitions.push({
      from: prevState,
      to: this.state,
      transition,
      timestamp: Date.now(),
      context: { ...this.context }
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
    this.context = {
      retryCount: 0,
      maxRetries: this.context.maxRetries,
      errors: []
    };
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
   * NOTE: Only in READY state are models considered fully loaded and functional.
   */
  isModelLoaded(modelType) {
    return this.state === ML_STATES.READY;
  }
}
