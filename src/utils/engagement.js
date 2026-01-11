/**
 * Utility to calculate real-time engagement metrics from conversation history.
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

  // Calculate Talk Ratio (by turn count for simplicity in 80/20)
  const talkRatio = userTurns.length / totalTurns;

  // Estimate Pace (last 5 turns)
  const recentTurns = turns.slice(-5);
  const totalWords = recentTurns.reduce((sum, t) => sum + (t.content?.split(' ').length || 0), 0);
  const timeSpanMs = recentTurns.length > 1 
    ? (recentTurns[recentTurns.length - 1].timestamp - recentTurns[0].timestamp) 
    : 0;
  
  const pace = timeSpanMs > 0 ? (totalWords / (timeSpanMs / 60000)) : 0;

  return {
    talkRatio,
    userTurns: userTurns.length,
    otherTurns: otherTurns.length,
    totalTurns,
    pace: Math.round(pace)
  };
};
