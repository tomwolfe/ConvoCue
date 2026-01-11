/**
 * Worker Message Handlers
 */
import { MLPipeline } from './MLPipeline';
import { WorkerState, updatePerformanceMode, initConversationTurnManager } from './state';
import { sanitizeText, throttledProgress } from './utils';
import { WorkerMessenger } from './Messenger';
import { AppConfig } from '../config';
import { analyzeEmotion } from '../utils/emotion';
import { detectMultipleIntents } from '../utils/intentRecognition';
import { analyzeCulturalContext } from '../utils/culturalIntelligence';
import { generateSystemPrompt } from './promptGenerator';

const messenger = WorkerMessenger.getInstance();

export const handleSTT = async (audio, taskId, settings) => {
  const pipelineManager = await MLPipeline.getInstance();
  const audioStartTime = performance.now();
  const audioData = audio instanceof Float32Array ? audio : new Float32Array(Object.values(audio));

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
  const pipelineManager = await MLPipeline.getInstance();
  
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
    taskId
  });
};
