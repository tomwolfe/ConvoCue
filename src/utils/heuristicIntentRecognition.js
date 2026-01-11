/**
 * Adapter classes that wrap existing heuristic implementations
 * to conform to the new interfaces
 */

import {
  analyzeConversationContext,
  analyzeSentimentTrend,
  analyzeEmotionalIntensity,
  inferCulturalContext,
  detectIntentWithFullContext
} from './enhancedIntentRecognition';
import {
  ContextDetector,
  SentimentAnalyzer,
  IntentClassifier,
  CulturalContextDetector,
  EmotionalIntensityAnalyzer,
  ConversationStageDetector
} from './intentRecognitionInterfaces';

/**
 * Adapter for heuristic-based context detection
 */
export class HeuristicContextDetector extends ContextDetector {
  async detect(conversationHistory) {
    return analyzeConversationContext(conversationHistory);
  }
}

/**
 * Adapter for heuristic-based sentiment analysis
 */
export class HeuristicSentimentAnalyzer extends SentimentAnalyzer {
  async analyze(conversationHistory) {
    return analyzeSentimentTrend(conversationHistory);
  }
}

/**
 * Adapter for heuristic-based intent classification
 */
export class HeuristicIntentClassifier extends IntentClassifier {
  async classify(input, context = null) {
    // If context is provided, use it; otherwise analyze from scratch
    const conversationHistory = context?.conversationHistory || [];
    return detectIntentWithFullContext(input, conversationHistory);
  }
}

/**
 * Adapter for heuristic-based cultural context detection
 */
export class HeuristicCulturalContextDetector extends CulturalContextDetector {
  async infer(conversationHistory) {
    return inferCulturalContext(conversationHistory);
  }
}

/**
 * Adapter for heuristic-based emotional intensity analysis
 */
export class HeuristicEmotionalIntensityAnalyzer extends EmotionalIntensityAnalyzer {
  async analyze(conversationHistory) {
    return analyzeEmotionalIntensity(conversationHistory);
  }
}

/**
 * Adapter for heuristic-based conversation stage detection
 */
export class HeuristicConversationStageDetector extends ConversationStageDetector {
  async detect(conversationHistory) {
    // Extract conversation stage from the full context analysis
    const contextAnalysis = analyzeConversationContext(conversationHistory);
    return contextAnalysis.conversationStage;
  }
}