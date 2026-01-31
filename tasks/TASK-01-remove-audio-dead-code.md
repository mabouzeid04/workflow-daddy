# TASK-01: Remove Audio Dead Code

## Scope
Remove all audio-related dead code from `src/utils/renderer.js`

## Files to Modify
- `src/utils/renderer.js` (ONLY this file)

## Do NOT Touch
- Any other files
- Any IPC handlers in index.js
- Any UI components

## What to Remove

Find and remove all audio-related variables, functions, and logic:

### Variables to Remove (around lines 4-18)
```javascript
let mediaStream = null;
let audioContext = null;
let audioProcessor = null;
let micProcessor = null;
// Any other audio-related state variables
```

### Functions to Remove
- Any function related to audio capture
- Any function related to microphone processing
- Any audio stream handling

### Event Listeners to Remove
- Any audio-related event listeners

## Verification
After removal:
1. The file should have no references to: `audio`, `microphone`, `mic`, `mediaStream` (in audio context)
2. Run `npm start` to verify app still launches
3. Test that screen capture still works (it should, as it's separate from audio)

## Notes
- Screen capture functionality must remain intact
- Video/image capture is NOT audio - don't remove that
- If unsure whether something is audio-related, check if it references AudioContext, MediaStream for audio, or microphone
