/**
 * Haptic Feedback Configuration for ConvoCue
 */
export const HapticsConfig = {
  // Mapping of detected intents to vibration pattern keys
  intentMap: {
    'CONFLICT': 'CONFLICT',
    'ACTION_ITEM': 'ACTION',
    'ACTION': 'ACTION',
    'QUESTION': 'QUESTION',
    'STRATEGIC': 'TRANSITION',
    'NEGOTIATION': 'TRANSITION',
    'EMPATHY': 'EMPATHY',
    'SUCCESS': 'SUCCESS',
    'AGREEMENT': 'SUCCESS',
    'SUGGESTION': 'SUGGESTION'
  },
  
  // Cooldown between vibrations to avoid overwhelming the user
  defaultCooldownMs: 1500,
  
  // Default haptic settings
  defaults: {
    enabled: true,
    intensity: 'medium'
  }
};

export default HapticsConfig;
