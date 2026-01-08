/**
 * @fileoverview Speaker detection and conversation turn management utilities
 */

import { detectIntent } from './intentRecognition';
import { CONVERSATION_CONFIG, validateConfig } from '../config/conversationConfig';
import { analyzeTurnYieldBias } from './biasMonitoring';

/**
 * Analyzes audio characteristics to distinguish between speakers
 * Implements more sophisticated audio analysis with multiple features
 *
 * @param {Float32Array} audioData - Audio data from the microphone
 * @param {Object} previousAudioData - Previous audio data for comparison
 * @returns {Object} Speaker analysis results
 */
export const analyzeSpeakerCharacteristics = (audioData, previousAudioData = null) => {
  // Calculate comprehensive audio features that help distinguish speakers
  const features = {
    volume: calculateRMS(audioData),
    pitchEstimate: estimatePitch(audioData),
    speechRate: estimateSpeechRate(audioData),
    spectralCentroid: calculateSpectralCentroid(audioData),
    zeroCrossingRate: calculateZeroCrossingRate(audioData),
    energy: calculateEnergy(audioData),
    formantFrequencies: calculateFormantFrequencies(audioData)
  };

  // Compare with previous audio to detect potential speaker change
  let speakerChangeLikelihood = 0;
  let confidence = 0;

  if (previousAudioData) {
    const prevFeatures = {
      volume: calculateRMS(previousAudioData),
      pitchEstimate: estimatePitch(previousAudioData),
      speechRate: estimateSpeechRate(previousAudioData),
      spectralCentroid: calculateSpectralCentroid(previousAudioData),
      zeroCrossingRate: calculateZeroCrossingRate(previousAudioData),
      energy: calculateEnergy(previousAudioData),
      formantFrequencies: calculateFormantFrequencies(previousAudioData)
    };

    // Calculate difference between current and previous features
    const volumeDiff = Math.abs(features.volume - prevFeatures.volume);
    const pitchDiff = Math.abs(features.pitchEstimate - prevFeatures.pitchEstimate);
    const spectralDiff = Math.abs(features.spectralCentroid - prevFeatures.spectralCentroid);
    const zeroCrossingDiff = Math.abs(features.zeroCrossingRate - prevFeatures.zeroCrossingRate);
    const energyDiff = Math.abs(features.energy - prevFeatures.energy);
    const formantDiff = calculateFormantDifference(features.formantFrequencies, prevFeatures.formantFrequencies);

    // Weighted combination of differences to estimate speaker change likelihood
    // Pitch is given highest weight as it's most distinctive between speakers
    speakerChangeLikelihood = (volumeDiff * 0.05 +
                              pitchDiff * 0.6 +
                              spectralDiff * 0.2 +
                              zeroCrossingDiff * 0.05 +
                              energyDiff * 0.05 +
                              formantDiff * 0.05) / 100;

    // Calculate confidence based on feature stability
    const featureStability = calculateFeatureStability(features, prevFeatures);
    confidence = Math.min(speakerChangeLikelihood * featureStability, 1.0);
  }

  return {
    features,
    speakerChangeLikelihood,
    confidence,
    isLikelyNewSpeaker: speakerChangeLikelihood > 0.3, // Threshold for considering it a new speaker
    confidenceScore: confidence
  };
}

/**
 * Explanation of confidence vs likelihood:
 * - speakerChangeLikelihood: Raw probability that speaker has changed based on audio features
 * - isLikelyNewSpeaker: Boolean derived from speakerChangeLikelihood using a threshold (0.3)
 * - confidenceScore: Quality measure of the speaker detection based on feature stability
 */

/**
 * Calculates Root Mean Square (RMS) of audio data
 * @param {Float32Array} audioData - Audio data
 * @returns {number} RMS value
 */
const calculateRMS = (audioData) => {
  if (!audioData || audioData.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < audioData.length; i++) {
    sum += audioData[i] * audioData[i];
  }
  return Math.sqrt(sum / audioData.length);
};

/**
 * Calculates zero crossing rate as a measure of speech characteristics
 * @param {Float32Array} audioData - Audio data
 * @returns {number} Zero crossing rate
 */
const calculateZeroCrossingRate = (audioData) => {
  if (!audioData || audioData.length === 0) return 0;
  let crossings = 0;
  for (let i = 1; i < audioData.length; i++) {
    if ((audioData[i] >= 0 && audioData[i-1] < 0) || (audioData[i] < 0 && audioData[i-1] >= 0)) {
      crossings++;
    }
  }
  return crossings / audioData.length;
};

/**
 * Calculates energy of the audio signal
 * @param {Float32Array} audioData - Audio data
 * @returns {number} Energy value
 */
const calculateEnergy = (audioData) => {
  if (!audioData || audioData.length === 0) return 0;
  let energy = 0;
  for (let i = 0; i < audioData.length; i++) {
    energy += audioData[i] * audioData[i];
  }
  return energy / audioData.length;
};

