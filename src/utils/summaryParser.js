/**
 * Summary Parser Utility
 * Parses LLM responses to extract structured information like themes, action items, and sentiment
 */

/**
 * Parses the LLM response to extract structured information
 * @param {string} response - The raw response from the LLM
 * @param {Object} options - Configuration options for parsing
 * @param {boolean} options.includeThemes - Whether to extract themes
 * @param {boolean} options.includeActionItems - Whether to extract action items
 * @param {boolean} options.includeSentiment - Whether to extract sentiment
 * @returns {Object} Structured data with themes, action items, and sentiment
 */
export const parseSummaryResponse = (response, options) => {
  const result = {};

  if (options.includeThemes) {
    // Extract themes using pattern matching
    const themePatterns = [
      /(?:themes?:|main themes?:|key themes?:)\s*([^.]+?(?=\n|$|\.))/gi,
      /(?:topic|theme|subject):?\s*([^.]+)/gi,
      /(?:discussion about|talked about|covered)\s*([^.]+)/gi,
      /(?:main point|key theme|central topic)\s*([^.]+)/gi,
      /(?:the conversation focused on|the discussion centered on)\s*([^.]+)/gi
    ];

    const themes = [];
    themePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(response)) !== null) {
        // Clean up the extracted theme
        const theme = match[1].trim().replace(/^[^a-zA-Z0-9]*/, '').trim();
        if (theme && !themes.includes(theme)) {
          themes.push(theme);
        }
      }
    });

    // If no themes found with patterns, try to extract from common summary formats
    if (themes.length === 0) {
      const lines = response.split('\n');
      lines.forEach(line => {
        line = line.trim();
        if (line.startsWith('- ') || line.startsWith('* ')) {
          // Look for lines that might be themes (contain common theme words)
          if (line.toLowerCase().includes('theme') || line.toLowerCase().includes('topic') || 
              line.toLowerCase().includes('discussion') || line.toLowerCase().includes('focus')) {
            const theme = line.replace(/^- |^\* /, '').trim();
            if (theme && !themes.includes(theme)) {
              themes.push(theme);
            }
          }
        }
      });
    }

    result.themes = [...new Set(themes)].slice(0, 5); // Limit to 5 unique themes
  }

  if (options.includeActionItems) {
    // Extract action items using pattern matching
    const actionItemPatterns = [
      /(?:action items?:|next steps?:|tasks?:)\s*([^.]+?(?=\n|$|\.))/gi,
      /(?:need to|should|must|will)\s*(?:do|implement|complete|address)\s*([^.]*)/gi,
      /(?:action item|next step|to do|task):\s*([^.]+)/gi,
      /(?:commitment|promise|agreement) to\s*([^.]+)/gi,
      /(?:we agreed to|they decided to)\s*([^.]+)/gi,
      /(?:the plan is|our plan|next we will)\s*([^.]+)/gi
    ];

    const actionItems = [];
    actionItemPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(response)) !== null) {
        // Clean up the extracted action item
        const actionItem = match[1].trim().replace(/^[^a-zA-Z0-9]*/, '').trim();
        if (actionItem && !actionItems.includes(actionItem)) {
          actionItems.push(actionItem);
        }
      }
    });

    // If no action items found with patterns, look for lines that start with action words
    if (actionItems.length === 0) {
      const lines = response.split('\n');
      lines.forEach(line => {
        line = line.trim();
        if (line.startsWith('- ') || line.startsWith('* ')) {
          const content = line.replace(/^- |^\* /, '').trim();
          if (content.toLowerCase().startsWith('need to') || 
              content.toLowerCase().startsWith('should') || 
              content.toLowerCase().startsWith('will') || 
              content.toLowerCase().startsWith('must')) {
            if (content && !actionItems.includes(content)) {
              actionItems.push(content);
            }
          }
        }
      });
    }

    result.actionItems = [...new Set(actionItems)].slice(0, 5); // Limit to 5 unique action items
  }

  if (options.includeSentiment) {
    // Determine sentiment based on keywords in the response
    const positiveKeywords = [
      'positive', 'good', 'great', 'excellent', 'happy', 'satisfied', 'pleased', 
      'successful', 'beneficial', 'constructive', 'optimistic', 'encouraging', 
      'uplifting', 'hopeful', 'confident', 'impressed', 'pleased', 'satisfied'
    ];
    const negativeKeywords = [
      'negative', 'bad', 'poor', 'terrible', 'sad', 'frustrated', 'angry', 
      'problem', 'issue', 'concern', 'difficult', 'challenging', 'worry', 
      'concerned', 'disappointed', 'frustrated', 'upset', 'tense', 'stressful'
    ];
    
    // Also check for sentiment-indicating phrases
    const positivePhrases = [
      'positive outcome', 'good progress', 'great success', 'excellent result',
      'constructive discussion', 'productive meeting', 'positive feedback'
    ];
    const negativePhrases = [
      'negative outcome', 'poor result', 'major issue', 'significant problem',
      'unproductive discussion', 'negative feedback', 'concerning trend'
    ];

    const responseLower = response.toLowerCase();
    
    // Count sentiment words
    const positiveCount = positiveKeywords.filter(word => responseLower.includes(word)).length;
    const negativeCount = negativeKeywords.filter(word => responseLower.includes(word)).length;
    
    // Count sentiment phrases
    const positivePhraseCount = positivePhrases.filter(phrase => responseLower.includes(phrase.toLowerCase())).length;
    const negativePhraseCount = negativePhrases.filter(phrase => responseLower.includes(phrase.toLowerCase())).length;
    
    // Calculate overall sentiment
    const totalPositive = positiveCount + positivePhraseCount;
    const totalNegative = negativeCount + negativePhraseCount;
    
    if (totalPositive > totalNegative) {
      result.sentiment = 'positive';
    } else if (totalNegative > totalPositive) {
      result.sentiment = 'negative';
    } else {
      // If counts are equal, look for explicit sentiment mentions
      if (responseLower.includes('overall sentiment is') || responseLower.includes('the sentiment is')) {
        if (responseLower.includes('positive')) {
          result.sentiment = 'positive';
        } else if (responseLower.includes('negative')) {
          result.sentiment = 'negative';
        } else {
          result.sentiment = 'neutral';
        }
      } else {
        result.sentiment = 'neutral';
      }
    }
  }

  return result;
};

