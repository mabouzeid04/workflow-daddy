// renderer.js
const { ipcRenderer } = require('electron');

let mediaStream = null;
let screenshotInterval = null;

let hiddenVideo = null;
let offscreenCanvas = null;
let offscreenContext = null;
let currentImageQuality = 'medium'; // Store current image quality for manual screenshots

const isLinux = process.platform === 'linux';
const isMacOS = process.platform === 'darwin';

// ============ STORAGE API ============
// Wrapper for IPC-based storage access
const storage = {
    // Config
    async getConfig() {
        const result = await ipcRenderer.invoke('storage:get-config');
        return result.success ? result.data : {};
    },
    async setConfig(config) {
        return ipcRenderer.invoke('storage:set-config', config);
    },
    async updateConfig(key, value) {
        return ipcRenderer.invoke('storage:update-config', key, value);
    },

    // Credentials
    async getCredentials() {
        const result = await ipcRenderer.invoke('storage:get-credentials');
        return result.success ? result.data : {};
    },
    async setCredentials(credentials) {
        return ipcRenderer.invoke('storage:set-credentials', credentials);
    },
    async getApiKey() {
        const result = await ipcRenderer.invoke('storage:get-api-key');
        return result.success ? result.data : '';
    },
    async setApiKey(apiKey) {
        return ipcRenderer.invoke('storage:set-api-key', apiKey);
    },

    // Preferences
    async getPreferences() {
        const result = await ipcRenderer.invoke('storage:get-preferences');
        return result.success ? result.data : {};
    },
    async setPreferences(preferences) {
        return ipcRenderer.invoke('storage:set-preferences', preferences);
    },
    async updatePreference(key, value) {
        return ipcRenderer.invoke('storage:update-preference', key, value);
    },

    // Keybinds
    async getKeybinds() {
        const result = await ipcRenderer.invoke('storage:get-keybinds');
        return result.success ? result.data : null;
    },
    async setKeybinds(keybinds) {
        return ipcRenderer.invoke('storage:set-keybinds', keybinds);
    },

    // Sessions (History)
    async getAllSessions() {
        const result = await ipcRenderer.invoke('storage:get-all-sessions');
        return result.success ? result.data : [];
    },
    async getSession(sessionId) {
        const result = await ipcRenderer.invoke('storage:get-session', sessionId);
        return result.success ? result.data : null;
    },
    async saveSession(sessionId, data) {
        return ipcRenderer.invoke('storage:save-session', sessionId, data);
    },
    async deleteSession(sessionId) {
        return ipcRenderer.invoke('storage:delete-session', sessionId);
    },
    async deleteAllSessions() {
        return ipcRenderer.invoke('storage:delete-all-sessions');
    },

    // Clear all
    async clearAll() {
        return ipcRenderer.invoke('storage:clear-all');
    },

    // Limits
    async getTodayLimits() {
        const result = await ipcRenderer.invoke('storage:get-today-limits');
        return result.success ? result.data : { flash: { count: 0 }, flashLite: { count: 0 } };
    }
};

// ============ CAPTURE API ============
// Wrapper for capture-related IPC calls
const captureApi = {
    // Capture Config
    async getConfig() {
        const result = await ipcRenderer.invoke('capture:get-config');
        return result.success ? result.data : {};
    },
    async setConfig(config) {
        return ipcRenderer.invoke('capture:set-config', config);
    },
    async updateConfig(key, value) {
        return ipcRenderer.invoke('capture:update-config', key, value);
    },

    // Capture Service
    async start(sessionId, config) {
        return ipcRenderer.invoke('capture:start', sessionId, config);
    },
    async stop() {
        return ipcRenderer.invoke('capture:stop');
    },
    async getState() {
        const result = await ipcRenderer.invoke('capture:get-state');
        return result.success ? result.data : { isCapturing: false };
    },

    // Active Window
    async getActiveWindow() {
        const result = await ipcRenderer.invoke('capture:get-active-window');
        return result.success ? result.data : { app: 'Unknown', title: 'Unknown' };
    },

    // Screenshot Metadata
    async saveScreenshotMetadata(sessionId, metadata) {
        return ipcRenderer.invoke('capture:save-screenshot-metadata', sessionId, metadata);
    },
    async getSessionScreenshots(sessionId) {
        const result = await ipcRenderer.invoke('capture:get-session-screenshots', sessionId);
        return result.success ? result.data : [];
    },

    // App Usage
    async saveAppUsage(sessionId, record) {
        return ipcRenderer.invoke('capture:save-app-usage', sessionId, record);
    },
    async getAppUsage(sessionId) {
        const result = await ipcRenderer.invoke('capture:get-app-usage', sessionId);
        return result.success ? result.data : [];
    },

    // Event listeners
    onScreenshotCaptured(callback) {
        ipcRenderer.on('capture:screenshot-captured', (event, metadata) => callback(metadata));
    },
    onAppSwitched(callback) {
        ipcRenderer.on('capture:app-switched', (event, data) => callback(data));
    },
    onCaptureStarted(callback) {
        ipcRenderer.on('capture:started', (event, data) => callback(data));
    },
    onCaptureStopped(callback) {
        ipcRenderer.on('capture:stopped', (event, data) => callback(data));
    }
};

