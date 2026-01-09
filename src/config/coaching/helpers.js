/**
 * Robust helper to safely access insights from the coaching state.
 * This makes the UI resilient to changes in the data structure.
 */
export const getSafeInsights = (insights, key) => {
  if (!insights || !key) return null;
  return insights[key]?.insights || null;
};

export const getSafeCoping = (insights, key) => {
  if (!insights || !key) return null;
  return insights[key]?.copingStrategies || null;
};
