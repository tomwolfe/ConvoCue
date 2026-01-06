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