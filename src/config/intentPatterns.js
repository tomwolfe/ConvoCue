/**
 * Intent patterns with weights for similarity matching
 */
export const intentPatterns = {
  social: {
    patterns: [
      { text: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'greetings', 'howdy', 'hiya', "what's up"], weight: 1.0 },
      { text: ['everyone', 'anyone', 'thoughts', 'opinions', 'feedback', 'share'], weight: 0.9 },
      { text: ['yes', 'yeah', 'yep', 'ok', 'okay', 'sure', 'absolutely', 'right', 'exactly', 'indeed', 'correct'], weight: 0.8 }
    ],
    cue: 'social'
  },
  question: {
    patterns: [
      { text: ['what', 'how', 'why', 'when', 'where', 'who', 'question'], weight: 1.0 },
      { text: ['can you', 'could you', 'would you', 'will you', 'do you', 'are you', 'is it'], weight: 0.9 },
      { text: ['tell me', 'explain', 'clarify', 'elaborate'], weight: 0.8 }
    ],
    cue: 'question'
  },
  conflict: {
    patterns: [
      { text: ['wrong', 'disagree', 'problem', 'issue', 'not happy', 'frustrated', 'mistake', 'stop', 'wait', 'hold on'], weight: 1.0 },
      { text: ['never', 'hate', 'terrible', 'awful', 'argue', 'fight', 'dispute', 'complain'], weight: 0.8 },
      { text: ['no', 'nope', 'nah', 'not really', 'disagree', "i don't think so"], weight: 0.7 }
    ],
    cue: 'conflict'
  },
  strategic: {
    patterns: [
      { text: ['negotiate', 'important', 'boss', 'manager', 'executive', 'director', 'urgent', 'priority', 'interview', 'decide', 'strategy', 'strategic'], weight: 1.0 },
      { text: ['contract', 'price', 'cost', 'deal', 'agreement', 'terms', 'align', 'vision', 'goal', 'objective'], weight: 0.9 },
      { text: ['presentation', 'meeting', 'stakeholders', 'investment', 'funding', 'revenue'], weight: 0.8 }
    ],
    cue: 'strategic'
  },
  action: {
    patterns: [
      { text: ['need to', 'should', 'will', "let's", 'assign', 'deadline', 'task', 'follow up', 'suggest', 'recommend', 'idea', 'proposal', 'thought'], weight: 1.0 },
      { text: ['todo', 'action', 'next steps', 'plan', 'schedule', 'maybe', 'perhaps', 'could', 'should', 'try'], weight: 0.8 },
      { text: ['remember', 'remind', 'organize', 'arrange', 'what if', 'how about', 'consider', 'think about'], weight: 0.7 }
    ],
    cue: 'action'
  },
  empathy: {
    patterns: [
      { text: ['feel', 'think', 'believe', 'understand', 'know', 'sorry', 'hard', 'anxious', 'worried', 'stressed'], weight: 1.0 },
      { text: ['i see', 'i hear', 'i understand', 'that makes sense', 'happy', 'excited', 'sad', 'upset'], weight: 0.9 },
      { text: ['empathize', 'relate', 'connect', 'share', 'support', 'feelings', 'emotions'], weight: 0.8 }
    ],
    cue: 'empathy'
  },
  language: {
    patterns: [
      { text: ['understand', 'clear', 'clarify', 'explain', 'detail', 'specification', 'meaning'], weight: 1.0 },
      { text: ['grammar', 'vocabulary', 'spelling', 'pronunciation', 'word', 'phrase'], weight: 0.9 },
      { text: ['confused', 'unsure', 'not sure', 'confirm', 'recap', 'summarize'], weight: 0.8 }
    ],
    cue: 'language'
  },
  negotiation: {
    patterns: [
      { text: ['negotiate', 'negotiation', 'deal', 'contract', 'price', 'cost', 'terms', 'agreement', 'bargain', 'compromise', 'budget'], weight: 1.0 },
      { text: ['offer', 'counter', 'concession', 'leverage', 'position', 'stance'], weight: 0.9 },
      { text: ['win-win', 'mutual benefit', 'trade-off', 'exchange'], weight: 0.8 }
    ],
    cue: 'negotiation'
  },
  leadership: {
    patterns: [
      { text: ['lead', 'leader', 'leadership', 'decision', 'decide', 'manage', 'direct', 'guide', 'steer'], weight: 1.0 },
      { text: ['team', 'delegate', 'authority', 'responsibility', 'vision', 'mission'], weight: 0.9 },
      { text: ['motivate', 'inspire', 'influence', 'empower', 'direction'], weight: 0.8 }
    ],
    cue: 'leadership'
  },
  clarity: {
    patterns: [
      { text: ['clarify', 'clear', 'explain', 'detail', 'elaborate', 'specify', 'define'], weight: 1.0 },
      { text: ['understand', 'comprehend', 'grasp', 'get it', 'make sense'], weight: 0.9 },
      { text: ['confused', 'unclear', 'vague', 'ambiguous', 'uncertain'], weight: 0.8 }
    ],
    cue: 'clarity'
  },
  execution: {
    patterns: [
      { text: ['execute', 'implement', 'carry out', 'perform', 'complete', 'finish'], weight: 1.0 },
      { text: ['do', 'act', 'proceed', 'move forward', 'advance', 'achieve'], weight: 0.9 },
      { text: ['plan', 'schedule', 'timeline', 'deadline', 'deliverable'], weight: 0.8 }
    ],
    cue: 'execution'
  },
  cultural: {
    patterns: [
      { text: ['culture', 'custom', 'tradition', 'etiquette', 'cultural', 'international', 'foreign', 'abroad', 'travel', 'local'], weight: 1.0 },
      { text: ['greeting', 'greet', 'formal', 'informal', 'respectful', 'respect', 'courtesy'], weight: 0.9 },
      { text: ['difference', 'diversity', 'inclusion', 'inclusive', 'multicultural'], weight: 0.8 }
    ],
    cue: 'cultural'
  },
  learning: {
    patterns: [
      { text: ['learn', 'learning', 'teach', 'teaching', 'study', 'studying', 'education', 'educational'], weight: 1.0 },
      { text: ['grammar', 'vocabulary', 'pronunciation', 'phrase', 'sentence', 'word', 'language'], weight: 0.9 },
      { text: ['practice', 'exercise', 'lesson', 'homework', 'assignment', 'class'], weight: 0.8 }
    ],
    cue: 'learning'
  }
};

