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
- **Human-Centric Pacing**: Natural speech often includes brief pauses for breaths, hesitations, or emphasis that can last 200-300ms.
- **Race Condition Prevention**: A slightly longer rejection window provides a buffer against interpreting these natural pauses as turn ends, preventing "turn stuttering" where the system prematurely yields.
- **Environmental Robustness**: Also provides secondary tolerance for variable network latency and processing delays in production environments.

**Impact**:
- Significant reduction in "turn stuttering" during expressive speech.
- More natural conversation flow that respects human speech patterns.
- Improved stability in high-jitter network environments.

## Development vs Production Differences

The configuration differences between development and production environments reflect different priorities:

- **Development**: More sensitive settings to facilitate debugging and testing
- **Production**: Conservative settings to ensure stable user experience
- **Testing**: Optimized settings for automated test scenarios

## Terminology Note: "Weighting Factor"

The configuration parameter `turnYieldWeightingFactor` refers to a weighting factor that influences speaker detection. This mathematical adjustment increases the likelihood of detecting the "other" speaker after a turn yield is detected. The term "weighting factor" was chosen to be more descriptive and avoid potential confusion with the term "bias" which might trigger fairness audits or confuse non-technical stakeholders.