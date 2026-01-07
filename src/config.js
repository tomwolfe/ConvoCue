// Device detection
const isMobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

// Default personas for ConvoCue
const DEFAULT_PERSONAS = {
  anxiety: {
    id: 'anxiety',
    label: 'Social Anxiety',
    description: 'Confidence boosts and low-pressure follow-up questions.',
    prompt: 'The user is feeling anxious. Provide a warm, validating confidence boost or a simple, open-ended but low-pressure follow-up question. Avoid complex topics. Keep it under 12 words.'
  },
  relationship: {
    id: 'relationship',
    label: 'EQ Coach',
    description: 'Relationship coaching: empathy and active listening.',
    prompt: 'Focus on emotional intelligence. Suggest a response that uses active listening or validates the other person\'s feelings. Use "I" statements where appropriate. Keep it under 20 words.'
  },
  professional: {
    id: 'professional',
    label: 'Professional',
    description: 'Confident, clear, and workplace-appropriate cues.',
    prompt: 'Provide a concise, professional response that demonstrates competence and clarity. Focus on next steps or constructive input. Keep it under 15 words.'
  },
  concise: {
    id: 'concise',
    label: 'Quick Replies',
    description: '3-4 word options for fast-paced chats.',
    prompt: 'Give three short (2-4 words) response options separated by " | ". Use natural spoken English.'
  },
  crosscultural: {
    id: 'crosscultural',
    label: 'Cultural Guide',
    description: 'Culturally sensitive phrasing suggestions.',
    prompt: 'Suggest a respectful response that avoids idioms and shows cultural awareness. Consider high-context vs low-context communication styles. If a specific culture is mentioned, adapt accordingly with appropriate formality and respect. Keep it brief but culturally appropriate.'
  },
  languagelearning: {
    id: 'languagelearning',
    label: 'Language Tutor',
    description: 'Natural phrasing and grammar corrections.',
    prompt: 'Suggest a more natural way to say what the user said, then ask a follow-up question. Be brief and encouraging. If specific language/culture is mentioned, incorporate cultural appropriateness.'
  },
  meeting: {
    id: 'meeting',
    label: 'Meeting Aide',
    description: 'Interjections and summaries for professional meetings.',
    prompt: 'Suggest a concise interjection to help the user contribute to a meeting or summarize a point. Under 15 words. Consider professional formality and cultural appropriateness in diverse settings.'
  }
};

// Configuration for ConvoCue application
export const AppConfig = {
  isMobile,

  // Model configurations
  models: {
    stt: {
      name: 'onnx-community/whisper-tiny.en',
      device: 'wasm',
      dtype: 'q4',
      chunk_length_s: isMobile ? 15 : 30,
      stride_length_s: isMobile ? 2 : 5,
    },
    llm: {
      name: 'HuggingFaceTB/SmolLM2-135M-Instruct',
      device: 'wasm',
      dtype: 'q4',
      max_new_tokens: isMobile ? 64 : 128,
      temperature: 0.7,
      do_sample: true,
    },
    personas: DEFAULT_PERSONAS
  },

  // VAD configurations
  vad: {
    positiveSpeechThreshold: 0.6,
    negativeSpeechThreshold: 0.4,
    minSpeechFrames: 3,
    model: "v5",
    workletURL: "/vad.worklet.bundle.min.js",
    modelURL: "/silero_vad_v5.onnx",
    onnxWASMPaths: {
      "ort-wasm-simd-threaded.wasm": "/ort-wasm-simd-threaded.wasm",
      "ort-wasm-simd-threaded.mjs": "/ort-wasm-simd-threaded.mjs",
      "ort-wasm-simd-threaded.jsep.wasm": "/ort-wasm-simd-threaded.jsep.wasm",
      "ort-wasm-simd-threaded.jsep.mjs": "/ort-wasm-simd-threaded.jsep.mjs",
    }
  },

  // ML Worker configurations
  worker: {
    // Dynamically set threads based on hardware, but cap for mobile to prevent memory pressure
    numThreads: isMobile 
      ? Math.min(2, (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 1)
      : Math.min(4, (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 2),
    simd: true,
  },

  // System configurations
  system: {
    // Maximum length for input validation
    maxTranscriptLength: isMobile ? 500 : 1000,
    maxSuggestionLength: isMobile ? 250 : 500,
    maxHistoryLength: isMobile ? 6 : 12, // Increased history length for better context

    // Speech analysis settings
    speechAnalysis: {
      volumeThreshold: 0.01, // Minimum RMS volume to consider speech "energetic"
      tempoThreshold: 3.0,   // Words per second threshold for "fast" speech
    },

    // Validation patterns
    allowedTranscriptPattern: /^[a-zA-Z0-9\s.,!?'""-]+$/,

    // Timeout configurations
    modelLoadTimeout: 300000, // 5 minutes
    processingTimeout: 60000,  // 1 minute

    // Performance and memory configurations
    memory: {
      maxHeapSizeMB: isMobile ? 250 : 512,
      gcInterval: isMobile ? 30000 : 60000,
      modelUnloadThreshold: isMobile ? 70 : 85,
      llmInactivityTimeout: isMobile ? 20000 : 60000, // Very aggressive on mobile
    },

    // Performance thresholds
    performance: {
      memoryThreshold: 100 * 1024 * 1024, // 100MB
      conversationLengthThreshold: isMobile ? 50 : 100, // Fewer turns on mobile
      processingTimeThreshold: isMobile ? 3000 : 2000, // Allow more time on mobile
      tokenToCharRatio: 4 // Approximation: 1 token ≈ 4 characters
    },

    // Low memory mode detection
    lowMemoryMode: () => {
      // Check for low memory conditions
      const memory = typeof navigator !== 'undefined' ? navigator.deviceMemory : null;
      const hardwareConcurrency = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : null;

      // Consider low memory if device has <= 4GB RAM or <= 2 cores
      return (memory && memory <= 4) || (hardwareConcurrency && hardwareConcurrency <= 2);
    },

    // Maximum token count for conversation history
    maxTokenCount: 4000
  }
};