/**
 * @fileoverview Speaker detection and conversation turn management utilities
 */

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
    speakerChangeLikelihood = (volumeDiff * 0.1 +
                              pitchDiff * 0.4 +
                              spectralDiff * 0.15 +
                              zeroCrossingDiff * 0.1 +
                              energyDiff * 0.1 +
                              formantDiff * 0.15) / 100;

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
};

/**
 * Calculates Root Mean Square (RMS) of audio data
 * @param {Float32Array} audioData - Audio data
 * @returns {number} RMS value
 */
const calculateRMS = (audioData) => {
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

  // Simulate FFT bins and find peaks
  for (let bin = 1; bin < Math.min(5, fftBins/2); bin++) {
    let binEnergy = 0;
    const startIdx = Math.floor(bin * binWidth);
    const endIdx = Math.floor((bin + 1) * binWidth);

    for (let i = startIdx; i < endIdx && i < sample.length; i++) {
      binEnergy += Math.abs(sample[i]);
    }

    formants.push(binEnergy / (endIdx - startIdx));
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
 * Estimates pitch from audio data (simplified approach)
 * @param {Float32Array} audioData - Audio data
 * @returns {number} Estimated pitch
 */
const estimatePitch = (audioData) => {
  // This is a very simplified pitch estimation
  // In a real implementation, you'd use autocorrelation or other methods
  let maxVal = 0;
  let maxIdx = 0;
  
  // Find the maximum value in the first portion of the audio
  const sampleSize = Math.min(1000, Math.floor(audioData.length / 4));
  for (let i = 0; i < sampleSize; i++) {
    if (Math.abs(audioData[i]) > maxVal) {
      maxVal = Math.abs(audioData[i]);
      maxIdx = i;
    }
  }
  
  // Convert to a rough pitch estimate (in Hz)
  // This is not accurate but provides a relative measure
  return 100 + (maxIdx * 50); // Rough estimate between 100-500 Hz
};

/**
 * Estimates speech rate from audio data
 * @param {Float32Array} audioData - Audio data
 * @returns {number} Estimated speech rate
 */
const estimateSpeechRate = (audioData) => {
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
 * Manages conversation turns and speaker identification
 */
export class ConversationTurnManager {
  constructor() {
    this.turns = [];
    this.currentTurn = null;
    this.lastSpeaker = 'user'; // Start assuming user is speaking
    this.turnThreshold = 1500; // 1.5 seconds of silence to consider turn end
    this.lastSpeechTime = 0;
  }

  /**
   * Processes incoming audio and determines if it's a new turn
   * @param {Float32Array} audioData - Audio data from microphone
   * @param {string} detectedText - Text from speech recognition
   * @returns {Object} Turn information
   */
  processAudio(audioData, detectedText = '') {
    const currentTime = Date.now();
    const isSilent = this.isSilent(audioData);

    // Analyze speaker characteristics
    const speakerAnalysis = analyzeSpeakerCharacteristics(audioData, this.lastAudioData);
    this.lastAudioData = audioData;

    // Determine if this is likely a new speaker with confidence scoring
    const isLikelyNewSpeaker = speakerAnalysis.isLikelyNewSpeaker;
    const confidenceScore = speakerAnalysis.confidenceScore;

    // Check if enough time has passed to consider a new turn
    const timeSinceLastSpeech = currentTime - this.lastSpeechTime;
    const shouldStartNewTurn = timeSinceLastSpeech > this.turnThreshold || (isLikelyNewSpeaker && confidenceScore > 0.5);

    if (!isSilent) {
      this.lastSpeechTime = currentTime;
    }

    // Determine speaker role with confidence consideration
    let speakerRole = 'user'; // Default to user
    if (isLikelyNewSpeaker && confidenceScore > 0.5 && this.lastSpeaker === 'user') {
      speakerRole = 'other'; // Likely other person speaking
    } else if (isLikelyNewSpeaker && confidenceScore > 0.5 && this.lastSpeaker === 'other') {
      speakerRole = 'user'; // Likely back to user
    } else {
      speakerRole = this.lastSpeaker; // Maintain current speaker
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
        confidenceScore: confidenceScore,
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
      confidenceScore: confidenceScore
    };
  }
  
  /**
   * Checks if audio data is silent
   * @param {Float32Array} audioData - Audio data
   * @returns {boolean} True if audio is silent
   */
  isSilent(audioData) {
    const rms = calculateRMS(audioData);
    return rms < 0.01; // Threshold for silence
  }
  
  /**
   * Ends the current turn and adds it to history
   */
  endCurrentTurn() {
    if (this.currentTurn) {
      this.currentTurn.endTime = Date.now();
      this.turns.push(this.currentTurn);
      
      // Keep only recent turns to manage memory
      if (this.turns.length > 20) {
        this.turns = this.turns.slice(-20);
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
    } else {
      const turn = this.turns.find(t => t.id === turnId);
      if (turn) {
        turn.speaker = correctSpeaker;
        turn.overridden = true;
      }
    }
  }

  /**
   * Updates the last speaker without processing new audio
   * @param {string} speaker - The speaker to set as last speaker
   */
  updateLastSpeaker(speaker) {
    this.lastSpeaker = speaker;
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