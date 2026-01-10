/**
 * Persona Orchestration Configuration for ConvoCue
 */
export const OrchestratorConfig = {
  stickyCooldownMs: 30000,
  
  // High similarity = shorter cooldown (10s), Low similarity = standard cooldown (30s)
  similarityMatrix: {
    'meeting': ['professional', 'concise'],
    'professional': ['meeting', 'crosscultural'],
    'anxiety': ['relationship'],
    'relationship': ['anxiety'],
    'languagelearning': ['crosscultural'],
    'crosscultural': ['languagelearning', 'professional']
  },

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

  // Intent and keyword mapping for each persona
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
};

export default OrchestratorConfig;
