/**
 * Utility to calculate real-time engagement metrics from conversation history.
 * 
 * NOTE: This is currently optimized for 1:1 interactions. In group chats (>2 participants),
 * 'otherTurns' aggregates all non-user participants, which may dilute individual dynamics.
 */

/**
 * Calculates talk ratio and other dynamics from turns.
 * @param {Array} turns - Array of conversation turns.
 * @returns {Object} Engagement metrics.
 */
export const calculateEngagement = (turns) => {
  if (!turns || turns.length === 0) {
    return {
      talkRatio: 0,
      userTurns: 0,
      otherTurns: 0,
      totalTurns: 0,
      pace: 0 // words per minute (estimate)
    };
  }

  const userTurns = turns.filter(t => t.role === 'user');
  const otherTurns = turns.filter(t => t.role === 'other' || t.role === 'assistant');
  const totalTurns = turns.length;

  // Calculate Turn-based Talk Ratio
  const turnRatio = userTurns.length / totalTurns;

  // Refinement: Word-based Talk Ratio (more accurate for 80/20)
  // This prevents short "OK" responses from being weighted the same as long monologues.
  const userWordCount = userTurns.reduce((sum, t) => sum + (t.content?.split(' ').length || 0), 0);
  const totalWordCount = turns.reduce((sum, t) => sum + (t.content?.split(' ').length || 0), 0);
  const wordRatio = totalWordCount > 0 ? userWordCount / totalWordCount : 0;

  // Balanced Talk Ratio (average of turn and word ratios for robustness)
  const talkRatio = (turnRatio + wordRatio) / 2;

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
    pace: Math.round(pace)
  };
};
