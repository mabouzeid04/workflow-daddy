import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { resizeLayout } from '../../utils/windowResize.js';

export class DocumentationPreviewView extends LitElement {
    static styles = css`
        * {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            cursor: default;
            user-select: none;
        }

        :host {
            display: flex;
            flex-direction: column;
            height: 100%;
            width: 100%;
        }

        .preview-container {
            display: flex;
            flex-direction: column;
            height: 100%;
        }

        .preview-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px;
            border-bottom: 1px solid var(--border-color);
        }

        .preview-title {
            font-size: 13px;
            font-weight: 600;
            color: var(--text-color);
        }

        .close-button {
            background: transparent;
            border: none;
            color: var(--text-muted);
            padding: 4px;
            border-radius: 3px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: color 0.1s ease, background 0.1s ease;
        }

        .close-button:hover {
            color: var(--text-color);
            background: var(--hover-background);
        }

        .close-button svg {
            width: 16px;
            height: 16px;
        }

        .preview-content {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            background: var(--bg-primary);
            user-select: text;
            cursor: text;
        }

        .preview-content::-webkit-scrollbar {
            width: 8px;
        }

        .preview-content::-webkit-scrollbar-track {
            background: transparent;
        }

        .preview-content::-webkit-scrollbar-thumb {
            background: var(--scrollbar-thumb);
            border-radius: 4px;
        }

        .preview-content::-webkit-scrollbar-thumb:hover {
            background: var(--scrollbar-thumb-hover);
        }

        .markdown-body {
            font-size: 12px;
            line-height: 1.6;
            color: var(--text-color);
            white-space: pre-wrap;
            word-wrap: break-word;
        }

        .markdown-body h1 {
            font-size: 18px;
            font-weight: 600;
            color: var(--text-color);
            margin: 0 0 16px 0;
            padding-bottom: 8px;
            border-bottom: 1px solid var(--border-color);
        }

        .markdown-body h2 {
            font-size: 14px;
            font-weight: 600;
            color: var(--text-color);
            margin: 20px 0 12px 0;
        }

        .markdown-body h3 {
            font-size: 12px;
            font-weight: 600;
            color: var(--text-secondary);
            margin: 16px 0 8px 0;
        }

        .markdown-body p {
            margin: 0 0 12px 0;
        }

        .markdown-body ul, .markdown-body ol {
            margin: 0 0 12px 0;
            padding-left: 20px;
        }

        .markdown-body li {
            margin-bottom: 4px;
        }

        .markdown-body strong {
            font-weight: 600;
            color: var(--text-color);
        }

        .markdown-body em {
            font-style: italic;
            color: var(--text-secondary);
        }

        .markdown-body code {
            font-family: 'SF Mono', Monaco, monospace;
            font-size: 11px;
            background: var(--bg-tertiary);
            padding: 2px 4px;
            border-radius: 3px;
        }

        .markdown-body table {
            width: 100%;
            border-collapse: collapse;
            margin: 12px 0;
            font-size: 11px;
        }

        .markdown-body th, .markdown-body td {
            border: 1px solid var(--border-color);
            padding: 6px 8px;
            text-align: left;
        }

        .markdown-body th {
            background: var(--bg-secondary);
            font-weight: 600;
        }

        .markdown-body tr:nth-child(even) td {
            background: var(--bg-secondary);
        }

        .markdown-body hr {
            border: none;
            border-top: 1px solid var(--border-color);
            margin: 16px 0;
        }

        .markdown-body details {
            margin: 12px 0;
            padding: 8px;
            background: var(--bg-secondary);
            border-radius: 4px;
        }

        .markdown-body summary {
            cursor: pointer;
            font-weight: 500;
            color: var(--text-secondary);
        }

        .preview-actions {
            display: flex;
            gap: 8px;
            padding: 12px;
            border-top: 1px solid var(--border-color);
            background: var(--bg-primary);
        }

        .back-button {
            background: transparent;
            color: var(--text-color);
            border: 1px solid var(--border-color);
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 500;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: background 0.1s ease;
        }

        .back-button:hover {
            background: var(--hover-background);
        }

        .back-button svg {
            width: 14px;
            height: 14px;
        }

        .spacer {
            flex: 1;
        }

        .export-button {
            background: transparent;
            color: var(--text-color);
            border: 1px solid var(--border-color);
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.1s ease;
        }

        .export-button:hover {
            background: var(--hover-background);
            border-color: var(--text-muted);
        }

        .export-button.primary {
            background: var(--start-button-background, #4caf50);
            color: white;
            border-color: transparent;
        }

        .export-button.primary:hover {
            filter: brightness(1.1);
        }

        .export-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: var(--text-muted);
            font-size: 12px;
            gap: 12px;
        }

        .loading-spinner {
            width: 24px;
            height: 24px;
            border: 2px solid var(--border-color);
            border-top-color: var(--text-color);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .error-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: var(--text-muted);
            font-size: 12px;
            gap: 12px;
            padding: 20px;
            text-align: center;
        }

        .error-icon {
            font-size: 32px;
        }

        .error-message {
            color: #e57373;
            font-size: 11px;
        }

        .retry-button {
            background: transparent;
            color: var(--text-color);
            border: 1px solid var(--border-color);
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 11px;
            cursor: pointer;
            transition: background 0.1s ease;
        }

        .retry-button:hover {
            background: var(--hover-background);
        }

        .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: var(--text-muted);
            font-size: 12px;
            gap: 8px;
            padding: 20px;
            text-align: center;
        }

        .empty-state-title {
            font-size: 14px;
            font-weight: 500;
            color: var(--text-secondary);
        }

        /* Success overlay */
        .success-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 100;
        }

        .success-dialog {
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 16px;
            max-width: 300px;
            width: 90%;
            text-align: center;
        }

        .success-icon {
            font-size: 32px;
            margin-bottom: 8px;
        }

        .success-title {
            font-size: 13px;
            font-weight: 600;
            color: #4caf50;
            margin-bottom: 8px;
        }

        .success-message {
            font-size: 11px;
            color: var(--text-secondary);
            margin-bottom: 12px;
            word-break: break-all;
        }

        .success-buttons {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .success-button {
            background: transparent;
            color: var(--text-color);
            border: 1px solid var(--border-color);
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 11px;
            cursor: pointer;
            transition: all 0.1s ease;
        }

        .success-button:hover {
            border-color: var(--text-muted);
            background: rgba(255, 255, 255, 0.05);
        }

        .success-button.primary {
            background: #4caf50;
            border-color: #4caf50;
            color: white;
        }

        .success-button.primary:hover {
            background: #43a047;
        }

        .copy-button {
            background: transparent;
            color: var(--text-muted);
            border: none;
            padding: 4px 8px;
            border-radius: 3px;
            font-size: 10px;
            cursor: pointer;
            transition: all 0.1s ease;
        }

        .copy-button:hover {
            color: var(--text-color);
            background: var(--hover-background);
        }

        .copy-button.copied {
            color: #4caf50;
        }
    `;

