/**
 * Helper functions for providing tooltips and explanations for complex settings
 * Improves user experience by making complex settings more accessible to novice users
 */

export const SETTINGS_TOOLTIPS = {
  confidenceThreshold: {
    title: 'Confidence Threshold',
    description: 'Controls how sensitive the intent detection is. Lower values (0.1-0.3) detect more intents but may have false positives. Higher values (0.7-0.9) are more selective but may miss some intents.',
    examples: [
      '0.1: Very sensitive - detects many intents but may have false positives',
      '0.3: Balanced - good for most users (default)',
      '0.7: Selective - only detects high-confidence intents'
    ]
  },
  debounceWindowMs: {
    title: 'Debounce Window',
    description: 'Time window (in milliseconds) to prevent rapid intent switching during continuous speech. Higher values prevent flickering but may delay intent updates.',
    examples: [
      '200ms: Responsive but may flicker',
      '800ms: Balanced - prevents most flickering (default)',
      '2000ms: Very stable but slower to respond'
    ]
  },
  stickyDurationMs: {
    title: 'Sticky Duration',
    description: 'How long (in milliseconds) to keep showing the same intent before allowing a new one. Prevents UI flickering.',
    examples: [
      '1000ms: Short duration - allows quick changes',
      '2000ms: Balanced - good stability (default)',
      '5000ms: Long duration - very stable'
    ]
  },
  hapticIntensity: {
    title: 'Haptic Intensity',
    description: 'Controls the strength of vibration feedback. Adjust based on your device capabilities.',
    examples: [
      'Low: Gentle vibrations',
      'Medium: Standard intensity (default)',
      'High: Strong vibrations'
    ]
  }
};

/**
 * Gets tooltip information for a specific setting
 * @param {string} settingName - Name of the setting
 * @returns {Object} Tooltip information or null if not found
 */
export const getSettingTooltip = (settingName) => {
  return SETTINGS_TOOLTIPS[settingName] || null;
};

/**
 * Renders a tooltip component for a setting
 * @param {string} settingName - Name of the setting
 * @returns {string} HTML string for the tooltip
 */
export const renderSettingTooltip = (settingName) => {
  const tooltip = getSettingTooltip(settingName);
  if (!tooltip) {
    return '';
  }

  let examplesHtml = '';
  if (tooltip.examples && tooltip.examples.length > 0) {
    examplesHtml = `
      <div class="tooltip-examples">
        <strong>Examples:</strong>
        <ul>
          ${tooltip.examples.map(example => `<li>${example}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  return `
    <div class="setting-tooltip" title="${tooltip.description}">
      <span class="tooltip-icon">ℹ️</span>
      <div class="tooltip-content">
        <h4>${tooltip.title}</h4>
        <p>${tooltip.description}</p>
        ${examplesHtml}
      </div>
    </div>
  `;
};

/**
 * Initializes tooltip functionality for settings UI
 */
export const initializeSettingTooltips = () => {
  // Add mouseover/mouseout event listeners for tooltips
  document.addEventListener('mouseover', (e) => {
    const tooltipTrigger = e.target.closest('.setting-with-tooltip');
    if (tooltipTrigger) {
      const settingName = tooltipTrigger.dataset.setting;
      const tooltipInfo = getSettingTooltip(settingName);
      if (tooltipInfo) {
        // Create and show tooltip
        showTooltip(tooltipTrigger, tooltipInfo);
      }
    }
  });

  document.addEventListener('mouseout', (e) => {
    if (e.target.classList.contains('setting-tooltip') || 
        e.target.closest('.setting-tooltip')) {
      hideTooltip();
    }
  });
};

/**
 * Shows a tooltip near the target element
 * @param {Element} target - Element to show tooltip for
 * @param {Object} tooltipInfo - Tooltip information
 */
const showTooltip = (target, tooltipInfo) => {
  // Remove any existing tooltip
  hideTooltip();

  // Create tooltip element
  const tooltipEl = document.createElement('div');
  tooltipEl.className = 'cv-settings-tooltip-popup';
  tooltipEl.innerHTML = `
    <div class="tooltip-header">
      <h4>${tooltipInfo.title}</h4>
    </div>
    <div class="tooltip-body">
      <p>${tooltipInfo.description}</p>
      ${tooltipInfo.examples ? `
        <div class="tooltip-examples">
          <strong>Examples:</strong>
          <ul>
            ${tooltipInfo.examples.map(ex => `<li>${ex}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    </div>
  `;

  // Position tooltip near the target
  const rect = target.getBoundingClientRect();
  tooltipEl.style.position = 'fixed';
  tooltipEl.style.left = rect.left + 'px';
  tooltipEl.style.top = (rect.top - tooltipEl.offsetHeight - 10) + 'px';
  tooltipEl.style.zIndex = '10000';
  tooltipEl.style.backgroundColor = '#333';
  tooltipEl.style.color = 'white';
  tooltipEl.style.padding = '10px';
  tooltipEl.style.borderRadius = '4px';
  tooltipEl.style.fontSize = '14px';
  tooltipEl.style.maxWidth = '300px';
  tooltipEl.style.wordWrap = 'break-word';
  tooltipEl.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';

  document.body.appendChild(tooltipEl);

  // Add timeout to remove tooltip after a while
  setTimeout(() => {
    if (tooltipEl.parentNode) {
      tooltipEl.parentNode.removeChild(tooltipEl);
    }
  }, 5000); // Auto-hide after 5 seconds
};

/**
 * Hides the current tooltip
 */
const hideTooltip = () => {
  const existingTooltip = document.querySelector('.cv-settings-tooltip-popup');
  if (existingTooltip) {
    existingTooltip.parentNode.removeChild(existingTooltip);
  }
};