/**
 * Estimates formant frequencies (resonant frequencies of the vocal tract)
 * @param {Float32Array} audioData - Audio data
 * @returns {Array} Array of formant frequencies
 */
const calculateFormantFrequencies = (audioData) => {
  if (!audioData || audioData.length === 0) return [0, 0, 0, 0];
  // Simplified formant estimation using spectral analysis
  // In a real implementation, this would use LPC (Linear Predictive Coding)
  const formants = [];

  // Use a small sample for computational efficiency
  const sampleSize = Math.min(1024, audioData.length);
  const sample = audioData.slice(0, sampleSize);

  // Calculate spectral peaks which correspond to formants
  // This is a simplified approach - real implementations use LPC
  const fftBins = 256;
  const binWidth = sampleSize / fftBins;
  if (binWidth === 0) return [0, 0, 0, 0];

  // Simulate FFT bins and find peaks
  for (let bin = 1; bin < Math.min(5, fftBins/2); bin++) {
    let binEnergy = 0;
    const startIdx = Math.floor(bin * binWidth);
    const endIdx = Math.floor((bin + 1) * binWidth);

    for (let i = startIdx; i < endIdx && i < sample.length; i++) {
      binEnergy += Math.abs(sample[i]);
    }

    formants.push(binEnergy / Math.max(1, endIdx - startIdx));
  }

  return formants;
};

/**
 * Calculates difference between formant frequencies
 * @param {Array} formants1 - First set of formant frequencies
 * @param {Array} formants2 - Second set of formant frequencies
 * @returns {number} Difference value
 */
const calculateFormantDifference = (formants1, formants2) => {
  if (!formants1 || !formants2 || formants1.length !== formants2.length) {
    return 0;
  }

  let diff = 0;
  for (let i = 0; i < formants1.length; i++) {
    diff += Math.abs(formants1[i] - formants2[i]);
  }

  return diff / formants1.length;
};

/**
 * Calculates feature stability between current and previous features
 * @param {Object} currentFeatures - Current audio features
 * @param {Object} previousFeatures - Previous audio features
 * @returns {number} Stability score (0-1)
 */
const calculateFeatureStability = (currentFeatures, previousFeatures) => {
  // Calculate how stable the features are (more stable = higher confidence in detection)
  const stabilityFactors = [];

  // Volume stability
  const volumeRatio = Math.min(currentFeatures.volume, previousFeatures.volume) /
                     Math.max(currentFeatures.volume, previousFeatures.volume);
  stabilityFactors.push(volumeRatio);

  // Pitch stability
  const pitchRatio = Math.min(currentFeatures.pitchEstimate, previousFeatures.pitchEstimate) /
                   Math.max(currentFeatures.pitchEstimate, previousFeatures.pitchEstimate);
  stabilityFactors.push(pitchRatio);

  // Energy stability
  const energyRatio = Math.min(currentFeatures.energy, previousFeatures.energy) /
                     Math.max(currentFeatures.energy, previousFeatures.energy);
  stabilityFactors.push(energyRatio);

  // Calculate average stability
  const avgStability = stabilityFactors.reduce((sum, val) => sum + val, 0) / stabilityFactors.length;

  return avgStability;
};

/**
 * Estimates pitch from audio data using autocorrelation
 * @param {Float32Array} audioData - Audio data
 * @returns {number} Estimated pitch in Hz
 */
const estimatePitch = (audioData) => {
  if (!audioData || audioData.length === 0) return 0;
  const sampleRate = 16000; // Standard for this app
  const minFreq = 80;
  const maxFreq = 400;
  const minPeriod = Math.floor(sampleRate / maxFreq);
  const maxPeriod = Math.floor(sampleRate / minFreq);

  let bestPeriod = -1;
  let bestCorrelation = -1;

  // Use a window for autocorrelation
  const windowSize = Math.min(1024, Math.floor(audioData.length / 2));
  if (windowSize === 0) return 0;
  
  for (let period = minPeriod; period <= maxPeriod; period++) {
    let correlation = 0;
    for (let i = 0; i < windowSize; i++) {
      correlation += Math.abs(audioData[i] - audioData[i + period]);
    }
    
    // We want to minimize the difference (AMDF - Average Magnitude Difference Function)
    if (bestCorrelation === -1 || correlation < bestCorrelation) {
      bestCorrelation = correlation;
      bestPeriod = period;
    }
  }

  if (bestPeriod === -1) return 0;
  return sampleRate / bestPeriod;
};

/**
 * Estimates speech rate from audio data
 * @param {Float32Array} audioData - Audio data
 * @returns {number} Estimated speech rate
 */
