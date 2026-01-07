/**
 * @fileoverview Speaker detection and conversation turn management utilities
 */

/**
 * Analyzes audio characteristics to distinguish between speakers
 * This is a simplified approach - in a real implementation, you'd use more sophisticated audio analysis
 * 
 * @param {Float32Array} audioData - Audio data from the microphone
 * @param {Object} previousAudioData - Previous audio data for comparison
 * @returns {Object} Speaker analysis results
 */
export const analyzeSpeakerCharacteristics = (audioData, previousAudioData = null) => {
  // Calculate basic audio features that might help distinguish speakers
  const features = {
    volume: calculateRMS(audioData),
    pitchEstimate: estimatePitch(audioData),
    speechRate: estimateSpeechRate(audioData),
    spectralCentroid: calculateSpectralCentroid(audioData)
  };

  // Compare with previous audio to detect potential speaker change
  let speakerChangeLikelihood = 0;
  if (previousAudioData) {
    const prevFeatures = {
      volume: calculateRMS(previousAudioData),
      pitchEstimate: estimatePitch(previousAudioData),
      speechRate: estimateSpeechRate(previousAudioData),
      spectralCentroid: calculateSpectralCentroid(previousAudioData)
    };

    // Calculate difference between current and previous features
    const volumeDiff = Math.abs(features.volume - prevFeatures.volume);
    const pitchDiff = Math.abs(features.pitchEstimate - prevFeatures.pitchEstimate);
    const spectralDiff = Math.abs(features.spectralCentroid - prevFeatures.spectralCentroid);

    // Weighted combination of differences to estimate speaker change likelihood
    speakerChangeLikelihood = (volumeDiff * 0.3 + pitchDiff * 0.5 + spectralDiff * 0.2) / 100;
  }

  return {
    features,
    speakerChangeLikelihood,
    isLikelyNewSpeaker: speakerChangeLikelihood > 0.3 // Threshold for considering it a new speaker
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
    
    // Determine if this is likely a new speaker
    const isLikelyNewSpeaker = speakerAnalysis.isLikelyNewSpeaker;
    
    // Check if enough time has passed to consider a new turn
    const timeSinceLastSpeech = currentTime - this.lastSpeechTime;
    const shouldStartNewTurn = timeSinceLastSpeech > this.turnThreshold || isLikelyNewSpeaker;
    
    if (!isSilent) {
      this.lastSpeechTime = currentTime;
    }
    
    // Determine speaker role
    let speakerRole = 'user'; // Default to user
    if (isLikelyNewSpeaker && this.lastSpeaker === 'user') {
      speakerRole = 'other'; // Likely other person speaking
    } else if (isLikelyNewSpeaker && this.lastSpeaker === 'other') {
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
      speakerChangeLikelihood: speakerAnalysis.speakerChangeLikelihood
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