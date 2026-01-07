# Internal Handling of conversationSentiment and history Props

## Overview

This document explains how the `conversationSentiment` and `history` props were removed from component interfaces and are now handled internally through the event-driven architecture and conversation manager.

## Background

In the previous architecture, components like `VADContent` received `conversationSentiment` and `history` as direct props:

```jsx
// OLD: Direct props
<VADContent
  conversationSentiment={conversationSentiment}
  history={history}
  // ... other props
/>
```

## Current Architecture

### 1. Removal of Direct Props

The `conversationSentiment` and `history` props were removed from the `VADContent` component interface in `src/App.jsx`:

```jsx
// NEW: No direct props needed
<VADContent
  // conversationSentiment prop removed
  // history prop removed
  // ... other props
/>
```

### 2. Internal Management via Conversation Manager

The conversation history is now managed internally by the `conversationManager`:

- **Location:** `src/conversationManager.js`
- **Purpose:** Centralized management of conversation turns
- **Access:** Components access history via `getConversationHistory()` function

### 3. Event-Driven Updates

Components receive conversation updates through the `convocue_conversation_updated` event:

```javascript
// In useMLWorker hook
const handleConversationUpdate = (event) => {
  if (event.detail && event.detail.turns) {
    dispatch({ type: 'SET_CONVERSATION_TURNS', turns: event.detail.turns });
  }
};
window.addEventListener('convocue_conversation_updated', handleConversationUpdate);
```

### 4. Sentiment Analysis Integration

- **Location:** `src/utils/sentimentAnalysis.js`
- **Usage:** Sentiment analysis is performed internally in the worker when needed
- **Propagation:** Sentiment data is included in LLM results and processed internally

### 5. Worker-Side Processing

The `history` prop is now passed directly to the worker for LLM processing:

```javascript
// In worker.js
const conversationHistory = (history || []).map(m => ({
    role: m.role || 'user',
    content: m.content
}));
```

## Benefits of Internal Handling

1. **Reduced Prop Drilling:** Components no longer need to pass these props through multiple levels
2. **Centralized State Management:** Single source of truth for conversation data
3. **Better Performance:** Only components that need updates receive them via events
4. **Improved Maintainability:** Changes to conversation management logic are isolated

## Component Integration

### VADContent Component

- **Before:** Received `conversationSentiment` and `history` as props
- **After:** Accesses conversation data through state managed by `useMLWorker`

### useMLWorker Hook

- **Responsibility:** Manages conversation state and receives updates via events
- **Integration:** Uses `getConversationHistory()` to initialize state
- **Updates:** Responds to `convocue_conversation_updated` events

### Worker Processing

- **History Access:** Receives history directly in LLM processing messages
- **Sentiment Analysis:** Performs sentiment analysis internally and returns results
- **Performance:** Includes performance metrics for large histories

## Migration Path

For developers working with the new architecture:

1. Remove `conversationSentiment` and `history` props from component calls
2. Access conversation data through the state provided by `useMLWorker`
3. Use the event-driven approach for real-time updates
4. Leverage the performance monitoring utilities for large conversations

## Performance Considerations

- Large conversation histories are monitored for performance
- History trimming occurs automatically when thresholds are exceeded
- Memory usage is tracked to prevent performance degradation
- Performance metrics are logged for analysis and optimization