// ============ INTERVIEW API ============
// Wrapper for interview-related IPC calls
const interviewApi = {
    // Session management
    async start(profileId) {
        const result = await ipcRenderer.invoke('interview:start', profileId);
        return result.success ? result.data : null;
    },
    async sendMessage(userMessage) {
        const result = await ipcRenderer.invoke('interview:send-message', userMessage);
        return result.success ? result.data : null;
    },
    async skipQuestion() {
        const result = await ipcRenderer.invoke('interview:skip-question');
        return result.success ? result.data : null;
    },
    async complete() {
        const result = await ipcRenderer.invoke('interview:complete');
        return result.success ? result.data : null;
    },
    async getCurrentSession() {
        const result = await ipcRenderer.invoke('interview:get-current-session');
        return result.success ? result.data : null;
    },
    async resume(profileId) {
        const result = await ipcRenderer.invoke('interview:resume', profileId);
        return result.success ? result.data : null;
    },
    async clear() {
        return ipcRenderer.invoke('interview:clear');
    },

    // Storage
    async getSession(profileId) {
        const result = await ipcRenderer.invoke('interview:get-session', profileId);
        return result.success ? result.data : null;
    },
    async getSummary(profileId) {
        const result = await ipcRenderer.invoke('interview:get-summary', profileId);
        return result.success ? result.data : null;
    },
    async hasCompleted(profileId) {
        const result = await ipcRenderer.invoke('interview:has-completed', profileId);
        return result.success ? result.data : false;
    },

    // Event listeners
    onStarted(callback) {
        ipcRenderer.on('interview:started', (event, data) => callback(data));
    },
    onMessage(callback) {
        ipcRenderer.on('interview:message', (event, message) => callback(message));
    },
    onCompleted(callback) {
        ipcRenderer.on('interview:completed', (event, data) => callback(data));
    },
    onReadyForObservation(callback) {
        ipcRenderer.on('interview:ready-for-observation', (event, data) => callback(data));
    }
};

// ============ PROFILES API ============
// Wrapper for profile-related IPC calls
const profilesApi = {
    async getAll() {
        const result = await ipcRenderer.invoke('profiles:get-all');
        return result.success ? result.data : [];
    },
    async delete(profileId) {
        return ipcRenderer.invoke('profiles:delete', profileId);
    }
};

// ============ CONFUSION API ============
// Wrapper for confusion detection IPC calls
const confusionApi = {
    // Lifecycle
    async init(sessionId, config) {
        const result = await ipcRenderer.invoke('confusion:init', sessionId, config);
        return result.success ? result.data : null;
    },
    async clear() {
        return ipcRenderer.invoke('confusion:clear');
    },

    // Analysis
    async analyze(screenshotImages) {
        const result = await ipcRenderer.invoke('confusion:analyze', screenshotImages);
        return result.success ? result.data : null;
    },
    async runCheck(screenshotImages) {
        const result = await ipcRenderer.invoke('confusion:run-check', screenshotImages);
        return result.success ? result.data : null;
    },

    // Rate Limiting
    async canAsk(sessionId) {
        const result = await ipcRenderer.invoke('confusion:can-ask', sessionId);
        return result.success ? result.data : false;
    },
    async getQuestionCount(sessionId, windowMinutes) {
        const result = await ipcRenderer.invoke('confusion:get-question-count', sessionId, windowMinutes);
        return result.success ? result.data : 0;
    },

    // Question Management
    async answerQuestion(questionId, answer) {
        const result = await ipcRenderer.invoke('confusion:answer-question', questionId, answer);
        return result.success ? result.data : null;
    },
    async dismissQuestion(questionId) {
        const result = await ipcRenderer.invoke('confusion:dismiss-question', questionId);
        return result.success ? result.data : null;
    },
    async deferQuestion(questionId) {
        const result = await ipcRenderer.invoke('confusion:defer-question', questionId);
        return result.success ? result.data : null;
    },
    async getCurrentQuestion() {
        const result = await ipcRenderer.invoke('confusion:get-current-question');
        return result.success ? result.data : null;
    },
    async getPendingQuestions() {
        const result = await ipcRenderer.invoke('confusion:get-pending-questions');
        return result.success ? result.data : [];
    },
    async getDeferredQuestions() {
        const result = await ipcRenderer.invoke('confusion:get-deferred-questions');
        return result.success ? result.data : [];
    },
    async getSessionQuestions() {
        const result = await ipcRenderer.invoke('confusion:get-session-questions');
        return result.success ? result.data : [];
    },
    async getQAForDocs() {
        const result = await ipcRenderer.invoke('confusion:get-qa-for-docs');
        return result.success ? result.data : [];
    },

    // Event listeners
    onQuestionCreated(callback) {
        ipcRenderer.on('confusion:question-created', (event, question) => callback(question));
    },
    onQuestionAnswered(callback) {
        ipcRenderer.on('confusion:question-answered', (event, question) => callback(question));
    },
    onQuestionDismissed(callback) {
        ipcRenderer.on('confusion:question-dismissed', (event, question) => callback(question));
    },
    onQuestionDeferred(callback) {
        ipcRenderer.on('confusion:question-deferred', (event, question) => callback(question));
    }
};

