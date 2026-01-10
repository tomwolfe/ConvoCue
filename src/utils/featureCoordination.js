/**
 * Feature Coordination System for ConvoCue
 * Manages potential conflicts between cultural context, language learning, and professional coaching features
 *
 * IMPORTANT DISCLAIMER: This system attempts to balance competing recommendations from different AI modules.
 * The prioritization system reflects design decisions that may not be appropriate for all contexts or individuals.
 * Cultural, linguistic, and professional advice should be considered as suggestions only, not absolute rules.
 * Always prioritize individual user preferences and context over algorithmic recommendations.
 */

// Define feature priorities to resolve conflicts
// NOTE: Higher numbers indicate higher priority in conflict resolution
const FEATURE_PRIORITIES = {
  'cultural': 3,
  'languagelearning': 2,
  'professional': 2,
  'meeting': 2,
  'relationship': 1,
  'anxiety': 1,
  'negotiation': 2,
  'leadership': 2,
  'clarity': 1,
  'execution': 1
};

// Define known conflict pairs and resolution strategies
const CONFLICT_RESOLUTION = {
  // When cultural context suggests formality but language learning suggests simplification
  'cultural_languagelearning_conflict': {
    strategy: 'balance',
    handler: (culturalInsight, languageInsight) => {
      // If cultural context demands high formality but language learning suggests simpler language,
      // find a middle ground that respects both
      if (culturalInsight.characteristics?.formality_level === 'high' &&
          languageInsight.grammarErrors && languageInsight.grammarErrors.length > 0) {
        // Return insights as-is for now; actual transformation would happen elsewhere
      }
      return { culturalInsight, languageInsight };
    }
  },
  
  // When professional coaching suggests directness but cultural context suggests indirectness
  'professional_cultural_conflict': {
    strategy: 'contextual_adaptation',
    handler: (professionalInsight, culturalInsight) => {
      // Adapt professional advice to cultural expectations
      if (professionalInsight.insight.includes('direct') && 
          culturalInsight.characteristics?.directness === 'low') {
        return transformDirectAdviceToIndirect(professionalInsight, culturalInsight);
      }
      return { professionalInsight, culturalInsight };
    }
  }
};

/**
 * Maps personas to their primary feature categories for priority boosting
 */
const PERSONA_TO_FEATURE_MAP = {
  'meeting': 'meeting',
  'professional': 'professional',
  'relationship': 'relationship',
  'anxiety': 'anxiety',
  'languagelearning': 'language'
};

/**
 * Resolves conflicts between different coaching features based on priorities and context.
 * @param {Object} insights - The collection of insights from various features
 * @param {string} persona - The currently active persona
 * @returns {Object} Prioritized and filtered insights
 */
