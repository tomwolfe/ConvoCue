import { calculateSessionTone } from './src/utils/personalization.js';

const defaultBaselines = { pace: 2.5, volume: 0.02, count: 0 };

console.log("Testing urgent tone detection...");
const text = "Quickly we need to move now it is very urgent go go go";
const metadata = { duration: 2, rms: 0.04 }; // Moderate speed and volume to stay below extreme thresholds
const emotionData = { emotion: 'anger', confidence: 0.8 };

const result = calculateSessionTone(text, metadata, emotionData, defaultBaselines);

console.log("Text:", text);
console.log("Metadata:", metadata);
console.log("Emotion Data:", emotionData);
console.log("Result:", result);
console.log("Words:", text.trim().split(/\s+/).filter(w => w.length > 0));
console.log("Word Count:", text.trim().split(/\s+/).filter(w => w.length > 0).length);
console.log("Duration:", metadata.duration);
console.log("Pace:", result.pace);
console.log("Volume:", result.volume);
console.log("Pace Ratio:", result.pace / defaultBaselines.pace);
console.log("Volume Ratio:", result.volume / defaultBaselines.volume);
console.log("Urgency Score:", result.urgencyScore);
console.log("Is Urgent:", result.isUrgent);
console.log("Active Thresholds for medium:", {
  urgent: 1.6,
  reflective: 0.6
});