// ============ CONTEXT API ============
// Wrapper for context management IPC calls
const contextApi = {
    // Session Lifecycle
    async startSession(sessionId, profileId) {
        const result = await ipcRenderer.invoke('context:start-session', sessionId, profileId);
        return result.success ? result.data : null;
    },
    async endSession() {
        const result = await ipcRenderer.invoke('context:end-session');
        return result.success ? result.data : null;
    },
    async clear() {
        return ipcRenderer.invoke('context:clear');
    },

    // Immediate Context
    async updateImmediate(screenshot) {
        const result = await ipcRenderer.invoke('context:update-immediate', screenshot);
        return result.success ? result.data : null;
    },
    async getImmediate() {
        const result = await ipcRenderer.invoke('context:get-immediate');
        return result.success ? result.data : null;
    },

    // Session Context
    async updateSession(observationEvent) {
        const result = await ipcRenderer.invoke('context:update-session', observationEvent);
        return result.success ? result.data : null;
    },
    async getSession() {
        const result = await ipcRenderer.invoke('context:get-session');
        return result.success ? result.data : null;
    },
    async addQuestion(question) {
        return ipcRenderer.invoke('context:add-question', question);
    },
    async wasQuestionAsked(question) {
        const result = await ipcRenderer.invoke('context:was-question-asked', question);
        return result.success ? result.data : false;
    },
    async updateTaskTheory(theory) {
        return ipcRenderer.invoke('context:update-task-theory', theory);
    },

    // Session Summarization
    async shouldUpdateSummary() {
        const result = await ipcRenderer.invoke('context:should-update-summary');
        return result.success ? result.data : false;
    },
    async generateSummary() {
        const result = await ipcRenderer.invoke('context:generate-summary');
        return result.success ? result.data : null;
    },

    // Historical Context
    async loadHistorical(profileId) {
        const result = await ipcRenderer.invoke('context:load-historical', profileId);
        return result.success ? result.data : null;
    },
    async getHistorical() {
        const result = await ipcRenderer.invoke('context:get-historical');
        return result.success ? result.data : null;
    },
    async getRelevantHistory(currentActivity) {
        const result = await ipcRenderer.invoke('context:get-relevant-history', currentActivity);
        return result.success ? result.data : '';
    },

    // Context Assembly
    async assemble() {
        const result = await ipcRenderer.invoke('context:assemble');
        return result.success ? result.data : null;
    },
    async getForLLM() {
        const result = await ipcRenderer.invoke('context:get-for-llm');
        return result.success ? result.data : '';
    },

    // Session Summaries
    async getSessionSummaries(profileId, limit = 10) {
        const result = await ipcRenderer.invoke('context:get-session-summaries', profileId, limit);
        return result.success ? result.data : [];
    },

    // Event listeners
    onImmediateUpdated(callback) {
        ipcRenderer.on('context:immediate-updated', (event, data) => callback(data));
    },
    onSessionUpdated(callback) {
        ipcRenderer.on('context:session-updated', (event, data) => callback(data));
    },
    onSummaryGenerated(callback) {
        ipcRenderer.on('context:summary-generated', (event, data) => callback(data));
    }
};

