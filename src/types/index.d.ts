// Type definitions for ConvoCue application

// AppConfig types
interface AppConfigType {
  isMobile: boolean;
  models: {
    stt: {
      name: string;
      device: string;
      dtype: string;
      chunk_length_s: number;
      stride_length_s: number;
    };
    llm: {
      name: string;
      device: string;
      dtype: string;
      max_new_tokens: number;
      temperature: number;
      do_sample: boolean;
    };
    personas: Record<string, PersonaConfig>;
  };
  vad: {
    positiveSpeechThreshold: number;
    negativeSpeechThreshold: number;
    minSpeechFrames: number;
    model: string;
    workletURL: string;
    modelURL: string;
    onnxWASMPaths: Record<string, string>;
  };
  worker: {
    numThreads: number;
    simd: boolean;
  };
  system: {
    maxTranscriptLength: number;
    maxSuggestionLength: number;
    maxHistoryLength: number;
    speechAnalysis: {
      volumeThreshold: number;
      tempoThreshold: number;
    };
    allowedTranscriptPattern: RegExp;
    modelLoadTimeout: number;
    processingTimeout: number;
    memory: {
      maxHeapSizeMB: number;
      gcInterval: number;
      modelUnloadThreshold: number;
      llmInactivityTimeout: number;
    };
  };
}

interface PersonaConfig {
  id: string;
  label: string;
  description: string;
  prompt: string;
}

// ML Worker return type
interface MLWorkerType {
  status: string;
  progress: number;
  isReady: boolean;
  transcript: string;
  suggestion: string;
  emotionData: any; // Should be more specific
  isProcessing: boolean;
  processingStep: string;
  processAudio: (audioBuffer: any) => void;
  prewarmLLM: () => void;
  refreshSuggestion: () => void;
  setTranscript: (transcript: string) => void;
  setSuggestion: (suggestion: string) => void;
  setStatus: (status: string) => void;
  resetWorker: () => void;
  history: any[]; // Should be more specific
  persona: string;
  setPersona: (persona: string) => void;
  culturalContext: string;
  setCulturalContext: (context: string) => void;
  clearHistory: () => void;
}

// Emotion analysis result type
interface EmotionResult {
  emotion: string;
  confidence: number;
  valence: number;
  arousal: number;
  dominance: number;
}

// Feedback submission type
interface FeedbackData {
  suggestion: string;
  feedbackType: 'like' | 'dislike' | 'report';
  persona: string;
  culturalContext: string;
  transcript: string;
}

// Audio processing metadata
interface AudioMetadata {
  rms: number;
  duration: number;
}