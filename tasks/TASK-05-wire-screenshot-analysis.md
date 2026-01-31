# TASK-05: Wire Screenshot Analysis to AI

## Scope
Connect the screenshot capture system to the confusion detection and task detection AI analysis.

## Files to Modify
- `src/utils/session.js` - Add analysis trigger after screenshot capture
- `src/utils/confusion.js` - Implement actual AI vision call
- `src/utils/taskDetection.js` - Implement actual AI vision call
- `src/utils/gemini.js` - Ensure vision API support exists

## Do NOT Touch
- `src/utils/capture.js` (capture logic is complete)
- UI components
- `src/utils/prompts.js` (separate task)
- Storage structure

## Current State

### What Works
- `capture.js` captures screenshots with metadata ✓
- `confusion.js` has detection logic and question generation ✓
- `taskDetection.js` has task boundary logic ✓
- `gemini.js` has API wrapper ✓

### What's Missing
- After a screenshot is captured, nothing analyzes it
- The AI vision calls are stubbed or missing
- Context isn't passed to the analysis functions

## Implementation Steps

### 1. Find Screenshot Capture Event in session.js

Look for where screenshots are captured/saved. Add a hook:

```javascript
// After screenshot is saved
async onScreenshotCaptured(screenshot, metadata) {
  // Get current context
  const context = await this.contextManager.getContext();

  // Run confusion detection (non-blocking)
  this.confusionDetector.analyze(screenshot, context);

  // Run task detection
  this.taskDetector.processScreenshot(screenshot, metadata);
}
```

### 2. Implement Vision Analysis in confusion.js

Find the analysis function and add actual Gemini vision call:

```javascript
async analyzeScreenshot(screenshotPath, context) {
  const imageData = await fs.readFile(screenshotPath);
  const base64Image = imageData.toString('base64');

  const response = await gemini.analyzeImage({
    image: base64Image,
    prompt: this.buildAnalysisPrompt(context),
  });

  return this.parseConfusionResponse(response);
}
```

### 3. Implement Vision Analysis in taskDetection.js

Similar pattern for task inference:

```javascript
async inferTaskFromScreenshot(screenshotPath, context) {
  const imageData = await fs.readFile(screenshotPath);
  const base64Image = imageData.toString('base64');

  const response = await gemini.analyzeImage({
    image: base64Image,
    prompt: this.buildTaskInferencePrompt(context),
  });

  return this.parseTaskResponse(response);
}
```

### 4. Ensure gemini.js Supports Vision

Verify or add image analysis capability:

```javascript
async analyzeImage({ image, prompt, mimeType = 'image/png' }) {
  const contents = [
    {
      role: 'user',
      parts: [
        { text: prompt },
        {
          inlineData: {
            mimeType,
            data: image
          }
        }
      ]
    }
  ];

  return this.generateContent(contents);
}
```

## Rate Limiting Considerations

- Don't analyze every screenshot (too expensive)
- Suggested: Analyze every 3rd-5th screenshot
- Or: Analyze when significant change detected (app switch, etc.)
- Confusion detection has its own rate limiting (5 questions/hour)

## Data Flow

```
Screenshot captured (capture.js)
    ↓
Session notified (session.js)
    ↓
Context assembled (context.js)
    ↓
┌─────────────────────────────────────┐
│ Parallel:                           │
│ • Confusion analysis (confusion.js) │
│ • Task detection (taskDetection.js) │
└─────────────────────────────────────┘
    ↓
If confused → Emit question event
If task boundary → Update task state
```

## Verification

1. Start observation session
2. Work normally for a few minutes
3. Check console/logs for analysis calls happening
4. Verify questions appear when AI is confused
5. Verify tasks are detected and logged

## Notes

- This is the most critical integration task
- Use proper error handling - don't crash on API failures
- Log analysis results for debugging
- Consider caching/batching for performance
