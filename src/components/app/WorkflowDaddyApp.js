import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { AppHeader } from './AppHeader.js';
import { MainView } from '../views/MainView.js';
import { CustomizeView } from '../views/CustomizeView.js';
import { HelpView } from '../views/HelpView.js';
import { HistoryView } from '../views/HistoryView.js';
import { OnboardingView } from '../views/OnboardingView.js';
import { ObservationView } from '../views/ObservationView.js';
import { InterviewView } from '../views/InterviewView.js';
import { TransitionView } from '../views/TransitionView.js';
import { DocumentationPreviewView } from '../views/DocumentationPreviewView.js';
import { QuestionOverlay } from '../overlays/QuestionOverlay.js';

export class WorkflowDaddyApp extends LitElement {
    static styles = css`
        * {
            box-sizing: border-box;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            margin: 0px;
            padding: 0px;
            cursor: default;
            user-select: none;
        }

        :host {
            display: block;
            width: 100%;
            height: 100vh;
            background-color: var(--background-transparent);
            color: var(--text-color);
        }

        .window-container {
            height: 100vh;
            overflow: hidden;
            background: var(--bg-primary);
        }

        .container {
            display: flex;
            flex-direction: column;
            height: 100%;
        }

        .main-content {
            flex: 1;
            padding: var(--main-content-padding);
            overflow-y: auto;
            background: var(--main-content-background);
        }

        .main-content.with-border {
            border-top: none;
        }

        .main-content.onboarding-view {
            padding: 0;
            background: transparent;
        }

        .main-content.settings-view,
        .main-content.help-view,
        .main-content.history-view {
            padding: 0;
        }

        .main-content.observation-view {
            padding: 0;
            overflow: hidden;
        }

        .view-container {
            opacity: 1;
            height: 100%;
        }

        .view-container.entering {
            opacity: 0;
        }

        ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }

        ::-webkit-scrollbar-track {
            background: transparent;
        }

        ::-webkit-scrollbar-thumb {
            background: var(--scrollbar-thumb);
            border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
            background: var(--scrollbar-thumb-hover);
        }
    `;

    static properties = {
        currentView: { type: String },
        statusText: { type: String },
        startTime: { type: Number },
        isRecording: { type: Boolean },
        sessionActive: { type: Boolean },
        selectedProfile: { type: String },
        selectedLanguage: { type: String },
        responses: { type: Array },
        currentResponseIndex: { type: Number },
        selectedScreenshotInterval: { type: String },
        selectedImageQuality: { type: String },
        layoutMode: { type: String },
        windowMode: { type: String },
        isPaused: { type: Boolean },
        currentTask: { type: String },
        _viewInstances: { type: Object, state: true },
        _isClickThrough: { state: true },
        _awaitingNewResponse: { state: true },
        shouldAnimateResponse: { type: Boolean },
        _storageLoaded: { state: true },
        _previousView: { state: true },
    };

    constructor() {
        super();
        // Set defaults - will be overwritten by storage
        this.currentView = 'main'; // Will check onboarding after storage loads
        this.statusText = '';
        this.startTime = null;
        this.isRecording = false;
        this.sessionActive = false;
        this.selectedProfile = 'interview';
        this.selectedLanguage = 'en-US';
        this.selectedScreenshotInterval = '5';
        this.selectedImageQuality = 'medium';
        this.layoutMode = 'normal';
        this.windowMode = 'hub';
        this.isPaused = false;
        this.currentTask = '';
        this.responses = [];
        this.currentResponseIndex = -1;
        this._viewInstances = new Map();
        this._isClickThrough = false;
        this._awaitingNewResponse = false;
        this._currentResponseIsComplete = true;
        this.shouldAnimateResponse = false;
        this._storageLoaded = false;

        // Load from storage
        this._loadFromStorage();
    }