    static properties = {
        profileId: { type: String },
        onBack: { type: Function },
        onExport: { type: Function },
        loading: { type: Boolean },
        previewContent: { type: String },
        error: { type: String },
        _showSuccessDialog: { state: true },
        _exportedPath: { state: true },
        _isExporting: { state: true },
        _copied: { state: true },
    };

    constructor() {
        super();
        this.profileId = '';
        this.onBack = () => {};
        this.onExport = () => {};
        this.loading = true;
        this.previewContent = '';
        this.error = null;
        this._showSuccessDialog = false;
        this._exportedPath = '';
        this._isExporting = false;
        this._copied = false;
    }

    connectedCallback() {
        super.connectedCallback();
        resizeLayout();
        this._loadPreview();
    }

    async _loadPreview() {
        this.loading = true;
        this.error = null;

        try {
            // Get the profile ID from storage if not provided
            if (!this.profileId) {
                const prefs = await workflowDaddy.storage.getPreferences();
                this.profileId = prefs.selectedProfile || 'interview';
            }

            if (window.require) {
                const { ipcRenderer } = window.require('electron');

                // Use the full documentation generation for preview
                const result = await ipcRenderer.invoke('documentation:generate', this.profileId);

                if (result.success) {
                    this.previewContent = result.markdown;
                } else {
                    this.error = result.error || 'Failed to generate documentation';
                }
            }
        } catch (err) {
            console.error('Error loading preview:', err);
            this.error = err.message || 'Failed to load preview';
        } finally {
            this.loading = false;
            this.requestUpdate();
        }
    }

    async _handleExport(format) {
        this._isExporting = true;

        try {
            if (window.require) {
                const { ipcRenderer } = window.require('electron');

                if (format === 'markdown') {
                    const result = await ipcRenderer.invoke('documentation:export', this.profileId);

                    if (result.success) {
                        this._exportedPath = result.path;
                        this._showSuccessDialog = true;
                    } else {
                        this.error = result.error || 'Export failed';
                    }
                } else if (format === 'json') {
                    // Export as JSON by aggregating data
                    const result = await ipcRenderer.invoke('documentation:aggregate', this.profileId);

                    if (result) {
                        // Save JSON file
                        const date = new Date().toISOString().split('T')[0];
                        const filename = `${this.profileId}-${date}.json`;
                        const jsonContent = JSON.stringify(result, null, 2);

                        // Use dialog to save
                        const { dialog } = window.require('@electron/remote') || {};
                        if (dialog) {
                            const { filePath } = await dialog.showSaveDialog({
                                defaultPath: filename,
                                filters: [{ name: 'JSON', extensions: ['json'] }]
                            });
                            if (filePath) {
                                const fs = window.require('fs');
                                fs.writeFileSync(filePath, jsonContent);
                                this._exportedPath = filePath;
                                this._showSuccessDialog = true;
                            }
                        } else {
                            // Fallback: copy to clipboard
                            await navigator.clipboard.writeText(jsonContent);
                            this._copied = true;
                            setTimeout(() => {
                                this._copied = false;
                                this.requestUpdate();
                            }, 2000);
                        }
                    }
                }
            }
        } catch (err) {
            console.error('Export error:', err);
            this.error = err.message || 'Export failed';
        } finally {
            this._isExporting = false;
            this.requestUpdate();
        }
    }

