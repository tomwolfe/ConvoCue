# Performance Optimization

## Overview

As an on-device AI application, ConvoCue must carefully manage memory and CPU usage, especially during long conversations. The `src/utils/performanceMonitoring.js` utility provides tools to monitor and optimize performance.

## Memory Management

### History Trimming
To prevent the LLM context and React state from bloating, conversation history is automatically trimmed when it exceeds thresholds (default: 100 turns).

**Algorithm (Head/Tail Preservation):**
Instead of a simple FIFO (First-In-First-Out) queue, ConvoCue uses a preservation strategy:
1.  **Head (20%)**: Preserves the beginning of the conversation to maintain initial context/greetings.
2.  **Tail (80%)**: Preserves the most recent turns to maintain immediate context.
3.  **Middle**: Older intermediate turns are removed first.

### Size Estimation
The `estimateConversationSize` function approximates the character count of the history to predict memory pressure before it affects the browser's responsiveness.

## Performance Monitoring

### `logPerformanceMetric`
Captured metrics include:
- `processingTime`: Time taken for LLM generation or audio processing.
- `conversationLength`: Number of turns.
- `estimatedSize`: Character count.

Warnings are logged to the console if `processingTime` exceeds 2 seconds or if the history approaches the 100-turn threshold.

### `usePerformanceMonitor` Hook
A higher-order function that wraps expensive operations to automatically log their performance characteristics.

## Implementation Details

- **Thresholds**: Defined in `PERFORMANCE_THRESHOLD` constant.
- **Aggressive Mode**: In low-memory environments, the system can switch to `aggressiveMemoryManagement` (via `AppConfig`), which uses tighter limits and more frequent trimming.
