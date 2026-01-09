# ConvoCue - AI-Powered Conversation Assistant

ConvoCue is a privacy-first, on-device AI conversation assistant that provides real-time cues and suggestions for live interactions. Built with a focus on accessibility and security, it helps users navigate complex social situations, professional meetings, and cross-cultural communication.

## Key Features

- **Real-time Speech Analysis**:
    - **Speech-to-Text**: High-performance transcription using Whisper Tiny with WASM backend.
    - **Voice Activity Detection (VAD)**: Optimized audio processing to minimize power consumption using Silero VAD.
    - **Speaker Detection**: Distinguishes between different speakers in a conversation.
    - **Audio Visualizer**: Real-time visualization of audio input levels.
- **Advanced AI Intelligence**:
    - **Context-Aware Suggestions**: Powered by SmolLM2-135M-Instruct for natural, relevant responses.
    - **Intent Recognition**: Detects conversational goals (e.g., conflict resolution, strategic planning) with semantic tagging.
      - **11 Intent Categories**: social, question, conflict, strategic, action, empathy, language, negotiation, leadership, clarity, execution, cultural, learning
      - **Configurable Confidence Threshold**: Adjustable sensitivity (default: 0.4 for better initial experience)
      - **Context-Aware Disambiguation**: Differentiates between similar phrases based on surrounding context
      - **Sarcasm Detection**: Advanced algorithms to identify potential sarcasm and idiomatic expressions
      - **Intent-Based Semantic Tags**: Automatically tags responses with semantic markers for better UI feedback
      - **Multi-Intent Detection**: Ability to detect multiple intents simultaneously
      - **High-Performance Real-Time Detection**: Optimized for fast processing during live conversations
    - **Emotion Analysis**: Monitors emotional tone to provide more empathetic cues.
    - **Sentiment Analysis**: Tracks conversation sentiment trends over time.
    - **Cultural Intelligence**: Multi-layered support for culturally sensitive communication with context detection.
- **Personalized Coaching Systems**:
    - **Relationship Coaching**: EQ-focused coaching with active listening and empathy suggestions.
    - **Anxiety Support**: Confidence-boosting and low-pressure follow-up questions for social anxiety.
    - **Professional Coaching**: Workplace-appropriate cues that project confidence and authority.
    - **Meeting Aide**: Strategic interjections and summaries for professional meetings.
    - **Language Learning**: Natural phrasing and grammar corrections for language learners.
    - **Cross-Cultural Guide**: Culturally sensitive phrasing suggestions with context awareness.
    - **Coaching Insights**: Personalized, AI-driven feedback with priority system and category scoring.
- **Auto-Persona Orchestration**:
    - **Smart Persona Switching**: Automatically switches between personas based on conversation context.
    - **Intent-Based Orchestration**: Uses detected intents to determine optimal persona.
    - **Keyword Recognition**: Identifies relevant keywords to trigger persona changes.
    - **History Context**: Considers conversation history for better persona selection.
    - **Sensitivity Controls**: Adjustable sensitivity for persona switching.
    - **Manual Override**: Allows users to manually select personas when needed.
- **Customization & Personalization**:
    - **Persona Engine**: Choose from preset personas or create custom AI behaviors.
    - **Persona Customization**: Create, edit, and save custom personas with tailored prompts.
    - **Cultural Context Selection**: Adjust communication style based on cultural context.
    - **Social Success Score (SSS)**: A gamified dashboard tracking communication growth through sentiment and engagement metrics.
    - **Subtle Mode**: Minimalist UI cues for discreet assistance with haptic feedback.
    - **Dyslexic-Friendly Mode**: Specialized font and layout for users with dyslexia.
    - **Compact Mode**: Minimal UI for focused interaction.
    - **Intent Detection Settings**: Configurable confidence thresholds, debounce windows, and sticky durations.
    - **Haptic Feedback Settings**: Adjustable intensity and patterns for tactile notifications.
- **Accessibility Features**:
    - **Dyslexic-Friendly Font**: Specialized typography for improved readability.
    - **Haptic Feedback**: Tactile responses for subtle mode notifications (device/browser dependent).
      - **Visual Fallback**: Automatic visual cues when haptic feedback is unavailable.
      - **Adjustable Intensity**: Customizable vibration strength to match device capabilities.
      - **Browser Compatibility**: Works on most mobile browsers; visual feedback on unsupported platforms.
    - **Screen Reader Support**: Full ARIA compliance for visually impaired users.
    - **High Contrast Mode**: Enhanced visibility for users with visual impairments.
    - **Keyboard Navigation**: Full keyboard support for all interface elements.
    - **Non-Color Visual Patterns**: Visual indicators that don't rely on color alone.
