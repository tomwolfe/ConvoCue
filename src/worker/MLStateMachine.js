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
  STT_READY: 'stt_ready',
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
  DEGRADE_TO_TEXT_ONLY: 'degrade_to_text_only'
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
  [ML_STATES.STT_READY]: {
    [ML_TRANSITIONS.START_LOADING_LLM]: ML_STATES.LOADING_LLM,
    [ML_TRANSITIONS.MEMORY_PRESSURE]: ML_STATES.LOW_MEMORY,
    [ML_TRANSITIONS.RESET]: ML_STATES.UNINITIALIZED,
  },
  [ML_STATES.ERROR]: {
    [ML_TRANSITIONS.START_LOADING_STT]: ML_STATES.LOADING_STT,
    [ML_TRANSITIONS.START_LOADING_LLM]: ML_STATES.LOADING_LLM,
    [ML_TRANSITIONS.RESET]: ML_STATES.UNINITIALIZED,
    [ML_TRANSITIONS.RETRY_STT]: ML_STATES.RETRYING_STT,
    [ML_TRANSITIONS.RETRY_LLM]: ML_STATES.RETRYING_LLM,
    [ML_TRANSITIONS.DEGRADE_TO_TEXT_ONLY]: ML_STATES.TEXT_ONLY_MODE,
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
      errors: [],
      sttFunctional: false,
      llmFunctional: false
    };
  }

  // Check if the current transition is redundant because we're already in the target state
  _isAlreadyInTargetState(state, transition) {
    const targetStates = {
      [ML_TRANSITIONS.START_LOADING_STT]: [ML_STATES.LOADING_STT, ML_STATES.RETRYING_STT],
      [ML_TRANSITIONS.START_LOADING_LLM]: [ML_STATES.LOADING_LLM, ML_STATES.RETRYING_LLM],
      [ML_TRANSITIONS.STT_LOADED]: [ML_STATES.READY],
      [ML_TRANSITIONS.LLM_LOADED]: [ML_STATES.READY],
      [ML_TRANSITIONS.MEMORY_PRESSURE]: [ML_STATES.LOW_MEMORY],
      [ML_TRANSITIONS.DEGRADE_TO_TEXT_ONLY]: [ML_STATES.TEXT_ONLY_MODE],
      [ML_TRANSITIONS.RESET]: [ML_STATES.UNINITIALIZED]
    };

    return targetStates[transition]?.includes(state) || false;
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
    let nextState = TRANSITION_TABLE[prevState]?.[transition];

    // No-op: if we are already in the target state for this transition, just return
    if (!nextState && this._isAlreadyInTargetState(prevState, transition)) {
      return this.state;
    }

    if (!nextState) {
      console.warn(`Invalid transition: ${transition} from state: ${prevState}`);
      return this.state;
    }

    // Handle context updates and side effects
    this.context = { ...this.context, ...contextUpdate };

    // Update functional status based on transitions
    if (transition === ML_TRANSITIONS.STT_LOADED) {
      this.context.sttFunctional = true;
      this.context.retryCount = 0;
    }
    if (transition === ML_TRANSITIONS.LLM_LOADED) {
      this.context.llmFunctional = true;
      this.context.retryCount = 0;
    }
    if (transition === ML_TRANSITIONS.LOAD_ERROR) {
      if (prevState === ML_STATES.LOADING_STT || prevState === ML_STATES.RETRYING_STT) {
        this.context.sttFunctional = false;
      }
      if (prevState === ML_STATES.LOADING_LLM || prevState === ML_STATES.RETRYING_LLM) {
        this.context.llmFunctional = false;
      }
    }
    if (transition === ML_TRANSITIONS.DEGRADE_TO_TEXT_ONLY) {
      // If we fallback after STT error, mark it as non-functional
      if (prevState === ML_STATES.ERROR && this.context.errors.length > 0) {
        const lastError = this.context.errors[this.context.errors.length - 1];
        if (lastError.state === ML_STATES.LOADING_STT || lastError.state === ML_STATES.RETRYING_STT) {
          this.context.sttFunctional = false;
        }
        if (lastError.state === ML_STATES.LOADING_LLM || lastError.state === ML_STATES.RETRYING_LLM) {
          this.context.llmFunctional = false;
        }
      }
    }

    // Refine nextState based on functional status
    // 1. If we are headed to READY but LLM is missing, it's either STT_READY or ERROR
    if (nextState === ML_STATES.READY && !this.context.llmFunctional) {
      if (this.context.sttFunctional) {
        nextState = ML_STATES.STT_READY;
      } else {
        nextState = ML_STATES.ERROR;
      }
    }
    
    // 2. If we are headed to READY/STT_READY but STT is missing, downgrade to TEXT_ONLY_MODE or ERROR
    if ((nextState === ML_STATES.READY || nextState === ML_STATES.STT_READY) && !this.context.sttFunctional) {
      if (this.context.llmFunctional) {
        nextState = ML_STATES.TEXT_ONLY_MODE;
      } else {
        nextState = ML_STATES.ERROR;
      }
    }

    // 3. If we are headed to TEXT_ONLY_MODE but LLM is missing, it's an ERROR
    if (nextState === ML_STATES.TEXT_ONLY_MODE && !this.context.llmFunctional) {
      nextState = ML_STATES.ERROR;
    }

    // 4. Final check: if we are in READY, BOTH must be functional
    if (nextState === ML_STATES.READY && (!this.context.sttFunctional || !this.context.llmFunctional)) {
       // This shouldn't happen with the logic above, but as a safeguard:
       if (this.context.llmFunctional) nextState = ML_STATES.TEXT_ONLY_MODE;
       else if (this.context.sttFunctional) nextState = ML_STATES.STT_READY;
       else nextState = ML_STATES.ERROR;
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
    if (this.state === ML_STATES.READY) {
      return this.context.sttFunctional && this.context.llmFunctional;
    }
    if (this.state === ML_STATES.TEXT_ONLY_MODE) {
      return this.context.llmFunctional;
    }
    if (this.state === ML_STATES.STT_READY) {
      return this.context.sttFunctional; // Can at least transcribe
    }
    return false;
  }

  /**
   * Check if voice input is functional and ready for processing
   * NOTE: READY and STT_READY states consider voice input functional.
   */
  isVoiceInputFunctional() {
    return (this.state === ML_STATES.READY || this.state === ML_STATES.STT_READY) && this.context.sttFunctional;
  }
}
