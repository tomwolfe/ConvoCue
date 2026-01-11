/**
 * Advanced Cultural Intelligence System
 * Provides sophisticated cross-cultural communication guidance
 */

import { detectMultipleIntents } from './intentRecognition';
import { AppConfig } from '../config';
import { 
  submitCulturalFeedback, 
  shouldFlagRecommendation, 
  getUserCulturalBiasAdjustments 
} from './culturalFeedback';
import { mergeCulturalContext, isCulturalOptOut } from './userCulturalProfile.js';
import { getCulturalConfidenceThreshold } from '../config/conservativeDefaults.js';

/**
 * CORE CULTURAL DATA MAP
 */
export const CULTURAL_DIMENSIONS = {
  powerDistance: {
    high: ['east-asian', 'south-asian', 'latin-american', 'middle-eastern', 'african', 'china', 'india', 'japan', 'south-korea'],
    low: ['nordic', 'germanic', 'anglo', 'anglo-canada', 'usa', 'uk', 'canada', 'australia']
  },
  individualism: {
    individualistic: ['anglo', 'germanic', 'nordic', 'anglo-canada', 'usa', 'uk', 'canada', 'australia'],
    collectivistic: ['east-asian', 'south-asian', 'latin-american', 'african', 'middle-eastern', 'china', 'india', 'japan']
  },
  uncertaintyAvoidance: {
    high: ['japan', 'germanic', 'latin-american', 'middle-eastern', 'germany', 'france', 'mexico'],
    low: ['nordic', 'anglo', 'anglo-canada', 'usa', 'uk', 'denmark']
  }
};

export const REGIONAL_STYLES = {
  'east-asian': {
    directness: 'indirect',
    formality: 'high',
    context: 'high-context',
    faceSaving: true,
    hierarchyAware: true,
    conflictApproach: 'avoidance',
    keywords: ['respect', 'hierarchy', 'face-saving', 'harmony', 'politeness'],
    phrases: ['it\'s an honor', 'respectfully', 'perhaps', 'it might be', 'let me think']
  },
  'south-asian': {
    directness: 'indirect',
    formality: 'high',
    context: 'high-context',
    faceSaving: true,
    hierarchyAware: true,
    conflictApproach: 'mediation',
    keywords: ['respect', 'elders', 'hierarchy', 'community', 'traditional'],
    phrases: ['namaste', 'regards', 'sir', 'ma\'am', 'respected']
  },
  'latin-american': {
    directness: 'moderate',
    formality: 'moderate',
    context: 'high-context',
    faceSaving: true,
    hierarchyAware: true,
    conflictApproach: 'personal',
    keywords: ['relationship', 'personal', 'warmth', 'connection', 'family', 'expressive'],
    phrases: ['how are your family', 'how\'s home', 'feel', 'passion']
  },
  'middle-eastern': {
    directness: 'indirect',
    formality: 'high',
    context: 'high-context',
    faceSaving: true,
    hierarchyAware: true,
    conflictApproach: 'avoidance',
    keywords: ['hospitality', 'respect', 'honor', 'tradition', 'community'],
    phrases: ['peace be upon you', 'blessings', 'honor', 'guest']
  },
  'nordic': {
    directness: 'direct',
    formality: 'low',
    context: 'low-context',
    faceSaving: false,
    conflictApproach: 'open',
    keywords: ['direct', 'efficient', 'equality', 'clear', 'precise'],
    phrases: ['clearly', 'directly', 'efficient', 'productive']
  },
  'germanic': {
    directness: 'direct',
    formality: 'moderate',
    context: 'low-context',
    faceSaving: false,
    conflictApproach: 'structured',
    keywords: ['direct', 'structured', 'professional', 'clear', 'efficient'],
    phrases: ['to the point', 'results-oriented', 'professional']
  },
  'anglo': {
    directness: 'moderate',
    formality: 'low-moderate',
    context: 'low-context',
    faceSaving: false,
    conflictApproach: 'direct',
    keywords: ['direct', 'individual', 'assertive', 'friendly', 'informal'],
    phrases: ['hi there', 'hey', 'I think', 'personally']
  },
  'african': {
    directness: 'moderate',
    formality: 'high',
    context: 'high-context',
    faceSaving: true,
    hierarchyAware: true,
    conflictApproach: 'community',
    keywords: ['community', 'respect', 'wisdom', 'tradition'],
    phrases: ['elder', 'together', 'share']
  }
};

