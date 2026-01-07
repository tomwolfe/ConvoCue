# Intent Recognition System

## Overview

ConvoCue uses a weighted NLP-based intent recognition system to provide context-aware suggestions (cues). This replaces simple keyword matching with a similarity-based approach that understands the "intent" behind a user's speech.

## Core Logic

The system is located in `src/utils/intentRecognition.js`. It uses:
1.  **Pattern Matching**: Pre-defined patterns for common intents.
2.  **Weighted Scoring**: Different words within a pattern have different "weights" (importance).
3.  **Similarity Matching**: Uses character overlap and substring matching to handle slight variations in speech.

## Supported Intents

| Intent | Triggers | Generated Cues |
| :--- | :--- | :--- |
| **Strategic** | negotiation, boss, priority, important | Strategic, Plan ahead, Evaluate |
| **Conflict** | wrong, disagree, problem, issue | De-escalate, Soft tone, Breathe |
| **Action** | need to, should, let's, deadline | Suggest, Try, Propose |
| **Emotion** | anxious, worried, stressed | Acknowledge, Validate, Support |
| **Greeting** | hello, hi, good morning | Wave, Smile, Warmly |

## Architecture

The `detectIntentWithConfidence` function returns both the detected intent and a confidence score (0.0 to 1.0). Cues are only generated if confidence exceeds a specific threshold (default: 0.3).

### Context Awareness
The `detectIntentWithContext` function enhances detection by looking at previous turns. For example, if the previous turn was a question, the system increases the probability that the current turn is an answer or a follow-up inquiry.

## Usage in Pipeline

Intent recognition is integrated into the `enhanceResponse` pipeline in `src/utils/responseEnhancement.js`. When `Subtle Mode` is enabled, the detected intent directly drives the selection of the "Quick Cue" displayed in the `GlanceWidget`.
