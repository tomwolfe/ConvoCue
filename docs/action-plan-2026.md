# ConvoCue Action Plan: 30-Day Performance & Relevance Sprint

## Executive Summary
This plan prioritizes the 20% of technical factors (Inference Latency, Intent Accuracy, and Worker Stability) that drive 80% of the user experience. The goal is to transform ConvoCue from a "smart tool" into a "real-time companion" by hitting sub-1.2s latency targets.

## Key Performance Indicators (KPIs)

| KPI | Metric Definition | Baseline (Est.) | Target (30 Days) |
| :--- | :--- | :--- | :--- |
| **Suggestion Latency (SL)** | Speech end to first token of suggestion | 2.5s - 4.0s | **< 1.2s** |
| **Haptic Latency (HL)** | Intent detection to vibration | 300ms - 500ms | **< 200ms** |
| **Worker Stability** | Unintended worker restarts per session | 2 - 3 | **0** |
| **RS (Relevance Score)** | User thumbs-up ratio on suggestions | N/A | **> 85%** |

---

## Cycle 1: Speed & Stability (Days 1–14)
**Focus**: Eliminating technical friction in the inference pipeline.

### High-Leverage Interventions
1.  **Inference Pipeline Hardening**:
    - Stabilize `useMLWorker` to prevent unnecessary worker terminations.
    - Implement an "Active Context" keep-alive for LLM models to avoid reload latency.
2.  **Prompt Generation Refactor**:
    - Pre-compile static persona prompts.
    - Use partial updates for dynamic context (Emotion, Sentiment) to reduce string manipulation overhead.
3.  **Haptic Fast-Path**:
    - Direct binding between `detectIntentHighPerformance` and `provideHapticFeedback` to bypass the event bus for critical notifications.

### Milestones
- **Day 3**: Performance baseline established via automated benchmarks.
- **Day 7**: Sugggestion Latency reduced to < 1.8s on desktop.
- **Day 14**: Worker stability reached (0 restarts per 15-min session).

---

## Cycle 2: Intelligence & Relevance (Days 15–30)
**Focus**: Refining AI output for maximum user value.

### High-Leverage Interventions
1.  **Persona Smoothing Logic**:
    - Implement a 30s "Sticky Persona" duration to prevent flicker.
    - Increase transition thresholds during high-intensity intents (e.g., Conflict).
2.  **Coaching Calibration**:
    - Weight "Active Persona" insights 2x higher than auxiliary coaching systems in `resolveFeatureConflicts`.
3.  **Cultural Intelligence Tuning**:
    - Adjust override thresholds dynamically based on intent (e.g., Strategic vs. Social).

### Milestones
- **Day 21**: Persona switching flicker reduced by 90%.
- **Day 30**: Final KPI measurement and documentation of performance gains.

---

## Accountability & Review Process
- **Data-Driven Decisions**: No priority shift without a benchmark report.
- **Cycle Retrospectives**: Every 14 days, compare measured KPIs against targets.
- **Documentation**: All performance improvements must be logged in `docs/performance-optimization.md`.