/**
 * Formats a prompt specifically designed to get structured output from the LLM
 * This helps ensure the LLM returns data in a format that's easier to parse
 */
export const createStructuredSummaryPrompt = (conversationHistory, options) => {
  const { 
    includeThemes = true, 
    includeActionItems = true, 
    includeSentiment = true, 
    summaryLength = 'medium' 
  } = options;

  let prompt = `Please provide a concise summary of the following conversation:\n\n${conversationHistory}\n\n`;
  
  // Request structured output to make parsing easier
  prompt += "Format your response with clear sections:\n";
  
  if (includeThemes) {
    prompt += "- Themes: List the main themes discussed\n";
  }
  
  if (includeActionItems) {
    prompt += "- Action Items: List any commitments, next steps, or tasks mentioned\n";
  }
  
 if (includeSentiment) {
    prompt += "- Sentiment: Describe the overall sentiment of the conversation\n";
  }
  
  switch(summaryLength) {
    case 'short':
      prompt += "\nKeep the summary brief (2-3 sentences).";
      break;
    case 'long':
      prompt += "\nProvide a detailed summary with specific examples.";
      break;
    default: // medium
      prompt += "\nProvide a moderate-length summary (3-5 sentences).";
  }
  
  prompt += "\n\nFormat your response with clear headings like 'Themes:', 'Action Items:', and 'Sentiment:' to make it easy to parse.";
  
  return prompt;
};