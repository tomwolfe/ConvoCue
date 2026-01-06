# ConvoCue - AI-Powered Conversation Assistant

ConvoCue is an AI-powered conversation assistant that listens to live conversations and suggests thoughtful, context-aware responses. The application runs entirely in the browser with all processing happening locally on your device, ensuring privacy and security.

## Features

- **Real-time Speech Recognition**: Uses Whisper Tiny for speech-to-text conversion in the browser
- **AI Response Suggestions**: Employs SmolLM2 for generating context-aware responses
- **Multiple Personas**: Choose from various conversation modes:
  - Social Coach: Encouraging and supportive responses
  - Professional: Workplace-appropriate suggestions
  - Warm Friend: Empathetic and caring responses
  - Bullet Points: Short, direct response options
  - Cross-Cultural: Culturally sensitive communication
  - Language Learning: Grammar correction and learning tips
  - Meeting Mode: Professional meeting responses
  - Emotional Support: Empathetic responses with emotional awareness
- **Extended Conversation Memory**: Maintains context across longer conversations with summarization
- **Privacy-First**: All processing happens locally in your browser
- **Mobile-Optimized**: Designed to work efficiently on mobile devices

## Use Cases

- Social anxiety support: Help users respond in conversations they find stressful
- Cross-cultural communication: Suggest culturally appropriate phrasing
- Professional settings: Meetings, sales calls, negotiations
- Language learners: Real-time feedback and learning suggestions
- Relationship coaching: Improve emotional intelligence in personal chats

## Technical Architecture

- React frontend with Vite build system
- Web Audio API with Voice Activity Detection (VAD)
- Transformers.js for on-device AI inference
- ONNX WebAssembly models for efficient processing
- Client-side only processing for privacy

## Getting Started

1. Install dependencies: `npm install`
2. Start development server: `npm run dev`
3. Build for production: `npm run build`

## Privacy

All processing happens locally in your browser. No audio or conversation data is sent to any server.