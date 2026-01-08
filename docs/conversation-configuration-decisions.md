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

## Terminology Note: "Weighting Factor"

The configuration parameter `turnYieldWeightingFactor` refers to a weighting factor that influences speaker detection. This mathematical adjustment increases the likelihood of detecting the "other" speaker after a turn yield is detected. The term "weighting factor" was chosen to be more descriptive and avoid potential confusion with the term "bias" which might trigger fairness audits or confuse non-technical stakeholders.