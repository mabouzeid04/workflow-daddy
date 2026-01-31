# TASK-07: Add Documentation Preview Capability

## Scope
Add ability to preview generated documentation before exporting.

## Files to Modify
- `src/components/views/` - Add new `DocumentationPreviewView.js`
- `src/components/index.js` - Export new component
- `src/components/app/WorkflowDaddyApp.js` - Add routing for preview
- `src/utils/documentation.js` - Add preview generation (if different from export)

## Do NOT Touch
- `src/utils/session.js`
- `src/utils/capture.js`
- Other existing views (except for navigation)
- Storage structure

## New Component: DocumentationPreviewView

### Purpose
Show user what the documentation will look like before they export.

### Layout

```
┌─────────────────────────────────────────────┐
│ Documentation Preview                    [X] │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐ │
│ │ # Workflow Documentation                │ │
│ │                                         │ │
│ │ ## Role Overview                        │ │
│ │ [Interview summary here]                │ │
│ │                                         │ │
│ │ ## Observed Tasks                       │ │
│ │ ### Task 1: Email Processing            │ │
│ │ - Step 1: Open Outlook                  │ │
│ │ - Step 2: Review inbox                  │ │
│ │ ...                                     │ │
│ │                                         │ │
│ │ ## Tools Used                           │ │
│ │ - Outlook (45 min)                      │ │
│ │ - Chrome (30 min)                       │ │
│ │ ...                                     │ │
│ └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│ [Back] [Export as Markdown] [Export as JSON]│
└─────────────────────────────────────────────┘
```

### Component Structure

```javascript
import { LitElement, html, css } from 'lit';

export class DocumentationPreviewView extends LitElement {
  static properties = {
    sessionId: { type: String },
    previewContent: { type: String },
    loading: { type: Boolean }
  };

  async connectedCallback() {
    super.connectedCallback();
    await this.loadPreview();
  }

  async loadPreview() {
    this.loading = true;
    const result = await window.api.invoke('documentation:preview', {
      sessionId: this.sessionId
    });
    this.previewContent = result.content;
    this.loading = false;
  }

  render() {
    if (this.loading) {
      return html`<div class="loading">Generating preview...</div>`;
    }

    return html`
      <div class="preview-container">
        <div class="preview-header">
          <h2>Documentation Preview</h2>
          <button @click=${this.handleClose}>×</button>
        </div>

        <div class="preview-content">
          ${this.renderMarkdown(this.previewContent)}
        </div>

        <div class="preview-actions">
          <button @click=${this.handleBack}>Back</button>
          <button @click=${() => this.handleExport('markdown')}>
            Export as Markdown
          </button>
          <button @click=${() => this.handleExport('json')}>
            Export as JSON
          </button>
        </div>
      </div>
    `;
  }
}
```

### Styling

- Scrollable preview area
- Monospace font for code blocks
- Clear section headers
- Readable on both light/dark modes

## IPC Handler for Preview

In `src/index.js`:

```javascript
ipcMain.handle('documentation:preview', async (event, { sessionId }) => {
  const documentation = require('./utils/documentation');

  // Generate but don't save
  const content = await documentation.generatePreview(sessionId);

  return { content };
});
```

## Integration Points

### From ObservationView
Add "Preview Documentation" button alongside export:
```javascript
<button @click=${this.handlePreview}>Preview Documentation</button>
```

### From HistoryView
Add preview option for past sessions:
```javascript
<button @click=${() => this.previewSession(session.id)}>Preview</button>
```

## Verification

1. Complete an observation session (or use existing data)
2. Click "Preview Documentation"
3. Preview view opens with formatted content
4. Content includes: interview summary, tasks, Q&A, tool usage
5. Export buttons work from preview
6. Back button returns to previous view
