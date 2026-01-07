/**
 * @fileoverview Conversation utilities for managing context and summarization
 */

/**
 * Summarizes a conversation history into a concise summary
 *
 * @param {Array} history - Array of conversation messages [{role, content}]
 * @returns {string} - Concise summary of the conversation
 */
export const summarizeConversation = (history) => {
  if (!history || history.length === 0) {
    return '';
  }

  // Filter out system messages and keep only user/assistant exchanges
  const conversationMessages = history.filter(msg => 
    msg.role === 'user' || msg.role === 'assistant'
  );

  if (conversationMessages.length === 0) {
    return '';
  }

  // Create a more descriptive summary
  const summaryParts = [];
  
  // Identify the core intent of the conversation based on the last few exchanges
  const lastMessages = conversationMessages.slice(-4);
  const firstMessages = conversationMessages.slice(0, 2);
  
  if (firstMessages.length > 0) {
    summaryParts.push(`Started with: ${firstMessages.map(m => m.content.substring(0, 50)).join(' -> ')}`);
  }

  const topics = extractConversationTopics(conversationMessages);
  if (topics.length > 0) {
    summaryParts.push(`Key topics: ${topics.join(', ')}`);
  }

  // Add a "Current Context" snippet
  if (lastMessages.length > 0) {
    const lastExchange = lastMessages[lastMessages.length - 1];
    summaryParts.push(`Most recently: ${lastExchange.role === 'user' ? 'User mentioned' : 'Assistant suggested'} "${lastExchange.content.substring(0, 60)}..."`);
  }

  return summaryParts.join(' | ');
};

/**
 * Extracts key topics from conversation messages
 *
 * @param {Array} messages - Array of conversation messages
 * @returns {Array} - Array of key topics
 */
const extractConversationTopics = (messages) => {
  const allText = messages.map(msg => msg.content).join(' ');
  const words = allText.toLowerCase().split(/\s+/);
  
  // Common stop words to filter out
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
    'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 
    'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'
  ]);
  
  // Count word frequencies
  const wordFreq = {};
  for (const word of words) {
    const cleanWord = word.replace(/[^\w\s]/g, '').trim();
    if (cleanWord.length > 3 && !stopWords.has(cleanWord)) {
      wordFreq[cleanWord] = (wordFreq[cleanWord] || 0) + 1;
    }
  }
  
  // Get top words as potential topics
  const sortedWords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5) // Top 5 potential topics
    .map(([word]) => word);
    
  return sortedWords;
};

/**
 * Manages conversation history with summarization when it gets too long
 *
 * @param {Array} history - Current conversation history
 * @param {number} maxHistoryLength - Maximum number of messages to keep
 * @returns {Array} - Trimmed history with optional summary
 */
export const manageConversationHistory = (history, maxHistoryLength = 6) => {
  if (history.length <= maxHistoryLength) {
    return history;
  }

  // Extract messages beyond the max length to create a summary
  const excessMessages = history.slice(0, history.length - maxHistoryLength);
  const remainingMessages = history.slice(history.length - maxHistoryLength);

  // Create a summary of the excess messages
  const summary = summarizeConversation(excessMessages);

  // If we have a meaningful summary, add it as a system message
  if (summary.trim()) {
    return [
      {
        role: 'system',
        content: `Previous conversation summary: ${summary}`
      },
      ...remainingMessages
    ];
  }

  return remainingMessages;
};

/**
 * Optimized conversation history management for longer conversations
 * Uses sliding window approach with periodic summarization
 *
 * @param {Array} history - Current conversation history
 * @param {number} maxHistoryLength - Maximum number of recent messages to keep
 * @param {number} summaryWindow - Number of messages to summarize when needed
 * @returns {Array} - Optimized history
 */
export const optimizeConversationHistory = (history, maxHistoryLength = 10, summaryWindow = 5) => {
  if (history.length <= maxHistoryLength) {
    return history;
  }

  // For longer histories, implement a more sophisticated approach
  const recentMessages = history.slice(-maxHistoryLength);
  const olderMessages = history.slice(0, history.length - maxHistoryLength);

  // Only summarize if we have enough older messages
  if (olderMessages.length >= summaryWindow) {
    // Group older messages into chunks and summarize each chunk
    const chunks = [];
    for (let i = 0; i < olderMessages.length; i += summaryWindow) {
      chunks.push(olderMessages.slice(i, i + summaryWindow));
    }

    // Create summaries for each chunk
    const chunkSummaries = chunks.map(chunk => {
      const summary = summarizeConversation(chunk);
      return {
        role: 'system',
        content: `Earlier conversation: ${summary}`,
        timestamp: chunk[0]?.timestamp || Date.now()
      };
    });

    // Keep only the most recent chunk summary to avoid clutter
    const recentChunkSummary = chunkSummaries.slice(-1);

    return [
      ...recentChunkSummary,
      ...recentMessages
    ];
  }

  // If not enough older messages for chunking, use simple summarization
  const summary = summarizeConversation(olderMessages);
  if (summary.trim()) {
    return [
      {
        role: 'system',
        content: `Previous conversation summary: ${summary}`
      },
      ...recentMessages
    ];
  }

  return recentMessages;
};

/**
 * Calculates memory usage estimate for conversation history
 * @param {Array} history - Conversation history
 * @returns {number} Estimated memory usage in bytes
 */
export const estimateMemoryUsage = (history) => {
  if (!history || history.length === 0) return 0;

  let totalSize = 0;
  history.forEach(msg => {
    if (msg.content) {
      totalSize += JSON.stringify(msg).length;
    }
  });

  return totalSize;
};

/**
 * Checks if memory usage is approaching limits
 * @param {Array} history - Conversation history
 * @param {number} limit - Memory limit in bytes (default 1MB)
 * @returns {boolean} True if approaching limit
 */
export const isMemoryLimitApproaching = (history, limit = 1024 * 1024) => {
  const estimatedUsage = estimateMemoryUsage(history);
  return estimatedUsage > limit * 0.8; // Alert at 80% of limit
};