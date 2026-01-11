/**
 * Message handlers for the ML worker
 */

import { MLPipeline } from '../worker/MLPipeline';
import { WorkerMessenger } from '../worker/Messenger';
import { detectIntentWithContext } from '../utils/intentRecognition';
import { parseSummaryResponse, createStructuredSummaryPrompt } from '../utils/summaryParser';
import { trackParserSuccess, trackSummaryParsingResult } from '../utils/telemetry';

const messenger = WorkerMessenger.getInstance();

/**
 * Handler for generating conversation summaries
 */
export const handleGenerateSummary = async (data) => {
  const { conversationHistory, options = {}, taskId } = data;

  try {
    // Validate inputs
    if (!conversationHistory || !Array.isArray(conversationHistory) || conversationHistory.length === 0) {
      messenger.postMessage({
        type: 'error',
        error: 'Invalid conversation history provided for summary generation',
        taskId
      });
      return;
    }

    // Get the LLM instance
    const llm = MLPipeline.llm;
    if (!llm) {
      messenger.postMessage({
        type: 'error',
        error: 'LLM not available for summary generation',
        taskId
      });
      return;
    }

    // Format the conversation history for the LLM
    const formattedHistory = conversationHistory
      .map(turn => `${turn.role || 'user'}: ${turn.content || turn.text || ''}`)
      .join('\n');

    // Use the structured prompt to get better formatted responses for parsing
    const prompt = createStructuredSummaryPrompt(formattedHistory, options);

    // Prepare the message for the LLM
    const messages = [
      {
        role: "system",
        content: "You are an expert conversation analyst. Provide accurate, concise summaries of conversations. Focus on extracting key themes, action items, and sentiment. Format your response with clear headings like 'Themes:', 'Action Items:', and 'Sentiment:' to make it easy to parse."
      },
      {
        role: "user",
        content: prompt
      }
    ];

    // Generate the summary using the LLM
    const output = await llm(messages, {
      max_new_tokens: 300, // Increased to allow for structured response
      temperature: 0.5,
      do_sample: true
    });

    const summaryText = output[0].generated_text;

    // Parse the response to extract structured information
    const parsedSummary = parseSummaryResponse(summaryText, options);

    // Track parsing success/failure for telemetry
    trackParserSuccess(parsedSummary.parsingSuccessful !== false, {
      taskId,
      hasThemes: !!(parsedSummary.themes && parsedSummary.themes.length > 0),
      hasActionItems: !!(parsedSummary.actionItems && parsedSummary.actionItems.length > 0),
      hasSentiment: !!parsedSummary.sentiment
    });

    trackSummaryParsingResult(parsedSummary.parsingSuccessful !== false, {
      taskId,
      themeCount: parsedSummary.themes ? parsedSummary.themes.length : 0,
      actionItemCount: parsedSummary.actionItems ? parsedSummary.actionItems.length : 0,
      sentiment: parsedSummary.sentiment
    });

    // Prepare the summary result
    let summaryResult = {
      summary: summaryText,
      themes: parsedSummary.themes || [],
      actionItems: parsedSummary.actionItems || [],
      sentiment: parsedSummary.sentiment || 'neutral',
      confidence: 0.8,
      parsingSuccessful: parsedSummary.parsingSuccessful !== undefined ? parsedSummary.parsingSuccessful : true
    };

    // If parsing failed, we still return the raw summary text as fallback
    if (!parsedSummary.parsingSuccessful) {
      console.warn("Summary parsing failed, returning raw summary as fallback");
      summaryResult = {
        ...summaryResult,
        themes: [], // Empty themes as parsing failed
        actionItems: [], // Empty action items as parsing failed
        // Keep the sentiment if it was detected, otherwise default to neutral
        sentiment: parsedSummary.sentiment || 'neutral',
        parsingSuccessful: false,
        fallbackUsed: true
      };
    }

    // Send the structured summary back to the main thread
    messenger.postMessage({
      type: 'summary_result',
      summary: summaryResult,
      taskId
    });
  } catch (error) {
    console.error("Error in handleGenerateSummary:", error);
    messenger.postMessage({
      type: 'error',
      error: `Summary generation failed: ${error.message}`,
      taskId
    });
  }
};

/**
 * Handler for STT processing
 */
