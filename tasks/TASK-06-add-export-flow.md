# TASK-06: Add Documentation Export Flow

## Scope
Add clear UI flow for ending an observation session and exporting documentation.

## Files to Modify
- `src/components/views/ObservationView.js` - Add export button and flow
- `src/utils/documentation.js` - Ensure export function is complete
- `src/index.js` - Add IPC handler if missing for export

## Do NOT Touch
- `src/utils/session.js` (separate concern)
- `src/utils/capture.js`
- Interview or Transition views
- Storage structure

## Current State
- `documentation.js` has export logic (~1074 lines)
- Export capability exists but no clear UI trigger
- User has no obvious way to "finish and export"

## Implementation Steps

### 1. Add Export Button to ObservationView

In `ObservationView.js`, add a prominent button:

```javascript
// In the render/template
<button
  class="export-button"
  @click=${this.handleExportClick}
>
  End Session & Export Documentation
</button>
```

### 2. Add Export Click Handler

```javascript
async handleExportClick() {
  // Confirm with user
  const confirmed = await this.confirmExport();
  if (!confirmed) return;

  // Stop observation
  await window.api.invoke('session:stop');

  // Generate and export documentation
  const result = await window.api.invoke('documentation:export', {
    sessionId: this.currentSessionId,
    format: 'markdown' // or get from settings
  });

  if (result.success) {
    // Show success message with file path
    this.showExportSuccess(result.filePath);
  }
}
```

### 3. Add Confirmation Dialog

Before exporting, confirm:
- "End this observation session?"
- "Documentation will be generated from X tasks and Y screenshots"
- [Cancel] [End & Export]

### 4. Add Success State

After export:
- Show where file was saved
- Option to open file
- Option to open containing folder
- Button to start new session

### 5. Ensure IPC Handler Exists

In `src/index.js`, verify handler exists:

```javascript
ipcMain.handle('documentation:export', async (event, { sessionId, format }) => {
  const documentation = require('./utils/documentation');
  return await documentation.exportSession(sessionId, format);
});
```

## UI/UX Considerations

### Button Placement
- Should be visible but not accidentally clickable
- Suggest: Bottom of observation panel, styled differently from pause/resume

### Button States
- Normal: "End Session & Export"
- During export: "Generating Documentation..." (disabled)
- After export: "Documentation Saved ✓"

### Error Handling
- If export fails, show error message
- Allow retry
- Don't lose session data on export failure

## Export Options (Optional Enhancement)

If time permits, add quick options:
- Format dropdown (Markdown, JSON)
- Include screenshots toggle
- Preview before export

## Verification

1. Start observation session
2. Work for a few minutes
3. Click "End Session & Export"
4. Confirm dialog appears
5. Documentation file is created
6. File contains session data (tasks, screenshots, Q&A)
7. Success message shows file location
