# Intent Recognition System Documentation

## Overview

ConvoCue's intent recognition system is a sophisticated, client-side NLP solution that identifies conversational goals in real-time. The system uses a combination of pattern matching, string similarity algorithms, and context-aware disambiguation to classify user input into meaningful categories.

## Intent Categories

The system recognizes 7 distinct intent categories:

### 1. Social (`social`)
Detects greetings, affirmations, acknowledgments, and social engagement cues.
- Examples: "Hello", "Hi", "Good morning", "Yes", "Absolutely", "Everyone", "What do you think?"

### 2. Question (`question`)
Identifies inquiries, requests for clarification, and follow-up prompts.
- Examples: "How?", "Why?", "What do you think?", "Can you explain?", "Tell me more"

### 3. Conflict (`conflict`)
Detects disagreements, tensions, problems, and negative sentiments.
- Examples: "Wrong", "Disagree", "Problem", "Issue", "Stop", "Wait", "I don't think so"

### 4. Strategic (`strategic`)
Identifies business discussions, planning, negotiations, and long-term thinking.
- Examples: "Negotiate", "Priority", "Contract", "Strategy", "Investment", "Director", "Urgent"

### 5. Action (`action`)
Recognizes suggestions, recommendations, tasks, and actionable items.
- Examples: "We should", "Let's", "Follow up", "Schedule", "Maybe", "Perhaps", "Try", "Consider"

### 6. Empathy (`empathy`)
Detects emotional support, validation, understanding, and compassionate responses.
- Examples: "I understand", "That sounds difficult", "I feel", "I think", "Sorry to hear", "Support"

### 7. Language (`language`)
Identifies concerns about phrasing, clarity, grammar, and linguistic precision.
- Examples: "Unclear", "Explain", "Grammar", "Better way to say", "Phrasing", "Vocabulary"

## How It Works

### Multi-Phase Detection
The system uses a three-phase approach for optimal performance:

1. **Fast Exact Matching**: Direct token matching for immediate results
2. **Regex Matching**: Pattern matching at word boundaries
3. **Similarity Calculation**: Jaccard-like overlap for fuzzy matching (limited to first 10 tokens)

### Context-Aware Disambiguation
The system handles ambiguous phrases by considering context:

- **"I'm sorry"** disambiguation:
  - "I'm sorry to hear about your loss" → `empathy`
  - "I'm sorry but that won't work" → `conflict`
  - "I'm sorry for the delay" → `social`

- **Sarcasm Detection**: Identifies potential sarcasm through contradiction markers and exaggerated language
- **Temporal Context**: Distinguishes between immediate actions and strategic planning

## Configuration Options

### Confidence Threshold
- **Default**: 0.3 (optimized for better initial user experience)
- **Range**: 0.1 to 0.9
- **Effect**: Lower values increase sensitivity but may produce more false positives

### Debounce Window
- **Default**: 800ms
- **Effect**: Prevents rapid intent switching during continuous speech

### Sticky Duration
- **Default**: 2000ms
- **Effect**: Maintains intent display for better user experience

## Performance Considerations

- **Client-Side Only**: All processing occurs in the browser for privacy
- **Token Limit**: Similarity checks limited to first 10 tokens for performance
- **Memory Efficient**: Optimized algorithms to minimize resource usage

## Extending the System

New intents can be added by:
1. Defining patterns in `src/utils/intentRecognition.js`
2. Adding corresponding UI elements
3. Updating the documentation
4. Testing thoroughly for edge cases

## Troubleshooting

### Common Issues
- **Low Detection Rate**: Consider lowering the confidence threshold
- **False Positives**: Increase the confidence threshold
- **Performance Issues**: The system is optimized for first 10 tokens; longer inputs are truncated

### Haptic Feedback
- **Not Working**: Check browser/device compatibility; visual feedback serves as fallback
- **Too Strong/Weak**: Adjust intensity in settings