// ============ SESSION API ============
// Wrapper for session management IPC calls
const sessionApi = {
    // Initialization
    async initialize() {
        const result = await ipcRenderer.invoke('session:initialize');
        return result.success ? result.data : null;
    },

    // Profile Management
    async createProfile(name) {
        const result = await ipcRenderer.invoke('session:create-profile', name);
        return result.success ? result.data : null;
    },
    async loadProfile(profileId) {
        const result = await ipcRenderer.invoke('session:load-profile', profileId);
        return result.success ? result.data : null;
    },
    async listProfiles() {
        const result = await ipcRenderer.invoke('session:list-profiles');
        return result.success ? result.data : [];
    },
    async getCurrentProfile() {
        const result = await ipcRenderer.invoke('session:get-current-profile');
        return result.success ? result.data : null;
    },

    // Session Lifecycle
    async start(profileId) {
        const result = await ipcRenderer.invoke('session:start', profileId);
        return result.success ? result.data : null;
    },
    async pause(reason = 'user') {
        const result = await ipcRenderer.invoke('session:pause', reason);
        return result.success ? result.data : null;
    },
    async resume(sessionId = null) {
        const result = await ipcRenderer.invoke('session:resume', sessionId);
        return result.success ? result.data : null;
    },
    async end() {
        const result = await ipcRenderer.invoke('session:end');
        return result.success ? result.data : null;
    },
    async getCurrent() {
        const result = await ipcRenderer.invoke('session:get-current');
        return result.success ? result.data : null;
    },
    async getStats() {
        const result = await ipcRenderer.invoke('session:get-stats');
        return result.success ? result.data : null;
    },

    // Session Resume (Multi-Day)
    async canResume(sessionData) {
        const result = await ipcRenderer.invoke('session:can-resume', sessionData);
        return result.success ? result.data : false;
    },
    async getResumable(profileId) {
        const result = await ipcRenderer.invoke('session:get-resumable', profileId);
        return result.success ? result.data : null;
    },

    // Crash Recovery
    async checkCrash() {
        const result = await ipcRenderer.invoke('session:check-crash');
        return result.success ? result.data : false;
    },
    async recoverCrash() {
        const result = await ipcRenderer.invoke('session:recover-crash');
        return result.success ? result.data : null;
    },

    // Activity & Idle
    async recordActivity() {
        return ipcRenderer.invoke('session:record-activity');
    },
    async detectIdle() {
        const result = await ipcRenderer.invoke('session:detect-idle');
        return result.success ? result.data : false;
    },

    // Session Stats
    async updateScreenshotCount(count) {
        return ipcRenderer.invoke('session:update-screenshot-count', count);
    },
    async incrementScreenshotCount() {
        return ipcRenderer.invoke('session:increment-screenshot-count');
    },
    async updateTaskCount(count) {
        return ipcRenderer.invoke('session:update-task-count', count);
    },
    async updateQuestionCount(count) {
        return ipcRenderer.invoke('session:update-question-count', count);
    },

    // Configuration
    async getConfig() {
        const result = await ipcRenderer.invoke('session:get-config');
        return result.success ? result.data : {};
    },
    async updateConfig(updates) {
        return ipcRenderer.invoke('session:update-config', updates);
    },

    // App State
    async getAppState() {
        const result = await ipcRenderer.invoke('session:get-app-state');
        return result.success ? result.data : null;
    },

    // Clear State
    async clear() {
        return ipcRenderer.invoke('session:clear');
    },

    // Event listeners
    onStarted(callback) {
        ipcRenderer.on('session:started', (event, data) => callback(data));
    },
    onPaused(callback) {
        ipcRenderer.on('session:paused', (event, data) => callback(data));
    },
    onResumed(callback) {
        ipcRenderer.on('session:resumed', (event, data) => callback(data));
    },
    onEnded(callback) {
        ipcRenderer.on('session:ended', (event, data) => callback(data));
    },
    onIdlePaused(callback) {
        ipcRenderer.on('session:idle-paused', (event, data) => callback(data));
    },
    onAutoResumed(callback) {
        ipcRenderer.on('session:auto-resumed', (event, data) => callback(data));
    },
    onCrashRecovered(callback) {
        ipcRenderer.on('session:crash-recovered', (event, data) => callback(data));
    },
    onProfileCreated(callback) {
        ipcRenderer.on('session:profile-created', (event, data) => callback(data));
    },
    onProfileLoaded(callback) {
        ipcRenderer.on('session:profile-loaded', (event, data) => callback(data));
    }
};

// Cache for preferences to avoid async calls in hot paths
let preferencesCache = null;

async function loadPreferencesCache() {
    preferencesCache = await storage.getPreferences();
    return preferencesCache;
}

// Initialize preferences cache
loadPreferencesCache();

async function initializeGemini(profile = 'interview', language = 'en-US') {
    const apiKey = await storage.getApiKey();
    if (apiKey) {
        const prefs = await storage.getPreferences();
        const success = await ipcRenderer.invoke('initialize-gemini', apiKey, prefs.customPrompt || '', profile, language);
        if (success) {
            workflowDaddy.setStatus('Live');
        } else {
            workflowDaddy.setStatus('error');
        }
    }
}

// Listen for status updates
ipcRenderer.on('update-status', (event, status) => {
    console.log('Status update:', status);
    workflowDaddy.setStatus(status);
});

