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

The single, standardized component for all user feedback actions.

- **Location:** `src/App.css`
- **Purpose:** Standardizes feedback loops across Suggestions, Insights, and Subtle Mode cues.
- **Features:**
  - Standardized size: 34x34px (base) / 28x28px (compact/nested).
  - Standardized icons: Lucide icons unified at 14px.
  - Interactive feel: `cubic-bezier` easing and `scale(0.9)` on active.
  - Consistent hover states: White background with elevated shadow.

**Contextual Overrides:**
- `.insight-footer .feedback-btn`: 28x28px for nested insight cards.
- `.glance-feedback-actions .feedback-btn`: 28x28px for subtle mode overlay.

**Usage Example:**
```jsx
<button
  className="feedback-btn"
  onClick={() => handleFeedback('like')}
  title="Helpful cue"
>
  <ThumbsUp size={14} />
</button>
```

## Best Practices

1. **Avoid Disparate Classes:** Do not create new classes like `btn-icon` or `insight-action-btn` for feedback actions. Use the standardized `.feedback-btn`.
2. **Icon Consistency:** Use Lucide icons sized at 14px within these buttons. Avoid inline emojis or disparate SVG sizes.
3. **Accessibility First:** Always include `title` and `aria-label` attributes. Use `aria-pressed` for toggles.
4. **Interactive States:** Leverage the built-in transitions. If a button should be disabled, use the `:disabled` pseudo-class or `.disabled` utility.

## Maintenance

Outdated classes that have been removed or replaced:
- `.btn-settings` (partial replacement)
- `.subtle-icon` (replaced by unified icons)
- `.btn-icon` (replaced by `.feedback-btn`)
- `.feedback-buttons` (redundant container)
- `.insight-action-btn` (replaced by `.feedback-btn`)
