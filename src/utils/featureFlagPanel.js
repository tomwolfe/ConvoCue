/**
 * Feature Flag Admin Panel
 * 
 * A simple admin panel to manage feature flags for A/B testing
 * and gradual rollouts without code changes.
 */

import { getAllFeatureFlags, setFeatureFlag, resetFeatureFlags } from '../utils/featureFlags';

/**
 * Render the feature flag admin panel
 * This can be embedded in a debug page or settings panel
 */
export const renderFeatureFlagPanel = () => {
  // Create a floating panel element
  const panel = document.createElement('div');
  panel.id = 'feature-flag-panel';
  panel.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 300px;
    background: white;
    border: 2px solid #ccc;
    border-radius: 8px;
    padding: 15px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    font-family: Arial, sans-serif;
    font-size: 14px;
  `;
  
  // Create title
  const title = document.createElement('h3');
  title.textContent = 'Feature Flags';
  title.style.marginTop = '0';
  title.style.marginBottom = '15px';
  title.style.color = '#333';
  panel.appendChild(title);
  
  // Get current flags
  const flags = getAllFeatureFlags();
  
  // Create checkboxes for each flag
  Object.entries(flags).forEach(([flagName, currentValue]) => {
    const container = document.createElement('div');
    container.style.marginBottom = '10px';
    
    const label = document.createElement('label');
    label.style.display = 'flex';
    label.style.alignItems = 'center';
    label.style.cursor = 'pointer';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = currentValue;
    checkbox.dataset.flagName = flagName;
    checkbox.style.marginRight = '8px';
    
    checkbox.addEventListener('change', (e) => {
      const flagName = e.target.dataset.flagName;
      setFeatureFlag(flagName, e.target.checked);
      // Show confirmation
      const status = document.getElementById('feature-flag-status');
      if (status) {
        status.textContent = `Updated ${flagName}: ${e.target.checked}`;
        setTimeout(() => {
          status.textContent = '';
        }, 2000);
      }
    });
    
    const textSpan = document.createElement('span');
    textSpan.textContent = flagName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()); // CamelCase to Title Case
    
    label.appendChild(checkbox);
    label.appendChild(textSpan);
    container.appendChild(label);
    panel.appendChild(container);
  });
  
  // Add status div
  const statusDiv = document.createElement('div');
  statusDiv.id = 'feature-flag-status';
  statusDiv.style.margin = '10px 0';
  statusDiv.style.padding = '5px';
  statusDiv.style.fontSize = '12px';
  statusDiv.style.color = '#007cba';
  panel.appendChild(statusDiv);
  
  // Add reset button
  const resetButton = document.createElement('button');
  resetButton.textContent = 'Reset to Defaults';
  resetButton.style.width = '100%';
  resetButton.style.padding = '8px';
  resetButton.style.backgroundColor = '#f44336';
  resetButton.style.color = 'white';
  resetButton.style.border = 'none';
  resetButton.style.borderRadius = '4px';
  resetButton.style.cursor = 'pointer';
  
  resetButton.addEventListener('click', () => {
    resetFeatureFlags();
    // Refresh the panel
    document.body.removeChild(panel);
    renderFeatureFlagPanel();
    // Show confirmation
    const status = document.getElementById('feature-flag-status');
    if (status) {
      status.textContent = 'Flags reset to defaults';
      setTimeout(() => {
        status.textContent = '';
      }, 2000);
    }
  });
  
  panel.appendChild(resetButton);
  
  // Add close button
  const closeButton = document.createElement('button');
  closeButton.innerHTML = '&times;';
  closeButton.style.position = 'absolute';
  closeButton.style.top = '5px';
  closeButton.style.right = '5px';
  closeButton.style.background = 'none';
  closeButton.style.border = 'none';
  closeButton.style.fontSize = '20px';
  closeButton.style.cursor = 'pointer';
  closeButton.style.color = '#999';
  
  closeButton.addEventListener('click', () => {
    document.body.removeChild(panel);
  });
  
  panel.appendChild(closeButton);
  
  // Add the panel to the document
  document.body.appendChild(panel);
};

/**
 * Toggle the feature flag panel visibility
 */
export const toggleFeatureFlagPanel = () => {
  const existingPanel = document.getElementById('feature-flag-panel');
  if (existingPanel) {
    document.body.removeChild(existingPanel);
  } else {
    renderFeatureFlagPanel();
  }
};

// Export for debugging purposes
export {
  getAllFeatureFlags,
  setFeatureFlag,
  resetFeatureFlags
};