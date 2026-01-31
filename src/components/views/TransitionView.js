import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

export class TransitionView extends LitElement {
    static properties = {
        onStart: { type: Function },
    };

    constructor() {
        super();
        this.onStart = () => {};
    }

    render() {
        return html`
            <div class="container">
                <div class="icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M12 16v-4M12 8h.01"></path>
                    </svg>
                </div>

                <h1>Ready to observe</h1>

                <div class="explanation">
                    <div class="step">
                        <span class="step-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                                <line x1="8" y1="21" x2="16" y2="21"></line>
                                <line x1="12" y1="17" x2="12" y2="21"></line>
                            </svg>
                        </span>
                        <span class="step-text">I'll watch your screen as you work</span>
                    </div>

                    <div class="step">
                        <span class="step-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                                <line x1="12" y1="17" x2="12.01" y2="17"></line>
                            </svg>
                        </span>
                        <span class="step-text">I'll ask when I don't understand something</span>
                    </div>

                    <div class="step">
                        <span class="step-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                            </svg>
                        </span>
                        <span class="step-text">Questions will appear as notifications</span>
                    </div>
                </div>

                <p class="note">The app will minimize to your menu bar. Click the tray icon anytime to see status or stop.</p>

                <button class="start-button" @click=${this.onStart}>
                    Start Observing
                </button>
            </div>
        `;
    }

    static styles = css`
        :host {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            width: 100%;
            background: var(--bg-primary);
        }

        .container {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            padding: 40px;
            max-width: 400px;
        }

        .icon {
            width: 64px;
            height: 64px;
            margin-bottom: 24px;
            color: var(--btn-primary-bg);
        }

        .icon svg {
            width: 100%;
            height: 100%;
        }

        h1 {
            font-size: 24px;
            font-weight: 600;
            color: var(--text-color);
            margin: 0 0 32px 0;
        }

        .explanation {
            display: flex;
            flex-direction: column;
            gap: 16px;
            margin-bottom: 32px;
            width: 100%;
        }

        .step {
            display: flex;
            align-items: center;
            gap: 16px;
            text-align: left;
            padding: 12px 16px;
            background: var(--bg-secondary);
            border-radius: 8px;
            border: 1px solid var(--border-color);
        }

        .step-icon {
            width: 24px;
            height: 24px;
            color: var(--text-muted);
            flex-shrink: 0;
        }

        .step-icon svg {
            width: 100%;
            height: 100%;
        }

        .step-text {
            font-size: 14px;
            color: var(--text-color);
            line-height: 1.4;
        }

        .note {
            font-size: 12px;
            color: var(--text-muted);
            margin: 0 0 24px 0;
            line-height: 1.5;
        }

        .start-button {
            background: var(--btn-primary-bg);
            color: var(--btn-primary-text);
            border: none;
            padding: 14px 32px;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s ease;
        }

        .start-button:hover {
            background: var(--btn-primary-hover);
        }
    `;
}

customElements.define('transition-view', TransitionView);
