/**
 * Cultural Disclaimer Component for ConvoCue
 * Displays important disclaimers about cultural generalizations and prompts users to customize preferences
 */

import { isCulturalProfileCustomized, getUserCulturalProfile, resetCulturalProfile } from '../utils/userCulturalProfile.js';
import { getBiasMonitoringDashboard } from '../utils/biasMonitoring.js';

// Display the cultural disclaimer with options for user customization
export const showCulturalDisclaimer = () => {
  // Check if user has already customized their profile
  const isCustomized = isCulturalProfileCustomized();
  
  // Get bias monitoring data to inform the user about system behavior
  const biasData = getBiasMonitoringDashboard();
  
  // Create a modal or banner with disclaimer information
  const disclaimerHTML = `
    <div id="cultural-disclaimer-modal" class="cultural-disclaimer-modal">
      <div class="cultural-disclaimer-content">
        <h3>Cultural Awareness & Customization</h3>
        
        <p><strong>Important Notice:</strong> ConvoCue may provide cultural communication suggestions based on general patterns. These are probabilistic suggestions, not definitive characterizations.</p>
        
        <p>Individual identity is complex and may not align with regional stereotypes. Personal preferences should take precedence over cultural assumptions.</p>
        
        <div class="disclaimer-options">
          ${isCustomized 
            ? `<p>You have customized your cultural preferences. Great job taking control of your experience!</p>
               <button id="reset-culture-prefs-btn" class="btn-secondary">Reset Preferences</button>`
            : `<p>We recommend customizing your cultural preferences to receive more personalized guidance.</p>
               <button id="customize-culture-btn" class="btn-primary">Customize My Preferences</button>`}
          
          <button id="opt-out-culture-btn" class="btn-tertiary">Opt Out of Cultural Suggestions</button>
        </div>
        
        <details class="transparency-details">
          <summary>System Transparency Report</summary>
          <p>Total cultural suggestions: ${biasData.summary.totalCulturalSuggestions}</p>
          <p>Override rate: ${biasData.summary.overrideRate}%</p>
          <p>User feedback count: ${biasData.summary.userFeedbackCount}</p>
          ${biasData.alerts.length > 0 
            ? `<p><strong>System Alerts:</strong> ${biasData.alerts.length} potential bias issues detected</p>` 
            : '<p>No current bias alerts detected.</p>'}
        </details>
        
        <button id="close-disclaimer-btn" class="btn-close">Close</button>
      </div>
    </div>
  `;
  
  // Add CSS for the disclaimer modal
  addDisclaimerStyles();
  
  // Inject the disclaimer into the DOM
  document.body.insertAdjacentHTML('beforeend', disclaimerHTML);
  
  // Attach event listeners
  attachDisclaimerEventListeners(isCustomized);
};

// Add CSS styles for the disclaimer
const addDisclaimerStyles = () => {
  if (document.getElementById('cultural-disclaimer-styles')) {
    return; // Styles already added
  }
  
  const styleElement = document.createElement('style');
  styleElement.id = 'cultural-disclaimer-styles';
  styleElement.textContent = `
    .cultural-disclaimer-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.6);
      z-index: 10000;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    
    .cultural-disclaimer-content {
      background: white;
      padding: 20px;
      border-radius: 8px;
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      position: relative;
    }
    
    .disclaimer-options {
      margin: 15px 0;
      padding: 15px;
      background-color: #f9f9f9;
      border-radius: 4px;
    }
    
    .disclaimer-options button {
      display: block;
      width: 100%;
      margin: 8px 0;
      padding: 10px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }
    
    .btn-primary {
      background-color: #007bff;
      color: white;
    }
    
    .btn-secondary {
      background-color: #6c757d;
      color: white;
    }
    
    .btn-tertiary {
      background-color: #dc3545;
      color: white;
    }
    
    .btn-close {
      position: absolute;
      top: 10px;
      right: 10px;
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
    }
    
    .transparency-details {
      margin-top: 15px;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    
    .transparency-details summary {
      cursor: pointer;
      font-weight: bold;
      margin-bottom: 5px;
    }
  `;
  
  document.head.appendChild(styleElement);
};

// Attach event listeners to disclaimer buttons
const attachDisclaimerEventListeners = (isCustomized) => {
  // Use a small timeout to ensure DOM is ready
  setTimeout(() => {
    // Close button
    const closeBtn = document.getElementById('close-disclaimer-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        const modal = document.getElementById('cultural-disclaimer-modal');
        if (modal) modal.remove();
      });
    }

    // Customize button
    if (!isCustomized) {
      const customizeBtn = document.getElementById('customize-culture-btn');
      if (customizeBtn) {
        customizeBtn.addEventListener('click', () => {
          // Redirect to cultural preferences page or open preferences modal
          alert('Redirecting to cultural preferences setup...');
          // In a real implementation, this would open the cultural preferences UI
          const modal = document.getElementById('cultural-disclaimer-modal');
          if (modal) modal.remove();
        });
      }
    }

    // Reset preferences button
    if (isCustomized) {
      const resetBtn = document.getElementById('reset-culture-prefs-btn');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          if (confirm('Are you sure you want to reset your cultural preferences to defaults?')) {
            resetCulturalProfile();
            alert('Cultural preferences have been reset to defaults.');
            const modal = document.getElementById('cultural-disclaimer-modal');
            if (modal) modal.remove();
          }
        });
      }
    }

    // Opt out button
    const optOutBtn = document.getElementById('opt-out-culture-btn');
    if (optOutBtn) {
      optOutBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to opt out of all cultural suggestions? You can change this later in settings.')) {
          // Import dynamically to avoid circular dependencies
          import('../utils/userCulturalProfile.js').then(({ setCulturalOptOut }) => {
            setCulturalOptOut(true);
            alert('You have opted out of cultural suggestions. This can be changed in settings.');
            const modal = document.getElementById('cultural-disclaimer-modal');
            if (modal) modal.remove();
          }).catch(err => {
            console.error('Error importing userCulturalProfile:', err);
            alert('There was an issue processing your request. Please try again.');
          });
        }
      });
    }
  }, 0);
};

// Function to determine if disclaimer should be shown
export const shouldShowCulturalDisclaimer = () => {
  // Check if disclaimer has been acknowledged recently (e.g., in the last week)
  const lastShown = localStorage.getItem('convoCue_culturalDisclaimerLastShown');
  const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days in milliseconds
  
  // Show disclaimer if:
  // 1. It hasn't been shown in the last week, OR
  // 2. User hasn't customized their profile yet, OR
  // 3. There are bias alerts that warrant attention
  const biasData = getBiasMonitoringDashboard();
  
  return (!lastShown || parseInt(lastShown) < oneWeekAgo) || 
         !isCulturalProfileCustomized() || 
         biasData.alerts.length > 0;
};

// Function to show disclaimer if appropriate
export const maybeShowCulturalDisclaimer = () => {
  if (shouldShowCulturalDisclaimer()) {
    showCulturalDisclaimer();
    
    // Update the last shown timestamp
    localStorage.setItem('convoCue_culturalDisclaimerLastShown', Date.now().toString());
  }
};