/**
 * Utility to calculate real-time engagement metrics from conversation history.
 * 
 * NOTE: This is currently optimized for 1:1 interactions. In group chats (>2 participants),
 * 'otherTurns' aggregates all non-user participants, which may dilute individual dynamics.
 */

/**
 * Calculates talk ratio and other dynamics from turns.
 * @param {Array} turns - Array of conversation turns.
 * @param {Object} options - Options including isGroupMode.
 * @returns {Object} Engagement metrics.
 */
export const calculateEngagement = (turns, options = {}) => {
  const { isGroupMode = false } = options;
  
  if (!turns || turns.length === 0) {
    return {
      talkRatio: 0,
      userTurns: 0,
      otherTurns: 0,
      totalTurns: 0,
      pace: 0,
      isGroupMode
    };
  }

  const userTurns = turns.filter(t => t.role === 'user');
  const otherTurns = turns.filter(t => t.role === 'other' || t.role === 'assistant');
  const totalTurns = turns.length;

  // Calculate Turn-based Talk Ratio
  const turnRatio = userTurns.length / totalTurns;

  // Refinement: Word-based Talk Ratio (more accurate for 80/20)
  const userWordCount = userTurns.reduce((sum, t) => sum + (t.content?.split(' ').length || 0), 0);
  const totalWordCount = turns.reduce((sum, t) => sum + (t.content?.split(' ').length || 0), 0);
  const wordRatio = totalWordCount > 0 ? userWordCount / totalWordCount : 0;

  // Balanced Talk Ratio
  let talkRatio = (turnRatio + wordRatio) / 2;

  // Adjustment for Group Mode: 
  // If in group mode, we don't know the exact number of participants, but we assume > 2.
  // We can attempt to estimate unique speakers if they were tracked, 
  // but since they aren't fully tracked as individual IDs, we use a multiplier
  // to make the talkRatio more sensitive to "dominating" behavior.
  if (isGroupMode) {
    // In a group, a user's "fair share" is smaller. 
    // We boost the reported talkRatio to trigger nudges earlier.
    // E.g., if talkRatio is 0.4, in a group of 3 it might be considered "high".
    talkRatio = talkRatio * 1.5; 
  }

  // Estimate Pace (last 5 turns)
  const recentTurns = turns.slice(-5);
  const recentWords = recentTurns.reduce((sum, t) => sum + (t.content?.split(' ').length || 0), 0);
  const timeSpanMs = recentTurns.length > 1 
    ? (recentTurns[recentTurns.length - 1].timestamp - recentTurns[0].timestamp) 
    : 0;
  
  const pace = timeSpanMs > 0 ? (recentWords / (timeSpanMs / 60000)) : 0;

  return {
    talkRatio,
    turnRatio,
    wordRatio,
    userTurns: userTurns.length,
    otherTurns: otherTurns.length,
    totalTurns,
    pace: Math.round(pace),
    isGroupMode
  };
};
