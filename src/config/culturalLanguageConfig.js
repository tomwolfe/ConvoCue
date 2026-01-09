/**
 * Configuration for Cultural and Language Learning Features
 * Allows users to control the behavior of AI suggestions
 */

export const CulturalLanguageConfig = {
  // Controls for cultural context features
  culturalSettings: {
    // Whether to enable cultural context detection
    enableCulturalDetection: true,
    
    // How prominently to display cultural disclaimers
    disclaimerVisibility: 'high', // 'low', 'medium', 'high'
    
    // Whether to prioritize user's cultural preferences over detected patterns
    prioritizeUserPreferences: true,
    
    // Threshold for cultural pattern matching (0-1)
    culturalMatchThreshold: 0.5,
    
    // Whether to show cultural suggestions in responses
    showCulturalSuggestions: true
  },
  
  // Controls for language learning features
  languageLearningSettings: {
    // Whether to enable language learning feedback
    enableLanguageLearning: true,
    
    // Level of grammar correction (0-2, where 2 is most aggressive)
    grammarCorrectionLevel: 1,
    
    // Whether to suggest vocabulary enhancements
    suggestVocabulary: true,
    
    // Whether to provide pronunciation feedback (text-based)
    providePronunciationFeedback: true,
    
    // Whether to show disclaimers with language suggestions
    showLanguageDisclaimers: true
  },
  
  // Controls for feature coordination
  coordinationSettings: {
    // Whether to enable conflict resolution between features
    enableConflictResolution: true,
    
    // Priority level for cultural features (relative to others)
    culturalPriority: 3, // 1-5 scale
    
    // Priority level for language learning features
    languageLearningPriority: 2, // 1-5 scale
    
    // Whether to show coordination notes in responses
    showCoordinationNotes: true
  },
  
  // Privacy and data handling settings
  privacySettings: {
    // Whether to store feedback locally for improvement
    storeFeedbackLocally: true,
    
    // Whether to allow anonymous feedback aggregation (future feature)
    allowAnonymousAggregation: false,
    
    // Whether to remember user preferences across sessions
    rememberPreferences: true
  },
  
  // Helper methods
  updateSetting(category, setting, value) {
    if (this[category] && this[category].hasOwnProperty(setting)) {
      this[category][setting] = value;
      // Optionally save to localStorage
      if (this.privacySettings.rememberPreferences) {
        try {
          const settingsStr = localStorage.getItem('convoCue_settings');
          const settings = settingsStr ? JSON.parse(settingsStr) : {};
          settings[`${category}.${setting}`] = value;
          localStorage.setItem('convoCue_settings', JSON.stringify(settings));
        } catch (e) {
          console.warn('Could not save settings to localStorage:', e);
        }
      }
    }
  },
  
  loadUserSettings() {
    try {
      const settingsStr = localStorage.getItem('convoCue_settings');
      if (settingsStr) {
        const settings = JSON.parse(settingsStr);
        for (const [key, value] of Object.entries(settings)) {
          const [category, setting] = key.split('.');
          if (this[category] && this[category].hasOwnProperty(setting)) {
            this[category][setting] = value;
          }
        }
      }
    } catch (e) {
      console.warn('Could not load settings from localStorage:', e);
    }
  }
};

// Load user settings on initialization
CulturalLanguageConfig.loadUserSettings();

export default CulturalLanguageConfig;