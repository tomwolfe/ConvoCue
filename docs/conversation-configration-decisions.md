# Conversation Configuration Decisions

This document explains the rationale behind key configuration decisions in the conversation system.

## Production Configuration Adjustments

### Speaker Confidence Threshold Adjustment

**Change**: Increased `speakerConfidenceHigh` from 0.6 to 0.65 in production environment.

**Rationale**: 
- In production environments, audio quality can be more variable due to different microphones, background noise, and acoustic conditions
- A higher confidence threshold reduces false speaker change detections that could cause jarring turn changes
- This conservative approach prioritizes conversation stability over sensitivity in real-world usage
- The 0.05 increase represents a balance between reducing false positives while still allowing legitimate speaker changes to be detected

**Impact**:
- Fewer false speaker change detections in production
- Slightly slower response to genuine speaker changes
- More stable conversation flow with reduced turn stuttering

### Rejection Window Adjustment

**Change**: Increased `rejectionWindowMs` from 300ms to 350ms in production environment.

**Rationale**:
- Production environments may have more variable network latency and processing delays
- A slightly longer rejection window provides more tolerance for timing variations
- Helps prevent premature turn changes when the same speaker continues talking after a brief pause

## Development vs Production Differences

The configuration differences between development and production environments reflect different priorities:

- **Development**: More sensitive settings to facilitate debugging and testing
- **Production**: Conservative settings to ensure stable user experience
- **Testing**: Optimized settings for automated test scenarios

## Terminology Note: "Bias" vs "Weighting"

The configuration parameter `turnYieldBiasMultiplier` uses the term "bias" in a technical sense to refer to a weighting factor that influences speaker detection. In this context, "bias" does not refer to unfair discrimination but rather to a mathematical adjustment that increases the likelihood of detecting the "other" speaker after a turn yield is detected. This term has been kept for consistency with common technical usage in machine learning and signal processing, but could alternatively be described as "turn-yield weighting" or "response propensity adjustment".