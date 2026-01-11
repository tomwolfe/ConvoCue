/**
 * Worker Message Handlers
 */
import { MLPipeline } from './MLPipeline';
import { WorkerState, updatePerformanceMode, initConversationTurnManager } from './state';
import { sanitizeText } from './utils';
import { WorkerMessenger } from './Messenger';
import { AppConfig } from '../config';
import { analyzeEmotion } from '../utils/emotion';
import { detectMultipleIntents } from '../utils/intentRecognition';
import { analyzeCulturalContext } from '../utils/culturalIntelligence';
import { generateSystemPrompt } from './promptGenerator';

const messenger = WorkerMessenger.getInstance();

export const handleSTT = async (audio, taskId, settings) => {
  await MLPipeline.getInstance();
  const audioStartTime = performance.now();

  // Convert audio data to proper format (Float32Array) if needed
  let audioData;
  if (audio instanceof Float32Array) {
    audioData = audio;
  } else if (audio instanceof Float64Array) {
    audioData = new Float32Array(audio);
  } else if (Array.isArray(audio)) {
    audioData = new Float32Array(audio);
  } else if (typeof audio === 'object' && audio !== null) {
    // Handle object with buffer property or similar structures
    if (audio.buffer && audio.buffer instanceof ArrayBuffer) {
      audioData = new Float32Array(audio.buffer);
    } else {
      // Extract values from object if it's a plain object
      audioData = new Float32Array(Object.values(audio));
    }
  } else {
    throw new Error('Audio data is in an unsupported format');
  }

  const output = await MLPipeline.stt(audioData, {
    chunk_length_s: AppConfig.models.stt.chunk_length_s,
    stride_length_s: AppConfig.models.stt.stride_length_s,
    return_timestamps: false,
  });

  const audioProcessingTime = performance.now() - audioStartTime;
  const sanitizedText = sanitizeText(output.text);
  const turnManager = initConversationTurnManager();

  const turnInfo = (WorkerState.performanceStats.mode !== 'minimal' && settings.enableSpeakerDetection !== false)
    ? turnManager.processAudio(audioData, sanitizedText)
    : { turn: { speaker: 'user' } };

  updatePerformanceMode(audioProcessingTime, 'audio');

  messenger.postMessage({
    type: 'stt_result',
    text: sanitizedText,
    metadata: { turnInfo, performance: { audioProcessingTime } },
    taskId
  });
};

export const handleLLM = async (data, taskId) => {
  const { text, persona, history, culturalContext, preferences, settings } = data;
  await MLPipeline.getInstance();
  
  const sanitizedText = text.trim().substring(0, AppConfig.system.maxTranscriptLength);
  const emotionData = analyzeEmotion(sanitizedText);
  const intents = detectMultipleIntents(sanitizedText, 0.4);
  
  const detectedCultural = analyzeCulturalContext(sanitizedText, culturalContext, history || []);
  const effectiveCulture = detectedCultural.confidence > 0.85 ? detectedCultural.primaryCulture : culturalContext;

  const systemPrompt = generateSystemPrompt({
    persona,
    effectiveCulturalContext: effectiveCulture,
    preferences,
    settings
  });

  // Simplified LLM execution for refactoring demonstration
  const result = await MLPipeline.llm(sanitizedText, { system_prompt: systemPrompt });

  messenger.postMessage({
    type: 'llm_result',
    text: result[0].generated_text,
    emotionData,
    coachingInsights: {
      cultural: detectedCultural,
      intents // Included to satisfy linter and provide extra context
    },
    taskId
  });
};
