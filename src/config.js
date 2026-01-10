// Device detection
const isMobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

// Default personas for ConvoCue
const DEFAULT_PERSONAS = {
  anxiety: {
    id: 'anxiety',
    label: 'Social Anxiety',
    description: 'Confidence boosts and low-pressure follow-up questions.',
    prompt: 'The user is feeling anxious. Provide a warm, validating confidence boost or a low-pressure, open-ended observation to bridge silence. Use gentle, encouraging language. Keep it under 15 words.'
  },
  relationship: {
    id: 'relationship',
    label: 'EQ Coach',
    description: 'Relationship coaching: empathy and active listening.',
    prompt: 'Acts as an EQ expert. Suggest responses that use active listening, label the other person\'s emotions, or validate feelings without immediately trying to "fix" the problem. Use "I" statements to express needs clearly. Keep it under 20 words.'
  },
  professional: {
    id: 'professional',
    label: 'Professional',
    description: 'Confident, clear, and workplace-appropriate cues.',
    prompt: 'Acts as a professional advisor. Provide concise, high-impact cues that project confidence. Use authoritative but collaborative language (e.g., "My recommendation is..." instead of "I think..."). Focus on strategic next steps. Keep it under 15 words.'
  },
  concise: {
    id: 'concise',
    label: 'Quick Replies',
    description: '3-4 word options for fast-paced chats.',
    prompt: 'Provide three distinct 2-4 word semantic cues separated by " | ". Example: "Ask why | Smile | Reassure".'
  },
  crosscultural: {
    id: 'crosscultural',
    label: 'Cultural Guide',
    description: 'Culturally sensitive phrasing suggestions.',
    prompt: 'Acts as a cross-cultural mediator. Suggest a response that respects the target culture\'s communication style (high/low context), formality, and face-saving norms. Avoid idioms. If no culture is specified, prioritize inclusive, respectful phrasing. Keep it brief.'
  },
  languagelearning: {
    id: 'languagelearning',
    label: 'Language Tutor',
    description: 'Natural phrasing and grammar corrections.',
    prompt: 'Acts as a helpful language coach. If the user makes a mistake, suggest a natural, idiomatic correction. Otherwise, provide a natural follow-up question to keep the conversation flowing. Be encouraging and brief.'
  },
  meeting: {
    id: 'meeting',
    label: 'Meeting Aide',
    description: 'Interjections and summaries for professional meetings.',
    prompt: 'Acts as a strategic meeting assistant. Suggest a concise interjection to summarize a complex point, ask a calibrated question (e.g., "How does this align with our goals?"), or bridge to a new topic. Under 15 words.'
  }
};

// Import cultural and language learning configuration
import CulturalLanguageConfig from './config/culturalLanguageConfig.js';
import { CulturalIntelligenceConfig } from './config/culturalIntelligenceConfig.js';

