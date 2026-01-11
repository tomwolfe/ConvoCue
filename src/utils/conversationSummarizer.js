/**
 * Conversation Summarization Utility
 * Generates concise summaries of conversation history with key themes, action items, and sentiment analysis
 */

import { AppConfig } from '../config';
import { analyzeConversationSentiment } from './sentimentAnalysis';

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

  // Check for long conversation history and warn if needed
  const fullHistoryLength = conversationHistory ? conversationHistory.length : 0;
  const showLongHistoryWarning = fullHistoryLength > 50; // Threshold for showing warning

  // Limit the conversation history to prevent token overflow
  const limitedHistory = conversationHistory ? conversationHistory.slice(-maxTurns) : [];

  if (limitedHistory.length === 0) {
    const result = {
      summary: "No conversation history available to summarize.",
      themes: [],
      actionItems: [],
      sentiment: "neutral",
      confidence: 0
    };

    // Only include showLongHistoryWarning when not in basic mode (when workerRef is provided)
    if (workerRef && workerRef.current) {
      result.showLongHistoryWarning = showLongHistoryWarning;
    }

    return result;
  }


  // If a worker is provided, use it for summary generation
  if (workerRef && typeof workerRef === 'object' && workerRef.current) {
    try {
      const result = await requestSummaryFromWorker(workerRef.current, limitedHistory, {
        includeThemes,
        includeActionItems,
        includeSentiment,
        summaryLength
      });
      // Merge the long history warning with the result
      return {
        ...result,
        showLongHistoryWarning
      };
    } catch (error) {
      console.error("Worker summary generation failed:", error);
      // Return an error object when worker fails
      return {
        summary: "Error generating summary. Worker unavailable.",
        themes: [],
        actionItems: [],
        sentiment: "unknown",
        confidence: 0,
        showLongHistoryWarning,
        error: error.message
      };
    }
  } else {
    // If no worker is provided, generate a basic summary using local logic
    return generateBasicSummary(limitedHistory, {
      includeThemes,
      includeActionItems,
      includeSentiment,
      summaryLength
    }, showLongHistoryWarning);
  }
};

/**
 * Generates a basic summary when no worker is available
 */
const generateBasicSummary = (conversationHistory, options, showLongHistoryWarning) => {
  const {
    includeThemes = true,
    includeActionItems = true,
    includeSentiment = true,
    summaryLength = 'medium'
  } = options;

  // Extract all content from the conversation
  const allContent = conversationHistory.map(turn => turn.content || '').join(' ');

  // Generate a basic summary
  let summary = allContent.substring(0, summaryLength === 'short' ? 100 :
                                    summaryLength === 'long' ? 300 : 200);

  if (allContent.length > summary.length) {
    summary += '...';
  }

  // Extract themes if requested
  const themes = includeThemes ? extractBasicThemes(conversationHistory) : [];

  // Extract action items if requested
  const actionItems = includeActionItems ? extractBasicActionItems(conversationHistory) : [];

  // Determine sentiment if requested
  const sentiment = includeSentiment ? determineBasicSentiment(conversationHistory) : 'neutral';

  return {
    summary: summary || "Conversation summary could not be generated.",
    themes,
    actionItems,
    sentiment,
    confidence: 0.7 // Basic confidence level
  };
};

/**
 * Extracts basic themes from conversation history
 */
const extractBasicThemes = (conversationHistory) => {
  const content = conversationHistory.map(turn => turn.content || '').join(' ').toLowerCase();
  const themeKeywords = [
    'project', 'timeline', 'budget', 'meeting', 'schedule', 'report',
    'development', 'design', 'planning', 'strategy', 'goal', 'objective',
    'feedback', 'review', 'analysis', 'solution', 'problem', 'challenge'
  ];

  const foundThemes = new Set();
  themeKeywords.forEach(keyword => {
    if (content.includes(keyword)) {
      foundThemes.add(keyword.charAt(0).toUpperCase() + keyword.slice(1));
    }
  });

  return Array.from(foundThemes).slice(0, 5); // Return up to 5 themes
};

/**
 * Extracts basic action items from conversation history
 */
const extractBasicActionItems = (conversationHistory) => {
  const actionItemPatterns = [
    /\b(?:will|should|need to|must|have to|going to|plan to)\s+(.+?)[.!?]/gi,
    /\b(?:send|provide|create|prepare|complete|finish|do|make)\s+(.+?)[.!?]/gi,
    /\b(?:by\s+\w+day|by\s+\d{1,2}[\/\-]\d{1,2}|by\s+\w+\s+\d{1,2})/gi
  ];

  const actionItems = [];
  conversationHistory.forEach(turn => {
    const content = turn.content || '';
    actionItemPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const action = match[1] ? match[1].trim() : match[0].trim();
        if (action && action.length > 3) { // Filter out very short matches
          actionItems.push(action.charAt(0).toUpperCase() + action.slice(1));
        }
      }
    });
  });

  return [...new Set(actionItems)].slice(0, 5); // Remove duplicates and return up to 5 items
};

/**
 * Determines basic sentiment from conversation history
 */
const determineBasicSentiment = (conversationHistory) => {
  const result = analyzeConversationSentiment(conversationHistory);
  return result.overallSentiment;
};

/**
 * Function to request summary generation through the worker system
 * This would be called from the main thread to coordinate with the worker
 */
export const requestSummaryFromWorker = (worker, conversationHistory, options = {}) => {
  return new Promise((resolve, reject) => {
    // Check if worker is properly initialized
    if (!worker || typeof worker.postMessage !== 'function') {
      reject(new Error('Worker is not properly initialized'));
      return;
    }

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