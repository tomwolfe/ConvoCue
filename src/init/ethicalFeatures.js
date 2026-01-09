/**
 * Initialization script for ConvoCue's ethical features
 * Sets up conservative defaults and proactive notifications
 */

import { maybeShowCulturalDisclaimer } from '../components/CulturalDisclaimer.js';
import { areCulturalFeaturesEnabled } from '../config/conservativeDefaults.js';

/**
 * Initialize ethical features for ConvoCue
 * This should be called when the application starts
 */
export const initializeEthicalFeatures = () => {
  console.log('Initializing ethical features for ConvoCue...');

  // Show cultural disclaimer if appropriate
  maybeShowCulturalDisclaimer();

  // Log the current state of cultural features
  const culturalFeaturesEnabled = areCulturalFeaturesEnabled();
  console.log(`Cultural features enabled: ${culturalFeaturesEnabled}`);

  console.log('Ethical features initialized successfully.');
};

// Auto-initialize when module is loaded (but not in worker context)
if (typeof window !== 'undefined' && typeof WorkerGlobalScope === 'undefined') {
  // Delay initialization slightly to ensure DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeEthicalFeatures);
  } else {
    // If DOM is already loaded, initialize immediately
    setTimeout(initializeEthicalFeatures, 100);
  }
}