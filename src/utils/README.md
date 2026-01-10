# Intent Recognition Utilities

This directory contains utilities for real-time intent detection and analysis in ConvoCue.

## Files Overview

### `intentRecognition.js`
Core intent detection system that identifies conversation intents in real-time. Features include:

- **Intent Taxonomy**: Thirteen distinct intent categories (social, question, conflict, strategic, action, empathy, language, negotiation, leadership, clarity, execution, cultural, learning)
- **High-Performance Detection**: Optimized for real-time processing with early termination
- **Context-Aware Detection**: Considers conversation history to disambiguate similar phrases
- **Similarity Matching**: Enhanced Jaccard-based algorithm with synonym support
- **Intent-Based Cues**: Generates contextual coaching cues based on detected intents

### `intentAnalytics.js`
Tracks intent detection accuracy and user feedback for continuous improvement. Features include:

- **Accuracy Tracking**: Monitors detection accuracy by intent type
- **User Feedback**: Records user corrections and confirmations
- **Performance Metrics**: Tracks detection times and success rates
- **Export/Import**: Allows exporting analytics data for analysis

### `intentPerformance.js`
Monitors performance of intent detection algorithms. Features include:

- **Timing Measurements**: Tracks execution time for different detection methods
- **Benchmarking**: Provides tools to benchmark detection performance
- **Performance Status**: Evaluates whether detection performance is optimal

### `haptics.js`
Provides haptic and visual feedback for different intent types. Features include:

- **Vibration Patterns**: Different patterns for different intent types
- **Visual Fallback**: Visual indicators when haptics aren't available
- **Cooldown Logic**: Prevents excessive feedback
- **Customizable Settings**: Allows users to adjust haptic preferences

## Usage Examples

### Basic Intent Detection
```javascript
import { detectIntent, detectIntentWithConfidence } from './utils/intentRecognition';

const intent = detectIntent("Hello, how are you?");
const { intent, confidence } = detectIntentWithConfidence("I understand your concern");
```

### Context-Aware Detection
```javascript
import { detectIntentWithContext } from './utils/intentRecognition';

const conversationHistory = [
  { content: "I'm feeling really stressed about work" },
  { content: "That sounds difficult" }
];

const result = detectIntentWithContext("I'm sorry to hear that", conversationHistory);
```

### Intent-Based Cue Generation
```javascript
import { generateIntentBasedCue } from './utils/intentRecognition';

const cue = generateIntentBasedCue("Can you explain this more?", "Sure, let me clarify...", conversationHistory);
```

### Haptic Feedback
```javascript
import { provideHapticFeedback } from './utils/haptics';

provideHapticFeedback("De-escalate [conflict]");
```

## Configuration

Intent detection can be configured via `src/config/intentDetection.js`:

- `confidenceThreshold`: Minimum confidence required for detection
- `debounceWindowMs`: Time window to prevent rapid switching
- `stickyDurationMs`: Duration to keep showing same intent

## Performance Considerations

- The high-performance detector limits similarity checks to first 5-10 tokens
- Memory usage is monitored to prevent issues on low-end devices
- Early termination is used to optimize real-time performance