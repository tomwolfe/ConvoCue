# Event-Driven Architecture Documentation

## Overview

ConvoCue implements an event-driven architecture using CustomEvents to enable loose coupling between components. This architecture allows components to communicate without direct dependencies, improving scalability and maintainability.

## Core Events

### `convocue_conversation_updated`

This is the primary event dispatched when conversation turns are updated in the system.

**Event Type:** `CustomEvent`

**Dispatch Location:** `src/conversationManager.js`

**Payload Structure:**
```javascript
{
  detail: {
    turns: Array // Array of conversation turn objects
  }
}
```

**When Dispatched:**
- When a new conversation turn is processed (`processConversationTurn`)
- When the conversation is reset (`resetConversationManager`)
- When a speaker is overridden for a turn (`overrideSpeakerForTurn`)
- When the last speaker is updated (`updateLastSpeaker`)

**Consumers:**
- `useMLWorker` hook listens for this event to update conversation turns state

### `convocue_preferences_changed`

This event is dispatched when user preferences are updated.

**Event Type:** `CustomEvent`

**Dispatch Location:** Preference management modules

**Payload Structure:**
```javascript
{
  detail: {
    preferences: Object // Updated preferences object
  }
}
```

**When Dispatched:**
- When user preferences are updated through the UI or programmatically

**Consumers:**
- `useMLWorker` hook listens for this event to update preferences state

## Component Integration

### useMLWorker Hook

The `useMLWorker` hook listens for both conversation and preference updates:

```javascript
// Listen for conversation turn updates from the conversation manager
const handleConversationUpdate = (event) => {
  if (event.detail && event.detail.turns) {
    dispatch({ type: 'SET_CONVERSATION_TURNS', turns: event.detail.turns });
  }
};
window.addEventListener('convocue_conversation_updated', handleConversationUpdate);

// Listen for preference changes
const handlePrefsChange = (event) => {
  // Handle preference updates
};
window.addEventListener('convocue_preferences_changed', handlePrefsChange);
```

### Conversation Manager

The conversation manager dispatches events when conversation state changes:

```javascript
// Notify listeners that conversation turns have been updated
window.dispatchEvent(new CustomEvent('convocue_conversation_updated', {
  detail: { turns: conversationManager.getConversationHistory() }
}));
```

## Benefits

1. **Decoupling:** Components don't need direct references to each other
2. **Scalability:** New components can listen to events without modifying existing code
3. **Maintainability:** Clear separation of concerns between state management and UI components
4. **Testability:** Events can be mocked for unit testing

## Best Practices

1. **Event Naming:** Use the `convocue_` prefix for all custom events
2. **Payload Consistency:** Maintain consistent payload structures for similar events
3. **Cleanup:** Always remove event listeners in cleanup functions to prevent memory leaks
4. **Error Handling:** Wrap event dispatches in try-catch blocks when appropriate
5. **Documentation:** Document all custom events in this file

## Event Lifecycle

1. State change occurs in a manager (e.g., conversation manager)
2. Manager dispatches a CustomEvent with the new state
3. Interested components receive the event via event listeners
4. Components update their local state based on the event payload
5. UI re-renders based on the updated state

This architecture ensures that state changes propagate consistently throughout the application while maintaining loose coupling between components.