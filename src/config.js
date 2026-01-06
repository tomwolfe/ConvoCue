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
        description: 'Friendly validation and natural follow-up questions.',
        prompt: 'Validate the user\'s statement briefly and ask one natural follow-up question. Keep it under 20 words.'
      },
      professional: {
        id: 'professional',
        label: 'Professional',
        description: 'Polite, confident, and workplace-appropriate responses.',
        prompt: 'Provide a concise, professional, and polite response for a workplace setting. Keep it under 15 words.'
      },
      friendly: {
        id: 'friendly',
        label: 'Warm Friend',
        description: 'Empathetic and supportive responses for close friends.',
        prompt: 'Respond as a warm, supportive friend. Acknowledge feelings with care. Keep it informal and under 20 words.'
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
        description: 'Culturally sensitive and respectful suggestions.',
        prompt: 'Suggest a respectful response that avoids idioms and shows cultural awareness. Keep it brief.'
      },
      languagelearning: {
        id: 'languagelearning',
        label: 'Language Tutor',
        description: 'Corrects grammar and suggests natural phrasing.',
        prompt: 'Suggest a more natural way to say what the user said, then ask a follow-up question. Be brief.'
      },
      meeting: {
        id: 'meeting',
        label: 'Meeting Aide',
        description: 'Helpful interjections and summaries for meetings.',
        prompt: 'Suggest a concise interjection for a professional meeting to help the user contribute. Under 15 words.'
      },
      emotional: {
        id: 'emotional',
        label: 'Emotional Support',
        description: 'Deep validation and comfort for stressful times.',
        prompt: 'Provide deep emotional validation. Use gentle phrases like "It makes sense you feel...". Keep it very brief.'
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