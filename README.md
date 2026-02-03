# ConvoCue 2: Your Local AI Social Coach

![ConvoCue 2 Logo](public/favicon.ico) <!-- Placeholder for logo -->

**ConvoCue 2** is a privacy-first, browser-based AI companion designed to help you navigate conversations with confidence. It analyzes your real-time speech locally on your device, providing subtle, personalized suggestions to enhance your social interactions—whether you're networking, navigating conflict, or just wanting to connect more deeply.

> **Privacy by Design**: All processing happens entirely in your browser. No audio, transcripts, or data are ever sent to any server.

## 🚀 How It Works

ConvoCue 2 uses a powerful, modular AI stack running directly in your browser:

1.  **Voice Activity Detection (VAD):** Uses the Silero VAD model to detect when you start and stop speaking.
2.  **Speech-to-Text (STT):** Transcribes your speech using the lightweight `whisper-tiny.en` model running on WebAssembly (WASM).
3.  **Intent Engine:** A fast, heuristic engine analyzes the transcript to categorize the conversation into one of four intents:
    *   **Social:** Casual talk, hobbies, greetings.
    *   **Professional:** Work, projects, deadlines.
    *   **Conflict:** Disagreements, errors, frustrations.
    *   **Empathy:** Sharing feelings, seeking support.
4.  **LLM Generation:** The compact `SmolLM2-135M` language model generates a concise (under 15 words), context-aware suggestion based on your detected intent and selected **Persona**.

All models are downloaded and run locally on your device, ensuring maximum privacy and security.

## 👤 Personalization: Choose Your Voice

Select a Persona to tailor ConvoCue's advice to your style and situation:

*   **Anxiety Coach:** Provides validating, low-pressure cues to bridge silences.
*   **Pro Exec:** Delivers sharp, authoritative advice for workplace dominance and clarity.
*   **EQ Coach:** Focuses on emotional labeling and deepening connections.
*   **Culture Guide:** Helps navigate high/low context differences and "saving face".

You can switch personas at any time to change the "voice" of your co-pilot.

## 🔋 Social Battery: Track Your Energy

ConvoCue 2 introduces the unique **Social Battery** feature to help you understand your social fatigue.

*   **Deduction:** Every word processed drains a small amount of battery.
*   **Multipliers:** High-stakes intents like `Conflict` drain battery 2x faster than `Social` talk.
*   **Exhaustion Mode:** When your battery falls below 20%, ConvoCue automatically pivots all personas to prioritize **Exit Strategies** and minimal-energy responses.

A visual battery indicator and detailed drain logs (showing *why* your battery dropped) provide clear, intuitive feedback on your social energy levels.

## 👥 Speaker Labeling

Since ConvoCue runs locally, it needs context on who is speaking. Use the **Speaker Toggle** (You/Them) to tell the AI who is currently talking. This ensures suggestions are relevant (e.g., suggesting a reply when *they* speak, or a follow-up when *you* speak).

## 📱 Getting Started

1.  **Visit** the ConvoCue 2 web app.
2.  **Grant Microphone Access** when prompted. ConvoCue will remember your choice.
3.  **Select your Persona** from the sidebar.
4.  **Start Talking!** ConvoCue will listen, analyze, and offer suggestions in real-time.

## ✨ Key Improvements (v2)

ConvoCue 2 focuses on user experience and reliability, addressing the most common frustrations:

*   **Enhanced Loading Experience:** Granular, 1% progress updates for both STT and LLM models, with estimated time remaining and engaging tips.
*   **Streamlined Microphone Flow:** Auto-retry on denied permissions, persistent state across refreshes, and a clear troubleshooting guide.
*   **Intelligent Caching:** Instant responses for common phrases (sub-50ms) and cached intent detection for faster, smoother interaction.
*   **Improved Onboarding:** A visual tutorial with a Persona comparison table and battery drain factor explanations.
*   **Better Error Handling:** Clear guidance and fallback responses during processing delays.
*   **Optimized Performance:** Reduced initial load time, improved memory management, and faster intent detection.

## 🔐 Privacy & Security

ConvoCue 2 is built on the principle of **privacy by design**. The entire application, including all AI models (Silero VAD, Whisper Tiny, SmolLM), runs in your browser. Your microphone input, transcribed text, and generated suggestions are never transmitted to any external server. Your conversations stay yours.

## 🛠️ Technical Stack

*   **Frontend:** React, Vite
*   **AI Models:** Silero VAD, ONNX Runtime Web (Whisper Tiny, SmolLM2-135M)
*   **Intent Detection:** Keyword-based heuristic engine
*   **State Management:** React Hooks
*   **Visualization:** Recharts
*   **Testing:** Jest, React Testing Library

## 📂 Project Structure (Key Files)

*   `/src/core/`: Core AI logic (VAD, STT, Intent Engine, LLM wrapper)
*   `/src/components/`: UI components (VAD visualizer, Persona selector, Insights Dashboard)
*   `/src/hooks/`: Custom hooks (`useSocialBattery`, `useML`)
*   `/public/`: Static assets (ONNX models, WASM files)
*   `/src/App.jsx`: Main application component
*   `/src/useML.js`: Orchestrates the AI pipeline and suggestion generation
*   `/src/core/intentEngine.js`: The heuristic intent classifier

## 🤝 Contributing

We welcome contributions! Please open an issue to discuss a feature or bug before submitting a pull request.

## 📜 License

MIT