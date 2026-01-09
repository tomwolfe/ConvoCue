/**
 * Performance Optimization Utilities for ConvoCue
 * Handles dynamic model selection based on device capabilities
 */

import { AppConfig } from '../config';

/**
 * Detects device capabilities and recommends optimal model configuration
 * @returns {Object} Device capability assessment and recommendations
 */
export const assessDeviceCapabilities = () => {
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(userAgent);
  
  // Get available device memory (may not be available in all browsers)
  const deviceMemory = typeof navigator !== 'undefined' ? navigator.deviceMemory : null;
  const hardwareConcurrency = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : null;
  
  // Estimate memory capacity based on available information
  let estimatedMemoryGB = 4; // Default assumption
  if (deviceMemory) {
    estimatedMemoryGB = deviceMemory;
  } else if (isMobile) {
    // Mobile devices typically have less memory
    estimatedMemoryGB = 3; // Conservative estimate
  }
  
  // Determine performance tier based on capabilities
  let performanceTier = 'high'; // Default to high performance
  if (estimatedMemoryGB <= 2 || (hardwareConcurrency && hardwareConcurrency <= 2)) {
    performanceTier = 'low';
  } else if (estimatedMemoryGB <= 4 || (hardwareConcurrency && hardwareConcurrency <= 4)) {
    performanceTier = 'medium';
  }
  
  return {
    isMobile,
    deviceMemory,
    hardwareConcurrency,
    estimatedMemoryGB,
    performanceTier,
    capabilities: {
      memory: estimatedMemoryGB,
      cpuCores: hardwareConcurrency || 4,
      isLowSpec: performanceTier === 'low',
      isMidSpec: performanceTier === 'medium'
    }
  };
};

/**
 * Gets optimal model configuration based on device capabilities
 * @param {string} modelType - 'stt' or 'llm'
 * @param {Object} deviceCaps - Device capabilities from assessDeviceCapabilities
 * @returns {Object} Optimized model configuration
 */
export const getOptimalModelConfig = (modelType, deviceCaps) => {
  const { performanceTier } = deviceCaps;
  
  // Base configuration from AppConfig
  const baseConfig = { ...AppConfig.models[modelType] };
  
  // Adjust configuration based on performance tier
  switch (performanceTier) {
    case 'low':
      // Use smallest models and most aggressive optimization
      return {
        ...baseConfig,
        dtype: 'q2', // More aggressive quantization
        max_new_tokens: modelType === 'llm' ? 32 : baseConfig.max_new_tokens,
        chunk_length_s: modelType === 'stt' ? 10 : baseConfig.chunk_length_s,
        stride_length_s: modelType === 'stt' ? 1 : baseConfig.stride_length_s,
        numThreads: Math.min(1, deviceCaps.hardwareConcurrency || 2),
        // Additional optimizations for low-spec devices
        optimization: {
          memoryEfficient: true,
          computeEfficient: true,
          reducedPrecision: true
        }
      };
    
    case 'medium':
      // Balanced configuration
      return {
        ...baseConfig,
        dtype: 'q3', // Moderate quantization
        max_new_tokens: modelType === 'llm' ? 48 : baseConfig.max_new_tokens,
        chunk_length_s: modelType === 'stt' ? 12 : baseConfig.chunk_length_s,
        stride_length_s: modelType === 'stt' ? 1.5 : baseConfig.stride_length_s,
        numThreads: Math.min(2, deviceCaps.hardwareConcurrency || 2),
        optimization: {
          memoryEfficient: true,
          computeEfficient: false,
          reducedPrecision: true
        }
      };
    
    case 'high':
    default:
      // High-performance configuration (original settings)
      return {
        ...baseConfig,
        dtype: baseConfig.dtype, // Keep original dtype (likely q4)
        max_new_tokens: baseConfig.max_new_tokens,
        chunk_length_s: baseConfig.chunk_length_s,
        stride_length_s: baseConfig.stride_length_s,
        numThreads: AppConfig.worker.numThreads,
        optimization: {
          memoryEfficient: false,
          computeEfficient: false,
          reducedPrecision: false
        }
      };
  }
};

/**
 * Estimates memory usage for a given model configuration
 * @param {Object} modelConfig - Model configuration object
 * @param {string} modelType - 'stt' or 'llm'
 * @returns {number} Estimated memory usage in MB
 */