- **Privacy & Security**:
    - **100% On-Device**: All processing (audio, ML inference, storage) stays on your device.
    - **Encrypted Storage**: Local personalization data is encrypted before being saved to the browser.
    - **Privacy Mode**: Option to disable personalization and data collection.
    - **Data Portability**: Full control to export or hard-reset your conversation history and learned data.
    - **Secure Local Storage**: Client-side encryption for all persistent user data.
    - **Structured Transparency**: Detailed logs showing exactly how your data is used.
- **User Experience**:
    - **Interactive Onboarding**: Guided tutorial for new users.
    - **Performance Diagnostics**: Real-time monitoring of system health, inference latency, and VAD performance.
    - **Mobile-Optimized**: Responsive design tailored for field use with memory optimization.
    - **Conversation History**: Track and review past interactions with sentiment analysis.
    - **Feedback System**: Like/dislike functionality to improve AI suggestions.
    - **Settings Panel**: Comprehensive configuration options for all features.
    - **Bias Monitoring Dashboard**: Tools to monitor and address potential AI bias.
    - **Cultural Disclaimer**: Clear disclaimers about cultural guidance limitations.
- **Performance Optimization**:
    - **Memory Management**: Aggressive memory management for mobile devices with automatic model unloading.
    - **Adaptive Performance**: Dynamic adjustment based on device capabilities and memory usage.
    - **Web Workers**: Background processing to keep the UI responsive during heavy ML tasks.
    - **Model Quantization**: Q4 quantized models for efficient on-device inference.
    - **Thread Optimization**: Dynamic thread allocation based on hardware capabilities.
    - **Low Memory Mode**: Automatic optimization for devices with limited resources.
    - **Progressive Loading**: Models load progressively to reduce initial wait times.
    - **Aggressive Caching**: Intelligent caching to reduce redundant processing.

## Use Cases

- **Social Support**: Navigation of stressful social interactions for individuals with social anxiety or neurodivergence.
- **Professional Excellence**: Real-time cues for meetings, negotiations, and sales calls.
- **Cross-Cultural Communication**: Bridging gaps with culturally appropriate phrasing and context.
- **Language Learning**: Real-time grammar feedback and natural idiom suggestions.
- **Public Speaking**: Confidence-building cues for presentations and speeches.
- **Therapy Support**: Guided responses for mental health conversations.
- **Interview Preparation**: Real-time feedback during practice interviews.

## Technical Architecture

ConvoCue leverages a modern, decoupled architecture to ensure high performance and privacy:

- **Frontend**: React 19 with Vite build system and an **Event-Driven Core** powered by a central Event Bus (`mitt`).
- **ML Inference**: Transformers.js and ONNX WebAssembly for running models directly in the browser.
- **Background Processing**: Web Workers handle heavy ML tasks to keep the UI responsive.
- **Audio Stack**: Web Audio API for low-latency capture and VAD integration with Silero VAD.
- **Security**: Client-side encryption for all persistent user data using secure localStorage.
- **UI Framework**: Tailwind CSS with Lucide React icons for consistent design.
- **Analytics**: Vercel Analytics for performance monitoring (opt-in).
- **Testing**: Vitest with React Testing Library for comprehensive test coverage.
- **Configuration**: Centralized AppConfig with device detection and adaptive settings.
- **Performance Monitoring**: Built-in tools for tracking latency, memory usage, and processing times.
- **Cultural Intelligence**: Multi-dimensional analysis based on Hofstede's cultural dimensions.
- **Intent Recognition**: Sophisticated NLP system with pattern matching and similarity algorithms.

## Documentation

For more detailed technical insights, see the `docs/` directory:
- [Event Architecture](./docs/event-architecture.md)
- [Intent Recognition](./docs/intent-recognition.md)
- [Performance Optimization](./docs/performance-optimization.md)
- [Props Handling](./docs/props-handling.md)
- [Coaching Insights System](./docs/coaching-insights.md)
- [Cultural Intelligence System](./docs/cultural_intelligence_system.md)
- [Intent Taxonomy](./docs/intent_taxonomy.md)

## Getting Started

1.  **Clone & Install**:
    ```bash
    npm install
    ```
2.  **Run Development Server**:
    ```bash
    npm run dev
    ```
3.  **Build for Production**:
    ```bash
    npm run build
    ```
4.  **Run Tests**:
    ```bash
    npm run test
    ```
5.  **Lint Code**:
    ```bash
    npm run lint
    ```
6.  **Run Tests with UI**:
    ```bash
    npm run test:ui
    ```
7.  **Preview Production Build**:
    ```bash
    npm run preview
    ```

## Privacy Policy

ConvoCue is built on the principle of radical privacy. **No audio or text data is ever sent to a server.** All data processing, from voice activity detection to AI inference, happens locally within your browser. Transparency reports are available in the settings menu to show exactly how your data is used.

## License

MIT License. See [LICENSE](./LICENSE) for details.