async function startCapture(screenshotIntervalSeconds = 5, imageQuality = 'medium') {
    // Store the image quality for manual screenshots
    currentImageQuality = imageQuality;

    try {
        // Get screen capture for screenshots (video only, no audio)
        mediaStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
                frameRate: 1,
                width: { ideal: 1920 },
                height: { ideal: 1080 },
            },
            audio: false,
        });

        console.log('Screen capture started');

        console.log('MediaStream obtained:', {
            hasVideo: mediaStream.getVideoTracks().length > 0,
            videoTrack: mediaStream.getVideoTracks()[0]?.getSettings(),
        });

        // Manual mode only - screenshots captured on demand via shortcut
        console.log('Manual mode enabled - screenshots will be captured on demand only');
    } catch (err) {
        console.error('Error starting capture:', err);
        workflowDaddy.setStatus('error');
    }
}

async function captureScreenshot(imageQuality = 'medium', isManual = false) {
    console.log(`Capturing ${isManual ? 'manual' : 'automated'} screenshot...`);
    if (!mediaStream) return;

    // Lazy init of video element
    if (!hiddenVideo) {
        hiddenVideo = document.createElement('video');
        hiddenVideo.srcObject = mediaStream;
        hiddenVideo.muted = true;
        hiddenVideo.playsInline = true;
        await hiddenVideo.play();

        await new Promise(resolve => {
            if (hiddenVideo.readyState >= 2) return resolve();
            hiddenVideo.onloadedmetadata = () => resolve();
        });

        // Lazy init of canvas based on video dimensions
        offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = hiddenVideo.videoWidth;
        offscreenCanvas.height = hiddenVideo.videoHeight;
        offscreenContext = offscreenCanvas.getContext('2d');
    }

    // Check if video is ready
    if (hiddenVideo.readyState < 2) {
        console.warn('Video not ready yet, skipping screenshot');
        return;
    }

    offscreenContext.drawImage(hiddenVideo, 0, 0, offscreenCanvas.width, offscreenCanvas.height);

    // Check if image was drawn properly by sampling a pixel
    const imageData = offscreenContext.getImageData(0, 0, 1, 1);
    const isBlank = imageData.data.every((value, index) => {
        // Check if all pixels are black (0,0,0) or transparent
        return index === 3 ? true : value === 0;
    });

    if (isBlank) {
        console.warn('Screenshot appears to be blank/black');
    }

    let qualityValue;
    switch (imageQuality) {
        case 'high':
            qualityValue = 0.9;
            break;
        case 'medium':
            qualityValue = 0.7;
            break;
        case 'low':
            qualityValue = 0.5;
            break;
        default:
            qualityValue = 0.7; // Default to medium
    }

    offscreenCanvas.toBlob(
        async blob => {
            if (!blob) {
                console.error('Failed to create blob from canvas');
                return;
            }

            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64data = reader.result.split(',')[1];

                // Validate base64 data
                if (!base64data || base64data.length < 100) {
                    console.error('Invalid base64 data generated');
                    return;
                }

                const result = await ipcRenderer.invoke('send-image-content', {
                    data: base64data,
                });

                if (result.success) {
                    console.log(`Image sent successfully (${offscreenCanvas.width}x${offscreenCanvas.height})`);
                } else {
                    console.error('Failed to send image:', result.error);
                }
            };
            reader.readAsDataURL(blob);
        },
        'image/jpeg',
        qualityValue
    );
}

const MANUAL_SCREENSHOT_PROMPT = `Help me on this page, give me the answer no bs, complete answer.
So if its a code question, give me the approach in few bullet points, then the entire code. Also if theres anything else i need to know, tell me.
If its a question about the website, give me the answer no bs, complete answer.
If its a mcq question, give me the answer no bs, complete answer.`;

async function captureManualScreenshot(imageQuality = null) {
    console.log('Manual screenshot triggered');
    const quality = imageQuality || currentImageQuality;

    if (!mediaStream) {
        console.error('No media stream available');
        return;
    }

    // Lazy init of video element
    if (!hiddenVideo) {
        hiddenVideo = document.createElement('video');
        hiddenVideo.srcObject = mediaStream;
        hiddenVideo.muted = true;
        hiddenVideo.playsInline = true;
        await hiddenVideo.play();

        await new Promise(resolve => {
            if (hiddenVideo.readyState >= 2) return resolve();
            hiddenVideo.onloadedmetadata = () => resolve();
        });

        // Lazy init of canvas based on video dimensions
        offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = hiddenVideo.videoWidth;
        offscreenCanvas.height = hiddenVideo.videoHeight;
        offscreenContext = offscreenCanvas.getContext('2d');
    }

    // Check if video is ready
    if (hiddenVideo.readyState < 2) {
        console.warn('Video not ready yet, skipping screenshot');
        return;
    }

    offscreenContext.drawImage(hiddenVideo, 0, 0, offscreenCanvas.width, offscreenCanvas.height);

    let qualityValue;
    switch (quality) {
        case 'high':
            qualityValue = 0.9;
            break;
        case 'medium':
            qualityValue = 0.7;
            break;
        case 'low':
            qualityValue = 0.5;
            break;
        default:
            qualityValue = 0.7;
    }

    offscreenCanvas.toBlob(
        async blob => {
            if (!blob) {
                console.error('Failed to create blob from canvas');
                return;
            }

            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64data = reader.result.split(',')[1];

                if (!base64data || base64data.length < 100) {
                    console.error('Invalid base64 data generated');
                    return;
                }

                // Send image with prompt to HTTP API (response streams via IPC events)
                const result = await ipcRenderer.invoke('send-image-content', {
                    data: base64data,
                    prompt: MANUAL_SCREENSHOT_PROMPT,
                });

                if (result.success) {
                    console.log(`Image response completed from ${result.model}`);
                    // Response already displayed via streaming events (new-response/update-response)
                } else {
                    console.error('Failed to get image response:', result.error);
                    workflowDaddy.addNewResponse(`Error: ${result.error}`);
                }
            };
            reader.readAsDataURL(blob);
        },
        'image/jpeg',
        qualityValue
    );
}