export const resolveFeatureConflicts = (insights, persona) => {
  // Create a copy of insights to modify
  const resolvedInsights = { ...insights };

  // Cycle 2: Coaching Calibration
  // Boost priority of the active persona to ensure it takes precedence in conflict resolution.
  const activePersonaFeature = PERSONA_TO_FEATURE_MAP[persona] || null;

  /**
   * Calculates the priority of a feature, applying a boost if it matches the active persona.
   * @param {string} feature - The feature key
   * @returns {number} The numeric priority value
   */
  const getPriority = (feature) => {
    // Ensure priority is always a number to prevent NaN in multiplication
    let priority = Number(FEATURE_PRIORITIES[feature]) || 0;
    if (activePersonaFeature === feature) {
      priority *= 2; // 2x weight boost for active persona to ensure cohesive coaching
    }
    return priority;
  };

  // Check for high bias risk in cultural insights and adjust accordingly
  if (resolvedInsights.cultural) {
    // If cultural insight has high bias risk, reduce its influence
    if (resolvedInsights.cultural.biasRiskLevel === 'high') {
      resolvedInsights.cultural.confidence = resolvedInsights.cultural.confidence * 0.5; // Reduce confidence by half
      resolvedInsights.cultural.advisoryNote = "This cultural suggestion has a high bias risk. Consider verifying with the individual directly.";
    }

    // If cultural insight has medium bias risk, add cautionary note
    if (resolvedInsights.cultural.biasRiskLevel === 'medium') {
      resolvedInsights.cultural.advisoryNote = "This cultural suggestion is based on generalizations. Individual preferences may vary.";
    }
  }

  // Check for known conflicts and resolve them
  if (resolvedInsights.cultural && resolvedInsights.language) {
    const conflict = CONFLICT_RESOLUTION['cultural_languagelearning_conflict'];
    if (conflict) {
      const result = conflict.handler(resolvedInsights.cultural, resolvedInsights.language);
      resolvedInsights.cultural = result.culturalInsight;
      resolvedInsights.language = result.languageInsight;
    }
  }

  if (resolvedInsights.professional && resolvedInsights.cultural) {
    const conflict = CONFLICT_RESOLUTION['professional_cultural_conflict'];
    if (conflict) {
      const result = conflict.handler(resolvedInsights.professional, resolvedInsights.cultural);
      resolvedInsights.professional = result.professionalInsight;
      resolvedInsights.cultural = result.culturalInsight;
    }
  }

  // Apply feature priorities to determine which insights take precedence
  const orderedFeatures = Object.keys(resolvedInsights)
    .sort((a, b) => getPriority(b) - getPriority(a));

  // Create a priority-ordered result
  const prioritizedInsights = {};
  orderedFeatures.forEach(feature => {
    prioritizedInsights[feature] = resolvedInsights[feature];
  });

  return prioritizedInsights;
};

/**
 * Transforms direct professional advice to be culturally appropriate
 * @param {Object} professionalInsight - Professional coaching insight
 * @param {Object} culturalInsight - Cultural context insight
 * @returns {Object} Adapted professional insight
 */
function transformDirectAdviceToIndirect(professionalInsight, culturalInsight) {
  if (!professionalInsight || !culturalInsight) return professionalInsight;
  
  let adaptedInsight = { ...professionalInsight };
  
  // If the culture prefers indirect communication, soften direct language
  if (culturalInsight.characteristics?.directness === 'low') {
    if (adaptedInsight.insight) {
      // Replace direct phrases with more indirect ones
      adaptedInsight.insight = adaptedInsight.insight
        .replace(/\byou should\b/gi, 'you might consider')
        .replace(/\byou must\b/gi, 'it could be beneficial to')
        .replace(/\byou need to\b/gi, 'you may want to');
    }
  }
  
  // Add cultural sensitivity note
  adaptedInsight.culturalNote = culturalInsight.disclaimer || 'Consider cultural context when applying this advice';
  
  return adaptedInsight;
}

/**
 * Validates that insights don't contradict each other
 * @param {Object} insights - Generated insights
 * @returns {Array} Array of validation warnings
 */
export const validateInsightsConsistency = (insights) => {
  const warnings = [];
  
  // Check for direct contradictions between features
  if (insights.cultural && insights.professional) {
    const culturalDirectness = insights.cultural.characteristics?.directness;
    const professionalAdvice = insights.professional.insight?.toLowerCase() || '';
    
    if (culturalDirectness === 'low' && 
        (professionalAdvice.includes('be direct') || professionalAdvice.includes('just say'))) {
      warnings.push('Potential contradiction: Cultural context suggests indirect communication but professional coaching suggests directness');
    }
  }
  
  return warnings;
};

/**
 * Applies feature coordination to response generation
 * @param {string} response - Original response
 * @param {Object} insights - All feature insights
 * @param {string} persona - Current persona
 * @returns {string} Coordinated response
 */
export const coordinateFeaturesInResponse = (response, insights, persona) => {
  // Resolve conflicts between insights
  const resolvedInsights = resolveFeatureConflicts(insights, persona);
  
  // Validate consistency
  const warnings = validateInsightsConsistency(resolvedInsights);
  
  // If there are warnings, add a note to the response
  if (warnings.length > 0) {
    response += `\n\nNote: Multiple guidance systems provided input. Balancing cultural sensitivity with other recommendations.`;
  }
  
  return response;
};