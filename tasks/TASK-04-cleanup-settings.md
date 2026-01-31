# TASK-04: Clean Up CustomizeView Settings

## Scope
Review and update `CustomizeView.js` to show only settings relevant to workflow documentation.

## Files to Modify
- `src/components/views/CustomizeView.js` (ONLY this file)

## Do NOT Touch
- `src/storage.js`
- `src/index.js` IPC handlers
- Other view components
- The actual storage structure

## Settings to Keep

### Screenshot Capture
- Capture interval (seconds between screenshots)
- Screenshot quality (low/medium/high)
- Whether to capture when specific apps are active

### Observation Behavior
- Idle timeout (pause after X minutes of inactivity)
- Auto-minimize to tray when starting observation
- Whether to show desktop notifications for questions

### API Configuration
- Gemini API key input
- Model selection (if applicable)

### Export Preferences
- Default export format (Markdown, JSON)
- Export location

## Settings to Remove (if present)

### Old "Cheating" Features
- Rate limiting settings (removed per commit history)
- Emergency erase settings
- Panic button configuration
- Quick hide shortcuts (beyond normal minimize)

### Audio-Related (removed feature)
- Microphone selection
- Audio capture toggle
- Audio quality settings

### Google Search (removed feature)
- Search API keys
- Search preferences

## UI Organization

Suggested sections:
```
1. Capture Settings
   - Screenshot interval
   - Screenshot quality

2. Observation Settings
   - Idle timeout
   - Notification preferences

3. API Settings
   - Gemini API key

4. Export Settings
   - Default format
   - Export location
```

## Verification
1. Open Customize/Settings view
2. All visible settings should relate to workflow documentation
3. No settings for removed features (audio, search, emergency)
4. Settings that are changed should persist correctly
