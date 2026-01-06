import { AppConfig } from './config';
import { describe, test, expect } from 'vitest';

describe('AppConfig', () => {
  test('contains all required configuration sections', () => {
    expect(AppConfig).toHaveProperty('models');
    expect(AppConfig).toHaveProperty('vad');
    expect(AppConfig).toHaveProperty('worker');
    expect(AppConfig).toHaveProperty('system');
  });

  test('models configuration has correct structure', () => {
    expect(AppConfig.models).toHaveProperty('stt');
    expect(AppConfig.models).toHaveProperty('llm');
    
    expect(AppConfig.models.stt).toHaveProperty('name');
    expect(AppConfig.models.stt).toHaveProperty('device');
    expect(AppConfig.models.stt).toHaveProperty('dtype');
    expect(AppConfig.models.stt).toHaveProperty('chunk_length_s');
    expect(AppConfig.models.stt).toHaveProperty('stride_length_s');
    
    expect(AppConfig.models.llm).toHaveProperty('name');
    expect(AppConfig.models.llm).toHaveProperty('device');
    expect(AppConfig.models.llm).toHaveProperty('dtype');
    expect(AppConfig.models.llm).toHaveProperty('max_new_tokens');
    expect(AppConfig.models.llm).toHaveProperty('temperature');
    expect(AppConfig.models.llm).toHaveProperty('do_sample');
  });

  test('vad configuration has correct structure', () => {
    expect(AppConfig.vad).toHaveProperty('positiveSpeechThreshold');
    expect(AppConfig.vad).toHaveProperty('negativeSpeechThreshold');
    expect(AppConfig.vad).toHaveProperty('minSpeechFrames');
    expect(AppConfig.vad).toHaveProperty('model');
    expect(AppConfig.vad).toHaveProperty('workletURL');
    expect(AppConfig.vad).toHaveProperty('modelURL');
    expect(AppConfig.vad).toHaveProperty('onnxWASMPaths');
  });

  test('worker configuration has correct structure', () => {
    expect(AppConfig.worker).toHaveProperty('numThreads');
    expect(AppConfig.worker).toHaveProperty('simd');
  });

  test('system configuration has correct structure', () => {
    expect(AppConfig.system).toHaveProperty('maxTranscriptLength');
    expect(AppConfig.system).toHaveProperty('maxSuggestionLength');
    expect(AppConfig.system).toHaveProperty('allowedTranscriptPattern');
    expect(AppConfig.system).toHaveProperty('modelLoadTimeout');
    expect(AppConfig.system).toHaveProperty('processingTimeout');
  });

  test('configuration values are of correct types', () => {
    expect(typeof AppConfig.models.stt.chunk_length_s).toBe('number');
    expect(typeof AppConfig.models.stt.stride_length_s).toBe('number');
    expect(typeof AppConfig.models.llm.max_new_tokens).toBe('number');
    expect(typeof AppConfig.models.llm.temperature).toBe('number');
    expect(typeof AppConfig.vad.positiveSpeechThreshold).toBe('number');
    expect(typeof AppConfig.worker.numThreads).toBe('number');
    expect(typeof AppConfig.system.maxTranscriptLength).toBe('number');
    expect(AppConfig.system.allowedTranscriptPattern).toBeInstanceOf(RegExp);
  });
});