// Expose functions to global scope for external access
window.captureManualScreenshot = captureManualScreenshot;

function stopCapture() {
    if (screenshotInterval) {
        clearInterval(screenshotInterval);
        screenshotInterval = null;
    }

    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }

    // Clean up hidden elements
    if (hiddenVideo) {
        hiddenVideo.pause();
        hiddenVideo.srcObject = null;
        hiddenVideo = null;
    }
    offscreenCanvas = null;
    offscreenContext = null;
}

// Send text message to Gemini
async function sendTextMessage(text) {
    if (!text || text.trim().length === 0) {
        console.warn('Cannot send empty text message');
        return { success: false, error: 'Empty message' };
    }

    try {
        const result = await ipcRenderer.invoke('send-text-message', text);
        if (result.success) {
            console.log('Text message sent successfully');
        } else {
            console.error('Failed to send text message:', result.error);
        }
        return result;
    } catch (error) {
        console.error('Error sending text message:', error);
        return { success: false, error: error.message };
    }
}

// Listen for conversation data from main process and save to storage
ipcRenderer.on('save-conversation-turn', async (event, data) => {
    try {
        await storage.saveSession(data.sessionId, { conversationHistory: data.fullHistory });
        console.log('Conversation session saved:', data.sessionId);
    } catch (error) {
        console.error('Error saving conversation session:', error);
    }
});

// Listen for session context (profile info) when session starts
ipcRenderer.on('save-session-context', async (event, data) => {
    try {
        await storage.saveSession(data.sessionId, {
            profile: data.profile,
            customPrompt: data.customPrompt
        });
        console.log('Session context saved:', data.sessionId, 'profile:', data.profile);
    } catch (error) {
        console.error('Error saving session context:', error);
    }
});

// Listen for screen analysis responses (from ctrl+enter)
ipcRenderer.on('save-screen-analysis', async (event, data) => {
    try {
        await storage.saveSession(data.sessionId, {
            screenAnalysisHistory: data.fullHistory,
            profile: data.profile,
            customPrompt: data.customPrompt
        });
        console.log('Screen analysis saved:', data.sessionId);
    } catch (error) {
        console.error('Error saving screen analysis:', error);
    }
});

// Handle shortcuts based on current view
function handleShortcut(shortcutKey) {
    const currentView = workflowDaddy.getCurrentView();

    if (shortcutKey === 'ctrl+enter' || shortcutKey === 'cmd+enter') {
        if (currentView === 'main') {
            workflowDaddy.element().handleStart();
        } else {
            captureManualScreenshot();
        }
    }
}

// Create reference to the main app element
const workflowDaddyApp = document.querySelector('workflow-daddy-app');

// ============ DOCUMENTATION API ============
// Wrapper for documentation generation IPC calls
const documentationApi = {
    // Export documentation to file
    async export(profileId, outputPath = null) {
        const result = await ipcRenderer.invoke('documentation:export', profileId, outputPath);
        return result;
    },

    // Generate documentation (markdown only, no file)
    async generate(profileId) {
        const result = await ipcRenderer.invoke('documentation:generate', profileId);
        return result;
    },

    // Get a short preview
    async preview(profileId) {
        const result = await ipcRenderer.invoke('documentation:preview', profileId);
        return result;
    },

    // Get aggregated data
    async aggregate(profileId) {
        const result = await ipcRenderer.invoke('documentation:aggregate', profileId);
        return result.success ? result.data : null;
    },

    // Infer workflow steps using LLM
    async inferSteps(task, screenshots) {
        const result = await ipcRenderer.invoke('documentation:infer-steps', task, screenshots);
        return result.success ? result.data : [];
    },

    // Event listeners
    onGenerating(callback) {
        ipcRenderer.on('documentation:generating', (event, data) => callback(data));
    },
    onComplete(callback) {
        ipcRenderer.on('documentation:complete', (event, data) => callback(data));
    },
    onExported(callback) {
        ipcRenderer.on('documentation:exported', (event, data) => callback(data));
    }
};

