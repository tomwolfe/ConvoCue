/**
 * Cultural context database for cross-cultural communication
 */

export const culturalContextDatabase = {
  // Common cultural communication patterns
  communicationStyles: {
    'high-context': {
      description: 'Indirect communication with emphasis on non-verbal cues',
      cultures: ['Japan', 'China', 'Korea', 'Arab countries', 'India', 'Vietnam', 'Thailand', 'Indonesia', 'Malaysia'],
      tips: [
        'Be patient with silence',
        'Pay attention to non-verbal cues',
        'Avoid direct confrontation',
        'Build relationship before business',
        'Use honorifics and formal language',
        'Show respect for hierarchy',
        'Pay attention to face-saving',
        'Use indirect language',
        'Read between the lines'
      ]
    },
    'low-context': {
      description: 'Direct communication with explicit verbal messages',
      cultures: ['USA', 'Germany', 'Switzerland', 'Scandinavian countries', 'Netherlands', 'Australia', 'New Zealand', 'Canada'],
      tips: [
        'Be direct and clear',
        'State intentions explicitly',
        'Value efficiency over relationship building',
        'Ask clarifying questions directly',
        'Get to the point quickly',
        'Focus on facts and data',
        'Be concise',
        'Value time efficiency',
        'Express disagreement openly if needed'
      ]
    },
    'medium-context': {
      description: 'Moderate directness with some indirect elements',
      cultures: ['France', 'Italy', 'Spain', 'Russia', 'Brazil', 'Mexico'],
      tips: [
        'Balance directness with politeness',
        'Build some relationship before business',
        'Use appropriate formalities',
        'Show personal interest',
        'Be aware of hierarchy',
        'Allow for some indirect communication'
      ]
    }
  },

  // Common cultural phrases and appropriate responses
  culturalPhrases: {
    'face-saving': [
      {
        situation: 'When someone makes a mistake',
        inappropriate: 'You did that wrong',
        appropriate: 'Let me help you with that',
        culturalContext: 'In many Asian cultures, preserving dignity is important'
      },
      {
        situation: 'Giving feedback',
        inappropriate: 'This is terrible',
        appropriate: 'There might be another way to approach this',
        culturalContext: 'Indirect feedback is preferred in many cultures'
      },
      {
        situation: 'Disagreeing with authority',
        inappropriate: 'You are completely wrong',
        appropriate: 'I see your point, but have you considered...',
        culturalContext: 'Respect for hierarchy is important in many cultures'
      }
    ],

    'formality': [
      {
        situation: 'Meeting new people',
        inappropriate: 'Hey buddy',
        appropriate: 'Nice to meet you, [title if known]',
        culturalContext: 'Many cultures value formal greetings initially'
      },
      {
        situation: 'Addressing elders',
        inappropriate: 'Hey, what\'s up?',
        appropriate: 'Hello, [title/respectful term]',
        culturalContext: 'Many cultures emphasize respect for elders'
      }
    ],

    'business': [
      {
        situation: 'Starting a business meeting',
        inappropriate: 'Let\'s get straight to business',
        appropriate: 'Thank you for taking the time to meet with me',
        culturalContext: 'Some cultures prefer relationship building before business'
      },
      {
        situation: 'Making a proposal',
        inappropriate: 'You should do it this way',
        appropriate: 'Perhaps we could consider this approach',
        culturalContext: 'Some cultures prefer collaborative language'
      }
    ]
  },

  // Cultural greetings by region
  greetings: {
    'East Asia': {
      'China': ['Ni Hao', 'Hello', 'How are you?'],
      'Japan': ['Konnichiwa', 'Hello', 'How are you?'],
      'Korea': ['Annyeonghaseyo', 'Hello', 'How are you?'],
      'Vietnam': ['Xin chào', 'Hello', 'How are you?'],
      'Thailand': ['Sawasdee', 'Hello', 'How are you?']
    },
    'South Asia': {
      'India': ['Namaste', 'Hello', 'How are you?'],
      'Pakistan': ['Assalamu Alaikum', 'Hello', 'How are you?'],
      'Bangladesh': ['Assalamu Alaikum', 'Hello', 'How are you?'],
      'Sri Lanka': ['Ayubowan', 'Hello', 'How are you?']
    },
    'Southeast Asia': {
      'Indonesia': ['Selamat pagi', 'Hello', 'How are you?'],
      'Malaysia': ['Selamat pagi', 'Hello', 'How are you?'],
      'Philippines': ['Kamusta', 'Hello', 'How are you?'],
      'Myanmar': ['Mingalarba', 'Hello', 'How are you?']
    },
    'Middle East': {
      'Arabic': ['As-salāmu ʿalaykum', 'Hello', 'How are you?'],
      'Persian': ['Dorood', 'Hello', 'How are you?'],
      'Turkish': ['Merhaba', 'Hello', 'How are you?'],
      'Hebrew': ['Shalom', 'Hello', 'How are you?']
    },
    'Europe': {
      'France': ['Bonjour', 'Hello', 'How are you?'],
      'Germany': ['Guten Tag', 'Hello', 'How are you?'],
      'Spain': ['Hola', 'Hello', 'How are you?'],
      'Italy': ['Ciao', 'Hello', 'How are you?'],
      'Russia': ['Zdravstvuyte', 'Hello', 'How are you?'],
      'Poland': ['Dzień dobry', 'Hello', 'How are you?'],
      'Portugal': ['Olá', 'Hello', 'How are you?'],
      'Greece': ['Yassas', 'Hello', 'How are you?'],
      'Netherlands': ['Goedendag', 'Hello', 'How are you?'],
      'Scandinavia': ['God dag', 'Hello', 'How are you?']
    },
    'Latin America': {
      'Spanish': ['Hola', 'Hello', 'How are you?'],
      'Portuguese': ['Olá', 'Hello', 'How are you?'],
      'Brazil': ['Oi', 'Hello', 'How are you?'],
      'Argentina': ['Hola', 'Hello', 'How are you?'],
      'Mexico': ['Hola', 'Hello', 'How are you?']
    },
    'English Speaking': {
      'USA': ['Hello', 'Hi', 'How are you?'],
      'UK': ['Hello', 'Good day', 'How are you?'],
      'Australia': ['G\'day', 'Hello', 'How are you?'],
      'Canada': ['Hello', 'Hi', 'How are you?'],
      'South Africa': ['Hello', 'Hi', 'How are you?']
    },
    'Africa': {
      'South Africa': ['Sawubona', 'Hello', 'How are you?'],
      'Nigeria': ['Ẹ n lẹ', 'Hello', 'How are you?'],
      'Egypt': ['Salam', 'Hello', 'How are you?'],
      'Ethiopia': ['Teanastelign', 'Hello', 'How are you?']
    }
  },

  // Cultural taboos to avoid
  taboos: [
    {
      culture: 'Japan',
      taboos: ['Blowing nose in public', 'Pointing with chopsticks', 'Tipping', 'Physical contact', 'Loud talking'],
      explanation: 'These actions are considered impolite or rude'
    },
    {
      culture: 'Middle Eastern',
      taboos: ['Using left hand for greeting', 'Discussing religion negatively', 'Public displays of affection', 'Alcohol references', 'Inappropriate dress'],
      explanation: 'These actions can be offensive in many Middle Eastern cultures'
    },
    {
      culture: 'Germany',
      taboos: ['Being late', 'Interrupting', 'Complaining about government', 'Loud talking', 'Disrespecting rules'],
      explanation: 'Punctuality and order are highly valued'
    },
    {
      culture: 'India',
      taboos: ['Touching someone with feet', 'Eating with left hand', 'Disrespecting elders', 'Criticizing family', 'Inappropriate dress'],
      explanation: 'Respect for hierarchy and traditions is important'
    },
    {
      culture: 'France',
      taboos: ['Not greeting properly', 'Rushing through pleasantries', 'Disrespecting cuisine', 'Speaking loudly', 'Not using formal language'],
      explanation: 'French culture values politeness and proper etiquette'
    },
    {
      culture: 'Brazil',
      taboos: ['Standing too far during conversation', 'Not greeting with physical contact', 'Being too formal initially', 'Disrespecting soccer', 'Inappropriate personal space'],
      explanation: 'Brazilian culture is warm and personal'
    },
    {
      culture: 'Russia',
      taboos: ['Smiling at strangers', 'Being overly casual', 'Discussing politics negatively', 'Refusing hospitality', 'Not toasting properly'],
      explanation: 'Russian culture has specific social norms and expectations'
    }
  ],

  // Business etiquette by culture
  businessEtiquette: {
    'East Asian': {
      importance: 'High',
      practices: [
        'Exchange business cards respectfully',
        'Show respect for seniority',
        'Build personal relationships first',
        'Be patient with decision-making process',
        'Use formal titles and names',
        'Avoid direct confrontation',
        'Present information gradually'
      ]
    },
    'Western': {
      importance: 'Medium',
      practices: [
        'Get to business quickly',
        'Focus on results and efficiency',
        'Direct communication is valued',
        'Punctuality is essential',
        'Be prepared with data',
        'Value individual input',
        'Encourage open discussion'
      ]
    },
    'Middle Eastern': {
      importance: 'High',
      practices: [
        'Build personal relationships first',
        'Show respect for traditions',
        'Be patient with decision-making',
        'Avoid scheduling during prayer times',
        'Use formal titles',
        'Accept hospitality',
        'Show interest in family'
      ]
    },
    'Latin American': {
      importance: 'High',
      practices: [
        'Build personal relationships',
        'Show warmth and friendliness',
        'Use formal titles initially',
        'Be patient with punctuality',
        'Show interest in family',
        'Accept social invitations',
        'Use appropriate physical contact'
      ]
    },
    'European': {
      importance: 'Medium',
      practices: [
        'Be punctual',
        'Prepare detailed presentations',
        'Respect hierarchy',
        'Use formal language initially',
        'Be prepared for debate',
        'Follow up in writing',
        'Respect work-life balance'
      ]
    }
  },

  // Cultural communication preferences
  communicationPreferences: {
    'formal': ['Japan', 'Korea', 'Germany', 'France', 'Middle Eastern countries'],
    'informal': ['USA', 'Australia', 'Canada', 'Scandinavian countries'],
    'relationship-focused': ['Latin America', 'Middle East', 'East Asia', 'India'],
    'task-focused': ['Germany', 'Switzerland', 'Netherlands', 'USA'],
    'high-touch': ['Latin America', 'Middle East', 'Southern Europe'],
    'low-touch': ['Northern Europe', 'Japan', 'Korea']
  },

  // Cultural time concepts
  timeConcepts: {
    'monochronic': {
      cultures: ['Germany', 'Switzerland', 'USA', 'Scandinavian countries', 'UK'],
      characteristics: ['Punctuality is crucial', 'One task at a time', 'Schedules are important', 'Time is linear'],
      businessTips: ['Be on time', 'Stick to agenda', 'Respect schedules', 'Value efficiency']
    },
    'polychronic': {
      cultures: ['Latin America', 'Middle East', 'Africa', 'South Asia'],
      characteristics: ['Relationships over schedules', 'Multiple tasks simultaneously', 'Flexible timing', 'Time is fluid'],
      businessTips: ['Allow extra time', 'Build relationships', 'Be flexible', 'Expect interruptions']
    }
  }
};