const estimateSpeechRate = (audioData) => {
  if (!audioData || audioData.length === 0) return 0;
  // Count zero crossings as a simple measure of speech activity
  let zeroCrossings = 0;
  for (let i = 1; i < audioData.length; i++) {
    if ((audioData[i] >= 0 && audioData[i-1] < 0) || (audioData[i] < 0 && audioData[i-1] >= 0)) {
      zeroCrossings++;
    }
  }
  
  // Normalize by audio length to get rate
  return (zeroCrossings / audioData.length) * 10000; // Arbitrary scaling
};

/**
 * Calculates spectral centroid as a measure of "brightness" of audio
 * @param {Float32Array} audioData - Audio data
 * @returns {number} Spectral centroid
 */
const calculateSpectralCentroid = (audioData) => {
  if (!audioData || audioData.length === 0) return 0;
  // Simplified spectral centroid calculation
  // In a real implementation, you'd use FFT
  let weightedSum = 0;
  let sum = 0;
  
  // Use a simple approach with the first portion of the signal
  const sampleSize = Math.min(2048, audioData.length);
  for (let i = 0; i < sampleSize; i++) {
    const magnitude = Math.abs(audioData[i]);
    weightedSum += i * magnitude;
    sum += magnitude;
  }
  
  return sum > 0 ? weightedSum / sum : 0;
};

/**
 * Manages average audio characteristics for a specific speaker
 */
class SpeakerProfile {
  constructor(role) {
    this.role = role;
    this.averageFeatures = {
      pitchEstimate: 0,
      spectralCentroid: 0,
      zeroCrossingRate: 0,
      count: 0
    };
    this.consistencyHistory = []; // Track recent similarity scores to monitor profile stability
  }

  /**
   * Updates the profile with new audio features using a moving average
   * @param {Object} features - New features to incorporate
   */
  update(features, config = null) {
    const c = this.averageFeatures.count;

    // Check for "stale" or inconsistent profile performance
    const isInconsistent = this.consistencyHistory.length > 5 &&
                         (this.consistencyHistory.reduce((a, b) => a + b, 0) / this.consistencyHistory.length < 0.4);

    // Weighted moving average - give more weight to recent speech but maintain history
    // Use alpha = 1.0 for the first update to initialize the profile
    // Use configurable alpha if available, otherwise use default
    // If inconsistent, temporarily increase learning rate (soft reset)
    let alpha = c === 0
      ? 1.0
      : (config && config.profileUpdateAlpha !== undefined
          ? Math.max(0.01, config.profileUpdateAlpha)
          : Math.max(0.1, 1 / (c + 1)));

    if (isInconsistent) {
      alpha = Math.min(0.3, alpha * 2); // Faster adaptation if profile is performing poorly
    }

    // Dynamic alpha that increases after minProfileUpdates is met
    // This allows faster adaptation for users with atypical speech patterns after initial profile establishment
    if (config && c >= (config.minProfileUpdates || 5)) {
      alpha = Math.min(0.2, alpha * (config.dynamicAlphaMultiplier || 1.5)); // Increase learning rate after profile is established
    }

    this.averageFeatures.pitchEstimate = (1 - alpha) * this.averageFeatures.pitchEstimate + alpha * features.pitchEstimate;
    this.averageFeatures.spectralCentroid = (1 - alpha) * this.averageFeatures.spectralCentroid + alpha * features.spectralCentroid;
    this.averageFeatures.zeroCrossingRate = (1 - alpha) * this.averageFeatures.zeroCrossingRate + alpha * features.zeroCrossingRate;

    this.averageFeatures.count++;
  }

  /**
   * Calculates similarity between new features and this profile (0-1)
   * @param {Object} features - Features to compare
   * @param {Object} config - Configuration object
   * @returns {number} Similarity score
   */
  getSimilarity(features, config = null) {
    if (this.averageFeatures.count === 0) return 0.5;

    const pitchDiff = Math.abs(features.pitchEstimate - this.averageFeatures.pitchEstimate) / Math.max(this.averageFeatures.pitchEstimate, 1);
    const spectralDiff = Math.abs(features.spectralCentroid - this.averageFeatures.spectralCentroid) / Math.max(this.averageFeatures.spectralCentroid, 1);
    const zcrDiff = Math.abs(features.zeroCrossingRate - this.averageFeatures.zeroCrossingRate) / Math.max(this.averageFeatures.zeroCrossingRate, 0.01);

    // Pitch is the most reliable indicator
    const distance = (pitchDiff * 0.6 + spectralDiff * 0.2 + zcrDiff * 0.2);
    const similarity = Math.max(0, 1 - distance);

    // Track consistency to detect if profile becomes "stale"
    this.consistencyHistory.push(similarity);
    if (this.consistencyHistory.length > 10) {
      this.consistencyHistory.shift();
    }

    // If profile is not yet reliable, return neutral similarity
    const minUpdates = config ? config.minProfileUpdates : 5;
    if (this.averageFeatures.count < minUpdates) {
      return 0.5;
    }

    return similarity;
  }
}

/**
 * Manages conversation turns and speaker identification
 */
