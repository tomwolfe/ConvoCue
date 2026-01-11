/**
 * Unified Cultural Intelligence Service
 * Single source of truth for cultural dimensions, detection, and analysis.
 */

import fundamentals from './culturalContext/cultural-fundamentals.json';
import interaction from './culturalContext/cultural-interaction.json';
import intelligence from './culturalContext/cultural-intelligence.json';

// Consolidate database
export const culturalContextDatabase = {
  ...fundamentals,
  ...interaction,
  ...intelligence
};

export const CULTURAL_DIMENSIONS = {
  INDIVIDUALISM: 'individualism',
  COLLECTIVISM: 'collectivism',
  HIGH_CONTEXT: 'high-context',
  LOW_CONTEXT: 'low-context',
  POWER_DISTANCE: 'power-distance'
};

export const REGIONAL_STYLES = culturalContextDatabase.communicationStyles || {};

/**
 * Detects cultural context from text and history
 */
export const analyzeCulturalContext = (text, currentCulture = 'general', history = []) => {
  if (!text) return { primaryCulture: currentCulture, confidence: 1.0, elements: [] };

  const inputLower = text.toLowerCase();
  let detectedCulture = 'general';
  let maxConfidence = 0;

  // Pattern-based detection logic
  Object.entries(culturalContextDatabase.regionalMarkers || {}).forEach(([culture, markers]) => {
    const matchCount = markers.filter(marker => inputLower.includes(marker.toLowerCase())).length;
    const confidence = matchCount / markers.length;
    if (confidence > maxConfidence) {
      maxConfidence = confidence;
      detectedCulture = culture;
    }
  });

  return {
    primaryCulture: maxConfidence > 0.4 ? detectedCulture : currentCulture,
    confidence: Math.max(maxConfidence, 0.5),
    dimensions: culturalContextDatabase.dimensions?.[detectedCulture] || {}
  };
};

/**
 * Legacy support and aliases
 */
export const detectCulturalContext = analyzeCulturalContext;
export const detectEnhancedCulturalContext = analyzeCulturalContext;

/**
 * Get communication style preferences
 */
export const getCommunicationStyleForCulture = (culture) => {
  return culturalContextDatabase.communicationStyles?.[culture] || 
         culturalContextDatabase.communicationStyles?.['high-context'];
};

/**
 * Cultural appropriateness validation
 */
export const validateCulturalAppropriateness = (text, culture) => {
  const taboos = culturalContextDatabase.taboos?.[culture] || [];
  const foundTaboos = taboos.filter(t => text.toLowerCase().includes(t.toLowerCase()));
  return {
    isAppropriate: foundTaboos.length === 0,
    issues: foundTaboos
  };
};

/**
 * Multilingual element detection
 */
export const detectMultilingualElements = (text) => {
  if (!text) return [];
  const markers = culturalContextDatabase.languageMarkers || {};
  return Object.entries(markers)
    .filter(([lang, patterns]) => patterns.some(p => text.toLowerCase().includes(p.toLowerCase())))
    .map(([lang]) => lang);
};
