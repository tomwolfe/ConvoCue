// Configuration for ConvoCue application
export const AppConfig = {
  // Model configurations
  models: {
    stt: {
      name: 'onnx-community/whisper-tiny.en',
      device: 'wasm',
      dtype: 'q4',
      chunk_length_s: 30,
      stride_length_s: 5,
    },
    llm: {
      name: 'HuggingFaceTB/SmolLM2-135M-Instruct',
      device: 'wasm',
      dtype: 'q4',
      max_new_tokens: 128,
      temperature: 0.7,
      do_sample: true,
    }
  },

  // VAD configurations
  vad: {
    positiveSpeechThreshold: 0.55,
    negativeSpeechThreshold: 0.35,
    minSpeechFrames: 4,
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
    numThreads: 1,
    simd: true,
  },

  // System configurations
  system: {
    // Maximum length for input validation
    maxTranscriptLength: 1000,
    maxSuggestionLength: 500,

    // Validation patterns
    allowedTranscriptPattern: /^[a-zA-Z0-9\s.,!?'""-]+$/,

    // Timeout configurations
    modelLoadTimeout: 300000, // 5 minutes
    processingTimeout: 60000,  // 1 minute

    // Performance and memory configurations
    memory: {
      maxHeapSizeMB: 512,  // Maximum heap size to monitor
      gcInterval: 300000,  // Garbage collection interval (5 minutes)
      modelUnloadThreshold: 100, // Memory threshold to consider unloading models
    }
  }
};