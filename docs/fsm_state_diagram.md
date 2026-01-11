# ML State Machine Documentation

## Overview
The ML State Machine manages the lifecycle of machine learning models (STT and LLM) in the ConvoCue application. It tracks the loading, readiness, and error states of the models to ensure proper functionality and graceful degradation.

## States

### UNINITIALIZED
- **Description**: Initial state when the application starts
- **Entry Conditions**: Application initialization
- **Exit Conditions**: Loading of STT or LLM models begins

### LOADING_STT
- **Description**: State when the Speech-to-Text model is being loaded
- **Entry Conditions**: STT loading initiated
- **Exit Conditions**: STT loads successfully, fails, or transitions to retry

### LOADING_LLM
- **Description**: State when the Language Model is being loaded
- **Entry Conditions**: LLM loading initiated
- **Exit Conditions**: LLM loads successfully, fails, or transitions to retry

### READY
- **Description**: Both models are loaded and ready for full processing
- **Entry Conditions**: Transition to READY when both STT and LLM are functional
- **Exit Conditions**: Model unloading, memory pressure, or error occurs

### STT_READY
- **Description**: Only the STT model is loaded and functional
- **Entry Conditions**: STT loads successfully while LLM is not yet loaded
- **Exit Conditions**: LLM loading starts, or error occurs

### ERROR
- **Description**: An error occurred during model loading or processing, or semantic consistency failed
- **Entry Conditions**: Model loading failure, or entering a "ready" state without required models
- **Exit Conditions**: Reset, retry attempt, or fallback success

### RETRYING_STT
- **Description**: State when retrying to load the STT model after failure
- **Entry Conditions**: Retry STT transition triggered
- **Exit Conditions**: STT loads successfully or fails again

### RETRYING_LLM
- **Description**: State when retrying to load the LLM after failure
- **Entry Conditions**: Retry LLM transition triggered
- **Exit Conditions**: LLM loads successfully or fails again

### LOW_MEMORY
- **Description**: State when the system is experiencing memory pressure
- **Entry Conditions**: Memory usage exceeds threshold
- **Exit Conditions**: Memory is freed or reset occurs

### TEXT_ONLY_MODE
- **Description**: Only the LLM is loaded and functional (Speech Engine failed)
- **Entry Conditions**: Fallback success after STT failure, provided LLM is functional
- **Exit Conditions**: Reset or model reload

## Transitions

### START_LOADING_STT
- **From**: UNINITIALIZED, READY, LOW_MEMORY, TEXT_ONLY_MODE, ERROR
- **To**: LOADING_STT
- **Description**: Initiates loading of the STT model

### START_LOADING_LLM
- **From**: UNINITIALIZED, READY, LOW_MEMORY, TEXT_ONLY_MODE, ERROR
- **To**: LOADING_LLM
- **Description**: Initiates loading of the LLM

### STT_LOADED
- **From**: LOADING_STT
- **To**: READY (if LLM loaded) or STT_READY (if LLM not loaded)
- **Description**: STT model loaded successfully

### LLM_LOADED
- **From**: LOADING_LLM
- **To**: READY (if STT loaded) or TEXT_ONLY_MODE (if STT not loaded)
- **Description**: LLM loaded successfully

### LOAD_ERROR
- **From**: LOADING_STT, LOADING_LLM, RETRYING_STT, RETRYING_LLM
- **To**: ERROR
- **Description**: Model loading failed

### RETRY_STT
- **From**: ERROR, READY, STT_READY
- **To**: RETRYING_STT
- **Description**: Attempt to reload STT model

### RETRY_LLM
- **From**: ERROR, READY, STT_READY
- **To**: RETRYING_LLM
- **Description**: Attempt to reload LLM

### RESET
- **From**: ERROR, LOW_MEMORY, TEXT_ONLY_MODE, STT_READY
- **To**: UNINITIALIZED
- **Description**: Reset the state machine to initial state

### MEMORY_PRESSURE
- **From**: READY, STT_READY
- **To**: LOW_MEMORY
- **Description**: System experiencing memory pressure

### DEGRADE_TO_TEXT_ONLY
- **From**: ERROR
- **To**: TEXT_ONLY_MODE (if LLM functional) or ERROR (if LLM failed)
- **Description**: Controlled degradation to text-only mode activated after primary model failure

## State Transition Diagram

```
UNINITIALIZED
     ↓ (START_LOADING_STT)
LOADING_STT ←→ RETRYING_STT
     ↓ (STT_LOADED)
STT_READY ←-------------------┐
     ↓ (START_LOADING_LLM)    ↓ (STT_LOADED)
LOADING_LLM ←→ RETRYING_LLM ←─┘
     ↓ (LLM_LOADED)           ↑ (START_LOADING_LLM)
   READY ←--------------------┘
     ↑ (LOAD_ERROR)
     ↓ (MEMORY_PRESSURE)
LOW_MEMORY ←------------ READY / STT_READY
     ↑                       ↓ (RETRY_STT/RETRY_LLM)
ERROR ←------------------ TEXT_ONLY_MODE
     ↑ (DEGRADE_TO_TEXT_ONLY)↑ (LLM_LOADED)
     └───────────────────────┘
```

## Race Condition Protection and Hardening

To ensure the state machine remains robust in the asynchronous environment of a Web Worker, several hardening measures have been implemented:

1.  **Sequential Message Processing**: The worker implements a message queue that processes incoming messages one by one, ensuring that transitions are atomic and not interrupted by concurrent events.
2.  **Loading Promise Guards**: `MLPipeline` uses static promise guards (`sttLoadingPromise`, `llmLoadingPromise`) to prevent redundant or concurrent model loading operations.
3.  **No-op Transition Support**: The state machine gracefully handles redundant transition requests (e.g., requesting to start loading when already in a loading state) without issuing warnings or performing unnecessary work.
4.  **Main-Thread Yielding**: The system utilizes `scheduler.yield` (with a `setTimeout(0)` fallback) to ensure that long-running ML operations do not block the worker's message loop, allowing for responsive state updates.

## Usage in Application

The state machine is integrated into the MLPipeline class and is used to:
- Track model loading progress
- Handle error recovery scenarios
- Enable retry mechanisms for both STT and LLM
- Manage memory pressure situations
- Provide status updates to the UI

## Key Methods

- `transition(transition, context)`: Change state based on transition type
- `getState()`: Get current state
- `isInState(state)`: Check if in specific state
- `isReadyForProcessing()`: Check if pipeline is ready for processing
- `isVoiceInputFunctional()`: Check if voice input is functional

## Memory Pressure Recovery

The LOW_MEMORY state can transition back to LOADING_STT/LOADING_LLM when attempting to reload models. The implementation now proactively disposes of loaded models when entering the LOW_MEMORY state to free resources immediately. The system relies on standard browser garbage collection to reclaim memory after model disposal. Developers should be aware that memory pressure conditions may persist if the user's system remains constrained despite these measures. Encouraging users to close other tabs remains the most effective manual intervention.