export class ConversationTurnManager {
  constructor(config = {}) {
    // Merge provided config with defaults
    this.config = { ...CONVERSATION_CONFIG, ...config };

    // Validate config at initialization
    try {
      validateConfig(this.config);
    } catch (error) {
      console.warn('Invalid configuration provided to ConversationTurnManager:', error.message);
      // Fall back to default config if validation fails
      this.config = { ...CONVERSATION_CONFIG };
    }

    this.turns = [];
    this.currentTurn = null;
    this.lastSpeaker = 'user'; // Start assuming user is speaking
    this.baseTurnThreshold = this.config.baseTurnThreshold;
    this.adaptiveTurnThreshold = this.config.baseTurnThreshold; // Will be adjusted based on conversation patterns
    this.lastSpeechTime = 0;
    this.silenceHistory = []; // Track silence patterns to adapt thresholds
    this.conversationDynamics = {
      avgTurnLength: 0,
      avgSilenceDuration: 0,
      turnFrequency: 0
    };
    this.profiles = {
      user: new SpeakerProfile('user'),
      other: new SpeakerProfile('other')
    };
    this.turnYieldConfidence = 0; // Likelihood the current speaker has yielded
    this.lastSpeechStartTime = 0; // Track when the current speaker started speaking

    // Diagnostic tracking
    this.diagnostics = {
      totalAudioFramesProcessed: 0,
      speakerChangesDetected: 0,
      turnYieldsDetected: 0,
      errorsEncountered: 0,
      sessionStartTime: Date.now() // Track when diagnostics collection started
    };
  }

