import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

/**
 * QuestionOverlay - Displays clarifying questions from the AI during observation
 *
 * States:
 * - hidden: Not visible
 * - notification: Small indicator showing "Quick question..."
 * - expanded: Full question UI with input and buttons
 *
 * Keyboard shortcuts:
 * - Cmd/Ctrl + Q: Toggle visibility
 * - Enter: Submit answer
 * - Escape: Dismiss question
 */
export class QuestionOverlay extends LitElement {
    static styles = css`
        :host {
            position: fixed;
            top: 60px;
            right: 16px;
            z-index: 10000;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .overlay {
            background: var(--bg-primary, rgba(30, 30, 30, 0.95));
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
            overflow: hidden;
            transition: all 0.2s ease;
        }

        .overlay.hidden {
            opacity: 0;
            transform: translateX(100%);
            pointer-events: none;
        }

        .overlay.notification {
            width: auto;
            max-width: 200px;
            cursor: pointer;
        }

        .overlay.expanded {
            width: 380px;
        }

        /* Notification State */
        .notification-content {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 14px;
        }

        .notification-icon {
            width: 20px;
            height: 20px;
            color: var(--accent-color, #4a9eff);
        }

        .notification-text {
            font-size: 13px;
            color: var(--text-color, #fff);
            white-space: nowrap;
        }

        /* Expanded State */
        .expanded-content {
            padding: 16px;
        }

        .question-header {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            margin-bottom: 12px;
        }

        .question-icon {
            width: 24px;
            height: 24px;
            color: var(--accent-color, #4a9eff);
            flex-shrink: 0;
            margin-top: 2px;
        }

        .context-text {
            font-size: 12px;
            color: var(--text-secondary, rgba(255, 255, 255, 0.6));
            margin-bottom: 8px;
            line-height: 1.4;
        }

        .question-text {
            font-size: 14px;
            color: var(--text-color, #fff);
            line-height: 1.5;
            margin-bottom: 12px;
        }

        .answer-input {
            width: 100%;
            background: var(--input-background, rgba(255, 255, 255, 0.1));
            border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
            border-radius: 8px;
            padding: 10px 12px;
            font-size: 13px;
            color: var(--text-color, #fff);
            resize: none;
            outline: none;
            font-family: inherit;
            margin-bottom: 12px;
        }

        .answer-input:focus {
            border-color: var(--accent-color, #4a9eff);
            background: var(--input-focus-background, rgba(255, 255, 255, 0.15));
        }

        .answer-input::placeholder {
            color: var(--text-secondary, rgba(255, 255, 255, 0.4));
        }

        .button-row {
            display: flex;
            gap: 8px;
            justify-content: flex-end;
        }

        .btn {
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s ease;
            border: none;
            outline: none;
        }

        .btn-primary {
            background: var(--accent-color, #4a9eff);
            color: #fff;
        }

        .btn-primary:hover {
            background: var(--accent-hover, #3a8eef);
        }

        .btn-primary:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .btn-secondary {
            background: var(--bg-tertiary, rgba(255, 255, 255, 0.1));
            color: var(--text-secondary, rgba(255, 255, 255, 0.7));
        }

        .btn-secondary:hover {
            background: var(--bg-hover, rgba(255, 255, 255, 0.15));
            color: var(--text-color, #fff);
        }

        .btn-text {
            background: transparent;
            color: var(--text-secondary, rgba(255, 255, 255, 0.5));
            padding: 8px 12px;
        }

        .btn-text:hover {
            color: var(--text-color, #fff);
        }

        /* Keyboard hint */
        .keyboard-hint {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding-top: 8px;
            border-top: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
            margin-top: 8px;
        }

        .kbd {
            background: var(--bg-tertiary, rgba(255, 255, 255, 0.1));
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 11px;
            color: var(--text-secondary, rgba(255, 255, 255, 0.5));
            font-family: monospace;
        }

        .hint-text {
            font-size: 11px;
            color: var(--text-secondary, rgba(255, 255, 255, 0.4));
        }

        /* Confusion type badge */
        .type-badge {
            display: inline-block;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 2px 6px;
            border-radius: 4px;
            background: var(--bg-tertiary, rgba(255, 255, 255, 0.1));
            color: var(--text-secondary, rgba(255, 255, 255, 0.5));
            margin-bottom: 8px;
        }
    `;

    static properties = {
        question: { type: Object },
        state: { type: String }, // 'hidden' | 'notification' | 'expanded'
        answer: { type: String },
    };

    constructor() {
        super();
        this.question = null;
        this.state = 'hidden';
        this.answer = '';

        // Bind keyboard handler
        this._handleKeyboard = this._handleKeyboard.bind(this);
    }

    connectedCallback() {
        super.connectedCallback();
        document.addEventListener('keydown', this._handleKeyboard);

        // Listen for confusion events from main process
        if (window.require) {
            const { ipcRenderer } = window.require('electron');

            ipcRenderer.on('confusion:question-created', (_, question) => {
                this.showQuestion(question);
            });

            ipcRenderer.on('confusion:question-answered', () => {
                this.hide();
            });

            ipcRenderer.on('confusion:question-dismissed', () => {
                this.hide();
            });

            ipcRenderer.on('confusion:question-deferred', () => {
                this.hide();
            });
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        document.removeEventListener('keydown', this._handleKeyboard);

        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.removeAllListeners('confusion:question-created');
            ipcRenderer.removeAllListeners('confusion:question-answered');
            ipcRenderer.removeAllListeners('confusion:question-dismissed');
            ipcRenderer.removeAllListeners('confusion:question-deferred');
        }
    }

