# Coaching Insights System

## Overview

The Coaching Insights system provides personalized, AI-driven feedback and suggestions to users during conversations. It analyzes conversation content, emotional context, and user preferences to deliver actionable insights tailored to specific communication scenarios.

## Architecture

The system follows a modular design with the following key components:

- **CoachingConfig Registry**: Central registry that defines configuration for different coaching personas
- **Persona-Specific Modules**: Separate modules for anxiety, relationship, professional, and meeting coaching
- **InsightCard Component**: Reusable UI component for displaying insights
- **Personalization Engine**: Feedback-driven system that adapts to user preferences

## Priority System

Each insight is assigned a priority level that determines its visibility and prominence:

- **High Priority**: Insights that are immediately relevant or address urgent concerns
- **Medium Priority**: Insights that provide valuable guidance but aren't time-sensitive
- **Low Priority**: General suggestions for future consideration

The priority is calculated based on:
1. Confidence level of the underlying analysis
2. User feedback scores for the specific category
3. Contextual relevance to the current conversation

## Category Scores Calculation

The system tracks user preferences through category scores that influence insight prioritization:

```javascript
// Score calculation logic
const getPriority = (confidence, category, categoryScores, threshold = 2) => {
  const score = categoryScores[category] || 0;
  return (confidence > 0.7 || score > threshold) ? 'high' : 'medium';
};
```

Scores are updated based on user feedback:
- `very_helpful`: +2 points
- `somewhat_helpful`: +1 point  
- `not_helpful`: -1 point

## Coping Strategy Indexing

To address the context mismatch issue, coping strategies are now indexed per insight ID rather than per persona:

- Each insight receives a unique ID: `${persona}-${index}-${category}`
- Coping indices are stored as: `{ [insightId]: copingIndex }`
- This ensures that switching between insights maintains separate coping strategy states

## Feedback Mechanism

The system supports granular feedback with three levels:
1. Very Helpful (+2 points)
2. Somewhat Helpful (+1 point)
3. Not Helpful (-1 point)

This provides richer data for personalization compared to binary feedback systems.

## Data Persistence

All personalization data is stored locally with encryption:
- `convocue_insight_category_scores`: User preference scores
- `coaching_coping_indices`: Coping strategy indices per insight
- `dismissed_coaching_insights`: Tracking for dismissed insights

## Accessibility Features

The system includes several accessibility enhancements:
- Non-color visual patterns for insight categorization
- Clear ARIA labels and semantic HTML
- Keyboard navigation support
- Subtle mode for minimalist interface

## Testing

Comprehensive tests cover:
- Insight navigation and display
- Coping strategy cycling
- Feedback submission
- Dismissal and persistence
- Cross-persona context switching