  /**
   * Processes incoming audio and determines if it's a new turn
   * @param {Float32Array} audioData - Audio data from microphone
   * @param {string} detectedText - Text from speech recognition
   * @returns {Object} Turn information
   */
  processAudio(audioData, detectedText = '') {
    try {
      // Increment diagnostic counter
      this.diagnostics.totalAudioFramesProcessed++;

      const currentTime = Date.now();
      const isSilent = this.isSilent(audioData);

      // Analyze speaker characteristics
      const speakerAnalysis = analyzeSpeakerCharacteristics(audioData, this.lastAudioData);
      this.lastAudioData = audioData;

      // Analyze intent for turn-yielding signals if we have text
      let wasYieldDetected = false;
      if (detectedText) {
        const intent = detectIntent(detectedText);
        if (intent === 'question' || detectedText.trim().endsWith('?')) {
          this.turnYieldConfidence = 0.8; // High likelihood of turn change after a question
          this.diagnostics.turnYieldsDetected++;
          wasYieldDetected = true;
        } else if (intent === 'greeting' && this.turns.length < 2) {
          this.turnYieldConfidence = 0.5;
        } else if (this.isTurnYieldingIntent(intent, detectedText)) {
          // Additional turn-yielding intents beyond question and greeting
          this.turnYieldConfidence = 0.7; // High likelihood of turn change
          this.diagnostics.turnYieldsDetected++;
          wasYieldDetected = true;
        } else {
          this.turnYieldConfidence = Math.max(0, this.turnYieldConfidence - this.config.yieldConfidenceDecay);
        }
      }

      // Update adaptive threshold based on conversation dynamics and intent
      this.updateAdaptiveThreshold(currentTime, isSilent);

      // Determine if this is likely a new speaker with confidence scoring
      const isLikelyNewSpeaker = speakerAnalysis.isLikelyNewSpeaker;
      const speakerConfidence = speakerAnalysis.confidenceScore;

      // Check if enough time has passed to consider a new turn
      const timeSinceLastSpeech = currentTime - this.lastSpeechTime;

      // Check if we're in a rejection window (to address race condition)
      const inRejectionWindow = this.lastSpeechStartTime &&
                                (currentTime - this.lastSpeechStartTime < this.config.rejectionWindowMs) &&
                                this.lastSpeaker === this.estimateCurrentSpeaker(speakerAnalysis);

      // Edge case: Rapid reinterruption handling - detect micro-pauses based on config
      // This distinguishes between true yield and mid-sentence correction
      const isMicroPause = timeSinceLastSpeech < this.config.microPauseThresholdMs && timeSinceLastSpeech > 0;
      const shouldConsiderMicroPause = isMicroPause && this.lastSpeaker === this.estimateCurrentSpeaker(speakerAnalysis);

      // Logic for ending turn:
      // 1. Silent longer than threshold
      // 2. High confidence speaker change detected
      // 3. User yielded turn (intent) AND some silence or moderate speaker change confidence
      // 4. Not in rejection window (to prevent jarring turn changes)
      // 5. Not a micro-pause (to distinguish true yield from mid-sentence correction)
      const shouldStartNewTurn = !inRejectionWindow &&
                                 !shouldConsiderMicroPause && (
        timeSinceLastSpeech > this.adaptiveTurnThreshold ||
        (isLikelyNewSpeaker && speakerConfidence > this.config.speakerConfidenceHigh) ||
        (this.turnYieldConfidence > this.config.highYieldConfidence && timeSinceLastSpeech > this.config.silenceThresholdForIntent) ||
        (this.turnYieldConfidence > this.config.moderateYieldConfidence && isLikelyNewSpeaker && speakerConfidence > this.config.speakerConfidenceModerate)
      );

      if (!isSilent) {
        this.lastSpeechTime = currentTime;
        // Update speech start time if this is a new speech segment from the same speaker
        if (this.lastSpeaker !== this.estimateCurrentSpeaker(speakerAnalysis)) {
          this.lastSpeechStartTime = currentTime;
          this.diagnostics.speakerChangesDetected++;
        }
      }

      // Determine speaker role using profiles and turn-yielding bias
      const userSimilarity = this.profiles.user.getSimilarity(speakerAnalysis.features, this.config);
      const otherSimilarity = this.profiles.other.getSimilarity(speakerAnalysis.features, this.config);

      let speakerRole = this.lastSpeaker;

      if (shouldStartNewTurn) {
        // Apply turn-yielding weighting: if user likely yielded, weight towards 'other'
        const weightToOther = (this.lastSpeaker === 'user') ? this.turnYieldConfidence * this.config.turnYieldWeightingFactor : 0;
        const weightToUser = (this.lastSpeaker === 'other') ? this.turnYieldConfidence * this.config.turnYieldWeightingFactor : 0;

        const adjustedUserSim = userSimilarity + weightToUser;
        const adjustedOtherSim = otherSimilarity + weightToOther;

        if (Math.abs(adjustedUserSim - adjustedOtherSim) > this.config.speakerSimilarityThreshold) {
          speakerRole = adjustedUserSim > adjustedOtherSim ? 'user' : 'other';
        } else if (isLikelyNewSpeaker && speakerConfidence > (this.config.speakerConfidenceHigh - 0.2)) { // 0.4 threshold
          speakerRole = this.lastSpeaker === 'user' ? 'other' : 'user';
        }

        // Reset yielding confidence when a turn actually changes
        if (speakerRole !== this.lastSpeaker) {
          this.turnYieldConfidence = 0;

          // Perform bias analysis when a turn change occurs due to yield
          if (wasYieldDetected) {
            analyzeTurnYieldBias(
              speakerAnalysis.features,
              true, // wasYield (turn actually changed)
              this.config
            );
          }
        } else {
          // Even if no turn change occurred, analyze for potential bias if yield was detected
          // This helps identify cases where the system detected a yield but didn't change turns
          // (e.g., when speaker continues talking despite yielding signals)
          if (wasYieldDetected) {
            analyzeTurnYieldBias(
              speakerAnalysis.features,
              false, // wasYield (no turn change occurred)
              this.config
            );
          }
        }
      } else {
        // If no new turn started but yield was detected, analyze for potential bias
        // This could indicate a false positive in yield detection
        if (wasYieldDetected) {
          analyzeTurnYieldBias(
            speakerAnalysis.features,
            false, // wasYield (no turn change occurred)
            this.config
          );
        }
      }

      // Update the profile for the detected speaker - only if confidence is reasonable
      if (!isSilent && speakerConfidence > this.config.speakerConfidenceUpdate) {
        this.profiles[speakerRole].update(speakerAnalysis.features, this.config);
      }

      // Create or continue turn
      if (!this.currentTurn || shouldStartNewTurn) {
        // End previous turn if exists
        if (this.currentTurn) {
          this.endCurrentTurn();
        }

        // Start new turn
        this.currentTurn = {
          id: Date.now(),
          startTime: currentTime,
          speaker: speakerRole,
          text: detectedText,
          audioFeatures: speakerAnalysis.features,
          isLikelyNewSpeaker: isLikelyNewSpeaker,
          confidenceScore: speakerConfidence,
          messages: detectedText ? [{ role: speakerRole, content: detectedText, timestamp: currentTime }] : []
        };
      } else if (detectedText) {
        // Add to current turn
        this.currentTurn.text += ' ' + detectedText;
        this.currentTurn.messages.push({
          role: speakerRole,
          content: detectedText,
          timestamp: currentTime
        });
      }

      this.lastSpeaker = speakerRole;

      return {
        turn: this.currentTurn,
        isLikelyNewSpeaker,
        speakerChangeLikelihood: speakerAnalysis.speakerChangeLikelihood,
        confidenceScore: speakerConfidence,
        userSimilarity,
        otherSimilarity,
        turnYieldConfidence: this.turnYieldConfidence
      };
    } catch (error) {
      this.diagnostics.errorsEncountered++;
      console.error('Error in processAudio:', error);

      // Return a safe default response to prevent system crashes
      return {
        turn: this.currentTurn,
        isLikelyNewSpeaker: false,
        speakerChangeLikelihood: 0,
        confidenceScore: 0,
        userSimilarity: 0.5,
        otherSimilarity: 0.5,
        turnYieldConfidence: this.turnYieldConfidence
      };
    }
  }
  