// ============ THEME SYSTEM ============
const theme = {
    themes: {
        dark: {
            background: '#1e1e1e',
            text: '#e0e0e0', textSecondary: '#a0a0a0', textMuted: '#6b6b6b',
            border: '#333333', accent: '#ffffff',
            btnPrimaryBg: '#ffffff', btnPrimaryText: '#000000', btnPrimaryHover: '#e0e0e0',
            tooltipBg: '#1a1a1a', tooltipText: '#ffffff',
            keyBg: 'rgba(255,255,255,0.1)'
        },
        light: {
            background: '#ffffff',
            text: '#1a1a1a', textSecondary: '#555555', textMuted: '#888888',
            border: '#e0e0e0', accent: '#000000',
            btnPrimaryBg: '#1a1a1a', btnPrimaryText: '#ffffff', btnPrimaryHover: '#333333',
            tooltipBg: '#1a1a1a', tooltipText: '#ffffff',
            keyBg: 'rgba(0,0,0,0.1)'
        },
        midnight: {
            background: '#0d1117',
            text: '#c9d1d9', textSecondary: '#8b949e', textMuted: '#6e7681',
            border: '#30363d', accent: '#58a6ff',
            btnPrimaryBg: '#58a6ff', btnPrimaryText: '#0d1117', btnPrimaryHover: '#79b8ff',
            tooltipBg: '#161b22', tooltipText: '#c9d1d9',
            keyBg: 'rgba(88,166,255,0.15)'
        },
        sepia: {
            background: '#f4ecd8',
            text: '#5c4b37', textSecondary: '#7a6a56', textMuted: '#998875',
            border: '#d4c8b0', accent: '#8b4513',
            btnPrimaryBg: '#5c4b37', btnPrimaryText: '#f4ecd8', btnPrimaryHover: '#7a6a56',
            tooltipBg: '#5c4b37', tooltipText: '#f4ecd8',
            keyBg: 'rgba(92,75,55,0.15)'
        },
        nord: {
            background: '#2e3440',
            text: '#eceff4', textSecondary: '#d8dee9', textMuted: '#4c566a',
            border: '#3b4252', accent: '#88c0d0',
            btnPrimaryBg: '#88c0d0', btnPrimaryText: '#2e3440', btnPrimaryHover: '#8fbcbb',
            tooltipBg: '#3b4252', tooltipText: '#eceff4',
            keyBg: 'rgba(136,192,208,0.15)'
        },
        dracula: {
            background: '#282a36',
            text: '#f8f8f2', textSecondary: '#bd93f9', textMuted: '#6272a4',
            border: '#44475a', accent: '#ff79c6',
            btnPrimaryBg: '#ff79c6', btnPrimaryText: '#282a36', btnPrimaryHover: '#ff92d0',
            tooltipBg: '#44475a', tooltipText: '#f8f8f2',
            keyBg: 'rgba(255,121,198,0.15)'
        },
        abyss: {
            background: '#0a0a0a',
            text: '#d4d4d4', textSecondary: '#808080', textMuted: '#505050',
            border: '#1a1a1a', accent: '#ffffff',
            btnPrimaryBg: '#ffffff', btnPrimaryText: '#0a0a0a', btnPrimaryHover: '#d4d4d4',
            tooltipBg: '#141414', tooltipText: '#d4d4d4',
            keyBg: 'rgba(255,255,255,0.08)'
        }
    },

    current: 'dark',

    get(name) {
        return this.themes[name] || this.themes.dark;
    },

    getAll() {
        const names = {
            dark: 'Dark',
            light: 'Light',
            midnight: 'Midnight Blue',
            sepia: 'Sepia',
            nord: 'Nord',
            dracula: 'Dracula',
            abyss: 'Abyss'
        };
        return Object.keys(this.themes).map(key => ({
            value: key,
            name: names[key] || key,
            colors: this.themes[key]
        }));
    },

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 30, g: 30, b: 30 };
    },

    lightenColor(rgb, amount) {
        return {
            r: Math.min(255, rgb.r + amount),
            g: Math.min(255, rgb.g + amount),
            b: Math.min(255, rgb.b + amount)
        };
    },

    darkenColor(rgb, amount) {
        return {
            r: Math.max(0, rgb.r - amount),
            g: Math.max(0, rgb.g - amount),
            b: Math.max(0, rgb.b - amount)
        };
    },

    applyBackgrounds(backgroundColor, alpha = 0.8) {
        const root = document.documentElement;
        const baseRgb = this.hexToRgb(backgroundColor);

        // For light themes, darken; for dark themes, lighten
        const isLight = (baseRgb.r + baseRgb.g + baseRgb.b) / 3 > 128;
        const adjust = isLight ? this.darkenColor.bind(this) : this.lightenColor.bind(this);

        const secondary = adjust(baseRgb, 7);
        const tertiary = adjust(baseRgb, 15);
        const hover = adjust(baseRgb, 20);

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
    },

    apply(themeName, alpha = 0.8) {
        const colors = this.get(themeName);
        this.current = themeName;
        const root = document.documentElement;

        // Text colors
        root.style.setProperty('--text-color', colors.text);
        root.style.setProperty('--text-secondary', colors.textSecondary);
        root.style.setProperty('--text-muted', colors.textMuted);
        // Border colors
        root.style.setProperty('--border-color', colors.border);
        root.style.setProperty('--border-default', colors.accent);
        // Misc
        root.style.setProperty('--placeholder-color', colors.textMuted);
        root.style.setProperty('--scrollbar-thumb', colors.border);
        root.style.setProperty('--scrollbar-thumb-hover', colors.textMuted);
        root.style.setProperty('--key-background', colors.keyBg);
        // Primary button
        root.style.setProperty('--btn-primary-bg', colors.btnPrimaryBg);
        root.style.setProperty('--btn-primary-text', colors.btnPrimaryText);
        root.style.setProperty('--btn-primary-hover', colors.btnPrimaryHover);
        // Start button (same as primary)
        root.style.setProperty('--start-button-background', colors.btnPrimaryBg);
        root.style.setProperty('--start-button-color', colors.btnPrimaryText);
        root.style.setProperty('--start-button-hover-background', colors.btnPrimaryHover);
        // Tooltip
        root.style.setProperty('--tooltip-bg', colors.tooltipBg);
        root.style.setProperty('--tooltip-text', colors.tooltipText);
        // Error color (stays constant)
        root.style.setProperty('--error-color', '#f14c4c');
        root.style.setProperty('--success-color', '#4caf50');

        // Also apply background colors from theme
        this.applyBackgrounds(colors.background, alpha);
    },

    async load() {
        try {
            const prefs = await storage.getPreferences();
            const themeName = prefs.theme || 'dark';
            const alpha = prefs.backgroundTransparency ?? 0.8;
            this.apply(themeName, alpha);
            return themeName;
        } catch (err) {
            this.apply('dark');
            return 'dark';
        }
    },

    async save(themeName) {
        await storage.updatePreference('theme', themeName);
        this.apply(themeName);
    }
};

