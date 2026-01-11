import { calculateSessionTone } from './src/utils/personalization.js';

const defaultBaselines = { pace: 2.5, volume: 0.02, count: 0 };
const text = "Quickly we need to move now it is very urgent go go go";
const metadata = { duration: 2, rms: 0.05 }; // Fast and loud
const emotionData = { emotion: 'anger', confidence: 0.8 };

const result = calculateSessionTone(text, metadata, emotionData, defaultBaselines);

console.log('Debug values:');
console.log('Text:', text);
console.log('Metadata:', metadata);
console.log('Emotion Data:', emotionData);
console.log('Word Count:', text.trim().split(/\s+/).filter(w => w.length > 0).length);
console.log('Pace:', result.pace);
console.log('Volume:', result.volume);
console.log('Urgency Score:', result.urgencyScore);
console.log('Is Urgent:', result.isUrgent);
console.log('Settings (empty):', {});
console.log('Result:', result);