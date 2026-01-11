import { detectIntentWithConfidence, ALL_INTENTS } from './intentRecognition';

/**
 * Merges existing user intents with new intents, preserving user preferences
 * for intents they had previously configured while adding new ones.
 * 
 * @param {Array<string>} existingIntents - The user's currently saved intents
 * @param {Array<string>} allIntents - All available intents (typically ALL_INTENTS)
 * @returns {Array<string>} Merged array of intents with duplicates removed
 */
export const mergeNewIntents = (existingIntents, allIntents = ALL_INTENTS) => {
  if (!existingIntents) {
    return allIntents;
  }

  // Find intents that are in ALL_INTENTS but NOT in existingIntents (newly added intents)
  const newIntents = allIntents.filter(intent => !existingIntents.includes(intent));

  // We only add new intents if they aren't already there.
  return [...new Set([...existingIntents, ...newIntents])];
};

/**
 * Metadata for semantic tags used in the intent detection system
 */
export const TAG_METADATA = {
  conflict: {
    tag: '[conflict]',
    aliases: ['[diplomatic]'],
    label: 'Conflict Alert',
    icon: 'ShieldAlert',
    variant: 'conflict',
    description: 'De-escalation needed'
  },
  action: {
    tag: '[action item]',
    aliases: ['[action]', '[suggestion]', '[recommendation]'],
    label: 'Action',
    icon: 'Zap',
    variant: 'action',
    description: 'Actionable advice or task'
  },
  strategic: {
    tag: '[strategic]',
    aliases: ['[negotiation]', '[leadership]'],
    label: 'Strategic',
    icon: 'Target',
    variant: 'strategic',
    description: 'Negotiation or long-term strategy'
  },
  social: {
    tag: '[social tip]',
    aliases: ['[social]', '[greeting]', '[participation]'],
    label: 'Social Tip',
    icon: 'MessageCircle',
    variant: 'social',
    description: 'Etiquette or phrasing tip'
  },
  language: {
    tag: '[language tip]',
    aliases: ['[natural phrasing]', '[clarity]'],
    label: 'Language',
    icon: 'Zap',
    variant: 'language',
    description: 'Language or phrasing suggestion'
  },
  empathy: {
    tag: '[empathy]',
    aliases: ['[support]', '[emotion]'],
    label: 'Empathy',
    icon: 'Heart',
    variant: 'empathy',
    description: 'Emotional support or validation'
  },
  question: {
    tag: '[question]',
    aliases: ['[ask]'],
    label: 'Question',
    icon: 'MessageCircle',
    variant: 'question',
    description: 'Follow-up question'
  },
  negotiation: {
    tag: '[negotiation]',
    aliases: ['[deal]', '[bargain]'],
    label: 'Negotiation',
    icon: 'Handshake',
    variant: 'strategic',
    description: 'Bargaining or deal-making'
  },
  leadership: {
    tag: '[leadership]',
    aliases: ['[lead]', '[direct]'],
    label: 'Leadership',
    icon: 'Star',
    variant: 'strategic',
    description: 'Guiding or directing others'
  },
  clarity: {
    tag: '[clarity]',
    aliases: ['[clear]', '[explain]'],
    label: 'Clarity',
    icon: 'Lightbulb',
    variant: 'language',
    description: 'Improving understanding'
  },
  execution: {
    tag: '[execution]',
    aliases: ['[execute]', '[do]'],
    label: 'Execution',
    icon: 'Target',
    variant: 'action',
    description: 'Focus on implementation'
  },
  cultural: {
    tag: '[cultural]',
    aliases: ['[culture]', '[etiquette]'],
    label: 'Cultural',
    icon: 'Globe',
    variant: 'social',
    description: 'Cultural context or etiquette'
  },
  learning: {
    tag: '[learning]',
    aliases: ['[learn]', '[study]'],
    label: 'Learning',
    icon: 'BookOpen',
    variant: 'language',
    description: 'Educational or learning moment'
  }
};

const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\\]/g, '\\$&');
};

/**
 * Generates an intent-based cue based on the detected intent from input text
 */
export const generateIntentBasedCue = (input, response = '', conversationHistory = []) => {
  const { intent, confidence } = detectIntentWithConfidence(input);
  
  if (!intent || confidence < 0.4) {
    return generateCueFromResponse(response, conversationHistory);
  }
  
  const intentToCueMap = {
    social: ['Hi', 'Hello', 'Hey', 'Smile', 'Wave', 'Connect', 'Share', 'Nod'],
    question: ['Ask', 'Clarify', 'Follow up', 'Probe', 'Inquire', 'Investigate', 'Query'],
    conflict: ['De-escalate', 'Validate first', 'Soft tone', 'Find common ground', 'Listen more', 'Breathe'],
    strategic: ['Strategic', 'Consider implications', 'Think long-term', 'Plan ahead', 'Evaluate', 'Project Confidence'],
    action: ['Action', 'Try', 'Propose', 'Recommend', 'Plan', 'Organize', 'Next step'],
    empathy: ['Acknowledge', 'Validate', 'Empathize', 'Listen', 'Support', 'Understand', 'Relate'],
    language: ['Clarify', 'Explain', 'Simplify', 'Rephrase', 'Detail']
  };

  const cues = intentToCueMap[intent] || ['Pause', 'Think', 'Consider', 'Reflect', 'Hmm', 'Observe'];

  if (intent === 'strategic') return 'Project Confidence';

  const seed = input.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + conversationHistory.length;
  return cues[seed % cues.length];
};

/**
 * Generates a cue based on the content of the AI response
 */
export const generateCueFromResponse = (response, conversationHistory = []) => {
  if (!response) return 'Pause';
  
  const lowerResponse = response.toLowerCase();
  const seed = response.length + conversationHistory.length;
  
  const matchAndReturn = (keywords, cues) => {
    if (keywords.some(k => lowerResponse.includes(k))) {
      return cues[seed % cues.length];
    }
    return null;
  };

  return matchAndReturn(['suggest', 'recommend', 'should', 'try', 'could'], ['Suggest', 'Try', 'Recommend', 'Propose', 'Consider', 'Experiment']) || 
         matchAndReturn(['feel', 'understand', 'hear'], ['Acknowledge', 'Validate', 'Empathize', 'Listen', 'Support', 'Connect']) || 
         (conversationHistory.length > 0 && conversationHistory[conversationHistory.length-1]?.content?.includes('?') 
           ? ['Ask', 'Clarify', 'Follow up', 'Probe', 'Inquire', 'Investigate'][seed % 6] 
           : ['Pause', 'Think', 'Consider', 'Reflect', 'Hmm', 'Observe'][seed % 6]);
};

/**
 * Parses semantic tags from text
 */
export const parseSemanticTags = (text) => {
  if (!text) return { cleanText: '', tags: [] };
  let cleanText = text;
  const foundTags = [];

  Object.entries(TAG_METADATA).forEach(([key, meta]) => {
    const allTags = [meta.tag, ...(meta.aliases || [])];
    allTags.forEach(tag => {
      if (text.toLowerCase().includes(tag.toLowerCase())) {
        if (!foundTags.some(t => t.key === key)) foundTags.push({ ...meta, key });
        const escapedTag = escapeRegex(tag);
        cleanText = cleanText.replace(new RegExp(escapedTag, 'gi'), '').trim();
      }
    });
  });

  return { cleanText, tags: foundTags };
};