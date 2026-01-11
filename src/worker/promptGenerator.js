import { AppConfig } from '../config';
import { getCulturalPromptTips, getLanguageLearningPromptTips, getProfessionalPromptTips, getSocialNuanceTips, getHighStakesTips } from '../utils/culturalIntelligence';
import { analyzeLanguageLearningText } from '../utils/languageLearning';
import { generateRelationshipCoachingPrompt } from '../utils/relationshipCoaching';
import { generateAnxietyCoachingPrompt } from '../utils/anxietyCoaching';

/**
 * Generates cultural-specific prompt tips.
 * @param {string} effectiveCulturalContext - The cultural context to use
 * @param {Object} detectedCulturalContext - Detected cultural insights and recommendations
 * @param {Object} settings - User settings
 * @param {boolean} isPowerSavingMode - Whether power saving mode is active
 * @returns {string} The cultural prompt segment
 */
export const generateCulturalPrompt = (effectiveCulturalContext, detectedCulturalContext, settings, isPowerSavingMode) => {
    if (!effectiveCulturalContext || effectiveCulturalContext === 'general') return '';

    let prompt = getCulturalPromptTips(effectiveCulturalContext, detectedCulturalContext);
    const isAdvancedCulturalGuidanceEnabled = settings?.enableAdvancedCulturalGuidance !== false;

    if (!isPowerSavingMode && isAdvancedCulturalGuidanceEnabled && detectedCulturalContext?.recommendations) {
        const culturalRecommendations = detectedCulturalContext.recommendations
            .filter(rec => rec.priority === 'high')
            .map(rec => `💡 ${rec.suggestion}`)
            .join(' ');
        if (culturalRecommendations) {
            prompt += `Cultural Tips: ${culturalRecommendations} `;
        }
    }
    return prompt;
};

/**
 * Generates language learning specific prompt tips and corrections.
 * @param {string} effectiveCulturalContext - The cultural context
 * @param {string} sanitizedText - The text to analyze
 * @param {Object} settings - User settings
 * @returns {string} The language learning prompt segment
 */
export const generateLanguageLearningPrompt = (effectiveCulturalContext, sanitizedText, settings) => {
    const nativeLanguage = settings?.nativeLanguage ||
        (AppConfig.culturalLanguageConfig?.languageLearningSettings?.nativeLanguage) ||
        'general';

    const languageAnalysis = analyzeLanguageLearningText(sanitizedText, nativeLanguage);
    let prompt = getLanguageLearningPromptTips(effectiveCulturalContext || 'english');

    if (languageAnalysis.grammarErrors.length > 0) {
        const grammarTips = languageAnalysis.grammarErrors.map(error => error.explanation).join('; ');
        prompt += `Grammar correction: ${grammarTips}. `;
    }

    if (languageAnalysis.vocabularySuggestions.length > 0) {
        const vocabTips = languageAnalysis.vocabularySuggestions.map(suggestion => `Instead of "${suggestion.original}", consider "${suggestion.alternatives[0]}".`).join(' ');
        prompt += `Vocabulary tip: ${vocabTips} `;
    }
    return prompt;
};

/**
 * Generates coaching specific prompt segments for relationship or anxiety personas.
 * @param {string} persona - Current active persona
 * @param {Object} relationshipInsights - Relationship-specific insights
 * @param {Object} anxietyInsights - Anxiety-specific insights
 * @returns {string} The coaching prompt segment
 */
export const generateCoachingPrompt = (persona, relationshipInsights, anxietyInsights) => {
    let prompt = '';
    if (relationshipInsights && persona === 'relationship') {
        const relationshipPrompt = generateRelationshipCoachingPrompt(relationshipInsights, persona);
        if (relationshipPrompt) prompt += relationshipPrompt + " ";
    }

    if (anxietyInsights && persona === 'anxiety') {
        const anxietyPrompt = generateAnxietyCoachingPrompt(anxietyInsights);
        if (anxietyPrompt) prompt += anxietyPrompt + " ";
    }
    return prompt;
};

/**
 * @typedef {Object} SystemPromptConfig
 * @property {string} persona - Active persona key
 * @property {Object} personaConfig - Configuration for the active persona
 * @property {string} effectiveCulturalContext - The cultural context to apply
 * @property {string} [communicationProfile] - User's communication style profile
 * @property {Object} [detectedCulturalContext] - Automatically detected cultural context
 * @property {string} sanitizedText - The current transcript text
 * @property {boolean} isPowerSavingMode - Power saving state
 * @property {boolean} isSubtleMode - Subtle mode state
 * @property {Object} [preferences] - User preferences (e.g. preferredLength)
 * @property {Object} [relationshipInsights] - Relationship coaching data
 * @property {Object} [anxietyInsights] - Anxiety coaching data
 * @property {Object} [settings] - General application settings
 */

/**
 * Combines static context segments into a final base system prompt for the LLM.
 * This part is intended to be cached across turns.
 * @param {SystemPromptConfig} config - Configuration for prompt generation
 * @returns {string} The base system prompt
 */
export const generateSystemPrompt = (config) => {
    const {
        personaConfig,
        effectiveCulturalContext,
        communicationProfile,
        detectedCulturalContext,
        isPowerSavingMode,
        settings
    } = config;

    let contextInstruction = `Persona: ${personaConfig.label}. `;

    if (communicationProfile) contextInstruction += `${communicationProfile} `;

    contextInstruction += generateCulturalPrompt(effectiveCulturalContext, detectedCulturalContext, settings, isPowerSavingMode);

    return `${personaConfig.prompt} ${contextInstruction}`;
};

/**
 * Generates dynamic, turn-specific context to be appended to the base prompt.
 * @param {SystemPromptConfig} config - Configuration for dynamic prompt generation
 * @returns {string} The dynamic prompt segment
 */
export const generateTurnSpecificContext = (config) => {
    const {
        persona,
        sanitizedText,
        isSubtleMode,
        preferences,
        relationshipInsights,
        anxietyInsights,
        effectiveCulturalContext,
        settings
    } = config;

    let turnContext = "";

    const socialTips = getSocialNuanceTips(sanitizedText);
    if (socialTips) turnContext += `Social Tips: ${socialTips} `;

    if (persona === 'meeting' || persona === 'professional') {
        const highStakesCategory = sanitizedText.toLowerCase().includes('negotiate') || sanitizedText.toLowerCase().includes('price')
            ? 'negotiation'
            : 'leadership';
        turnContext += getHighStakesTips(highStakesCategory);
        turnContext += getProfessionalPromptTips(persona === 'meeting' ? 'business' : 'academic');
    }

    if (persona === 'languagelearning') {
        turnContext += generateLanguageLearningPrompt(effectiveCulturalContext, sanitizedText, settings);
    }

    turnContext += generateCoachingPrompt(persona, relationshipInsights, anxietyInsights);

    if (isSubtleMode) {
        turnContext += "SUBTLE MODE ACTIVE: Provide ONLY extremely brief, context-aware Quick Cues (1-5 words). No full sentences. ";
    } else if (preferences) {
        turnContext += `Preference: ${preferences.preferredLength} length. `;
    }

    turnContext += "IMPORTANT: Always include semantic tags in square brackets for specific cues: [conflict], [action item], [strategic], [social tip], [language tip], [empathy]. ";

    return `${turnContext} Respond naturally.`.trim();
};