import { AppConfig } from '../config';

/**
 * Validates the persona orchestrator configuration for potential conflicts.
 * Checks for overlapping keywords and intents that might cause "jitter."
 */
export const validateOrchestratorConfig = () => {
  const { intentMap } = AppConfig.system.orchestrator;
  const personas = Object.keys(intentMap);
  const conflicts = [];

  for (let i = 0; i < personas.length; i++) {
    for (let j = i + 1; j < personas.length; j++) {
      const p1 = personas[i];
      const p2 = personas[j];
      const conf1 = intentMap[p1];
      const conf2 = intentMap[p2];

      // Check for overlapping keywords
      const commonKeywords = conf1.keywords?.filter(k => conf2.keywords?.includes(k)) || [];
      if (commonKeywords.length > 0) {
        conflicts.push({
          type: 'keyword_overlap',
          personas: [p1, p2],
          items: commonKeywords,
          severity: 'high'
        });
      }

      // Check for overlapping intents
      const commonIntents = conf1.intents?.filter(k => conf2.intents?.includes(k)) || [];
      if (commonIntents.length > 0) {
        // Some intent overlap is expected (e.g., 'clarity')
        const ignoreIntents = ['clarity', 'participation', 'emotion'];
        const significantOverlap = commonIntents.filter(it => !ignoreIntents.includes(it));
        
        if (significantOverlap.length > 0) {
          conflicts.push({
            type: 'intent_overlap',
            personas: [p1, p2],
            items: significantOverlap,
            severity: 'medium'
          });
        }
      }

      // Check if a keyword for one is a negative keyword for another (This is actually good reinforcement, not a conflict)
    }
  }

  return conflicts;
};

/**
 * Runs validation and logs warnings if conflicts are found.
 */
export const checkOrchestratorHealth = () => {
  const conflicts = validateOrchestratorConfig();
  if (conflicts.length > 0) {
    console.warn('[Orchestrator Health] Potential configuration conflicts detected:', conflicts);
  } else {
    console.log('[Orchestrator Health] Configuration is clean.');
  }
  return conflicts;
};
