/**
 * Demo script for enhanced cultural and language learning features
 * Demonstrates the key capabilities and disclaimers
 */

import {
  detectEnhancedCulturalContext
} from './src/utils/culturalIntelligence.js';
import { resolveFeatureConflicts, validateInsightsConsistency } from './src/utils/featureCoordination.js';
import { analyzeProfessionalCoaching } from './src/utils/professionalCoaching.js';
import { analyzeLanguageLearningText, provideContextualLanguageFeedback } from './src/utils/languageLearning.js';

console.log('=== ConvoCue Enhanced Features Demo ===\n');

// Demo 1: Cultural Context Detection with Disclaimers
console.log('1. Cultural Context Detection:');
const culturalInput = "Hello, I hope this message finds you well. I wanted to discuss business matters in a respectful way.";
const culturalResult = detectEnhancedCulturalContext(culturalInput);
console.log(`Detected culture: ${culturalResult.primaryCulture}`);
console.log(`Confidence: ${(culturalResult.confidence * 100).toFixed(1)}%`);
console.log(`Disclaimer: ${culturalResult.disclaimer}`);
console.log(`Warning: ${culturalResult.warning}\n`);

// Demo 2: Language Learning Analysis
console.log('2. Language Learning Analysis:');
const languageInput = "I goes to the store yesterday.";
const languageAnalysis = analyzeLanguageLearningText(languageInput);
console.log(`Grammar errors found: ${languageAnalysis.grammarErrors.length}`);
console.log(`Overall score: ${languageAnalysis.overallScore}/100`);
console.log(`Feedback: ${languageAnalysis.feedbackSummary}\n`);

// Demo 3: Contextual Language Feedback
console.log('3. Contextual Language Feedback:');
const contextualFeedback = provideContextualLanguageFeedback(languageInput, 'spanish');
console.log(`Contextual response: ${contextualFeedback.contextualResponse}`);
console.log(`Is learning focused: ${contextualFeedback.isLearningFocused}\n`);

// Demo 4: Professional Coaching with Cultural Sensitivity
console.log('4. Professional Coaching with Cultural Adaptation:');
const professionalInput = "You should definitely do it this way.";
const emotionData = { emotion: 'neutral', confidence: 0.5 };
const professionalInsights = analyzeProfessionalCoaching(professionalInput, [], emotionData);
console.log(`Professional insights: ${professionalInsights.length}`);
if (professionalInsights.length > 0) {
  console.log(`Sample insight: ${professionalInsights[0].insight}`);
}
console.log('');

// Demo 5: Feature Conflict Resolution
console.log('5. Feature Conflict Resolution:');
const mockInsights = {
  cultural: { 
    characteristics: { directness: 'low' },
    disclaimer: "Cultural guidance disclaimer"
  },
  professional: { 
    insight: "You should be direct in your communication." 
  },
  language: { 
    grammarErrors: [{ explanation: "Subject-verb agreement error" }] 
  }
};

const resolvedInsights = resolveFeatureConflicts(mockInsights, 'professional');
console.log('Feature conflicts resolved successfully');
console.log(`Resolved cultural insight: ${JSON.stringify(resolvedInsights.cultural, null, 2)}`);

const consistencyWarnings = validateInsightsConsistency(resolvedInsights);
console.log(`Consistency warnings: ${consistencyWarnings.length}`);
if (consistencyWarnings.length > 0) {
  console.log(`Warning: ${consistencyWarnings[0]}`);
}

console.log('\n=== Demo Complete ===');
console.log('Remember: All suggestions are general guidelines. Individual preferences should take priority.');