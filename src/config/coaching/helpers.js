/**
 * Robust helper to safely access insights from the coaching state.
 * This makes the UI resilient to changes in the data structure.
 */
export const getSafeInsights = (insights, key) => {
  if (!insights) return null;
  if (!key || !insights[key]) {
    if (key) console.warn(`[Coaching] No insights found for key: ${key}`);
    return null;
  }
  return insights[key]?.insights || null;
};

export const getSafeCoping = (insights, key) => {
  if (!insights) return null;
  if (!key || !insights[key]) {
    if (key) console.warn(`[Coaching] No coping strategies found for key: ${key}`);
    return null;
  }
  return insights[key]?.copingStrategies || null;
};