  /**
   * Updates the adaptive turn threshold based on conversation dynamics
   * @param {number} currentTime - Current timestamp
   * @param {boolean} isSilent - Whether the current audio is silent
   */
  updateAdaptiveThreshold(currentTime, isSilent) {
    // Track silence periods to understand conversation rhythm
    if (isSilent && this.lastSpeechTime > 0) {
      const silenceDuration = currentTime - this.lastSpeechTime;
      this.silenceHistory.push({
        timestamp: currentTime,
        duration: silenceDuration
      });

      // Keep only recent silence history (last 10 entries)
      if (this.silenceHistory.length > 10) {
        this.silenceHistory = this.silenceHistory.slice(-10);
      }
    }

    // Calculate adaptive threshold based on recent conversation patterns
    let threshold = this.baseTurnThreshold;

    if (this.silenceHistory.length > 0) {
      const recentSilences = this.silenceHistory.slice(-5); // Look at last 5 silences
      const avgSilence = recentSilences.reduce((sum, s) => sum + s.duration, 0) / recentSilences.length;

      // Adjust threshold: shorter for fast-paced conversations, longer for slower ones
      threshold = Math.max(this.config.minAdaptiveThreshold, Math.min(this.config.maxAdaptiveThreshold, avgSilence * 0.8));
    }

    // Gracefully reduce threshold if current speaker likely yielded
    // Use weighted interpolation between adaptive threshold and quickResponseThreshold
    if (this.turnYieldConfidence > 0.3) {
      const yieldWeight = Math.min(1.0, (this.turnYieldConfidence - 0.3) / 0.7);
      const yieldInfluencedThreshold = threshold * (1 - yieldWeight) + this.config.quickResponseThreshold * yieldWeight;
      threshold = Math.min(threshold, yieldInfluencedThreshold);
    }

    this.adaptiveTurnThreshold = threshold;
  }

  /**
   * Checks if audio data is silent
   * @param {Float32Array} audioData - Audio data
   * @returns {boolean} True if audio is silent
   */
  isSilent(audioData) {
    const rms = calculateRMS(audioData);
    // Improved noise floor detection with dynamic threshold
    const baseThreshold = 0.01;
    const ambientNoiseLevel = this.estimateAmbientNoise(audioData);
    const dynamicThreshold = Math.max(baseThreshold, ambientNoiseLevel * 2);
    return rms < dynamicThreshold;
  }

  /**
   * Estimates ambient noise level in the audio
   * @param {Float32Array} audioData - Audio data
   * @returns {number} Estimated ambient noise level
   */
  estimateAmbientNoise(audioData) {
    // Calculate a rolling average of the lowest RMS values to estimate ambient noise
    if (!this.noiseFloorEstimator) {
      this.noiseFloorEstimator = {
        samples: [],
        windowSize: 40 // Reduced from 100 for faster adaptation
      };
    }

    const rms = calculateRMS(audioData);
    this.noiseFloorEstimator.samples.push(rms);

    // Maintain a sliding window of samples
    if (this.noiseFloorEstimator.samples.length > this.noiseFloorEstimator.windowSize) {
      this.noiseFloorEstimator.samples.shift();
    }

    // Estimate noise floor as a percentile of the lowest values
    const sortedSamples = [...this.noiseFloorEstimator.samples].sort((a, b) => a - b);
    const percentileIndex = Math.floor(sortedSamples.length * 0.2); // 20th percentile

    return sortedSamples[percentileIndex] || 0.005; // Default to 0.005 if no samples
  }
  
  /**
   * Ends the current turn and adds it to history
   */
  endCurrentTurn() {
    if (this.currentTurn) {
      this.currentTurn.endTime = Date.now();
      this.turns.push(this.currentTurn);

      // Keep only recent turns to manage memory
      if (this.turns.length > this.config.maxConversationTurns) {
        this.turns = this.turns.slice(-this.config.maxConversationTurns);
      }
    }
  }
  
  /**
   * Gets conversation history with speaker identification
   * @returns {Array} Array of messages with speaker information
   */
  getConversationHistory() {
    const history = [];
    
    // Add completed turns
    this.turns.forEach(turn => {
      turn.messages.forEach(message => {
        history.push({
          role: message.role,
          content: message.content,
          timestamp: message.timestamp,
          turnId: turn.id
        });
      });
    });
    
    // Add current turn if it has messages
    if (this.currentTurn && this.currentTurn.messages.length > 0) {
      this.currentTurn.messages.forEach(message => {
        history.push({
          role: message.role,
          content: message.content,
          timestamp: message.timestamp,
          turnId: this.currentTurn.id
        });
      });
    }
    
    return history;
  }
  
