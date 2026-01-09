/**
 * Cultural Disclaimer Component for ConvoCue
 * Displays prominent disclaimers about cultural generalizations
 */

import React from 'react';

const CulturalDisclaimer = ({ isVisible = true, type = 'general' }) => {
  if (!isVisible) {
    return null;
  }

  const disclaimers = {
    general: {
      title: 'Cultural Guidance Disclaimer',
      message: 'This system provides general cultural guidance based on patterns. Individual preferences may differ significantly from cultural generalizations. Always respect personal preferences over cultural assumptions.',
      detailedWarning: '⚠️ IMPORTANT: Cultural patterns are statistical generalizations that may not apply to individuals. Identity is complex and multifaceted. Use these suggestions as starting points, not definitive characterizations.'
    },
    language: {
      title: 'Language Learning Disclaimer',
      message: 'Language suggestions are based on general patterns and may not be appropriate for all learners. Individual learning styles and native language backgrounds vary greatly.',
      detailedWarning: '⚠️ IMPORTANT: Language learning feedback is based on general patterns. Your unique learning journey may require different approaches. Consider these as suggestions, not absolute rules.'
    },
    professional: {
      title: 'Professional Coaching Disclaimer',
      message: 'Professional advice is contextual and may not apply to all situations. Consider your specific circumstances and consult professionals when needed.',
      detailedWarning: '⚠️ IMPORTANT: Professional guidance is contextual and may not account for your specific workplace culture or situation. Use discretion when applying these suggestions.'
    },
    biasAlert: {
      title: 'Bias Awareness Alert',
      message: 'This system may reflect historical or data collection biases. Always consider multiple perspectives and verify with individuals directly when possible.',
      detailedWarning: '⚠️ CRITICAL: AI systems can perpetuate societal biases. These suggestions should supplement, not replace, direct human interaction and understanding.'
    }
  };

  const disclaimer = disclaimers[type] || disclaimers.general;

  return (
    <div className="cultural-disclaimer-container">
      <div className="cultural-disclaimer-content">
        <h4>{disclaimer.title}</h4>
        <p>{disclaimer.message}</p>
        {disclaimer.detailedWarning && (
          <div className="detailed-warning">
            <p><strong>{disclaimer.detailedWarning}</strong></p>
          </div>
        )}
        <small>This is a general guideline, not personalized advice.</small>
      </div>
    </div>
  );
};

export default CulturalDisclaimer;

// CSS styles for the disclaimer component
export const disclaimerStyles = `
.cultural-disclaimer-container {
  margin: 1rem 0;
  padding: 0.75rem;
  border: 2px solid #ffd700;
  border-radius: 4px;
  background-color: #fff8e1;
  font-size: 0.85rem;
}

.cultural-disclaimer-content h4 {
  margin: 0 0 0.5rem 0;
  color: #d32f2f;
  font-size: 0.9rem;
}

.cultural-disclaimer-content p {
  margin: 0 0 0.5rem 0;
  line-height: 1.4;
}

.cultural-disclaimer-content small {
  color: #666;
  font-style: italic;
}
`;