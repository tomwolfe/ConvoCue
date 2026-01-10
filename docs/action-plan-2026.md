# ConvoCue 90-Day Action Plan (2026)

## Executive Summary
This plan outlines a 90-day strategic roadmap to transform ConvoCue into a high-performance, high-relevance social companion. By targeting the top 20% of technical and UX friction points, we aim to reduce task abandonment by 40% and achieve sub-1.2s suggestion latency.

## Prioritization Matrix (Weighted Impact-Effort)

| Issue | Impact (1-10) | Effort (1-10) | Score (I * E) | Priority |
| :--- | :--- | :--- | :--- | :--- |
| **Suggestion Latency** | 10 | 8 | 80 | **Critical** |
| **Suggestion Relevance** | 9 | 7 | 63 | **High** |
| **Task Abandonment** | 9 | 6 | 54 | **High** |
| **Worker Instability** | 8 | 4 | 32 | **Medium** |
| **Persona Flicker** | 6 | 3 | 18 | **Low** |
| **Haptic Lag** | 7 | 2 | 14 | **Low** |

## Key Performance Indicators (KPIs)

| KPI | Baseline (Jan 2026) | Target (90 Days) |
| :--- | :--- | :--- |
| **Suggestion Latency (SL)** | 2.5s - 4.0s | **< 1.2s** |
| **Relevance Score (RS)** | ~65% (est.) | **> 90%** |
| **Task Abandonment Rate** | ~35% (est.) | **< 20%** |
| **Worker Restarts** | 2-3 / session | **0** |
| **Haptic Latency (HL)** | 300ms - 500ms | **< 200ms** |

---

## Phase 1: Foundation & Speed (Days 1–30)
**Goal**: Technical stabilization and sub-1.5s latency.

### Cycle 1: The Fast-Path (Days 1–14)
- **Inference Pipeline**: Implement "Active Context" pre-warming in `useMLWorker`.
- **Haptic Fast-Path**: Direct binding of intent detection to haptic drivers to bypass the event bus.
- **Stability**: Harden worker lifecycle to prevent resets during settings changes.

### Cycle 2: Intelligence Foundation (Days 15–30)
- **Prompt Optimization**: Pre-compile static persona tokens; use incremental context updates.
- **Persona Smoothing**: Implement the 30s "Sticky Persona" duration and hysteresis logic.
- **Baseline Analytics**: Establish concrete abandonment tracking via `session_purged` vs `interaction_completed` metrics.

---

## Phase 2: Relevance & Engagement (Days 31–60)
**Goal**: Personalization and meaningful coaching.

### Cycle 3: Personalization (Days 31–45)
- **Feedback Loop**: Integrate `analyzeFeedbackTrends` directly into the LLM prompt generation for real-time adaptation.
- **Preference Learning**: Automatically adjust suggestion length and tone based on user's "Improvement Areas" (e.g., if user dislikes "longResponses", auto-truncate).
- **Subtle Mode Expansion**: Introduce haptic-only cues for high-confidence intents to reduce visual clutter.

### Cycle 4: Coaching & Context (Days 46–60)
- **Contextual Awareness**: Improve `isResponseRelevant` logic using semantic embedding comparisons instead of keyword matching.
- **Proactive Coaching**: Trigger coaching insights *during* silence gaps rather than after speech, using VAD (Voice Activity Detection) cues.

---

## Phase 3: Growth & Optimization (Days 61–90)
**Goal**: User retention and system polish.

### Cycle 5: Abandonment Reduction (Days 61–75)
- **Onboarding Refinement**: Implement a "Tutorial 2.0" that focuses on AI personalization settings.
- **Frictionless Feedback**: Introduce 1-tap "Correction" mode where users can quickly edit a suggestion to train the model.
- **Offline Reliability**: Ensure all features function with zero latency in Airplane Mode (fully local inference).

### Cycle 6: Final Polish (Days 76–90)
- **UI/UX Audit**: Minimize layout shift during persona transitions.
- **Performance Wrap-up**: Final pass on memory management (History Trimming) to ensure stability in 2-hour+ sessions.
- **90-Day Review**: Final KPI measurement and planning for 2026 H2.

---

## Measurement Methodology
- **Abandonment Rate**: Calculated as `1 - (interactions_with_feedback / total_detected_cues)`.
- **Latency**: Measured using `performance.now()` from `STT_START` to `LLM_FIRST_TOKEN`.
- **Relevance**: 7-day rolling average of `thumbs_up / (thumbs_up + thumbs_down)`.