  /**
   * Resets the conversation turn manager
   */
  reset() {
    this.turns = [];
    this.currentTurn = null;
    this.lastSpeaker = 'user';
    this.lastSpeechTime = 0;
  }

  /**
   * Allows manual override of speaker attribution for a specific turn
   * @param {number} turnId - ID of the turn to modify
   * @param {string} correctSpeaker - The correct speaker ('user' or 'other')
   */
  overrideSpeaker(turnId, correctSpeaker) {
    if (this.currentTurn && this.currentTurn.id === turnId) {
      this.currentTurn.speaker = correctSpeaker;
      this.currentTurn.overridden = true;
      this.lastSpeaker = correctSpeaker;
      
      // Update profile with the features from this turn
      if (this.currentTurn.audioFeatures) {
        this.profiles[correctSpeaker].update(this.currentTurn.audioFeatures, this.config);
      }
    } else {
      const turn = this.turns.find(t => t.id === turnId);
      if (turn) {
        turn.speaker = correctSpeaker;
        turn.overridden = true;
        
        // Update profile with the features from this turn
        if (turn.audioFeatures) {
          this.profiles[correctSpeaker].update(turn.audioFeatures, this.config);
        }
      }
    }
  }

  /**
   * Determines if an intent indicates the speaker is yielding their turn
   * @param {string} intent - Detected intent
   * @param {string} text - Original text
   * @returns {boolean} True if the intent suggests turn yielding
   */
  isTurnYieldingIntent(intent, text) {
    // Define intents that typically indicate turn yielding
    const turnYieldingIntents = [
      'agreement',      // "Yes, that's right" - often followed by other speaker
      'acknowledgment', // "I see", "Right" - may yield to other speaker
      'backchannel',    // "Uh-huh", "Mm-hmm" - acknowledging, yielding to speaker
      'concession',     // "You're right", "Fair point" - yielding after agreement
      'invitation',     // "Go ahead", "Tell me more" - explicitly inviting other to speak
      'transition',     // "Anyway", "So", "Well" - often precede turn yielding
      'pause_indicators' // "Hmm", "Let me think" - pausing, may yield turn
    ];

    // Additional text-based heuristics for turn yielding
    const turnYieldingPhrases = [
      'go ahead',
      'you tell me',
      'what do you think',
      'what about you',
      'how about you',
      'over to you',
      'your turn',
      'tell me more',
      'continue',
      'proceed',
      'i\'m listening',
      'please continue'
    ];

    // Check if intent is in turn-yielding category
    if (turnYieldingIntents.includes(intent)) {
      return true;
    }

    // Check for specific turn-yielding phrases in the text
    const lowerText = text.toLowerCase();
    return turnYieldingPhrases.some(phrase => lowerText.includes(phrase));
  }

  /**
   * Estimates the current speaker based on similarity scores
   * @param {Object} speakerAnalysis - Analysis of current speaker characteristics
   * @returns {string} Estimated speaker role ('user' or 'other')
   */
  estimateCurrentSpeaker(speakerAnalysis) {
    const userSimilarity = this.profiles.user.getSimilarity(speakerAnalysis.features, this.config);
    const otherSimilarity = this.profiles.other.getSimilarity(speakerAnalysis.features, this.config);

    // Return the speaker with higher similarity
    return userSimilarity > otherSimilarity ? 'user' : 'other';
  }

  /**
   * Updates the last speaker without processing new audio
   * @param {string} speaker - The speaker to set as last speaker
   */
  updateLastSpeaker(speaker) {
    this.lastSpeaker = speaker;
  }

  /**
   * Get memory usage statistics for the conversation manager
   * @returns {object} Memory usage information
   */
  getMemoryUsage() {
    // Calculate approximate memory usage using a more accurate method
    const turnCount = this.turns.length;

    // More accurate memory estimation using object property counting
    const estimateObjectSize = (obj) => {
      let bytes = 0;
      const objStack = [obj];

      while (objStack.length) {
        const currentObj = objStack.pop();

        for (const prop in currentObj) {
          if (typeof currentObj[prop] === 'string') {
            bytes += currentObj[prop].length * 2; // 2 bytes per character
          } else if (typeof currentObj[prop] === 'number') {
            bytes += 8; // 8 bytes per number
          } else if (typeof currentObj[prop] === 'boolean') {
            bytes += 4; // 4 bytes per boolean
          } else if (typeof currentObj[prop] === 'object' && currentObj[prop] !== null) {
            objStack.push(currentObj[prop]);
          } else if (Array.isArray(currentObj[prop])) {
            bytes += 8; // Array overhead
            currentObj[prop].forEach(item => {
              if (typeof item === 'string') {
                bytes += item.length * 2;
              } else if (typeof item === 'number') {
                bytes += 8;
              } else if (typeof item === 'object' && item !== null) {
                objStack.push(item);
              }
            });
          }
        }
      }

      return bytes;
    };

    const turnHistorySize = estimateObjectSize(this.turns);
    const profileSize = estimateObjectSize(this.profiles);

    // Estimate in bytes
    const estimatedBytes = turnHistorySize + profileSize;

    return {
      turnCount,
      turnHistorySize: turnHistorySize,
      profileSize: profileSize,
      estimatedBytes,
      estimatedMB: parseFloat((estimatedBytes / (1024 * 1024)).toFixed(2)),
      warning: estimatedBytes > 50 * 1024 * 1024 // 50MB warning
    };
  }

