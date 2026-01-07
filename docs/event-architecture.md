# Event-Driven Architecture Documentation

## Overview

ConvoCue implements an event-driven architecture using `mitt` as a centralized event bus. This architecture enables loose coupling between components and avoids global namespace pollution associated with `window.dispatchEvent`.

## Event Bus

The event bus is located at `src/utils/eventBus.js`.

```javascript
import { eventBus, EVENTS } from './utils/eventBus';

// Emit an event
eventBus.emit(EVENTS.CONVERSATION_UPDATED, { turns: [...] });

// Listen for an event
eventBus.on(EVENTS.CONVERSATION_UPDATED, (data) => {
  console.log(data.turns);
});
```

## Core Events

### `convocue:conversation_updated` (`EVENTS.CONVERSATION_UPDATED`)

This is the primary event dispatched when conversation turns are updated in the system.

**Dispatch Location:** `src/conversationManager.js`

**Payload Structure:**
```javascript
{
  turns: Array // Array of conversation turn objects
}
```

### `convocue:preferences_changed` (`EVENTS.PREFERENCES_CHANGED`)

This event is dispatched when user preferences are updated.

**Dispatch Location:** `src/utils/preferences.js`

**Payload Structure:**
```javascript
{
  // Updated preferences object
}
```

### `convocue:settings_changed` (`EVENTS.SETTINGS_CHANGED`)

This event is dispatched when user settings are updated in the Settings UI.

**Dispatch Location:** `src/components/Settings.jsx`

### `convocue:feedback_submitted` (`EVENTS.FEEDBACK_SUBMITTED`)

Dispatched when general feedback is submitted.

**Dispatch Location:** `src/utils/feedback.js`

## Benefits

1. **Namespace Isolation:** Prevents collisions with third-party libraries.
2. **Type Safety:** Using `EVENTS` constants prevents typos.
3. **Better Testing:** The event bus can be easily mocked or cleared during tests.
4. **Decoupling:** Components don't need direct references to each other.

## Best Practices

1. **Use Constants:** Always use the `EVENTS` object from `src/utils/eventBus.js`.
2. **Cleanup:** Always remove event listeners in cleanup functions (e.g., `useEffect` return) using `eventBus.off`.
3. **Payload Consistency:** Maintain consistent payload structures.