/**
 * Synonym mapping for enhanced similarity matching
 */
export const SYNONYM_MAP = {
  // Social synonyms
  'hello': ['hi', 'hey', 'greetings', 'howdy', 'hiya', 'good morning', 'good afternoon', 'good evening'],
  'hi': ['hello', 'hey', 'greetings', 'howdy', 'hiya'],
  'thanks': ['thank', 'appreciate', 'grateful', 'gratitude'],
  'thank': ['thanks', 'appreciate', 'grateful', 'gratitude'],

  // Empathy synonyms
  'understand': ['comprehend', 'grasp', 'appreciate', 'relate', 'empathize', 'sympathize'],
  'empathize': ['understand', 'relate', 'sympathize', 'connect', 'feel for'],
  'sympathize': ['empathize', 'understand', 'relate', 'care', 'support'],
  'support': ['help', 'assist', 'encourage', 'back', 'aid'],

  // Question synonyms
  'what': ['which', 'what kind', 'what type', 'what sort'],
  'how': ['in what way', 'by what means', 'to what extent'],
  'why': ['for what reason', 'on what grounds'],

  // Conflict synonyms
  'disagree': ['object', 'oppose', 'counter', 'contradict', 'take issue'],
  'problem': ['issue', 'difficulty', 'trouble', 'challenge', 'obstacle'],
  'wrong': ['incorrect', 'mistaken', 'erroneous', 'faulty', 'flawed'],

  // Action synonyms
  'should': ['ought to', 'need to', 'must', 'have to', 'better'],
  'recommend': ['suggest', 'advise', 'propose', 'urge', 'endorse'],
  'suggest': ['recommend', 'advise', 'propose', 'hint', 'imply'],

  // Strategic synonyms
  'strategy': ['plan', 'approach', 'method', 'scheme', 'tactic'],
  'negotiate': ['bargain', 'discuss terms', 'compromise', 'haggle'],
  'priority': ['importance', 'urgency', 'significance', 'precedence'],

  // Language synonyms
  'explain': ['clarify', 'elucidate', 'expound', 'detail', 'describe'],
  'clarify': ['explain', 'elucidate', 'elaborate', 'detail', 'expand'],
  'unclear': ['ambiguous', 'vague', 'confusing', 'uncertain', 'obscure']
};
