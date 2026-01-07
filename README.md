# ConvoCue - AI-Powered Conversation Assistant

ConvoCue is a privacy-first, on-device AI conversation assistant that provides real-time cues and suggestions for live interactions. Built with a focus on accessibility and security, it helps users navigate complex social situations, professional meetings, and cross-cultural communication.

## Key Features

- **Real-time Speech Analysis**:
    - **Speech-to-Text**: High-performance transcription using Whisper Tiny.
    - **Voice Activity Detection (VAD)**: Optimized audio processing to minimize power consumption.
    - **Speaker Detection**: Distinguishes between different speakers in a conversation.
- **Advanced AI Intelligence**:
    - **Context-Aware Suggestions**: Powered by SmolLM2 for natural, relevant responses.
    - **Intent Recognition**: Detects conversational goals (e.g., conflict resolution, strategic planning).
    - **Sentiment Analysis**: Monitors emotional tone to provide more empathetic cues.
    - **Cultural Intelligence**: Multi-layered support for culturally sensitive communication.
- **Customization & Personalization**:
    - **Persona Engine**: Choose from preset personas (Social Coach, Professional, Warm Friend, etc.) or create your own custom AI behaviors.
    - **Social Success Score (SSS)**: A gamified dashboard tracking communication growth through sentiment and engagement metrics.
    - **Subtle Mode**: Minimalist UI cues for discreet assistance.
- **Privacy & Security**:
    - **100% On-Device**: All processing (audio, ML inference, storage) stays on your device.
    - **Encrypted Storage**: Local personalization data is encrypted before being saved to the browser.
    - **Data Portability**: Full control to export or hard-reset your conversation history and learned data.
- **User Experience**:
    - **Interactive Onboarding**: Guided tutorial for new users.
    - **Performance Diagnostics**: Real-time monitoring of system health and inference latency.
    - **Mobile-Optimized**: Responsive design tailored for field use.

## Use Cases

- **Social Support**: Navigation of stressful social interactions for individuals with social anxiety or neurodivergence.
- **Professional Excellence**: Real-time cues for meetings, negotiations, and sales calls.
- **Cross-Cultural Communication**: Bridging gaps with culturally appropriate phrasing and context.
- **Language Learning**: Real-time grammar feedback and natural idiom suggestions.

## Technical Architecture

ConvoCue leverages a modern, decoupled architecture to ensure high performance and privacy:

- **Frontend**: React (Vite) with an **Event-Driven Core** powered by a central Event Bus (`mitt`).
- **ML Inference**: Transformers.js and ONNX WebAssembly for running models directly in the browser.
- **Background Processing**: Web Workers handle heavy ML tasks to keep the UI responsive.
- **Audio Stack**: Web Audio API for low-latency capture and VAD integration.
- **Security**: Client-side encryption for all persistent user data.

## Documentation

For more detailed technical insights, see the `docs/` directory:
- [Event Architecture](./docs/event-architecture.md)
- [Intent Recognition](./docs/intent-recognition.md)
- [Performance Optimization](./docs/performance-optimization.md)
- [Props Handling](./docs/props-handling.md)

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

## Privacy Policy

ConvoCue is built on the principle of radical privacy. **No audio or text data is ever sent to a server.** All data processing, from voice activity detection to AI inference, happens locally within your browser. Transparency reports are available in the settings menu to show exactly how your data is used.

## License

MIT License. See [LICENSE](./LICENSE) for details.