export const handleSTT = async (data) => {
  // Existing STT handling code would go here
  // This is a simplified version for demonstration
  let taskId; // Initialize taskId to be accessible in catch block
  try {
    const { audio: audioData, taskId: extractedTaskId } = data;
    taskId = extractedTaskId; // Assign to outer-scoped variable

    // Get STT instance
    const stt = MLPipeline.stt;
    if (!stt) {
      throw new Error('STT pipeline not initialized');
    }

    // Perform speech-to-text
    const result = await stt({ input: audioData });

    // Detect intent from the transcribed text
    const intentResult = detectIntentWithContext(result.text);

    // Send STT result back to main thread
    const messageObj = {
      type: 'stt_result',
      text: result.text,
      intent: intentResult.intent,
      metadata: {
        rms: audioData.reduce((sum, sample) => sum + sample * sample, 0) / audioData.length, // Calculate RMS for volume
        duration: audioData.length / 16000 // Assuming 16kHz sample rate
      }
    };

    if (typeof taskId !== 'undefined') {
      messageObj.taskId = taskId;
    }

    messenger.postMessage(messageObj);
  } catch (error) {
    console.error("Error in handleSTT:", error);
    const messageObj = {
      type: 'error',
      error: `STT processing failed: ${error.message}`
    };

    if (typeof taskId !== 'undefined') {
      messageObj.taskId = taskId;
    }

    messenger.postMessage(messageObj);
  }
};

/**
 * Handler for LLM processing
 */
export const handleLLM = async (data) => {
  // Existing LLM handling code would go here
  // This is a simplified version for demonstration
  let extractedTaskId; // Initialize taskId to be accessible in catch block
  try {
    const {
      text,
      persona,
      communicationProfile,
      taskId: localTaskId
    } = data;
    extractedTaskId = localTaskId; // Assign to outer-scoped variable

    // Get LLM instance
    const llm = MLPipeline.llm;
    if (!llm) {
      throw new Error('LLM pipeline not initialized');
    }

    // Construct the prompt based on persona and context
    // This is a simplified version - the actual implementation would be more complex
    const personaPrompt = `You are an assistant with the following persona: ${persona}. ${communicationProfile ? `User profile: ${communicationProfile}. ` : ''} Respond to: ${text}`;

    const messages = [
      { role: "system", content: personaPrompt },
      { role: "user", content: text }
    ];

    // Generate response
    const output = await llm(messages, {
      max_new_tokens: 128,
      temperature: 0.7,
      do_sample: true
    });

    const responseText = output[0].generated_text;

    // Perform emotion analysis and coaching insights
    // These would be implemented in their respective utility files
    const emotionData = null; // await analyzeEmotion(responseText);
    const coachingInsights = null; // await generateCoachingInsights(responseText, insightCategoryScores);

    // Send LLM result back to main thread
    const messageObj = {
      type: 'llm_result',
      text: responseText,
      emotionData,
      coachingInsights
    };

    if (typeof extractedTaskId !== 'undefined') {
      messageObj.taskId = extractedTaskId;
    }

    messenger.postMessage(messageObj);
  } catch (error) {
    console.error("Error in handleLLM:", error);
    const messageObj = {
      type: 'error',
      error: `LLM processing failed: ${error.message}`
    };

    if (typeof extractedTaskId !== 'undefined') {
      messageObj.taskId = extractedTaskId;
    }

    messenger.postMessage(messageObj);
  }
};

// Other handlers would be defined here...
// For brevity, I'm only including the key handlers needed for the summary feature

export const handleLoad = async () => {
  // This would handle the initial loading of models
  // Implementation would depend on the specific loading logic
  try {
    await MLPipeline.getInstance();

    // Load STT first
    await MLPipeline.getInstance().then(instance => instance.loadSTT((progress) => {
      messenger.postMessage({
        type: 'status',
        status: `Loading Speech Engine... ${Math.round(progress * 100)}%`,
        progress: Math.round(progress * 100)
      });
    }));

    // Then load LLM
    await MLPipeline.getInstance().then(instance => instance.loadLLM((progress) => {
      messenger.postMessage({
        type: 'status',
        status: `Loading Social Brain... ${Math.round(progress * 100)}%`,
        progress: Math.round(progress * 100)
      });
    }));

    // Notify main thread that we're ready
    messenger.postMessage({
      type: 'ready',
      status: 'ConvoCue is ready!'
    });
  } catch (error) {
    console.error("Error in handleLoad:", error);
    messenger.postMessage({
      type: 'error',
      error: `Model loading failed: ${error.message}`
    });
  }
};

export const handlePrewarmLLM = async () => {
  // Implementation for prewarming the LLM
  // This would typically involve loading the model into memory ahead of time
};

export const handlePrewarmSystemPrompt = async () => {
  // Implementation for prewarming system prompts
  // This would prepare persona-specific prompts ahead of time
};

export const handleRetrySTTLoad = async () => {
  // Implementation for retrying STT loading
};

export const handleRetryLLMLoad = async () => {
  // Implementation for retrying LLM loading
};

export const handleCleanup = async () => {
  // Implementation for cleaning up resources
};

export const handleTerminate = async (memoryInterval) => {
  if (memoryInterval) clearInterval(memoryInterval);
  // Cleanup resources if needed
  // Close the worker
  setTimeout(() => self.close(), 50);
};