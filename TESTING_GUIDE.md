# Testing Guide for Hang Issue Fix

## Quick Test Scenarios

### Test 1: Normal Conversation
1. Start the application
2. Speak as "Me" (you): "Hello, how are you?"
3. Verify: You should see a quick suggestion appear
4. Speak as "Me": "I'm doing well, thanks!"
5. Verify: No hanging in "Refining..." state

**Expected Logs:**
```
[useML] processAudio START
[useML] STT result received
[useML] processText START - Input: "Hello..."
[useML] Pipeline stage: VAD -> STT -> Intent: social -> Starting LLM generation
[llmWorker] LLM request received for taskId X
[useML] processText END - Pipeline complete
```

---

### Test 2: First Message from "Them" (Critical Test)
1. Toggle speaker to "Them"
2. Speak: "Hi there! How are you doing today?"
3. Verify: No hang in "Refining..." state
4. Verify: Quick suggestion appears (should be fast with fallback)

**Expected Behavior:**
- If LLM responds within 4 seconds: Show LLM suggestion
- If LLM fails: Show fallback suggestion after 4 seconds
- Never hang indefinitely

**Expected Logs:**
```
[useML] processAudio START
[useML] STT result received
[useML] processText START - Input: "Hi there! How are you doing today?"
[useML] Pipeline stage: VAD -> STT -> Intent: social -> Starting LLM generation
[llmWorker] LLM request received for taskId X
[useML] 4-second timeout triggered - LLM worker not responding, providing fallback
[useML] processText END - Pipeline complete
```

---

### Test 3: Speaker Switch from "Them" to "Me"
1. Have "Them" speak: "What do you think about this?"
2. Toggle speaker back to "Me"
3. Speak as "Me": "I think it's a great idea."
4. Verify: Processing state resets, no hanging

**Expected Logs:**
```
[useML] Speaker switched to: me (confidence: 2)
[useML] processText START - Input: "I think it's a great idea."
[useML] processText END - Pipeline complete
```

---

### Test 4: Long Silence Recovery
1. After a conversation, wait 10+ seconds without speaking
2. Speak again as "Me"
3. Verify: Processing state clears, no legacy states persist

**Expected Logs:**
```
[useML] processAudio START
[useML] STT result received
[useML] processText START - Input: "Hello again."
[useML] processText END - Pipeline complete
```

---

### Test 5: Multiple Rapid Messages
1. Speak quickly without pausing: "Hello! How are you? I'm doing great!"
2. Verify: Each message processes quickly, no accumulation of processing states

**Expected Logs:**
```
[useML] processAudio START
[useML] STT result received
[useML] processText START - Input: "Hello!"
[useML] processText END - Pipeline complete

[useML] processAudio START
[useML] STT result received
[useML] processText START - Input: "How are you?"
[useML] processText END - Pipeline complete

[useML] processAudio START
[useML] STT result received
[useML] processText START - Input: "I'm doing great!"
[useML] processText END - Pipeline complete
```

---

### Test 6: Error Simulation (Optional)
1. If you want to test the timeout paths, temporarily modify the LLM worker to add a delay:
   ```javascript
   // In src/core/llmWorker.js, case 'llm':
   await new Promise(resolve => setTimeout(resolve, 10000)); // 10-second delay
   ```
2. Run the application and test
3. Verify you see the timeout logs and fallback suggestions
4. Restore the original code

**Expected Logs:**
```
[useML] processText START - Input: "Test message"
[useML] Pipeline stage: VAD -> STT -> Intent: social -> Starting LLM generation
[llmWorker] LLM request received for taskId X
[useML] 4-second timeout triggered - LLM worker not responding, providing fallback
[useML] Watchdog timeout triggered for taskId X after 8 seconds - LLM worker failed to respond
[useML] Safeguard timeout triggered for taskId X, clearing processing state
```

---

## Key Success Criteria

✅ **No "Refining..." hang after first message from "Them"**
✅ **No "UPDATING..." hang after intent detection**
✅ **Processing state clears after 4 seconds with fallback suggestion**
✅ **Speaker switch from "Them" to "Me" resets all processing states**
✅ **Legacy processing states don't persist across speaker changes**

---

## Troubleshooting

### If you still see hanging:

1. **Check browser console** for the log patterns above
2. **Verify LLM worker is loading**: Look for `[llmWorker] LLM request received`
3. **Check for error messages**: Look for `[llmWorker] LLM processing failed`
4. **Verify timeout behavior**: You should see timeout logs within 8 seconds
5. **Test with fast lookup**: Try simple phrases like "hello" or "how are you" (these use precomputed suggestions and should work instantly)

### If worker never receives requests:

1. Check if `llmReady` state is true
2. Look for any errors in the browser console
3. Verify network connectivity if loading models from HuggingFace
4. Check if WebGPU or WASM fallback is working properly

### If suggestions never appear:

1. Check if `isProcessing` state is being set to false
2. Look for timeout logs (4s, 8s, 10s)
3. Verify the `suggestion` state is being updated
4. Check if fast lookup or precomputed suggestions are being triggered

---

## Performance Expectations

| Scenario | Expected Time | Status |
|----------|--------------|--------|
| Fast lookup (hello, hi) | < 1 second | ✅ |
| Precomputed suggestion | < 2 seconds | ✅ |
| LLM suggestion (fast) | < 4 seconds | ✅ |
| LLM suggestion (slow) | 4-8 seconds | ✅ |
| LLM timeout | 4 seconds with fallback | ✅ |
| Guard timeout | 10 seconds | ✅ |

---

## Test Checklist

- [ ] Test 1: Normal conversation
- [ ] Test 2: First message from "Them" (critical)
- [ ] Test 3: Speaker switch reset
- [ ] Test 4: Long silence recovery
- [ ] Test 5: Rapid messages
- [ ] Test 6: Error simulation (optional)
- [ ] All logs appear in browser console
- [ ] No indefinite hanging in "Refining..."
- [ ] No indefinite hanging in "UPDATING..."
- [ ] Processing state clears properly after timeouts
- [ ] Fallback suggestions appear correctly
