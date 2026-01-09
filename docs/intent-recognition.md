# Intent Recognition & Auto-Persona Orchestration

## Overview

ConvoCue uses a sophisticated, weighted NLP-based intent recognition system to provide context-aware suggestions and automatically adapt coaching personas. This system replaces simple keyword matching with a multi-factor analysis that understands the "intent" and "context" behind a user's speech in real-time.

## Privacy & Security

**100% Client-Side Implementation.**
The intent recognition system is designed with absolute privacy in mind. All pattern analysis, keyword matching, and scoring algorithms run entirely within the user's browser/device. 
- No conversational transcripts or intent data are ever sent to a server for analysis.
- Pattern matching is performed against local, pre-defined rules.
- Verification: The implementation in `src/utils/intentRecognition.js` uses only local JavaScript logic and avoids all external API calls.

## Core Logic

Located in `src/utils/intentRecognition.js` and `src/utils/personaOrchestrator.js`.

1.  **Pattern Matching**: Pre-defined patterns for over 15 intents (e.g., `strategic`, `conflict`, `empathy`).
2.  **Pre-compiled RegEx**: Patterns are pre-compiled on initialization to ensure sub-millisecond analysis on every conversational turn.
3.  **Similarity Matching**: Uses character-based similarity (Jaccard index) to handle variations and typos.
4.  **Weighted Scoring**: Different intents and keywords have configurable weights that contribute to a total confidence score.

## Auto-Persona Orchestration ("Smart Switch")

The app intelligently switches between coaching personas based on the detected context.

### The Scoring Algorithm
For every transcript update, the system calculates a score for each available persona:
- **Positive Reinforcement**: Detected intents and keywords matching the persona's profile (e.g., "negotiate" boosts `professional`).
- **Negative Reinforcement**: Certain keywords act as penalties for specific personas (e.g., "business contract" penalizes `languagelearning`).
- **Contextual History**: Considers the last 3-5 turns of conversation for holistic understanding.
- **Current Persona Bias**: A small score advantage is given to the active persona to prevent "jitter" or frequent unnecessary switches.

### Sensitivity & Control
Users can tune the system's reactivity in the **Settings** panel:
- **High Sensitivity**: Quick to adapt, switches even on subtle context changes.
- **Medium Sensitivity**: Balanced approach.
- **Low Sensitivity**: Stable, requires strong evidence before switching.

### User Rejection & Preference Boost
The system respects user agency through two primary mechanisms:
1.  **Rejection Dampening**: If a user manually reverts an automatic switch within 15 seconds, the system temporarily increases the threshold for that persona.
2.  **Manual Preference Boost**: When a user manually selects a persona, that persona receives a temporary scoring advantage (10-minute window) to prevent the system from immediately switching back to its autonomous choice.

### Diagnostics & Transparency
To ensure the "Smart Switch" isn't a black box, the system maintains a **System Diagnostics** log:
- Every automatic switch is recorded with its confidence score and primary trigger (keyword or intent).
- Manual rejections and preference boosts are logged.
- Users can view these logs in the **Settings > System Diagnostics** panel.

## Performance Optimization

| Intent | Triggers | Coaching Application |
| :--- | :--- | :--- |
| **Strategic** | negotiate, boss, priority, contract | `professional` persona boost |
| **Conflict** | wrong, disagree, problem, issue | `anxiety` persona boost (De-escalation) |
| **Action** | next steps, todo, schedule | `meeting` persona boost |
| **Emotion** | anxious, worried, sorry | `anxiety` / `relationship` boost |
| **Cultural** | custom, meaning, slang, idiom | `crosscultural` boost |
| **Learning** | practice, grammar, correct | `languagelearning` boost |

## Performance Optimization

The orchestration logic is optimized for low-end devices:
- **Pattern Pre-compilation**: RegEx objects are created once, not on every turn.
- **Throttled Analysis**: Orchestration only fires on meaningful updates (e.g., sentences > 3 words or questions).
- **Performance Monitor**: If the device is in low-battery or high-memory state, the system can reduce analysis depth to prioritize responsiveness.