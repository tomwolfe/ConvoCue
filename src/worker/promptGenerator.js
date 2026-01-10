import { AppConfig } from '../config';
import { getCulturalPromptTips, getLanguageLearningPromptTips, getProfessionalPromptTips, getSocialNuanceTips, getHighStakesTips } from '../utils/culturalContext';
import { analyzeLanguageLearningText } from '../utils/languageLearning';
import { generateRelationshipCoachingPrompt } from '../utils/relationshipCoaching';
import { generateAnxietyCoachingPrompt } from '../utils/anxietyCoaching';

export const generateCulturalPrompt = (effectiveCulturalContext, detectedCulturalContext, settings, isPowerSavingMode) => {
    if (!effectiveCulturalContext || effectiveCulturalContext === 'general') return '';

    let prompt = getCulturalPromptTips(effectiveCulturalContext);
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

export const generateSystemPrompt = (config) => {
    const {
        persona,
        personaConfig,
        effectiveCulturalContext,
        communicationProfile,
        detectedCulturalContext,
        sanitizedText,
        isPowerSavingMode,
        isSubtleMode,
        preferences,
        relationshipInsights,
        anxietyInsights,
        settings
    } = config;

    let contextInstruction = `Persona: ${personaConfig.label}. `;

    if (communicationProfile) contextInstruction += `${communicationProfile} `;

    contextInstruction += generateCulturalPrompt(effectiveCulturalContext, detectedCulturalContext, settings, isPowerSavingMode);

    const socialTips = getSocialNuanceTips(sanitizedText);
    if (socialTips) contextInstruction += `Social Tips: ${socialTips} `;

    if (persona === 'meeting' || persona === 'professional') {
        const highStakesCategory = sanitizedText.toLowerCase().includes('negotiate') || sanitizedText.toLowerCase().includes('price')
            ? 'negotiation'
            : 'leadership';
        contextInstruction += getHighStakesTips(highStakesCategory);
        contextInstruction += getProfessionalPromptTips(persona === 'meeting' ? 'business' : 'academic');
    }

    if (persona === 'languagelearning') {
        contextInstruction += generateLanguageLearningPrompt(effectiveCulturalContext, sanitizedText, settings);
    }

    contextInstruction += generateCoachingPrompt(persona, relationshipInsights, anxietyInsights);

    if (isSubtleMode) {
        contextInstruction += "SUBTLE MODE ACTIVE: Provide ONLY extremely brief, context-aware Quick Cues (1-5 words). No full sentences. ";
    } else if (preferences) {
        contextInstruction += `Preference: ${preferences.preferredLength} length. `;
    }

    contextInstruction += "IMPORTANT: Always include semantic tags in square brackets for specific cues: [conflict], [action item], [strategic], [social tip], [language tip], [empathy]. ";

    return `${personaConfig.prompt} ${contextInstruction} Respond naturally.`;
};
