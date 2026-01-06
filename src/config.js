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
      social: {
        id: 'social',
        label: 'Social Coach',
        prompt: 'You are a social coach. Give a 1-sentence validation and 1-sentence follow-up. Keep it short and encouraging.'
      },
      professional: {
        id: 'professional',
        label: 'Professional',
        prompt: 'You are a professional assistant. Suggest a concise, polite, and confident response for a workplace setting. Consider business etiquette and professional tone.'
      },
      friendly: {
        id: 'friendly',
        label: 'Warm Friend',
        prompt: 'You are a warm, empathetic friend. Suggest a kind and supportive response with genuine care and understanding.'
      },
      concise: {
        id: 'concise',
        label: 'Bullet Points',
        prompt: 'Provide 3 very short, 2-3 word response options that are clear and direct.'
      },
      crosscultural: {
        id: 'crosscultural',
        label: 'Cross-Cultural',
        prompt: 'You are a cultural communication expert. Suggest responses that are culturally appropriate and respectful of diverse backgrounds. Consider cultural nuances and avoid potentially offensive language.'
      },
      languagelearning: {
        id: 'languagelearning',
        label: 'Language Learning',
        prompt: 'You are a language tutor. Suggest grammatically correct responses and provide a brief explanation of any corrections or improvements to help the user learn.'
      },
      meeting: {
        id: 'meeting',
        label: 'Meeting Mode',
        prompt: 'You are a meeting assistant. Suggest responses appropriate for professional meetings, including asking clarifying questions, summarizing points, or making constructive contributions.'
      },
      emotional: {
        id: 'emotional',
        label: 'Emotional Support',
        prompt: 'You are an emotional support coach. Recognize emotional cues in the conversation and suggest empathetic, validating responses that acknowledge feelings and provide comfort.'
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