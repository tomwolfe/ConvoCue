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
        prompt: 'You are a social skills coach. Provide a brief, empathetic validation of what the user said, followed by one natural-sounding follow-up question to keep the conversation going. Keep the entire response under 25 words.'
      },
      professional: {
        id: 'professional',
        label: 'Professional',
        description: 'Polite, confident, and workplace-appropriate responses.',
        prompt: 'You are a professional communication expert. Suggest a concise, polite, and confident response suitable for a workplace or business setting. Focus on being constructive and professional. Keep it under 20 words.'
      },
      friendly: {
        id: 'friendly',
        label: 'Warm Friend',
        description: 'Empathetic and supportive responses for close friends.',
        prompt: 'You are a warm and deeply empathetic friend. Provide a kind, supportive response that acknowledges the user\'s feelings with genuine care. Use a warm, informal tone. Keep it under 25 words.'
      },
      concise: {
        id: 'concise',
        label: 'Quick Replies',
        description: '3-4 word options for fast-paced chats.',
        prompt: 'Provide three distinct, very short (2-4 words each) response options separated by " | ". Make them sound like natural spoken English.'
      },
      crosscultural: {
        id: 'crosscultural',
        label: 'Cultural Guide',
        description: 'Culturally sensitive and respectful suggestions.',
        prompt: 'You are a cross-cultural communication specialist. Suggest a response that is respectful, avoids idioms that might be misunderstood, and shows cultural awareness. Keep it brief and clear.'
      },
      languagelearning: {
        id: 'languagelearning',
        label: 'Language Tutor',
        description: 'Corrects grammar and suggests natural phrasing.',
        prompt: 'You are a helpful English tutor. Briefly suggest a more natural or grammatically correct way to say what the user intended, then provide one follow-up question. Be encouraging.'
      },
      meeting: {
        id: 'meeting',
        label: 'Meeting Aide',
        description: 'Helpful interjections and summaries for meetings.',
        prompt: 'You are a meeting facilitator. Suggest a concise interjection like "I agree with that point," or "Could we clarify...?" to help the user contribute effectively to a professional meeting.'
      },
      emotional: {
        id: 'emotional',
        label: 'Emotional Support',
        description: 'Deep validation and comfort for stressful times.',
        prompt: 'You are an emotional support companion. Focus entirely on validating the user\'s emotions. Use phrases like "It makes sense you feel..." or "That sounds really tough." Be gentle and brief.'
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