/**
 * Get cultural context for a specific situation
 * @param {string} situation - The communication situation
 * @param {string} targetCulture - Optional target culture
 * @returns {object} Cultural context information
 */
export const getCulturalContext = (situation, targetCulture = null) => {
  // Find relevant cultural information based on situation
  const relevantPhrases = culturalContextDatabase.culturalPhrases[situation] || [];

  if (targetCulture) {
    // Filter for specific culture if provided
    return {
      situation,
      targetCulture,
      phrases: relevantPhrases,
      communicationStyle: getCommunicationStyleForCulture(targetCulture),
      businessEtiquette: getBusinessEtiquetteForCulture(targetCulture)
    };
  }

  return {
    situation,
    phrases: relevantPhrases,
    generalTips: culturalContextDatabase.communicationStyles['high-context'].tips.concat(
      culturalContextDatabase.communicationStyles['low-context'].tips
    )
  };
};

/**
 * Get appropriate communication style for a specific culture
 * @param {string} culture - The target culture
 * @returns {string} Communication style ('high-context', 'medium-context', or 'low-context')
 */
export const getCommunicationStyleForCulture = (culture) => {
  for (const [style, data] of Object.entries(culturalContextDatabase.communicationStyles)) {
    if (data.cultures.includes(culture)) {
      return style;
    }
  }
  return 'low-context'; // Default to low-context
};