// Configuration for ConvoCue application
export const AppConfig = {
  isMobile,
  culturalLanguageConfig: CulturalLanguageConfig,
  culturalIntelligenceConfig: CulturalIntelligenceConfig,

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
    // Performance optimization settings
    optimization: {
      enableDynamicQuantization: true,
      enableProgressiveLoading: true,
      enableMemoryMonitoring: true,
      enableAdaptiveThreading: true
    }
  },

  // System configurations
  system: {
    // Maximum length for input validation
    maxTranscriptLength: isMobile ? 500 : 1000,
    maxSuggestionLength: isMobile ? 250 : 500,
    maxHistoryLength: isMobile ? 15 : 30, // Increased history length for better context
    maxCoachingInsightsSize: isMobile ? 50000 : 100000, // 50KB on mobile, 100KB on desktop

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

    // Haptic Feedback Patterns
    haptics: {
      intentMap: {
        'CONFLICT': 'CONFLICT',
        'ACTION_ITEM': 'ACTION',
        'ACTION': 'ACTION',
        'QUESTION': 'QUESTION',
        'STRATEGIC': 'TRANSITION',
        'NEGOTIATION': 'TRANSITION',
        'EMPATHY': 'EMPATHY',
        'SUCCESS': 'SUCCESS',
        'AGREEMENT': 'SUCCESS',
        'SUGGESTION': 'SUGGESTION'
      }
    },

    // Persona Orchestration settings
    orchestrator: {
      stickyCooldownMs: 30000,
      
      // Cycle 2 Post-Sprint: Dynamic Similarity Matrix for Cooldowns
      // High similarity = shorter cooldown (10s), Low similarity = standard cooldown (30s)
      similarityMatrix: {
        'meeting': ['professional', 'concise'],
        'professional': ['meeting', 'crosscultural'],
        'anxiety': ['relationship'],
        'relationship': ['anxiety'],
        'languagelearning': ['crosscultural'],
        'crosscultural': ['languagelearning', 'professional']
      },

      // Cycle 2 Post-Sprint: Scalable Feature Priority Matrix
      // Key: Persona -> { Feature: PriorityMultiplier }
      priorityMatrix: {
        'meeting': { 'meeting': 2.0, 'professional': 1.5 },
        'professional': { 'professional': 2.0, 'meeting': 1.5 },
        'relationship': { 'relationship': 2.0, 'anxiety': 1.5 },
        'anxiety': { 'anxiety': 2.0, 'relationship': 1.5 },
        'languagelearning': { 'languagelearning': 2.0, 'cultural': 1.5 },
        'crosscultural': { 'cultural': 2.0, 'languagelearning': 1.5 }
      },

      thresholdBase: 0.7, // Base threshold for switching
      keywordWeight: 0.3,
      historyWeight: 0.1,
      currentPersonaBias: 0.2,
      manualPreferenceBoost: 0.4, // Boost for user-selected persona
      rejectionDampening: 0.3, // How much to increase threshold after a rejection
      ignoreKeywords: [], // Keywords allowed to overlap between personas
      sensitivityPresets: {
        low: 1.5,    // Multiplier for base (higher = harder to switch)
        medium: 1.0, // Multiplier for base
        high: 0.5    // Multiplier for base (lower = easier to switch)
      },
      intentMap: {
        anxiety: {
          intents: ['empathy', 'conflict', 'interruption'],
          keywords: ['nervous', 'stressed', 'anxious', 'fear', 'scared', 'worried', 'stop', 'wait', 'panic', 'terrified', 'shaking', 'uncomfortable'],
          negativeKeywords: ['negotiate', 'deal', 'contract', 'grammar', 'vocabulary'],
          weight: 1.2
        },
        relationship: {
          intents: ['empathy', 'social', 'participation'],
          keywords: ['feel', 'understand', 'connect', 'share', 'thoughts', 'opinions', 'partner', 'friend', 'family', 'honest', 'listen', 'vulnerable'],
          negativeKeywords: ['agenda', 'minutes', 'meeting', 'contract'],
          weight: 1.0
        },
        professional: {
          intents: ['strategic', 'negotiation', 'leadership'],
          keywords: ['negotiate', 'important', 'manager', 'executive', 'contract', 'deal', 'strategy', 'interview', 'salary', 'promotion', 'feedback', 'career', 'client', 'project'],
          negativeKeywords: ['grammar', 'vocabulary', 'lesson', 'homework'],
          weight: 1.1
        },
        meeting: {
          intents: ['action', 'execution', 'clarity', 'participation'],
          keywords: ['todo', 'action', 'next steps', 'plan', 'schedule', 'clear', 'minutes', 'agenda', 'collaborate', 'brief', 'sync', 'touchbase', 'update'],
          negativeKeywords: ['date', 'romance', 'feelings'],
          weight: 1.0
        },
        crosscultural: {
          intents: ['clarity', 'cultural'],
          keywords: ['culture', 'custom', 'tradition', 'translation', 'language', 'meaning', 'slang', 'idiom', 'international', 'foreign', 'travel', 'abroad', 'respectful'],
          weight: 1.1
        },
        languagelearning: {
          intents: ['clarity', 'learning'],
          keywords: [
            'grammar', 'vocabulary', 'phrase', 'speak', 'say', 'correct', 'pronounce', 'word',
            'fluent', 'practice', 'expression', 'translate', 'sentence', 'verb', 'noun',
            'adjective', 'pronunciation', 'accent', 'fluency', 'idiom', 'slang', 'colloquial',
            'syntax', 'morphology', 'phonetics', 'articulation', 'diction', 'inflection',
            'conjugation', 'declension', 'syntax', 'semantics', 'pragmatics', 'discourse'
          ],
          negativeKeywords: ['business contract', 'legal agreement', 'strategic partnership', 'quarterly results'],
          weight: 1.1
        },
        concise: {
          intents: ['greeting', 'agreement'],
          keywords: ['hi', 'hello', 'yes', 'ok', 'thanks', 'bye'],
          weight: 0.7
        }
      }
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