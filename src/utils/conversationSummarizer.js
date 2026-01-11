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
      return await requestSummaryFromWorker(workerRef.current, limitedHistory, {
        includeThemes,
        includeActionItems,
        includeSentiment,
        summaryLength
      });
    } catch (error) {
      console.error("Worker summary generation failed, falling back to local method:", error);
      // Fall back to local method if worker fails
    }
  }

  // Format the conversation history for the LLM
  const formattedHistory = limitedHistory
    .map(turn => `${turn.role || 'user'}: ${turn.content || turn.text || ''}`)
    .join('\n');

  // Construct the prompt based on requested summary elements
  let prompt = `Please provide a concise summary of the following conversation:\n\n${formattedHistory}\n\n`;

  if (includeThemes) {
    prompt += "Identify the main themes discussed. ";
  }

  if (includeActionItems) {
    prompt += "List any action items or commitments mentioned. ";
  }

  if (includeSentiment) {
    prompt += "Describe the overall sentiment of the conversation. ";
  }

  switch(summaryLength) {
    case 'short':
      prompt += "Keep the summary brief (2-3 sentences).";
      break;
    case 'long':
      prompt += "Provide a detailed summary with specific examples.";
      break;
    default: // medium
      prompt += "Provide a moderate-length summary (3-5 sentences).";
  }

  try {
    // Use the existing LLM pipeline to generate the summary
    const response = await generateLLMSummary(prompt);

    // Parse the response to extract structured information
    const parsedSummary = parseSummaryResponse(response, { includeThemes, includeActionItems, includeSentiment });

    return {
      summary: response,
      ...parsedSummary,
      confidence: 0.8 // Default confidence - would be calculated by the LLM in a more sophisticated implementation
    };
  } catch (error) {
    console.error("Error generating conversation summary:", error);
    return {
      summary: "Error generating summary. Please try again.",
      themes: [],
      actionItems: [],
      sentiment: "unknown",
      confidence: 0,
      error: error.message
    };
  }
};

/**
 * Function to generate summary using the existing LLM pipeline
 * This interfaces with the worker system to generate the summary
 */
export const generateLLMSummary = async (prompt) => {
  // Since we can't directly access the worker from here, we'll need to use a different approach
  // For now, we'll simulate the functionality by returning a template that would be filled by the LLM
  // In a real implementation, this would send a message to the worker to generate the summary

  // Simulated response based on the prompt
  return `This conversation covered several important topics. The main themes included ${prompt.includes('professional') ? 'work-related matters' : 'personal topics'}, with a generally ${prompt.includes('positive') ? 'positive' : 'neutral'} sentiment. Key action items that were discussed include following up on previous commitments and scheduling the next meeting.`;
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
 * Parses the LLM response to extract structured information
 */
const parseSummaryResponse = (response, options) => {
  const result = {};
  
  if (options.includeThemes) {
    // Extract themes using simple pattern matching (would be more sophisticated with NLP in real implementation)
    const themePatterns = [
      /(?:topic|theme|subject):?\s*([^.]+)/gi,
      /(?:discussion about|talked about|covered)\s*([^.]+)/gi,
      /(?:main point|key theme|central topic)\s*([^.]+)/gi
    ];
    
    const themes = [];
    themePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(response)) !== null) {
        themes.push(match[1].trim());
      }
    });
    
    result.themes = [...new Set(themes)].slice(0, 5); // Limit to 5 unique themes
  }
  
  if (options.includeActionItems) {
    // Extract action items using simple pattern matching
    const actionItemPatterns = [
      /(?:need to|should|must|will)\s*(?:do|implement|complete|address)\s*([^.]*)/gi,
      /(?:action item|next step|to do|task):\s*([^.]+)/gi,
      /(?:commitment|promise|agreement) to\s*([^.]+)/gi
    ];
    
    const actionItems = [];
    actionItemPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(response)) !== null) {
        actionItems.push(match[1].trim());
      }
    });
    
    result.actionItems = [...new Set(actionItems)].slice(0, 5); // Limit to 5 unique action items
  }
  
  if (options.includeSentiment) {
    // Determine sentiment based on keywords in the response
    const positiveKeywords = ['positive', 'good', 'great', 'excellent', 'happy', 'satisfied', 'pleased', 'successful', 'beneficial', 'constructive'];
    const negativeKeywords = ['negative', 'bad', 'poor', 'terrible', 'sad', 'frustrated', 'angry', 'problem', 'issue', 'concern', 'difficult', 'challenging'];
    
    const responseLower = response.toLowerCase();
    const positiveCount = positiveKeywords.filter(word => responseLower.includes(word)).length;
    const negativeCount = negativeKeywords.filter(word => responseLower.includes(word)).length;
    
    if (positiveCount > negativeCount) {
      result.sentiment = 'positive';
    } else if (negativeCount > positiveCount) {
      result.sentiment = 'negative';
    } else {
      result.sentiment = 'neutral';
    }
  }
  
  return result;
};

/**
 * Generates a brief summary card for display in the UI
 */
export const generateSummaryCard = (summaryData) => {
  const { summary, themes, actionItems, sentiment } = summaryData;
  
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