    async _handleCopyToClipboard() {
        try {
            await navigator.clipboard.writeText(this.previewContent);
            this._copied = true;
            setTimeout(() => {
                this._copied = false;
                this.requestUpdate();
            }, 2000);
        } catch (err) {
            console.error('Copy failed:', err);
        }
    }

    _handleCloseSuccess() {
        this._showSuccessDialog = false;
        this._exportedPath = '';
    }

    async _handleOpenFile() {
        if (window.require && this._exportedPath) {
            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('open-external', `file://${this._exportedPath}`);
        }
        this._handleCloseSuccess();
    }

    async _handleOpenFolder() {
        if (window.require && this._exportedPath) {
            const { ipcRenderer } = window.require('electron');
            const path = window.require('path');
            const folderPath = path.dirname(this._exportedPath);
            await ipcRenderer.invoke('open-external', `file://${folderPath}`);
        }
        this._handleCloseSuccess();
    }

    _renderMarkdown(content) {
        if (!content) return '';

        // Simple markdown-to-HTML conversion for display
        // This preserves the markdown structure for readability
        return html`<div class="markdown-body">${content}</div>`;
    }

    render() {
        if (this.loading) {
            return html`
                <div class="preview-container">
                    <div class="preview-header">
                        <span class="preview-title">Documentation Preview</span>
                    </div>
                    <div class="loading">
                        <div class="loading-spinner"></div>
                        <span>Generating documentation preview...</span>
                    </div>
                </div>
            `;
        }

        if (this.error) {
            return html`
                <div class="preview-container">
                    <div class="preview-header">
                        <span class="preview-title">Documentation Preview</span>
                        <button class="close-button" @click=${this.onBack}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <div class="error-state">
                        <span class="error-icon">!</span>
                        <span>Failed to generate preview</span>
                        <span class="error-message">${this.error}</span>
                        <button class="retry-button" @click=${() => this._loadPreview()}>Retry</button>
                    </div>
                    <div class="preview-actions">
                        <button class="back-button" @click=${this.onBack}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M15 6L9 12L15 18"></path>
                            </svg>
                            Back
                        </button>
                    </div>
                </div>
            `;
        }

        if (!this.previewContent) {
            return html`
                <div class="preview-container">
                    <div class="preview-header">
                        <span class="preview-title">Documentation Preview</span>
                        <button class="close-button" @click=${this.onBack}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <div class="empty-state">
                        <div class="empty-state-title">No documentation available</div>
                        <div>Complete an interview and observation session first</div>
                    </div>
                    <div class="preview-actions">
                        <button class="back-button" @click=${this.onBack}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M15 6L9 12L15 18"></path>
                            </svg>
                            Back
                        </button>
                    </div>
                </div>
            `;
        }

        return html`
            <div class="preview-container">
                <div class="preview-header">
                    <span class="preview-title">Documentation Preview</span>
                    <button class="copy-button ${this._copied ? 'copied' : ''}" @click=${() => this._handleCopyToClipboard()}>
                        ${this._copied ? 'Copied!' : 'Copy'}
                    </button>
                </div>

                <div class="preview-content">
                    ${this._renderMarkdown(this.previewContent)}
                </div>

                <div class="preview-actions">
                    <button class="back-button" @click=${this.onBack}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M15 6L9 12L15 18"></path>
                        </svg>
                        Back
                    </button>
                    <span class="spacer"></span>
                    <button
                        class="export-button"
                        ?disabled=${this._isExporting}
                        @click=${() => this._handleExport('json')}
                    >
                        Export as JSON
                    </button>
                    <button
                        class="export-button primary"
                        ?disabled=${this._isExporting}
                        @click=${() => this._handleExport('markdown')}
                    >
                        ${this._isExporting ? 'Exporting...' : 'Export as Markdown'}
                    </button>
                </div>
            </div>

            ${this._showSuccessDialog ? html`
                <div class="success-overlay">
                    <div class="success-dialog">
                        <div class="success-icon">✓</div>
                        <div class="success-title">Export Complete</div>
                        <div class="success-message">${this._exportedPath}</div>
                        <div class="success-buttons">
                            <button class="success-button primary" @click=${() => this._handleOpenFile()}>Open File</button>
                            <button class="success-button" @click=${() => this._handleOpenFolder()}>Open Folder</button>
                            <button class="success-button" @click=${() => this._handleCloseSuccess()}>Close</button>
                        </div>
                    </div>
                </div>
            ` : ''}
        `;
    }
}

customElements.define('documentation-preview-view', DocumentationPreviewView);