/**
 * Get business etiquette for a specific culture
 * @param {string} culture - The target culture
 * @returns {object} Business etiquette information
 */
export const getBusinessEtiquetteForCulture = (culture) => {
  // Check for specific cultural matches
  if (culturalContextDatabase.communicationStyles['high-context'].cultures.includes(culture)) {
    return culturalContextDatabase.businessEtiquette['East Asian'];
  }
  if (culturalContextDatabase.communicationStyles['low-context'].cultures.includes(culture)) {
    return culturalContextDatabase.businessEtiquette['Western'];
  }
  if (culturalContextDatabase.communicationStyles['medium-context'].cultures.includes(culture)) {
    return culturalContextDatabase.businessEtiquette['European'];
  }
  if (['Arab countries', 'India'].includes(culture) ||
      culturalContextDatabase.taboos.some(taboo => taboo.culture === 'Middle Eastern' && culture.toLowerCase().includes('arab') || culture === 'India')) {
    return culturalContextDatabase.businessEtiquette['Middle Eastern'];
  }
  if (['Latin America', 'Brazil', 'Mexico', 'Argentina', 'Spanish'].some(latin => culture.toLowerCase().includes(latin.toLowerCase()))) {
    return culturalContextDatabase.businessEtiquette['Latin American'];
  }

  return culturalContextDatabase.businessEtiquette.Western; // Default
};