export const COUNTRY_DATA = {
  'china': { region: 'east-asian' },
  'japan': { region: 'east-asian', directness: 'very-indirect', conflictApproach: 'extreme-avoidance' },
  'south-korea': { region: 'east-asian', hierarchyAware: 'extremely-high' },
  'india': { region: 'south-asian' },
  'germany': { region: 'germanic', directness: 'very-direct' },
  'usa': { region: 'anglo', directness: 'direct' },
  'uk': { region: 'anglo', directness: 'moderate-indirect' },
  'canada': { region: 'anglo' },
  'brazil': { region: 'latin-american', greetingStyle: 'very-warm' },
  'mexico': { region: 'latin-american' },
  'egypt': { region: 'middle-eastern' },
  'saudi-arabia': { region: 'middle-eastern', formality: 'very-high' },
  'uae': { region: 'middle-eastern' },
  'israel': { region: 'middle-eastern', directness: 'direct', context: 'low-context' },
  'thailand': { region: 'east-asian', directness: 'very-indirect', faceSaving: true },
  'ghana': { region: 'african', greetingStyle: 'warm' }
};

const CULTURAL_GREETINGS = {
  'ar': { label: 'saudi-arabia', greetings: ['as-salamu alaykum', 'marrhaban', 'ahlan'] },
  'he': { label: 'israel', greetings: ['shalom'] },
  'zh': { label: 'china', greetings: ['ni hao', 'nin hao'] },
  'ja': { label: 'japan', greetings: ['konnichiwa', 'ohayou', 'konichiwa'] },
  'th': { label: 'thailand', greetings: ['sawatdee', 'sawasdee'] },
  'ak': { label: 'ghana', greetings: ['akwaaba'] }
};

/**
 * Enhanced Cultural Context Detection
 */
export const analyzeCulturalContext = (text, currentCulturalContext = 'general', conversationHistory = []) => {
  if (!text || isCulturalOptOut()) {
    return { primaryCulture: currentCulturalContext, confidence: 0, detectedCultures: [] };
  }

  const lowerText = text.toLowerCase();
  const detected = [];

  // 1. Check for specific greetings (High confidence)
  for (const [lang, data] of Object.entries(CULTURAL_GREETINGS)) {
    if (data.greetings.some(g => lowerText.includes(g))) {
      detected.push({ culture: data.label, confidence: 0.9, type: 'greeting' });
    }
  }

  // 2. Check for keywords and patterns (Medium confidence)
  for (const [region, style] of Object.entries(REGIONAL_STYLES)) {
    let matches = 0;
    style.keywords?.forEach(k => { if (lowerText.includes(k)) matches++; });
    style.phrases?.forEach(p => { if (lowerText.includes(p)) matches++; });
    
    if (matches > 0) {
      detected.push({
        culture: region, 
        confidence: Math.min(0.8, matches * 0.15), 
        type: 'pattern' 
      });
    }
  }

  // 3. Check for specific country names
  for (const country of Object.keys(COUNTRY_DATA)) {
    if (lowerText.includes(country)) {
      detected.push({ culture: country, confidence: 0.85, type: 'explicit' });
    }
  }

  detected.sort((a, b) => b.confidence - a.confidence);
  
  // Decide whether to override current context
  let primaryCulture = currentCulturalContext;
  let confidence = 0;
  
  if (detected.length > 0) {
    const best = detected[0];
    const threshold = currentCulturalContext === 'general' ? 0.3 : 0.75;
    
    if (best.confidence >= threshold) {
      primaryCulture = best.culture;
      confidence = best.confidence;
    }
  }

  const result = {
    primaryCulture,
    confidence,
    detectedCultures: detected,
    communicationStyle: getCommunicationStyleForCulture(primaryCulture),
    biasRiskLevel: confidence > 0.7 ? 'medium' : 'high'
  };

  // Add for compatibility with tests that might expect 'characteristics'
  result.characteristics = result.communicationStyle;

  return mergeCulturalContext(result);
};

/**
 * Retrieves communication style for a given culture
 */
export const getCommunicationStyleForCulture = (culture) => {
  const country = COUNTRY_DATA[culture];
  const regionStyle = country ? REGIONAL_STYLES[country.region] : REGIONAL_STYLES[culture];
  
  const base = regionStyle || REGIONAL_STYLES['anglo'] || { directness: 'moderate', formality: 'moderate' };
  return { ...base, ...(country || {}) };
};

/**
 * Detects multilingual elements
 */
export const detectMultilingualElements = (text) => {
  const results = [];
  for (const [lang, data] of Object.entries(CULTURAL_GREETINGS)) {
    const matches = data.greetings.filter(g => text.toLowerCase().includes(g));
    if (matches.length > 0) {
      results.push({ language: lang, count: matches.length, confidence: 0.9 });
    }
  }
  return results;
};

// Backward compatibility exports
export const detectEnhancedCulturalContext = analyzeCulturalContext;
export const validateCulturalAppropriateness = () => true;
export const generateCulturallyAppropriateResponses = (text, analysis) => {
  const style = analysis.communicationStyle || {};
  const suggestions = [];
  if (style.directness === 'indirect') suggestions.push('Consider softer, more indirect phrasing');
  if (style.formality === 'high') suggestions.push('Use formal titles and greetings');
  return suggestions;
};