    async _loadFromStorage() {
        try {
            const [config, prefs] = await Promise.all([
                workflowDaddy.storage.getConfig(),
                workflowDaddy.storage.getPreferences()
            ]);

            // Check onboarding status
            this.currentView = config.onboarded ? 'main' : 'onboarding';

            // Apply background appearance (color + transparency)
            this.applyBackgroundAppearance(
                prefs.backgroundColor ?? '#1e1e1e',
                prefs.backgroundTransparency ?? 0.8
            );

            // Load preferences
            this.selectedProfile = prefs.selectedProfile || 'interview';
            this.selectedLanguage = prefs.selectedLanguage || 'en-US';
            this.selectedScreenshotInterval = prefs.selectedScreenshotInterval || '5';
            this.selectedImageQuality = prefs.selectedImageQuality || 'medium';
            this.layoutMode = config.layout || 'normal';

            this._storageLoaded = true;
            this.updateLayoutMode();
            this.requestUpdate();
        } catch (error) {
            console.error('Error loading from storage:', error);
            this._storageLoaded = true;
            this.requestUpdate();
        }
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 30, g: 30, b: 30 };
    }

    lightenColor(rgb, amount) {
        return {
            r: Math.min(255, rgb.r + amount),
            g: Math.min(255, rgb.g + amount),
            b: Math.min(255, rgb.b + amount)
        };
    }

    applyBackgroundAppearance(backgroundColor, alpha) {
        const root = document.documentElement;
        const baseRgb = this.hexToRgb(backgroundColor);

        // Generate color variants based on the base color
        const secondary = this.lightenColor(baseRgb, 7);
        const tertiary = this.lightenColor(baseRgb, 15);
        const hover = this.lightenColor(baseRgb, 20);

        root.style.setProperty('--header-background', `rgba(${baseRgb.r}, ${baseRgb.g}, ${baseRgb.b}, ${alpha})`);
        root.style.setProperty('--main-content-background', `rgba(${baseRgb.r}, ${baseRgb.g}, ${baseRgb.b}, ${alpha})`);
        root.style.setProperty('--bg-primary', `rgba(${baseRgb.r}, ${baseRgb.g}, ${baseRgb.b}, ${alpha})`);
        root.style.setProperty('--bg-secondary', `rgba(${secondary.r}, ${secondary.g}, ${secondary.b}, ${alpha})`);
        root.style.setProperty('--bg-tertiary', `rgba(${tertiary.r}, ${tertiary.g}, ${tertiary.b}, ${alpha})`);
        root.style.setProperty('--bg-hover', `rgba(${hover.r}, ${hover.g}, ${hover.b}, ${alpha})`);
        root.style.setProperty('--input-background', `rgba(${tertiary.r}, ${tertiary.g}, ${tertiary.b}, ${alpha})`);
        root.style.setProperty('--input-focus-background', `rgba(${tertiary.r}, ${tertiary.g}, ${tertiary.b}, ${alpha})`);
        root.style.setProperty('--hover-background', `rgba(${hover.r}, ${hover.g}, ${hover.b}, ${alpha})`);
        root.style.setProperty('--scrollbar-background', `rgba(${baseRgb.r}, ${baseRgb.g}, ${baseRgb.b}, ${alpha})`);
    }

    // Keep old function name for backwards compatibility
    applyBackgroundTransparency(alpha) {
        this.applyBackgroundAppearance('#1e1e1e', alpha);
    }

    connectedCallback() {
        super.connectedCallback();

        // Apply layout mode to document root
        this.updateLayoutMode();

        // Set up IPC listeners if needed
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.on('new-response', (_, response) => {
                this.addNewResponse(response);
            });
            ipcRenderer.on('update-response', (_, response) => {
                this.updateCurrentResponse(response);
            });
            ipcRenderer.on('update-status', (_, status) => {
                this.setStatus(status);
            });
            ipcRenderer.on('click-through-toggled', (_, isEnabled) => {
                this._isClickThrough = isEnabled;
            });
            ipcRenderer.on('reconnect-failed', (_, data) => {
                this.addNewResponse(data.message);
            });

            // Mode switching
            ipcRenderer.on('mode:change', (_, mode) => {
                this.windowMode = mode;
                if (mode === 'observation') {
                    this.currentView = 'observation';
                }
            });

            // Navigate to settings (from tray or Cmd+, shortcut)
            ipcRenderer.on('navigate-to-settings', () => {
                this.currentView = 'customize';
                this.requestUpdate();
            });

            // Tray pause/resume events
            ipcRenderer.on('tray:pause-recording', async () => {
                try {
                    await ipcRenderer.invoke('session:pause', 'user_requested');
                    this.isPaused = true;
                } catch (error) {
                    console.error('Error pausing from tray:', error);
                }
            });

            ipcRenderer.on('tray:resume-recording', async () => {
                try {
                    const sessionResult = await ipcRenderer.invoke('session:get-current');
                    if (sessionResult.success && sessionResult.data) {
                        await ipcRenderer.invoke('session:resume', sessionResult.data.id);
                        this.isPaused = false;
                    }
                } catch (error) {
                    console.error('Error resuming from tray:', error);
                }
            });

            // Tray export docs
            ipcRenderer.on('tray:export-docs', async () => {
                try {
                    const profileId = this.selectedProfile;
                    await ipcRenderer.invoke('documentation:generate', profileId);
                } catch (error) {
                    console.error('Error exporting docs from tray:', error);
                }
            });

            // Task detection events for observation view
            ipcRenderer.on('taskdetection:task-started', (_, task) => {
                this.currentTask = task.name || 'New task';
            });
            ipcRenderer.on('taskdetection:task-named', (_, task) => {
                this.currentTask = task.name || this.currentTask;
            });
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.removeAllListeners('new-response');
            ipcRenderer.removeAllListeners('update-response');
            ipcRenderer.removeAllListeners('update-status');
            ipcRenderer.removeAllListeners('click-through-toggled');
            ipcRenderer.removeAllListeners('reconnect-failed');
            ipcRenderer.removeAllListeners('mode:change');
            ipcRenderer.removeAllListeners('navigate-to-settings');
            ipcRenderer.removeAllListeners('tray:pause-recording');
            ipcRenderer.removeAllListeners('tray:resume-recording');
            ipcRenderer.removeAllListeners('tray:export-docs');
            ipcRenderer.removeAllListeners('taskdetection:task-started');
            ipcRenderer.removeAllListeners('taskdetection:task-named');
        }
    }

    setStatus(text) {
        this.statusText = text;

        // Mark response as complete when we get certain status messages
        if (text.includes('Ready') || text.includes('Listening') || text.includes('Error')) {
            this._currentResponseIsComplete = true;
            console.log('[setStatus] Marked current response as complete');
        }
    }

    addNewResponse(response) {
        // Add a new response entry (first word of a new AI response)
        this.responses = [...this.responses, response];
        this.currentResponseIndex = this.responses.length - 1;
        this._awaitingNewResponse = false;
        console.log('[addNewResponse] Added:', response);
        this.requestUpdate();
    }

    updateCurrentResponse(response) {
        // Update the current response in place (streaming subsequent words)
        if (this.responses.length > 0) {
            this.responses = [...this.responses.slice(0, -1), response];
            console.log('[updateCurrentResponse] Updated to:', response);
        } else {
            // Fallback: if no responses exist, add as new
            this.addNewResponse(response);
        }
        this.requestUpdate();
    }

    // Header event handlers
    handleCustomizeClick() {
        this.currentView = 'customize';
        this.requestUpdate();
    }

    handleHelpClick() {
        this.currentView = 'help';
        this.requestUpdate();
    }

    handleHistoryClick() {
        this.currentView = 'history';
        this.requestUpdate();
    }

    async handleClose() {
        if (this.currentView === 'customize' || this.currentView === 'help' || this.currentView === 'history') {
            this.currentView = 'main';
        } else {
            // Quit the entire application
            if (window.require) {
                const { ipcRenderer } = window.require('electron');
                await ipcRenderer.invoke('quit-application');
            }
        }
    }

    async handleHideToggle() {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('toggle-window-visibility');
        }
    }

    // Main view event handlers
    async handleStart() {
        // check if api key is empty do nothing
        const apiKey = await workflowDaddy.storage.getApiKey();
        if (!apiKey || apiKey === '') {
            // Trigger the red blink animation on the API key input
            const mainView = this.shadowRoot.querySelector('main-view');
            if (mainView && mainView.triggerApiKeyError) {
                mainView.triggerApiKeyError();
            }
            return;
        }

        // Check if interview profile and not yet completed
        if (this.selectedProfile === 'interview') {
            const hasCompleted = await workflowDaddy.interview.hasCompleted(this.selectedProfile);
            if (!hasCompleted) {
                this.currentView = 'interview';
                return;
            }
        }

        // Start observation mode (interview already completed or different profile)
        await this._startObservationMode();
    }

    async _startObservationMode() {
        // Initialize Gemini
        await workflowDaddy.initializeGemini(this.selectedProfile, this.selectedLanguage);

        // Start session (automatically loads interview summary as baseline if available)
        const session = await workflowDaddy.session.start(this.selectedProfile);

        // Start screen capture
        workflowDaddy.startCapture(this.selectedScreenshotInterval, this.selectedImageQuality);

        // Reset response tracking
        this.responses = [];
        this.currentResponseIndex = -1;
        this.startTime = Date.now();

        // Switch to observation view
        this.currentView = 'observation';
    }

    handleInterviewComplete(event) {
        console.log('Interview completed:', event.detail);
        // Show transition view explaining what happens next
        this.currentView = 'transition';
    }

    async handleStartObserving() {
        // Start observation mode and minimize to tray
        await this._startObservationMode();

        // Minimize window to tray
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.send('minimize-to-tray');
        }
    }

    async handleAddMoreContext() {
        // Re-open interview view to add more context
        this.currentView = 'interview';
    }

    async handleAPIKeyHelp() {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('open-external', 'https://workflowdaddy.com/help/api-key');
        }
    }

    // Customize view event handlers
    async handleProfileChange(profile) {
        this.selectedProfile = profile;
        await workflowDaddy.storage.updatePreference('selectedProfile', profile);
    }

    async handleLanguageChange(language) {
        this.selectedLanguage = language;
        await workflowDaddy.storage.updatePreference('selectedLanguage', language);
    }

    async handleScreenshotIntervalChange(interval) {
        this.selectedScreenshotInterval = interval;
        await workflowDaddy.storage.updatePreference('selectedScreenshotInterval', interval);
    }

    async handleImageQualityChange(quality) {
        this.selectedImageQuality = quality;
        await workflowDaddy.storage.updatePreference('selectedImageQuality', quality);
    }

    handleBackClick() {
        // If we were in observation mode and user goes to settings, going back should return to observation
        if (this.windowMode === 'observation' || this.windowMode === 'hub') {
            this.currentView = 'main';
        } else {
            this.currentView = 'main';
        }
        this.requestUpdate();
    }

    async handleSwitchToObservation() {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('window:switch-mode', 'observation');
        }
    }

    async handleObservationHide() {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('window:switch-mode', 'hidden');
        }
    }

    async handleObservationSettings() {
        // Switch back to hub mode to show settings
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('window:switch-mode', 'hub');
        }
        this.currentView = 'customize';
        this.requestUpdate();
    }

    async handleObservationPause() {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('session:pause', 'user_requested');
            this.isPaused = true;
        }
    }

    async handleObservationResume() {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            const sessionResult = await ipcRenderer.invoke('session:get-current');
            if (sessionResult.success && sessionResult.data) {
                await ipcRenderer.invoke('session:resume', sessionResult.data.id);
                this.isPaused = false;
            }
        }
    }

    // Help view event handlers
    async handleExternalLinkClick(url) {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('open-external', url);
        }
    }

    // Documentation preview handlers
    handleDocumentationPreview() {
        this._previousView = this.currentView;
        this.currentView = 'documentation-preview';
        this.requestUpdate();
    }

    handleBackFromPreview() {
        this.currentView = this._previousView || 'main';
        this._previousView = null;
        this.requestUpdate();
    }

    // Onboarding event handlers
    handleOnboardingComplete() {
        this.currentView = 'main';
    }

    updated(changedProperties) {
        super.updated(changedProperties);

        // Only notify main process of view change if the view actually changed
        if (changedProperties.has('currentView') && window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.send('view-changed', this.currentView);

            // Add a small delay to smooth out the transition
            const viewContainer = this.shadowRoot?.querySelector('.view-container');
            if (viewContainer) {
                viewContainer.classList.add('entering');
                requestAnimationFrame(() => {
                    viewContainer.classList.remove('entering');
                });
            }
        }

        if (changedProperties.has('layoutMode')) {
            this.updateLayoutMode();
        }
    }

    renderCurrentView() {
        // Only re-render the view if it hasn't been cached or if critical properties changed
        const viewKey = `${this.currentView}-${this.selectedProfile}-${this.selectedLanguage}`;

        switch (this.currentView) {
            case 'onboarding':
                return html`
                    <onboarding-view .onComplete=${() => this.handleOnboardingComplete()} .onClose=${() => this.handleClose()}></onboarding-view>
                `;

            case 'interview':
                return html`
                    <interview-view
                        .onComplete=${(data) => this.handleInterviewComplete(data)}
                        @interview-complete=${e => this.handleInterviewComplete(e)}
                    ></interview-view>
                `;

            case 'transition':
                return html`
                    <transition-view
                        .onStart=${() => this.handleStartObserving()}
                    ></transition-view>
                `;

            case 'main':
                return html`
                    <main-view
                        .onStart=${() => this.handleStart()}
                        .onAPIKeyHelp=${() => this.handleAPIKeyHelp()}
                        .onLayoutModeChange=${layoutMode => this.handleLayoutModeChange(layoutMode)}
                    ></main-view>
                `;

            case 'customize':
                return html`
                    <customize-view
                        .selectedProfile=${this.selectedProfile}
                        .selectedLanguage=${this.selectedLanguage}
                        .selectedScreenshotInterval=${this.selectedScreenshotInterval}
                        .selectedImageQuality=${this.selectedImageQuality}
                        .layoutMode=${this.layoutMode}
                        .onProfileChange=${profile => this.handleProfileChange(profile)}
                        .onLanguageChange=${language => this.handleLanguageChange(language)}
                        .onScreenshotIntervalChange=${interval => this.handleScreenshotIntervalChange(interval)}
                        .onImageQualityChange=${quality => this.handleImageQualityChange(quality)}
                        .onLayoutModeChange=${layoutMode => this.handleLayoutModeChange(layoutMode)}
                    ></customize-view>
                `;

            case 'help':
                return html` <help-view .onExternalLinkClick=${url => this.handleExternalLinkClick(url)}></help-view> `;

            case 'history':
                return html`
                    <history-view
                        .onPreview=${() => this.handleDocumentationPreview()}
                    ></history-view>
                `;

            case 'observation':
                return html`
                    <observation-view
                        .isRecording=${this.sessionActive}
                        .isPaused=${this.isPaused}
                        .startTime=${this.startTime}
                        .currentTask=${this.currentTask}
                        .onHide=${() => this.handleObservationHide()}
                        .onSettings=${() => this.handleObservationSettings()}
                        .onPause=${() => this.handleObservationPause()}
                        .onResume=${() => this.handleObservationResume()}
                        .onPreview=${() => this.handleDocumentationPreview()}
                    ></observation-view>
                `;

            case 'documentation-preview':
                return html`
                    <documentation-preview-view
                        .profileId=${this.selectedProfile}
                        .onBack=${() => this.handleBackFromPreview()}
                    ></documentation-preview-view>
                `;

            default:
                return html`<div>Unknown view: ${this.currentView}</div>`;
        }
    }

    render() {
        const viewClassMap = {
            'onboarding': 'onboarding-view',
            'customize': 'settings-view',
            'help': 'help-view',
            'history': 'history-view',
            'observation': 'observation-view',
            'documentation-preview': 'history-view',
        };
        const mainContentClass = `main-content ${viewClassMap[this.currentView] || 'with-border'}`;

        const showHeader = this.currentView !== 'observation';

        return html`
            <div class="window-container">
                <div class="container">
                    ${showHeader ? html`
                        <app-header
                            .currentView=${this.currentView}
                            .statusText=${this.statusText}
                            .startTime=${this.startTime}
                            .onCustomizeClick=${() => this.handleCustomizeClick()}
                            .onHelpClick=${() => this.handleHelpClick()}
                            .onHistoryClick=${() => this.handleHistoryClick()}
                            .onCloseClick=${() => this.handleClose()}
                            .onBackClick=${() => this.handleBackClick()}
                            .onHideToggleClick=${() => this.handleHideToggle()}
                            ?isClickThrough=${this._isClickThrough}
                        ></app-header>
                    ` : ''}
                    <div class="${mainContentClass}">
                        <div class="view-container">${this.renderCurrentView()}</div>
                    </div>
                </div>
                <!-- Question Overlay for confusion detection -->
                <question-overlay></question-overlay>
            </div>
        `;
    }

    updateLayoutMode() {
        // Apply or remove compact layout class to document root
        if (this.layoutMode === 'compact') {
            document.documentElement.classList.add('compact-layout');
        } else {
            document.documentElement.classList.remove('compact-layout');
        }
    }

    async handleLayoutModeChange(layoutMode) {
        this.layoutMode = layoutMode;
        await workflowDaddy.storage.updateConfig('layout', layoutMode);
        this.updateLayoutMode();

        // Notify main process about layout change for window resizing
        if (window.require) {
            try {
                const { ipcRenderer } = window.require('electron');
                await ipcRenderer.invoke('update-sizes');
            } catch (error) {
                console.error('Failed to update sizes in main process:', error);
            }
        }

        this.requestUpdate();
    }
}

customElements.define('workflow-daddy-app', WorkflowDaddyApp);