/**
 * Get cultural communication preferences for a specific culture
 * @param {string} culture - The target culture
 * @returns {object} Communication preferences
 */
export const getCommunicationPreferencesForCulture = (culture) => {
  const preferences = {
    formality: 'neutral',
    relationshipFocus: 'balanced',
    touchPreference: 'neutral'
  };

  const formalCultures = culturalContextDatabase.communicationPreferences.formal;
  const informalCultures = culturalContextDatabase.communicationPreferences.informal;
  const relationshipCultures = culturalContextDatabase.communicationPreferences['relationship-focused'];
  const taskCultures = culturalContextDatabase.communicationPreferences['task-focused'];
  const highTouchCultures = culturalContextDatabase.communicationPreferences['high-touch'];
  const lowTouchCultures = culturalContextDatabase.communicationPreferences['low-touch'];

  if (formalCultures.some(c => culture.toLowerCase().includes(c.toLowerCase()))) {
    preferences.formality = 'high';
  } else if (informalCultures.some(c => culture.toLowerCase().includes(c.toLowerCase()))) {
    preferences.formality = 'low';
  }

  if (relationshipCultures.some(c => culture.toLowerCase().includes(c.toLowerCase()))) {
    preferences.relationshipFocus = 'high';
  } else if (taskCultures.some(c => culture.toLowerCase().includes(c.toLowerCase()))) {
    preferences.relationshipFocus = 'low';
  }

  if (highTouchCultures.some(c => culture.toLowerCase().includes(c.toLowerCase()))) {
    preferences.touchPreference = 'high';
  } else if (lowTouchCultures.some(c => culture.toLowerCase().includes(c.toLowerCase()))) {
    preferences.touchPreference = 'low';
  }

  return preferences;
};

/**
 * Get time concept for a specific culture
 * @param {string} culture - The target culture
 * @returns {string} Time concept ('monochronic' or 'polychronic')
 */
export const getTimeConceptForCulture = (culture) => {
  const monochronicCultures = culturalContextDatabase.timeConcepts.monochronic.cultures;
  const polychronicCultures = culturalContextDatabase.timeConcepts.polychronic.cultures;

  if (monochronicCultures.some(c => culture.toLowerCase().includes(c.toLowerCase()))) {
    return 'monochronic';
  } else if (polychronicCultures.some(c => culture.toLowerCase().includes(c.toLowerCase()))) {
    return 'polychronic';
  }

  return 'monochronic'; // Default
};

/**
 * Get appropriate greeting for a culture
 * @param {string} culture - Target culture
 * @returns {string} Appropriate greeting
 */
export const getGreetingForCulture = (culture) => {
  for (const [region, cultures] of Object.entries(culturalContextDatabase.greetings)) {
    if (cultures[culture]) {
      return cultures[culture][0]; // Return the native greeting
    }
  }
  return 'Hello'; // Default greeting
};

