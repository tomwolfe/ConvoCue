# ConvoCue Design System: Unified Components

## Overview

To ensure UI consistency, accessibility, and maintainability, ConvoCue has moved to a unified component strategy for interactive elements. This eliminates "style drift" and provides a predictable experience for users.

## Standardized Interactive Elements

### 1. `.btn-toggle-icon`

Used exclusively for global view mode toggles in the header (Quick Toggles).

- **Location:** `src/App.css`
- **Purpose:** Consistent styling for mode switching (Compact, Subtle, Dyslexic).
- **Features:** 
  - Standardized size: 34x34px.
  - Clear active/inactive states.
  - Hover elevation and background transition.
  - Comprehensive ARIA support (`aria-pressed`, `title`).

**Usage Example:**
```jsx
<button
  onClick={() => setIsCompactMode(!isCompactMode)}
  className={`btn-toggle-icon ${isCompactMode ? 'active' : ''}`}
  title="Switch to Minimal UI"
  aria-label="Toggle Minimal UI"
  aria-pressed={isCompactMode}
>
  <Activity size={18} />
</button>
```

### 2. `.feedback-btn`
+ `.feedback-btn--sm`

The single, standardized component for all user feedback actions.

- **Location:** `src/App.css`
- **Purpose:** Standardizes feedback loops across Suggestions, Insights, and Subtle Mode cues.
- **Features:**
  - Standardized size: 34x34px (base).
  - Modifier: `.feedback-btn--sm` (28x28px) for compact/nested contexts.
  - Standardized icons: Lucide icons unified at 14px.
  - Interactive feel: `cubic-bezier` easing and `scale(0.9)` on active.
  - Consistent hover states: White background with elevated shadow.

**Usage Example:**
```jsx
<button
  className="feedback-btn feedback-btn--sm"
  onClick={() => handleFeedback('like')}
  title="Helpful cue"
>
  <ThumbsUp size={14} />
</button>
```

### 3. `.btn-action-sm` & `.btn-close-sm`

Used for secondary actions that are not feedback (navigation, info, dismiss).

- **Location:** `src/App.css`
- **Standard size:** 28x28px (action) / 24x24px (close).
- **Icons:** 12px or 14px Lucide icons.

## Best Practices

1. **Avoid Disparate Classes:** Do not create new classes like `btn-icon` or `insight-action-btn`. Use `.feedback-btn` for feedback and `.btn-action-sm` for other small actions.
2. **Icon Consistency:** Use Lucide icons sized at 14px (feedback) or 12px (navigation). Avoid inline emojis.
3. **Accessibility First:** Always include `title` and `aria-label` attributes. Use `aria-pressed` for toggles.
4. **Interactive States:** Leverage the built-in transitions.

## Maintenance

Outdated classes that have been removed or replaced:
- `.btn-settings` (partial replacement)
- `.subtle-icon` (replaced by unified icons)
- `.btn-icon` (replaced by `.feedback-btn`)
- `.feedback-buttons` (redundant container)
- `.insight-action-btn` (replaced by `.feedback-btn` or `.btn-action-sm`)
