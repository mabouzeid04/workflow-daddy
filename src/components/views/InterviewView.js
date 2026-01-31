import { html, css, LitElement, unsafeHTML } from '../../assets/lit-all-2.7.4.min.js';

// Simple markdown to HTML converter for chat messages
function formatMessage(text) {
    if (!text) return '';

    let formatted = text
        // Escape HTML first
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        // Bold **text**
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        // Italic *text*
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // Line breaks
        .replace(/\n/g, '<br>');

    return formatted;
}

export class InterviewView extends LitElement {
    static properties = {
        messages: { type: Array },              // InterviewMessage[]
        isWaitingForAI: { type: Boolean },      // Loading state
        sessionStartTime: { type: Number },     // Track duration
        onComplete: { type: Function },         // Callback when done
        _inputValue: { state: true },           // Internal input state
        _isInitialized: { state: true },        // Loaded session
    };

    constructor() {
        super();
        this.messages = [];
        this.isWaitingForAI = false;
        this.sessionStartTime = Date.now();
        this.onComplete = () => {};
        this._inputValue = '';
        this._isInitialized = false;
    }

    connectedCallback() {
        super.connectedCallback();
        this._setupEventListeners();
        this._initializeInterview();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this._cleanupEventListeners();
    }

    async _initializeInterview() {
        try {
            // Check for existing session
            const currentSession = await window.workflowDaddy.interview.getCurrentSession();

            if (currentSession && !currentSession.completed) {
                // Resume existing session
                this.messages = currentSession.messages;
                this.sessionStartTime = new Date(currentSession.startTime).getTime();
                this._isInitialized = true;
            } else {
                // Start new session
                const result = await window.workflowDaddy.interview.start('interview');
                this.messages = [result.message];
                this.sessionStartTime = Date.now();
                this._isInitialized = true;
            }

            this.requestUpdate();
            this.scrollToBottom();
        } catch (error) {
            console.error('Failed to initialize interview:', error);
            this._isInitialized = true;
            this.requestUpdate();
        }
    }

    _setupEventListeners() {
        window.workflowDaddy.interview.onMessage((message) => {
            this.messages = [...this.messages, message];
            this.requestUpdate();
            this.scrollToBottom();
        });

        window.workflowDaddy.interview.onCompleted((data) => {
            this.dispatchEvent(new CustomEvent('interview-complete', {
                detail: data,
                bubbles: true,
                composed: true
            }));

            if (this.onComplete) {
                this.onComplete(data);
            }
        });
    }

    _cleanupEventListeners() {
        // Event listeners are on window.workflowDaddy, no cleanup needed
    }

    async handleSendMessage() {
        const message = this._inputValue.trim();
        if (!message) return;

        this._inputValue = '';
        this.isWaitingForAI = true;
        this.requestUpdate();

        try {
            const result = await window.workflowDaddy.interview.sendMessage(message);
            // Messages already added by event listener
            this.isWaitingForAI = false;
            this.requestUpdate();
        } catch (error) {
            console.error('Failed to send message:', error);
            this.isWaitingForAI = false;
            this.requestUpdate();
        }
    }

    async handleSkipQuestion() {
        this.isWaitingForAI = true;
        this.requestUpdate();

        try {
            await window.workflowDaddy.interview.skipQuestion();
            // Message added by event listener
            this.isWaitingForAI = false;
            this.requestUpdate();
        } catch (error) {
            console.error('Failed to skip question:', error);
            this.isWaitingForAI = false;
            this.requestUpdate();
        }
    }

    handleKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.handleSendMessage();
        }
    }

    scrollToBottom() {
        requestAnimationFrame(() => {
            const container = this.shadowRoot.querySelector('.messages-container');
            if (container) {
                container.scrollTop = container.scrollHeight;
            }
        });
    }

    render() {
        if (!this._isInitialized) {
            return html`<div class="loading">Starting interview...</div>`;
        }

        return html`
            <div class="container">
                <div class="header">
                    <div class="title">Interview: Learning About Your Work</div>
                    <div class="subtitle">Help me understand your role so I can assist you better</div>
                </div>

                <div class="messages-container">
                    ${this.messages.map(msg => this.renderMessage(msg))}
                    ${this.isWaitingForAI ? html`
                        <div class="message ai">
                            <div class="message-bubble typing">
                                <span class="dot"></span>
                                <span class="dot"></span>
                                <span class="dot"></span>
                            </div>
                        </div>
                    ` : ''}
                </div>

                <div class="input-area">
                    <input
                        type="text"
                        placeholder="Type your answer..."
                        .value=${this._inputValue}
                        @input=${e => this._inputValue = e.target.value}
                        @keydown=${e => this.handleKeydown(e)}
                        ?disabled=${this.isWaitingForAI}
                    />
                    <button
                        class="skip-btn"
                        @click=${this.handleSkipQuestion}
                        ?disabled=${this.isWaitingForAI}
                    >
                        Skip
                    </button>
                    <button
                        class="send-btn"
                        @click=${this.handleSendMessage}
                        ?disabled=${this.isWaitingForAI || !this._inputValue.trim()}
                    >
                        Send
                    </button>
                </div>
            </div>
        `;
    }

    renderMessage(msg) {
        const isAI = msg.role === 'ai';
        const time = new Date(msg.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });

        return html`
            <div class="message ${isAI ? 'ai' : 'user'}">
                <div class="message-bubble">
                    <div class="message-content">${unsafeHTML(formatMessage(msg.content))}</div>
                    <div class="message-time">${time}</div>
                </div>
            </div>
        `;
    }

    static styles = css`
        :host {
            display: flex;
            flex-direction: column;
            height: 100%;
            width: 100%;
        }

        .container {
            flex: 1;
            display: flex;
            flex-direction: column;
            height: 100%;
            background: var(--bg-primary);
        }

        .header {
            padding: 20px 24px 16px;
            border-bottom: 1px solid var(--border-color);
            background: var(--bg-secondary);
        }

        .title {
            font-size: 18px;
            font-weight: 600;
            color: var(--text-color);
            margin-bottom: 4px;
        }

        .subtitle {
            font-size: 13px;
            color: var(--text-secondary);
        }

        .messages-container {
            flex: 1;
            overflow-y: auto;
            padding: 24px;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .message {
            display: flex;
            width: 100%;
        }

        .message.ai {
            justify-content: flex-start;
        }

        .message.user {
            justify-content: flex-end;
        }

        .message-bubble {
            max-width: 70%;
            padding: 12px 16px;
            border-radius: 12px;
            font-size: 14px;
            line-height: 1.5;
        }

        .message.ai .message-bubble {
            background: var(--bg-tertiary);
            color: var(--text-color);
            border-bottom-left-radius: 4px;
        }

        .message.user .message-bubble {
            background: var(--btn-primary-bg);
            color: var(--btn-primary-text);
            border-bottom-right-radius: 4px;
        }

        .message-content {
            margin-bottom: 4px;
            white-space: pre-wrap;
            word-wrap: break-word;
        }

        .message-time {
            font-size: 11px;
            opacity: 0.6;
        }

        .message-bubble.typing {
            display: flex;
            gap: 6px;
            align-items: center;
            padding: 16px 20px;
        }

        .dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--text-muted);
            animation: typing 1.4s infinite;
        }

        .dot:nth-child(2) {
            animation-delay: 0.2s;
        }

        .dot:nth-child(3) {
            animation-delay: 0.4s;
        }

        @keyframes typing {
            0%, 60%, 100% {
                opacity: 0.3;
                transform: translateY(0);
            }
            30% {
                opacity: 1;
                transform: translateY(-10px);
            }
        }

        .input-area {
            padding: 16px 24px;
            border-top: 1px solid var(--border-color);
            background: var(--bg-secondary);
            display: flex;
            gap: 12px;
            align-items: center;
        }

        input {
            flex: 1;
            background: var(--input-background);
            color: var(--text-color);
            border: 1px solid var(--border-color);
            padding: 10px 14px;
            border-radius: 6px;
            font-size: 14px;
            transition: border-color 0.2s ease;
        }

        input:focus {
            outline: none;
            border-color: var(--btn-primary-bg);
        }

        input::placeholder {
            color: var(--placeholder-color);
        }

        input:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        button {
            padding: 10px 20px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            border: none;
        }

        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .skip-btn {
            background: transparent;
            color: var(--text-secondary);
            border: 1px solid var(--border-color);
        }

        .skip-btn:hover:not(:disabled) {
            background: var(--hover-background);
            border-color: var(--text-muted);
        }

        .send-btn {
            background: var(--btn-primary-bg);
            color: var(--btn-primary-text);
        }

        .send-btn:hover:not(:disabled) {
            background: var(--btn-primary-hover);
        }

        .loading {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: var(--text-secondary);
            font-size: 14px;
        }
    `;
}

customElements.define('interview-view', InterviewView);
