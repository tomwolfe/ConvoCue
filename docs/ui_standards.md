# ConvoCue UI Standards Documentation

## Purpose
This document outlines the UI standards and design principles for the ConvoCue application to ensure consistency, accessibility, and usability across all components.

## Design Principles

### 1. Clarity First
- Prioritize clear, understandable interfaces over decorative elements
- Use familiar UI patterns that users recognize
- Minimize cognitive load by grouping related elements

### 2. Accessibility by Default
- All interactive elements must meet WCAG 2.1 AA standards
- Color contrast ratios of at least 4.5:1 for normal text, 3:1 for large text
- Keyboard navigable interface with visible focus indicators
- Proper ARIA attributes for screen readers

### 3. Performance Conscious
- Optimize animations to avoid jank and battery drain
- Use CSS transforms and opacity for smooth animations
- Limit simultaneous animations to maintain 60fps

## Color Palette

### Primary Colors
- Primary: #6366f1 (Indigo 500)
- Primary Light: #818cf8 (Indigo 400)
- Background: #f8fafc (Slate 50)
- Card Background: #ffffff
- Text: #0f172a (Slade 900)
- Text Muted: #64748b (Gray 500)
- Accent: #10b981 (Emerald 500)
- Border: #e2e8f0 (Gray 200)

### Semantic Colors
- Success: #10b981 (Emerald 500)
- Warning: #f59e0b (Amber 500)
- Error: #ef4444 (Red 500)
- Info: #3b82f6 (Blue 500)

## Typography

### Font Stack
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### Scale
- Heading 1: 1.5rem (24px) - Bold
- Heading 2: 1.25rem (20px) - Bold
- Body: 1rem (16px) - Regular
- Small: 0.875rem (14px) - Regular
- Caption: 0.75rem (12px) - Regular

### Line Height
- Default: 1.5
- Dense: 1.25

## Spacing System
- Base unit: 0.25rem (4px)
- Common scales: 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4

## Component Standards

### Buttons

#### Types
- **Primary**: For main actions, uses primary color
- **Secondary**: For secondary actions, outlined style
- **Tertiary**: For subtle actions, text-only style

#### Sizes
- **Small**: 0.5rem vertical padding, 0.75rem horizontal padding
- **Medium**: 0.625rem vertical padding, 1rem horizontal padding  
- **Large**: 0.75rem vertical padding, 1.25rem horizontal padding

#### States
- **Default**: Normal appearance
- **Hover**: Slight color shift, subtle elevation
- **Active**: Pressed effect (translateY(1px))
- **Focus**: Visible outline (2px solid primary color)
- **Disabled**: Reduced opacity (0.5), not interactive

### Cards
- Border radius: 20px
- Border: 1px solid border color
- Shadow: var(--shadow) for main cards
- Padding: 1rem for content areas

### Forms
- Input fields: 1rem vertical padding, 0.75rem horizontal padding
- Border: 1px solid border color
- Border radius: 8px
- Focus: Primary color border, subtle shadow

## Responsive Behavior

### Breakpoints
- Mobile: 0px to 480px
- Tablet: 481px to 768px
- Desktop: 769px+

### Adaptive UI Modes
- **Normal Mode**: Full feature set
- **Compact Mode**: Reduced spacing, condensed layout
- **Subtle Mode**: Minimal visual presence for real-world interactions
- **Dyslexic-Friendly Mode**: Special typography and spacing

## Interaction Patterns

### Feedback Timing
- Immediate visual feedback for all interactions
- Loading states for operations > 500ms
- Success/error feedback for all state changes

### Animation Guidelines
- Duration: 200ms for micro-interactions
- Easing: ease-in-out for most transitions
- Transform-based animations only (avoid animating layout properties)

## Accessibility Standards

### Focus Management
- Visible focus indicators for all interactive elements
- Logical tab order matching visual flow
- Focus restoration after modal/popup close

### Color Usage
- Never use color alone to convey information
- Provide text labels for all icons
- Ensure sufficient contrast ratios

### Screen Reader Support
- Proper heading hierarchy (H1 → H6)
- Descriptive labels for form inputs
- ARIA landmarks for major regions
- Status messages for dynamic content updates

## UI Mode Guidelines

### Subtle Mode Visual Vocabulary
- **Purpose**: To provide essential social cues without being a distraction in face-to-face interactions.
- **Backgrounds**: Use `transparent` or low-opacity `rgba(255, 255, 255, 0.1)` with `backdrop-filter: blur(2px)`.
- **Text**: Reduce font size by 10-20% and use `var(--text-muted)` to lower contrast.
- **Visibility**: 
    - Hide non-essential secondary information (timestamps, metadata).
    - Hide persistent controls (`.controls`, `.persona-selector`) when not actively needed.
    - Reduce opacity of status indicators (`.status-badge`) to 0.3-0.5.
- **Animations**: Disable or significantly slow down non-critical animations.
- **Interactions**: Reveal full controls on hover or through a specific "expand" action if necessary.

### Conflicting Modes Prevention
- Compact mode and Subtle mode should not be active simultaneously.
- When one UI mode is activated, incompatible modes should be deactivated.
- Clear visual indicators for active modes in the view menu.

### Mode Transitions
- Smooth transitions between modes
- Preserve user context during mode changes
- Clear affordances for mode activation/deactivation

## Testing Standards

### Visual Regression
- Test all components across different modes
- Verify consistent spacing and alignment
- Check responsive behavior at all breakpoints

### Performance
- Measure render performance of animated components
- Monitor memory usage during extended sessions
- Validate smoothness of interactive elements

### Accessibility
- Keyboard navigation testing
- Screen reader compatibility
- Color contrast validation
- Focus management verification

## Maintenance

### Component Updates
- Update documentation when component styles change
- Maintain backward compatibility when possible
- Document breaking changes clearly

### Review Process
- All UI changes require accessibility review
- Performance impact assessment for new features
- Cross-browser compatibility testing