    _handleKeyboard(e) {
        // Cmd/Ctrl + Q: Toggle visibility
        if ((e.metaKey || e.ctrlKey) && e.key === 'q') {
            e.preventDefault();
            this.toggleVisibility();
            return;
        }

        // Only handle these when expanded
        if (this.state !== 'expanded') return;

        // Escape: Dismiss
        if (e.key === 'Escape') {
            e.preventDefault();
            this.dismissQuestion();
            return;
        }

        // Enter (not in textarea): Submit
        if (e.key === 'Enter' && !e.shiftKey && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            this.submitAnswer();
            return;
        }
    }

    showQuestion(question) {
        this.question = question;
        this.answer = '';
        this.state = 'notification';
        this.requestUpdate();
    }

    hide() {
        this.state = 'hidden';
        this.question = null;
        this.answer = '';
        this.requestUpdate();
    }

    toggleVisibility() {
        if (this.state === 'hidden' && this.question) {
            this.state = 'notification';
        } else if (this.state === 'notification') {
            this.state = 'expanded';
        } else if (this.state === 'expanded') {
            this.state = 'hidden';
        }
        this.requestUpdate();
    }

    expand() {
        if (this.state === 'notification') {
            this.state = 'expanded';
            this.requestUpdate();

            // Focus the input after render
            this.updateComplete.then(() => {
                const input = this.shadowRoot.querySelector('.answer-input');
                if (input) input.focus();
            });
        }
    }

    async submitAnswer() {
        if (!this.question || !this.answer.trim()) return;

        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('confusion:answer-question', this.question.id, this.answer.trim());
        }

        this.dispatchEvent(new CustomEvent('question-answered', {
            detail: { questionId: this.question.id, answer: this.answer.trim() }
        }));

        this.hide();
    }

    async dismissQuestion() {
        if (!this.question) return;

        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('confusion:dismiss-question', this.question.id);
        }

        this.dispatchEvent(new CustomEvent('question-dismissed', {
            detail: { questionId: this.question.id }
        }));

        this.hide();
    }

    async deferQuestion() {
        if (!this.question) return;

        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('confusion:defer-question', this.question.id);
        }

        this.dispatchEvent(new CustomEvent('question-deferred', {
            detail: { questionId: this.question.id }
        }));

        this.hide();
    }

    _handleInputChange(e) {
        this.answer = e.target.value;
    }

    _handleInputKeydown(e) {
        // Submit on Enter (without shift)
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.submitAnswer();
        }
    }

    _formatConfusionType(type) {
        const typeMap = {
            'unfamiliar_app': 'New App',
            'unclear_purpose': 'Purpose',
            'repeated_action': 'Repeated',
            'multi_system': 'Multi-System',
            'pattern_deviation': 'Different Pattern',
            'manual_entry': 'Manual Entry',
            'error_state': 'Error'
        };
        return typeMap[type] || type;
    }

    _renderQuestionIcon() {
        return html`
            <svg class="question-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
        `;
    }

    _renderNotificationIcon() {
        return html`
            <svg class="notification-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
        `;
    }

    render() {
        const overlayClass = `overlay ${this.state}`;

        if (this.state === 'hidden' || !this.question) {
            return html`<div class="${overlayClass}"></div>`;
        }

        if (this.state === 'notification') {
            return html`
                <div class="${overlayClass}" @click=${() => this.expand()}>
                    <div class="notification-content">
                        ${this._renderNotificationIcon()}
                        <span class="notification-text">Quick question...</span>
                    </div>
                </div>
            `;
        }

        // Expanded state
        return html`
            <div class="${overlayClass}">
                <div class="expanded-content">
                    <div class="question-header">
                        ${this._renderQuestionIcon()}
                        <div>
                            ${this.question.confusionType ? html`
                                <span class="type-badge">${this._formatConfusionType(this.question.confusionType)}</span>
                            ` : ''}
                            ${this.question.triggerContext ? html`
                                <div class="context-text">I noticed you just ${this.question.triggerContext.toLowerCase()}</div>
                            ` : ''}
                            <div class="question-text">${this.question.question}</div>
                        </div>
                    </div>

                    <textarea
                        class="answer-input"
                        rows="2"
                        placeholder="Your answer..."
                        .value=${this.answer}
                        @input=${this._handleInputChange}
                        @keydown=${this._handleInputKeydown}
                    ></textarea>

                    <div class="button-row">
                        <button class="btn btn-text" @click=${() => this.deferQuestion()}>
                            Ask Later
                        </button>
                        <button class="btn btn-secondary" @click=${() => this.dismissQuestion()}>
                            Skip
                        </button>
                        <button
                            class="btn btn-primary"
                            @click=${() => this.submitAnswer()}
                            ?disabled=${!this.answer.trim()}
                        >
                            Submit
                        </button>
                    </div>

                    <div class="keyboard-hint">
                        <span class="kbd">Enter</span>
                        <span class="hint-text">submit</span>
                        <span class="kbd">Esc</span>
                        <span class="hint-text">skip</span>
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('question-overlay', QuestionOverlay);