// ============ WINDOW MODE API ============
const windowModeApi = {
    async switchMode(mode) {
        const result = await ipcRenderer.invoke('window:switch-mode', mode);
        return result.success ? result.mode : null;
    },
    async getMode() {
        const result = await ipcRenderer.invoke('window:get-mode');
        return result.success ? result.mode : 'hub';
    },
    onModeChange(callback) {
        ipcRenderer.on('mode:change', (event, mode) => callback(mode));
    }
};

// Consolidated workflowDaddy object - all functions in one place
const workflowDaddy = {
    // App version
    getVersion: async () => ipcRenderer.invoke('get-app-version'),

    // Element access
    element: () => workflowDaddyApp,
    e: () => workflowDaddyApp,

    // App state functions - access properties directly from the app element
    getCurrentView: () => workflowDaddyApp.currentView,
    getLayoutMode: () => workflowDaddyApp.layoutMode,

    // Status and response functions
    setStatus: text => workflowDaddyApp.setStatus(text),
    addNewResponse: response => workflowDaddyApp.addNewResponse(response),
    updateCurrentResponse: response => workflowDaddyApp.updateCurrentResponse(response),

    // Core functionality
    initializeGemini,
    startCapture,
    stopCapture,
    sendTextMessage,
    handleShortcut,

    // Storage API
    storage,

    // Capture API
    capture: captureApi,

    // Interview API
    interview: interviewApi,

    // Profiles API
    profiles: profilesApi,

    // Context API
    context: contextApi,

    // Confusion Detection API
    confusion: confusionApi,

    // Session Management API
    session: sessionApi,

    // Documentation Generation API
    documentation: documentationApi,

    // Theme API
    theme,

    // Window Mode API
    windowMode: windowModeApi,

    // Refresh preferences cache (call after updating preferences)
    refreshPreferencesCache: loadPreferencesCache,

    // Platform detection
    isLinux: isLinux,
    isMacOS: isMacOS,

    // Open external path
    openDataFolder: async () => ipcRenderer.invoke('open-data-folder'),
};

// Make it globally available
window.workflowDaddy = workflowDaddy;

// Load theme after DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => theme.load());
} else {
    theme.load();
}
