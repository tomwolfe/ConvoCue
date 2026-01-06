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

  // Create a simple summary by combining key points from the conversation
  const summaryParts = [];
  
  // Add first few exchanges as they often set the context
  const initialMessages = conversationMessages.slice(0, 4); // First 2 user-assistant pairs
  for (const msg of initialMessages) {
    const prefix = msg.role === 'user' ? 'User: ' : 'Assistant: ';
    summaryParts.push(`${prefix}${msg.content.substring(0, 100)}`); // Limit length
  }

  // If there are more messages, add a summary of the general topic
  if (conversationMessages.length > 4) {
    const topics = extractConversationTopics(conversationMessages);
    if (topics.length > 0) {
      summaryParts.push(`Topics discussed: ${topics.join(', ')}`);
    }
  }

  return summaryParts.join('; ');
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