/**
 * Check if a phrase might be culturally inappropriate
 * @param {string} phrase - The phrase to check
 * @param {string} targetCulture - Target culture for context
 * @returns {object|null} Inappropriateness information or null if appropriate
 */
export const checkCulturalInappropriateness = (phrase, targetCulture) => {
  // This is a simplified check - in a real implementation, this would be more sophisticated
  const lowerPhrase = phrase.toLowerCase();

  // Common patterns that might be inappropriate in certain cultures
  const inappropriatePatterns = [
    { pattern: /you did that wrong/i, cultures: ['East Asian'], suggestion: 'Consider rephrasing to be more indirect' },
    { pattern: /stupid/i, cultures: ['most'], suggestion: 'Avoid using potentially offensive language' },
    { pattern: /whatever/i, cultures: ['formal cultures'], suggestion: 'Use more respectful language' },
    { pattern: /dude|bro/i, cultures: ['formal cultures'], suggestion: 'Use more respectful language' },
    { pattern: /hurry up|faster/i, cultures: ['high-context'], suggestion: 'Be more patient and respectful' }
  ];

  for (const pattern of inappropriatePatterns) {
    if (pattern.pattern.test(lowerPhrase) &&
        (pattern.cultures.includes('most') || pattern.cultures.includes(targetCulture))) {
      return {
        issue: 'Potentially inappropriate',
        suggestion: pattern.suggestion,
        culture: targetCulture
      };
    }
  }

  return null;
};

/**
 * Get language learning support for a specific language
 * @param {string} language - Target language
 * @returns {object} Language learning support information
 */
export const getLanguageLearningSupport = (language) => {
  const languageSupport = {
    'english': {
      commonMistakes: [
        { mistake: 'Using wrong prepositions', example: 'in the weekend' },
        { mistake: 'Forgetting articles', example: 'I go store' },
        { mistake: 'Wrong verb tenses', example: 'I go yesterday' }
      ],
      culturalNotes: [
        'In American English, be direct but polite',
        'In British English, be more formal and indirect',
        'Use "please" and "thank you" frequently'
      ]
    },
    'spanish': {
      commonMistakes: [
        { mistake: 'Gender agreement', example: 'la mesa rojo' },
        { mistake: 'Ser vs. Estar', example: 'Estoy aburrido' },
        { mistake: 'Formal vs. informal', example: 'Tú vs. Usted' }
      ],
      culturalNotes: [
        'Use formal "usted" with elders or in professional settings',
        'Physical contact is more common in greetings',
        'Punctuality may be more flexible'
      ]
    },
    'chinese': {
      commonMistakes: [
        { mistake: 'Tone errors', example: 'mā vs. má' },
        { mistake: 'Missing measure words', example: 'three book' },
        { mistake: 'Literal translations', example: 'head very pain' }
      ],
      culturalNotes: [
        'Respect for hierarchy is important',
        'Face-saving is crucial',
        'Indirect communication is preferred'
      ]
    }
  };

  return languageSupport[language.toLowerCase()] || languageSupport.english;
};

/**
 * Get professional meeting support for different contexts
 * @param {string} context - Meeting context (e.g., 'business', 'academic', 'casual')
 * @returns {object} Professional meeting support information
 */
export const getProfessionalMeetingSupport = (context) => {
  const meetingSupport = {
    'business': {
      keyPhrases: [
        'Thank you for your time',
        'Let\'s circle back on this',
        'I\'ll follow up with you',
        'What are the next steps?'
      ],
      etiquette: [
        'Arrive on time',
        'Come prepared with agenda',
        'Listen actively',
        'Take notes if appropriate'
      ]
    },
    'academic': {
      keyPhrases: [
        'Could you elaborate on that?',
        'I have a different perspective',
        'What are the implications?',
        'How does this connect to...?'
      ],
      etiquette: [
        'Respect for expertise',
        'Constructive criticism',
        'Evidence-based arguments',
        'Open-mindedness'
      ]
    },
    'casual': {
      keyPhrases: [
        'That\'s interesting',
        'Tell me more about that',
        'I see your point',
        'What do you think?'
      ],
      etiquette: [
        'Be genuine',
        'Show interest in others',
        'Share appropriately',
        'Respect personal boundaries'
      ]
    }
  };

  return meetingSupport[context] || meetingSupport.business;
};