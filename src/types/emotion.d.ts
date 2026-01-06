// Type definitions for emotion analysis utilities

interface EmotionWords {
  [key: string]: string[];
}

interface VadScores {
  valence: number;
  arousal: number;
  dominance: number;
}

interface EmotionAnalysisResult {
  emotion: string;
  confidence: number;
  valence: number;
  arousal: number;
  dominance: number;
}

interface SentimentAnalysisResult {
  valence: number;
  arousal: number;
  dominance: number;
}

interface PhraseExtractionResult {
  phrases: string[];
}