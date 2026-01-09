/**
 * Cultural Intelligence Configuration
 * Defines settings and parameters for the advanced cultural intelligence system
 */

export const CulturalIntelligenceConfig = {
  // Sensitivity levels for cultural detection
  sensitivity: {
    low: {
      threshold: 0.3,
      description: 'Less sensitive to cultural cues, fewer automatic switches'
    },
    medium: {
      threshold: 0.5,
      description: 'Balanced sensitivity to cultural cues'
    },
    high: {
      threshold: 0.7,
      description: 'More sensitive to cultural cues, more frequent adjustments'
    }
  },
  
  // Weighting for different cultural indicators
  indicatorWeights: {
    greetings: 0.8,           // Formal greetings carry high weight
    honorifics: 0.7,          // Honorifics indicate formality expectations
    formalityMarkers: 0.5,    // Formal language patterns
    relationshipTerms: 0.4,   // Hierarchy-indicating terms
    culturalReferences: 0.6   // Direct cultural references
  },
  
  // Confidence thresholds for cultural identification
  confidence: {
    high: 0.8,    // Very confident in cultural identification
    medium: 0.5,  // Moderately confident
    low: 0.3,     // Less confident, rely on default settings
    overrideThreshold: 0.75, // Default confidence required to override user setting
    minOverrideThreshold: 0.4, // Minimum threshold if user wants more experimental guidance
    maxOverrideThreshold: 0.95  // Maximum threshold for high-certainty overrides only
  },
  
  // Cultural dimension weights for multi-dimensional analysis
  dimensionWeights: {
    powerDistance: 0.25,
    individualism: 0.25,
    uncertaintyAvoidance: 0.2,
    masculinity: 0.15,
    longTermOrientation: 0.1,
    indulgence: 0.05
  },
  
  // Default cultural settings for each region
  defaults: {
    'east-asian': {
      directness: 'indirect',
      formality: 'high',
      context: 'high-context',
      faceSaving: true,
      hierarchyAware: true
    },
    'south-asian': {
      directness: 'indirect',
      formality: 'high',
      context: 'high-context',
      faceSaving: true,
      hierarchyAware: true
    },
    'latin-american': {
      directness: 'moderate',
      formality: 'moderate',
      context: 'high-context',
      faceSaving: true,
      hierarchyAware: true
    },
    'middle-eastern': {
      directness: 'indirect',
      formality: 'high',
      context: 'high-context',
      faceSaving: true,
      hierarchyAware: true
    },
    'nordic': {
      directness: 'direct',
      formality: 'low',
      context: 'low-context',
      faceSaving: false,
      hierarchyAware: false
    },
    'germanic': {
      directness: 'direct',
      formality: 'moderate',
      context: 'low-context',
      faceSaving: false,
      hierarchyAware: false
    },
    'anglo': {
      directness: 'moderate',
      formality: 'low-moderate',
      context: 'low-context',
      faceSaving: false,
      hierarchyAware: false
    },
    'anglo-canada': {
      directness: 'moderate',
      formality: 'low',
      context: 'low-context',
      faceSaving: false,
      hierarchyAware: false
    },
    'african': {
      directness: 'moderate',
      formality: 'moderate-high',
      context: 'high-context',
      faceSaving: true,
      hierarchyAware: true
    },
    'general': {
      directness: 'moderate',
      formality: 'moderate',
      context: 'neutral',
      faceSaving: false,
      hierarchyAware: false
    }
  },
  
  // Disclaimers and warnings for cultural guidance
  disclaimers: {
    general: "Cultural guidance is based on general patterns and may not apply to all individuals. Always respect personal preferences over cultural assumptions.",
    individualVariation: "Individual preferences and context should take priority over algorithmic recommendations.",
    dynamicNature: "Cultural norms evolve over time and vary within regions. This guidance represents general tendencies."
  },
  
  // Validation settings for cultural appropriateness
  validation: {
    checkFrequency: 5,  // Check every 5th interaction
    strictness: 'moderate', // 'lenient', 'moderate', 'strict'
    feedbackIntegration: true // Whether to incorporate user feedback
  }
};