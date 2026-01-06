// Device detection
const isMobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

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
    personas: {
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
        prompt: 'Suggest a respectful response that avoids idioms and shows cultural awareness. If a specific culture is mentioned, adapt accordingly. Keep it brief.'
      },
      languagelearning: {
        id: 'languagelearning',
        label: 'Language Tutor',
        description: 'Natural phrasing and grammar corrections.',
        prompt: 'Suggest a more natural way to say what the user said, then ask a follow-up question. Be brief and encouraging.'
      },
      meeting: {
        id: 'meeting',
        label: 'Meeting Aide',
        description: 'Interjections and summaries for professional meetings.',
        prompt: 'Suggest a concise interjection to help the user contribute to a meeting or summarize a point. Under 15 words.'
      }
    }
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
    numThreads: 1, // Keep at 1 for both mobile and desktop to be safe
    simd: true,
  },

  // System configurations
  system: {
    // Maximum length for input validation
    maxTranscriptLength: isMobile ? 500 : 1000,
    maxSuggestionLength: isMobile ? 250 : 500,
    maxHistoryLength: isMobile ? 4 : 8, // Increased history length for better context

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
    }
  }
};