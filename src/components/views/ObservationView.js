import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

export class ObservationView extends LitElement {
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
            padding: 12px 16px;
            box-sizing: border-box;
        }

        .status-row {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 8px;
        }

        .recording-indicator {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            font-weight: 600;
        }

        .recording-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #4caf50;
            flex-shrink: 0;
        }

        .recording-dot.active {
            animation: pulse 1.5s ease-in-out infinite;
        }

        .recording-dot.paused {
            background: #888;
            animation: none;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
        }

        .recording-label {
            color: var(--text-color);
        }

        .elapsed-time {
            font-size: 12px;
            font-family: 'SF Mono', Monaco, monospace;
            color: var(--text-secondary);
            font-weight: 500;
        }

        .spacer {
            flex: 1;
        }

        .action-buttons {
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .icon-button {
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

        .icon-button:hover {
            color: var(--text-color);
            background: var(--hover-background);
        }

        .icon-button svg {
            width: 14px;
            height: 14px;
        }

        .task-row {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 6px;
        }

        .task-label {
            font-size: 11px;
            color: var(--text-muted);
            flex-shrink: 0;
        }

        .task-name {
            font-size: 11px;
            color: var(--text-secondary);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .bottom-row {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .hide-button {
            background: transparent;
            color: var(--text-muted);
            border: 1px solid var(--border-color);
            padding: 3px 10px;
            border-radius: 3px;
            font-size: 10px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.1s ease;
        }

        .hide-button:hover {
            color: var(--text-color);
            border-color: var(--text-muted);
        }

        .pause-button {
            background: transparent;
            color: var(--text-muted);
            border: 1px solid var(--border-color);
            padding: 3px 10px;
            border-radius: 3px;
            font-size: 10px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.1s ease;
        }

        .pause-button:hover {
            color: var(--text-color);
            border-color: var(--text-muted);
        }

        .drag-region {
            -webkit-app-region: drag;
            flex: 1;
        }

        .no-drag {
            -webkit-app-region: no-drag;
        }

        .export-button {
            background: transparent;
            color: #e57373;
            border: 1px solid #e57373;
            padding: 3px 10px;
            border-radius: 3px;
            font-size: 10px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.1s ease;
        }

        .export-button:hover {
            background: rgba(229, 115, 115, 0.1);
            border-color: #ef5350;
            color: #ef5350;
        }

        .export-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .export-button.exporting {
            color: var(--text-muted);
            border-color: var(--border-color);
        }

        /* Confirmation Dialog Overlay */
        .confirm-overlay {
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

        .confirm-dialog {
            background: var(--background-color, #1e1e1e);
            border: 1px solid var(--border-color, #333);
            border-radius: 8px;
            padding: 16px;
            max-width: 280px;
            width: 90%;
        }

        .confirm-title {
            font-size: 13px;
            font-weight: 600;
            color: var(--text-color);
            margin-bottom: 8px;
        }

        .confirm-message {
            font-size: 11px;
            color: var(--text-secondary);
            margin-bottom: 12px;
            line-height: 1.4;
        }

        .confirm-stats {
            font-size: 10px;
            color: var(--text-muted);
            margin-bottom: 12px;
            padding: 8px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 4px;
        }

        .confirm-buttons {
            display: flex;
            gap: 8px;
            justify-content: flex-end;
        }

        .confirm-cancel {
            background: transparent;
            color: var(--text-muted);
            border: 1px solid var(--border-color);
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 11px;
            cursor: pointer;
        }

        .confirm-cancel:hover {
            color: var(--text-color);
            border-color: var(--text-muted);
        }

        .confirm-action {
            background: #e57373;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 500;
            cursor: pointer;
        }

        .confirm-action:hover {
            background: #ef5350;
        }

        /* Success State */
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
            background: var(--background-color, #1e1e1e);
            border: 1px solid var(--border-color, #333);
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

        /* Error State */
        .error-message {
            color: #e57373;
            font-size: 11px;
            margin-top: 4px;
        }
    `;

    static properties = {
        isRecording: { type: Boolean },
        isPaused: { type: Boolean },
        startTime: { type: Number },
        currentTask: { type: String },
        sessionId: { type: String },
        profileId: { type: String },
        taskCount: { type: Number },
        screenshotCount: { type: Number },
        onHide: { type: Function },
        onSettings: { type: Function },
        onPause: { type: Function },
        onResume: { type: Function },
        onExportComplete: { type: Function },
        onPreview: { type: Function },
        _elapsedDisplay: { state: true },
        _showConfirmDialog: { state: true },
        _showSuccessDialog: { state: true },
        _isExporting: { state: true },
        _exportError: { state: true },
        _exportedPath: { state: true },
    };

    constructor() {
        super();
        this.isRecording = false;
        this.isPaused = false;
        this.startTime = 0;
        this.currentTask = '';
        this.sessionId = '';
        this.profileId = '';
        this.taskCount = 0;
        this.screenshotCount = 0;
        this.onHide = () => {};
        this.onSettings = () => {};
        this.onPause = () => {};
        this.onResume = () => {};
        this.onExportComplete = () => {};
        this.onPreview = () => {};
        this._elapsedDisplay = '00:00:00';
        this._timerInterval = null;
        this._showConfirmDialog = false;
        this._showSuccessDialog = false;
        this._isExporting = false;
        this._exportError = null;
        this._exportedPath = '';
    }

    connectedCallback() {
        super.connectedCallback();
        this._startTimer();

        // Listen for task detection events
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.on('taskdetection:task-started', (event, task) => {
                this.currentTask = task.name || 'New task';
                this.taskCount = (this.taskCount || 0) + 1;
            });
            ipcRenderer.on('taskdetection:task-named', (event, task) => {
                this.currentTask = task.name || this.currentTask;
            });
            ipcRenderer.on('taskdetection:task-switched', (event, data) => {
                if (data.newTask) {
                    this.currentTask = data.newTask.name || 'New task';
                }
            });
            // Listen for screenshot captures
            ipcRenderer.on('capture:screenshot-captured', () => {
                this.screenshotCount = (this.screenshotCount || 0) + 1;
            });
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this._stopTimer();

        // Remove IPC listeners
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.removeAllListeners('taskdetection:task-started');
            ipcRenderer.removeAllListeners('taskdetection:task-named');
            ipcRenderer.removeAllListeners('taskdetection:task-switched');
            ipcRenderer.removeAllListeners('capture:screenshot-captured');
        }
    }

    _startTimer() {
        this._stopTimer();
        this._updateElapsed();
        this._timerInterval = setInterval(() => this._updateElapsed(), 1000);
    }

    _stopTimer() {
        if (this._timerInterval) {
            clearInterval(this._timerInterval);
            this._timerInterval = null;
        }
    }

    _updateElapsed() {
        if (!this.startTime) {
            this._elapsedDisplay = '00:00:00';
            return;
        }
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const hours = Math.floor(elapsed / 3600);
        const minutes = Math.floor((elapsed % 3600) / 60);
        const seconds = elapsed % 60;
        this._elapsedDisplay = [
            String(hours).padStart(2, '0'),
            String(minutes).padStart(2, '0'),
            String(seconds).padStart(2, '0'),
        ].join(':');
    }

    _handlePauseResume() {
        if (this.isPaused) {
            this.onResume();
        } else {
            this.onPause();
        }
    }

    async _handleClose() {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('quit-application');
        }
    }

    _handleExportClick() {
        this._showConfirmDialog = true;
    }

    _handleCancelExport() {
        this._showConfirmDialog = false;
    }

    async _handleConfirmExport() {
        this._showConfirmDialog = false;
        this._isExporting = true;
        this._exportError = null;

        try {
            // Stop the observation session first
            if (window.require) {
                const { ipcRenderer } = window.require('electron');
                await ipcRenderer.invoke('session:end');

                // Export documentation
                const result = await ipcRenderer.invoke('documentation:export', this.profileId);

                if (result.success) {
                    this._exportedPath = result.path;
                    this._showSuccessDialog = true;
                } else {
                    this._exportError = result.error || 'Export failed';
                }
            }
        } catch (error) {
            console.error('Export error:', error);
            this._exportError = error.message || 'Export failed';
        } finally {
            this._isExporting = false;
        }
    }

    _handleCloseSuccess() {
        this._showSuccessDialog = false;
        this._exportedPath = '';
        this.onExportComplete();
    }

    async _handleOpenFile() {
        if (window.require && this._exportedPath) {
            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('open-external', `file://${this._exportedPath}`);
        }
    }

    async _handleOpenFolder() {
        if (window.require && this._exportedPath) {
            const { ipcRenderer } = window.require('electron');
            const path = window.require('path');
            const folderPath = path.dirname(this._exportedPath);
            await ipcRenderer.invoke('open-external', `file://${folderPath}`);
        }
    }

    _getExportButtonText() {
        if (this._isExporting) {
            return 'Exporting...';
        }
        return 'End & Export';
    }

    render() {
        return html`
            <div class="status-row">
                <div class="recording-indicator no-drag">
                    <span class="recording-dot ${this.isRecording && !this.isPaused ? 'active' : 'paused'}"></span>
                    <span class="recording-label">
                        ${this.isPaused ? 'Paused' : (this.isRecording ? 'Recording' : 'Idle')}
                    </span>
                </div>
                <span class="elapsed-time">${this._elapsedDisplay}</span>
                <span class="drag-region"></span>
                <div class="action-buttons no-drag">
                    <button class="icon-button" title="Settings" @click=${this.onSettings}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                    </button>
                    <button class="icon-button" title="Minimize" @click=${this.onHide}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </button>
                    <button class="icon-button" title="Close" @click=${this._handleClose}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="task-row">
                <span class="task-label">Task:</span>
                <span class="task-name">${this.currentTask || 'Monitoring...'}</span>
            </div>
            <div class="bottom-row">
                <button class="pause-button no-drag" @click=${() => this._handlePauseResume()}>
                    ${this.isPaused ? 'Resume' : 'Pause'}
                </button>
                <button class="hide-button no-drag" @click=${this.onPreview}>Preview</button>
                <button class="hide-button no-drag" @click=${this.onHide}>Hide</button>
                <span class="drag-region"></span>
                <button
                    class="export-button no-drag ${this._isExporting ? 'exporting' : ''}"
                    @click=${this._handleExportClick}
                    ?disabled=${this._isExporting}
                >
                    ${this._getExportButtonText()}
                </button>
            </div>
            ${this._exportError ? html`<div class="error-message">${this._exportError}</div>` : ''}

            ${this._showConfirmDialog ? html`
                <div class="confirm-overlay no-drag" @click=${this._handleCancelExport}>
                    <div class="confirm-dialog" @click=${(e) => e.stopPropagation()}>
                        <div class="confirm-title">End Session & Export?</div>
                        <div class="confirm-message">
                            This will stop the observation session and generate workflow documentation.
                        </div>
                        <div class="confirm-stats">
                            Session duration: ${this._elapsedDisplay}<br>
                            Tasks detected: ${this.taskCount || 0}<br>
                            Screenshots: ${this.screenshotCount || 0}
                        </div>
                        <div class="confirm-buttons">
                            <button class="confirm-cancel" @click=${this._handleCancelExport}>Cancel</button>
                            <button class="confirm-action" @click=${this._handleConfirmExport}>End & Export</button>
                        </div>
                    </div>
                </div>
            ` : ''}

            ${this._showSuccessDialog ? html`
                <div class="success-overlay no-drag">
                    <div class="success-dialog">
                        <div class="success-icon">✓</div>
                        <div class="success-title">Documentation Exported!</div>
                        <div class="success-message">
                            Saved to:<br>${this._exportedPath}
                        </div>
                        <div class="success-buttons">
                            <button class="success-button" @click=${this._handleOpenFile}>Open File</button>
                            <button class="success-button" @click=${this._handleOpenFolder}>Open Folder</button>
                            <button class="success-button primary" @click=${this._handleCloseSuccess}>Done</button>
                        </div>
                    </div>
                </div>
            ` : ''}
        `;
    }
}

customElements.define('observation-view', ObservationView);