export const estimateModelMemoryUsage = (modelConfig, modelType) => {
  // Rough estimates based on model type and quantization
  let baseMemoryMB = 100; // Base memory usage
  
  if (modelType === 'llm') {
    // LLM memory scales with model size and quantization
    if (modelConfig.name.includes('135M')) {
      baseMemoryMB = 200;
    } else if (modelConfig.name.includes('300M')) {
      baseMemoryMB = 400;
    } else if (modelConfig.name.includes('1B')) {
      baseMemoryMB = 800;
    }
    
    // Apply quantization factor
    switch (modelConfig.dtype) {
      case 'q2':
        baseMemoryMB *= 0.3; // 30% of original size
        break;
      case 'q3':
        baseMemoryMB *= 0.4; // 40% of original size
        break;
      case 'q4':
        baseMemoryMB *= 0.5; // 50% of original size
        break;
      case 'fp16':
        baseMemoryMB *= 0.7; // 70% of original size
        break;
      default:
        baseMemoryMB *= 0.5; // Default to 50%
    }
  } else if (modelType === 'stt') {
    // STT models (Whisper) memory usage
    if (modelConfig.name.includes('tiny')) {
      baseMemoryMB = 80;
    } else if (modelConfig.name.includes('base')) {
      baseMemoryMB = 120;
    } else if (modelConfig.name.includes('small')) {
      baseMemoryMB = 200;
    }
    
    // Apply quantization factor
    switch (modelConfig.dtype) {
      case 'q2':
        baseMemoryMB *= 0.3;
        break;
      case 'q3':
        baseMemoryMB *= 0.4;
        break;
      case 'q4':
        baseMemoryMB *= 0.5;
        break;
      default:
        baseMemoryMB *= 0.5;
    }
  }
  
  return Math.round(baseMemoryMB);
};

/**
 * Checks if the device has sufficient memory for the requested models
 * @param {Object} sttConfig - Speech-to-text model configuration
 * @param {Object} llmConfig - Language model configuration
 * @returns {Object} Memory adequacy assessment
 */
export const checkMemoryAdequacy = (sttConfig, llmConfig) => {
  const sttMemory = estimateModelMemoryUsage(sttConfig, 'stt');
  const llmMemory = estimateModelMemoryUsage(llmConfig, 'llm');
  const totalMemory = sttMemory + llmMemory;
  
  // Get device memory if available
  const deviceMemoryGB = typeof navigator !== 'undefined' ? navigator.deviceMemory : null;
  const estimatedDeviceMemoryMB = deviceMemoryGB ? deviceMemoryGB * 1024 : 2048; // Default to 2GB
  
  // Account for other application memory usage (browser, OS, etc.)
  const availableMemoryForModels = estimatedDeviceMemoryMB * 0.6; // Use 60% of available memory
  
  return {
    sttMemoryMB: sttMemory,
    llmMemoryMB: llmMemory,
    totalMemoryMB: totalMemory,
    deviceMemoryMB: estimatedDeviceMemoryMB,
    availableMemoryMB: availableMemoryForModels,
    isAdequate: totalMemory <= availableMemoryForModels,
    headroomMB: availableMemoryForModels - totalMemory,
    recommendation: totalMemory > availableMemoryForModels ? 'reduce_model_size' : 'proceed'
  };
};

/**
 * Creates a progressive loading strategy based on device capabilities
 * @param {Object} deviceCaps - Device capabilities
 * @returns {Object} Loading strategy configuration
 */
export const createProgressiveLoadingStrategy = (deviceCaps) => {
  const { performanceTier } = deviceCaps;
  
  switch (performanceTier) {
    case 'low':
      return {
        initialLoad: ['minimal_stt'], // Only load essential models initially
        delayedLoad: ['llm'], // Load LLM after first interaction
        memoryThreshold: 0.6, // Start aggressive memory management at 60%
        unloadAggressively: true,
        maxConcurrentModels: 1
      };
    
    case 'medium':
      return {
        initialLoad: ['stt'], // Load STT first
        delayedLoad: ['llm'], // Load LLM when needed
        memoryThreshold: 0.7, // Start memory management at 70%
        unloadAggressively: false,
        maxConcurrentModels: 2
      };
    
    case 'high':
    default:
      return {
        initialLoad: ['stt', 'llm'], // Load all models upfront
        delayedLoad: [],
        memoryThreshold: 0.85, // Start memory management at 85%
        unloadAggressively: false,
        maxConcurrentModels: 2
      };
  }
};