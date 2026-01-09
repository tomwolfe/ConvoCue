import { orchestratePersona } from './src/utils/personaOrchestrator.js';

console.log("Testing persona orchestrator...");

// Test 1: should apply bias to the current persona
console.log("\n=== Test 1: Bias to current persona ===");
const input1 = "What do you think?";
const result1 = orchestratePersona(input1, [], 'relationship');
console.log("Input:", input1);
console.log("Current persona:", 'relationship');
console.log("Result:", result1);
console.log("Suggested persona:", result1.suggestedPersona);

// Test 2: should suggest crosscultural persona for cultural inquiries
console.log("\n=== Test 2: Crosscultural persona ===");
const input2 = "What is the local custom for greeting elders?";
const result2 = orchestratePersona(input2, [], 'meeting');
console.log("Input:", input2);
console.log("Current persona:", 'meeting');
console.log("Result:", result2);
console.log("Suggested persona:", result2.suggestedPersona);

// Let's also check the intent map configuration
import { AppConfig } from './src/config.js';
console.log("\n=== Intent Map Configuration ===");
console.log("Intent map:", JSON.stringify(AppConfig.system.orchestrator.intentMap, null, 2));