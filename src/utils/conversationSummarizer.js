/**
 * Conversation Summarization Utility
 * Generates concise summaries of conversation history with key themes, action items, and sentiment analysis
 */

import { AppConfig } from '../config';

/**
 * Generates a conversation summary using the LLM
 * @param {Array} conversationHistory - Array of conversation turns
 * @param {Object} options - Configuration options for the summary
 * @param {Object} workerRef - Reference to the worker instance (optional, for direct worker communication)
 * @returns {Promise<Object>} Summary object with themes, action items, and sentiment
 */
export const generateConversationSummary = async (conversationHistory, options = {}, workerRef = null) => {
  const {
    maxTurns = 20,
    includeThemes = true,
    includeActionItems = true,
    includeSentiment = true,
    summaryLength = 'medium' // 'short', 'medium', 'long'
  } = options;

  // Limit the conversation history to prevent token overflow
  const limitedHistory = conversationHistory.slice(-maxTurns);

  if (limitedHistory.length === 0) {
    return {
      summary: "No conversation history available to summarize.",
      themes: [],
      actionItems: [],
      sentiment: "neutral",
      confidence: 0
    };
  }

  // If a worker is provided, use it for summary generation
  if (workerRef && workerRef.current) {
    try {
      const result = await requestSummaryFromWorker(workerRef.current, limitedHistory, {
        includeThemes,
        includeActionItems,
        includeSentiment,
        summaryLength
      });
      return result;
    } catch (error) {
      console.error("Worker summary generation failed:", error);
      // Return an error object when worker fails
      return {
        summary: "Error generating summary. Worker unavailable.",
        themes: [],
        actionItems: [],
        sentiment: "unknown",
        confidence: 0,
        error: error.message
      };
    }
  } else {
    // If no worker is provided, return an error
    return {
      summary: "Error generating summary. Worker not available.",
      themes: [],
      actionItems: [],
      sentiment: "unknown",
      confidence: 0,
      error: "Worker reference not provided"
    };
  }
};

/**
 * Function to request summary generation through the worker system
 * This would be called from the main thread to coordinate with the worker
 */
export const requestSummaryFromWorker = (worker, conversationHistory, options = {}) => {
  return new Promise((resolve, reject) => {
    const taskId = `summary_${Date.now()}`;

    // Set up a temporary listener for the summary result
    const handleMessage = (event) => {
      if (event.data.taskId === taskId && event.data.type === 'summary_result') {
        worker.removeEventListener('message', handleMessage);
        resolve(event.data.summary);
      } else if (event.data.taskId === taskId && event.data.type === 'error') {
        worker.removeEventListener('message', handleMessage);
        reject(new Error(event.data.error));
      }
    };

    worker.addEventListener('message', handleMessage);

    // Send the summary request to the worker
    worker.postMessage({
      type: 'generate_summary',
      conversationHistory,
      options,
      taskId
    });
  });
};

/**
 * Generates a brief summary card for display in the UI
 */
export const generateSummaryCard = (summaryData) => {
  const { summary, themes = [], actionItems = [], sentiment = 'neutral' } = summaryData;

  return {
    title: `Conversation Summary`,
    subtitle: `Overall sentiment: ${sentiment}`,
    content: summary.substring(0, 150) + (summary.length > 150 ? '...' : ''),
    stats: {
      themesCount: themes.length,
      actionItemsCount: actionItems.length,
      sentiment
    },
    fullSummary: summaryData
  };
};