  /**
   * Cleans up old turns to manage memory usage
   * @param {number} maxTurns - Maximum number of turns to keep (default: from config)
   */
  cleanupMemory(maxTurns = this.config.maxConversationTurns) {
    if (this.turns.length > maxTurns) {
      this.turns = this.turns.slice(-maxTurns);
    }
  }

  /**
   * Get diagnostic information about the conversation manager
   * @returns {object} Diagnostic information
   */
  getDiagnostics() {
    return {
      ...this.diagnostics,
      config: {
        baseTurnThreshold: this.config.baseTurnThreshold,
        rejectionWindowMs: this.config.rejectionWindowMs,
        speakerConfidenceHigh: this.config.speakerConfidenceHigh,
        turnYieldWeightingFactor: this.config.turnYieldWeightingFactor
      },
      memoryUsage: this.getMemoryUsage(),
      profileStats: {
        user: {
          count: this.profiles.user.averageFeatures.count,
          consistency: this.profiles.user.consistencyHistory.length > 0
            ? this.profiles.user.consistencyHistory.reduce((a, b) => a + b, 0) / this.profiles.user.consistencyHistory.length
            : 0
        },
        other: {
          count: this.profiles.other.averageFeatures.count,
          consistency: this.profiles.other.consistencyHistory.length > 0
            ? this.profiles.other.consistencyHistory.reduce((a, b) => a + b, 0) / this.profiles.other.consistencyHistory.length
            : 0
        }
      },
      conversationState: {
        totalTurns: this.turns.length,
        currentTurnExists: !!this.currentTurn,
        lastSpeaker: this.lastSpeaker,
        turnYieldConfidence: this.turnYieldConfidence,
        adaptiveThreshold: this.adaptiveTurnThreshold
      }
    };
  }

  /**
   * Reset diagnostic counters
   */
  resetDiagnostics() {
    this.diagnostics = {
      totalAudioFramesProcessed: 0,
      speakerChangesDetected: 0,
      turnYieldsDetected: 0,
      errorsEncountered: 0
    };
  }
}

/**
 * Creates a conversation summary that distinguishes between speakers
 * @param {Array} conversationHistory - History with speaker information
 * @returns {string} Conversation summary
 */
export const createSpeakerAwareSummary = (conversationHistory) => {
  if (!conversationHistory || conversationHistory.length === 0) {
    return '';
  }

  // Group messages by speaker to identify conversation flow
  const speakerMessages = {};
  conversationHistory.forEach(msg => {
    if (!speakerMessages[msg.role]) {
      speakerMessages[msg.role] = [];
    }
    speakerMessages[msg.role].push(msg.content);
  });

  // Create summary based on speaker contributions
  const summaryParts = [];
  
  Object.entries(speakerMessages).forEach(([speaker, messages]) => {
    if (messages.length > 0) {
      // Extract key topics from this speaker's messages
      const topics = extractTopicsFromText(messages.join(' '));
      if (topics.length > 0) {
        summaryParts.push(`${speaker === 'user' ? 'User' : 'Other person'} discussed: ${topics.slice(0, 3).join(', ')}`);
      }
    }
  });

  // Identify the flow of conversation
  if (conversationHistory.length >= 2) {
    const firstSpeaker = conversationHistory[0].role;
    const lastSpeaker = conversationHistory[conversationHistory.length - 1].role;
    summaryParts.push(`Conversation started by ${firstSpeaker === 'user' ? 'you' : 'other person'} and ended with ${lastSpeaker === 'user' ? 'you' : 'other person'}`);
  }

  return summaryParts.join(' | ');
};

/**
 * Extracts topics from text
 * @param {string} text - Input text
 * @returns {Array} Array of topics
 */
const extractTopicsFromText = (text) => {
  const words = text.toLowerCase().split(/\s+/);
  
  // Common stop words to filter out
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
    'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
    'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her', 'its', 'our', 'their'
  ]);

  // Count word frequencies
  const wordFreq = {};
  for (const word of words) {
    const cleanWord = word.replace(/[^\w\s]/g, '').trim();
    if (cleanWord.length > 4 && !stopWords.has(cleanWord)) {
      wordFreq[cleanWord] = (wordFreq[cleanWord] || 0) + 1;
    }
  }

  // Get top words as potential topics
  return Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5) // Top 5 potential topics
    .map(([word]) => word);
};