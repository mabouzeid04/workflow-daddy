if (require('electron-squirrel-startup')) {
    process.exit(0);
}

const { app, BrowserWindow, shell, ipcMain, Notification } = require('electron');
const { createWindow, updateGlobalShortcuts, switchWindowMode } = require('./utils/window');
const { setupGeminiIpcHandlers, sendToRenderer } = require('./utils/gemini');
const { createTray, updateTrayMenu, destroyTray } = require('./utils/tray');
const storage = require('./storage');
const capture = require('./utils/capture');
const interview = require('./utils/interview');
const context = require('./utils/context');
const confusion = require('./utils/confusion');
const taskDetection = require('./utils/taskDetection');
const session = require('./utils/session');
const documentation = require('./utils/documentation');

const geminiSessionRef = { current: null };
let mainWindow = null;

function createMainWindow() {
    mainWindow = createWindow(sendToRenderer, geminiSessionRef);
    return mainWindow;
}

app.whenReady().then(async () => {
    // Initialize storage (checks version, resets if needed)
    storage.initializeStorage();

    createMainWindow();
    createTray(mainWindow);
    setupGeminiIpcHandlers(geminiSessionRef);
    setupStorageIpcHandlers();
    setupCaptureIpcHandlers();
    setupInterviewIpcHandlers();
    setupContextIpcHandlers();
    setupConfusionIpcHandlers();
    setupTaskDetectionIpcHandlers();
    setupSessionIpcHandlers();
    setupDocumentationIpcHandlers();
    setupGeneralIpcHandlers();
    setupTraySessionEvents();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    // Stop capture service if running
    capture.stopCapture();

    // Destroy tray
    destroyTray();

    // Pause active session on quit
    try {
        const currentSession = session.getCurrentSession();
        if (currentSession && currentSession.status === 'active') {
            session.pauseSession('app_closed');
        }
    } catch (error) {
        console.error('Error pausing session on quit:', error);
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
    }
});

function setupStorageIpcHandlers() {
    // ============ CONFIG ============
    ipcMain.handle('storage:get-config', async () => {
        try {
            return { success: true, data: storage.getConfig() };
        } catch (error) {
            console.error('Error getting config:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:set-config', async (event, config) => {
        try {
            storage.setConfig(config);
            return { success: true };
        } catch (error) {
            console.error('Error setting config:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:update-config', async (event, key, value) => {
        try {
            storage.updateConfig(key, value);
            return { success: true };
        } catch (error) {
            console.error('Error updating config:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ CREDENTIALS ============
    ipcMain.handle('storage:get-credentials', async () => {
        try {
            return { success: true, data: storage.getCredentials() };
        } catch (error) {
            console.error('Error getting credentials:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:set-credentials', async (event, credentials) => {
        try {
            storage.setCredentials(credentials);
            return { success: true };
        } catch (error) {
            console.error('Error setting credentials:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:get-api-key', async () => {
        try {
            return { success: true, data: storage.getApiKey() };
        } catch (error) {
            console.error('Error getting API key:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:set-api-key', async (event, apiKey) => {
        try {
            storage.setApiKey(apiKey);
            return { success: true };
        } catch (error) {
            console.error('Error setting API key:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ PREFERENCES ============
    ipcMain.handle('storage:get-preferences', async () => {
        try {
            return { success: true, data: storage.getPreferences() };
        } catch (error) {
            console.error('Error getting preferences:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:set-preferences', async (event, preferences) => {
        try {
            storage.setPreferences(preferences);
            return { success: true };
        } catch (error) {
            console.error('Error setting preferences:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:update-preference', async (event, key, value) => {
        try {
            storage.updatePreference(key, value);
            return { success: true };
        } catch (error) {
            console.error('Error updating preference:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ KEYBINDS ============
    ipcMain.handle('storage:get-keybinds', async () => {
        try {
            return { success: true, data: storage.getKeybinds() };
        } catch (error) {
            console.error('Error getting keybinds:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:set-keybinds', async (event, keybinds) => {
        try {
            storage.setKeybinds(keybinds);
            return { success: true };
        } catch (error) {
            console.error('Error setting keybinds:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ HISTORY ============
    ipcMain.handle('storage:get-all-sessions', async () => {
        try {
            return { success: true, data: storage.getAllSessions() };
        } catch (error) {
            console.error('Error getting sessions:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:get-session', async (event, sessionId) => {
        try {
            return { success: true, data: storage.getSession(sessionId) };
        } catch (error) {
            console.error('Error getting session:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:save-session', async (event, sessionId, data) => {
        try {
            storage.saveSession(sessionId, data);
            return { success: true };
        } catch (error) {
            console.error('Error saving session:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:delete-session', async (event, sessionId) => {
        try {
            storage.deleteSession(sessionId);
            return { success: true };
        } catch (error) {
            console.error('Error deleting session:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:delete-all-sessions', async () => {
        try {
            storage.deleteAllSessions();
            return { success: true };
        } catch (error) {
            console.error('Error deleting all sessions:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ CLEAR ALL ============
    ipcMain.handle('storage:clear-all', async () => {
        try {
            storage.clearAllData();
            return { success: true };
        } catch (error) {
            console.error('Error clearing all data:', error);
            return { success: false, error: error.message };
        }
    });
}

function setupCaptureIpcHandlers() {
    // ============ CAPTURE CONFIG ============
    ipcMain.handle('capture:get-config', async () => {
        try {
            return { success: true, data: storage.getCaptureConfig() };
        } catch (error) {
            console.error('Error getting capture config:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('capture:set-config', async (event, config) => {
        try {
            storage.setCaptureConfig(config);
            capture.updateCaptureConfig(config);
            return { success: true };
        } catch (error) {
            console.error('Error setting capture config:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('capture:update-config', async (event, key, value) => {
        try {
            storage.updateCaptureConfig(key, value);
            capture.updateCaptureConfig({ [key]: value });
            return { success: true };
        } catch (error) {
            console.error('Error updating capture config:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ CAPTURE SERVICE ============
    ipcMain.handle('capture:start', async (event, sessionId, config) => {
        try {
            const captureConfig = config || storage.getCaptureConfig();
            capture.startCapture(sessionId, captureConfig);
            return { success: true };
        } catch (error) {
            console.error('Error starting capture:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('capture:stop', async () => {
        try {
            capture.stopCapture();
            return { success: true };
        } catch (error) {
            console.error('Error stopping capture:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('capture:get-state', async () => {
        try {
            return { success: true, data: capture.getCaptureState() };
        } catch (error) {
            console.error('Error getting capture state:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ ACTIVE WINDOW ============
    ipcMain.handle('capture:get-active-window', async () => {
        try {
            const windowInfo = await capture.getActiveWindow();
            return { success: true, data: windowInfo };
        } catch (error) {
            console.error('Error getting active window:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ SCREENSHOT METADATA ============
    ipcMain.handle('capture:save-screenshot-metadata', async (event, sessionId, metadata) => {
        try {
            storage.saveScreenshotMetadata(sessionId, metadata);
            return { success: true };
        } catch (error) {
            console.error('Error saving screenshot metadata:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('capture:get-session-screenshots', async (event, sessionId) => {
        try {
            return { success: true, data: storage.getSessionScreenshots(sessionId) };
        } catch (error) {
            console.error('Error getting session screenshots:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ APP USAGE ============
    ipcMain.handle('capture:save-app-usage', async (event, sessionId, record) => {
        try {
            storage.saveAppUsageRecord(sessionId, record);
            return { success: true };
        } catch (error) {
            console.error('Error saving app usage:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('capture:get-app-usage', async (event, sessionId) => {
        try {
            return { success: true, data: storage.getAppUsageRecords(sessionId) };
        } catch (error) {
            console.error('Error getting app usage:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ CAPTURE EVENTS ============
    // Forward capture events to renderer
    capture.captureEvents.on('screenshot:captured', (metadata) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('capture:screenshot-captured', metadata);
        }
    });

    capture.captureEvents.on('app:switched', (data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('capture:app-switched', data);
            // Also save the completed app usage record
            if (data.previous && data.previous.endTime) {
                const state = capture.getCaptureState();
                if (state.sessionId) {
                    storage.saveAppUsageRecord(state.sessionId, data.previous);
                }
            }
        }
    });

    capture.captureEvents.on('capture:started', (data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('capture:started', data);
        }
    });

    capture.captureEvents.on('capture:stopped', (data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('capture:stopped', data);
        }
    });
}

function setupInterviewIpcHandlers() {
    // ============ INTERVIEW SESSION ============
    ipcMain.handle('interview:start', async (event, profileId) => {
        try {
            const result = await interview.startInterview(profileId);
            // Save session to storage
            storage.saveInterviewSession(profileId, result.session);
            return { success: true, data: result };
        } catch (error) {
            console.error('Error starting interview:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('interview:send-message', async (event, userMessage) => {
        try {
            const result = await interview.sendMessage(userMessage);
            // Save updated session
            const session = interview.getCurrentSession();
            if (session) {
                storage.saveInterviewSession(session.profileId, session);
            }
            return { success: true, data: result };
        } catch (error) {
            console.error('Error sending interview message:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('interview:skip-question', async () => {
        try {
            const aiMessage = await interview.skipQuestion();
            // Save updated session
            const session = interview.getCurrentSession();
            if (session) {
                storage.saveInterviewSession(session.profileId, session);
            }
            return { success: true, data: aiMessage };
        } catch (error) {
            console.error('Error skipping question:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('interview:complete', async () => {
        try {
            const result = await interview.completeInterview();
            // Save both session and summary
            storage.saveInterviewSession(result.session.profileId, result.session);
            storage.saveInterviewSummary(result.session.profileId, result.summary);
            return { success: true, data: result };
        } catch (error) {
            console.error('Error completing interview:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('interview:get-current-session', async () => {
        try {
            const session = interview.getCurrentSession();
            return { success: true, data: session };
        } catch (error) {
            console.error('Error getting current interview session:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('interview:resume', async (event, profileId) => {
        try {
            const session = storage.getInterviewSession(profileId);
            if (!session) {
                return { success: false, error: 'No interview session found' };
            }
            interview.resumeInterview(session);
            return { success: true, data: session };
        } catch (error) {
            console.error('Error resuming interview:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('interview:clear', async () => {
        try {
            interview.clearSession();
            return { success: true };
        } catch (error) {
            console.error('Error clearing interview session:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ INTERVIEW STORAGE ============
    ipcMain.handle('interview:get-session', async (event, profileId) => {
        try {
            return { success: true, data: storage.getInterviewSession(profileId) };
        } catch (error) {
            console.error('Error getting interview session:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('interview:get-summary', async (event, profileId) => {
        try {
            return { success: true, data: storage.getInterviewSummary(profileId) };
        } catch (error) {
            console.error('Error getting interview summary:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('interview:has-completed', async (event, profileId) => {
        try {
            return { success: true, data: storage.hasCompletedInterview(profileId) };
        } catch (error) {
            console.error('Error checking interview completion:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ PROFILES ============
    ipcMain.handle('profiles:get-all', async () => {
        try {
            return { success: true, data: storage.getAllProfiles() };
        } catch (error) {
            console.error('Error getting profiles:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('profiles:delete', async (event, profileId) => {
        try {
            storage.deleteProfile(profileId);
            return { success: true };
        } catch (error) {
            console.error('Error deleting profile:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ INTERVIEW EVENTS ============
    // Forward interview events to renderer
    interview.interviewEvents.on('interview:started', (data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('interview:started', data);
        }
    });

    interview.interviewEvents.on('interview:message', (message) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('interview:message', message);
        }
    });

    interview.interviewEvents.on('interview:completed', (data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('interview:completed', data);
        }
    });

    interview.interviewEvents.on('interview:ready-for-observation', (data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('interview:ready-for-observation', data);
        }
    });
}

function setupContextIpcHandlers() {
    // ============ SESSION LIFECYCLE ============
    ipcMain.handle('context:start-session', async (event, sessionId, profileId) => {
        try {
            const result = context.startSession(sessionId, profileId);
            return { success: true, data: result };
        } catch (error) {
            console.error('Error starting context session:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('context:end-session', async () => {
        try {
            const summary = await context.endSession();
            return { success: true, data: summary };
        } catch (error) {
            console.error('Error ending context session:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('context:clear', async () => {
        try {
            context.clearContext();
            return { success: true };
        } catch (error) {
            console.error('Error clearing context:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ IMMEDIATE CONTEXT ============
    ipcMain.handle('context:update-immediate', async (event, screenshot) => {
        try {
            const result = context.updateImmediateContext(screenshot);
            return { success: true, data: result };
        } catch (error) {
            console.error('Error updating immediate context:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('context:get-immediate', async () => {
        try {
            return { success: true, data: context.getImmediateContext() };
        } catch (error) {
            console.error('Error getting immediate context:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ SESSION CONTEXT ============
    ipcMain.handle('context:update-session', async (event, observationEvent) => {
        try {
            const result = context.updateSessionContext(observationEvent);
            return { success: true, data: result };
        } catch (error) {
            console.error('Error updating session context:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('context:get-session', async () => {
        try {
            return { success: true, data: context.getSessionContextState() };
        } catch (error) {
            console.error('Error getting session context:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('context:add-question', async (event, question) => {
        try {
            context.addQuestionAsked(question);
            return { success: true };
        } catch (error) {
            console.error('Error adding question:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('context:was-question-asked', async (event, question) => {
        try {
            return { success: true, data: context.wasQuestionAsked(question) };
        } catch (error) {
            console.error('Error checking question:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('context:update-task-theory', async (event, theory) => {
        try {
            context.updateTaskTheory(theory);
            return { success: true };
        } catch (error) {
            console.error('Error updating task theory:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ SESSION SUMMARIZATION ============
    ipcMain.handle('context:should-update-summary', async () => {
        try {
            return { success: true, data: context.shouldUpdateSummary() };
        } catch (error) {
            console.error('Error checking summary update:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('context:generate-summary', async () => {
        try {
            const summary = await context.generateSessionSummary();
            return { success: true, data: summary };
        } catch (error) {
            console.error('Error generating summary:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ HISTORICAL CONTEXT ============
    ipcMain.handle('context:load-historical', async (event, profileId) => {
        try {
            const result = context.loadHistoricalContext(profileId);
            return { success: true, data: result };
        } catch (error) {
            console.error('Error loading historical context:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('context:get-historical', async () => {
        try {
            return { success: true, data: context.getHistoricalContextState() };
        } catch (error) {
            console.error('Error getting historical context:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('context:get-relevant-history', async (event, currentActivity) => {
        try {
            return { success: true, data: context.getRelevantHistory(currentActivity) };
        } catch (error) {
            console.error('Error getting relevant history:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ CONTEXT ASSEMBLY ============
    ipcMain.handle('context:assemble', async () => {
        try {
            return { success: true, data: context.assembleContext() };
        } catch (error) {
            console.error('Error assembling context:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('context:get-for-llm', async () => {
        try {
            return { success: true, data: context.getContextForLLM() };
        } catch (error) {
            console.error('Error getting context for LLM:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ SESSION SUMMARIES STORAGE ============
    ipcMain.handle('context:get-session-summaries', async (event, profileId, limit) => {
        try {
            return { success: true, data: storage.getSessionSummaries(profileId, limit) };
        } catch (error) {
            console.error('Error getting session summaries:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ CONTEXT EVENTS ============
    // Forward context events to renderer
    context.contextEvents.on('context:immediate-updated', (data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('context:immediate-updated', data);
        }
    });

    context.contextEvents.on('context:session-updated', (data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('context:session-updated', data);
        }
    });

    context.contextEvents.on('context:summary-generated', (data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('context:summary-generated', data);
        }
    });

    // ============ WIRE UP CAPTURE EVENTS TO CONTEXT ============
    // When a screenshot is captured, update immediate context
    capture.captureEvents.on('screenshot:captured', (metadata) => {
        try {
            context.updateImmediateContext(metadata);

            // Also update session context with app time
            const sessionCtx = context.getSessionContextState();
            if (sessionCtx) {
                const captureState = capture.getCaptureState();
                context.updateSessionContext({
                    type: 'screenshot',
                    app: metadata.activeApplication,
                    interval: captureState.config.screenshotInterval / 1000
                });
            }
        } catch (error) {
            console.error('Error updating context from screenshot:', error);
        }
    });

    // When app switches, update session context
    capture.captureEvents.on('app:switched', (data) => {
        try {
            const sessionCtx = context.getSessionContextState();
            if (sessionCtx) {
                context.updateSessionContext({
                    type: 'app_switch',
                    app: data.current.app,
                    previousApp: data.previous.app,
                    duration: data.previous.duration
                });
            }
        } catch (error) {
            console.error('Error updating context from app switch:', error);
        }
    });
}

function setupConfusionIpcHandlers() {
    // ============ CONFUSION DETECTION LIFECYCLE ============
    ipcMain.handle('confusion:init', async (event, sessionId, config) => {
        try {
            const result = confusion.initConfusionDetection(sessionId, config);
            return { success: true, data: result };
        } catch (error) {
            console.error('Error initializing confusion detection:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('confusion:clear', async () => {
        try {
            confusion.clearConfusionState();
            return { success: true };
        } catch (error) {
            console.error('Error clearing confusion state:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ CONFUSION ANALYSIS ============
    ipcMain.handle('confusion:analyze', async (event, screenshotImages) => {
        try {
            const signal = await confusion.analyzeForConfusion(screenshotImages);
            return { success: true, data: signal };
        } catch (error) {
            console.error('Error analyzing for confusion:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('confusion:run-check', async (event, screenshotImages) => {
        try {
            const question = await confusion.runConfusionCheck(screenshotImages);
            return { success: true, data: question };
        } catch (error) {
            console.error('Error running confusion check:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ RATE LIMITING ============
    ipcMain.handle('confusion:can-ask', async (event, sessionId) => {
        try {
            return { success: true, data: confusion.canAskQuestion(sessionId) };
        } catch (error) {
            console.error('Error checking if can ask:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('confusion:get-question-count', async (event, sessionId, windowMinutes) => {
        try {
            return { success: true, data: confusion.getQuestionCount(sessionId, windowMinutes) };
        } catch (error) {
            console.error('Error getting question count:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ QUESTION MANAGEMENT ============
    ipcMain.handle('confusion:answer-question', async (event, questionId, answer) => {
        try {
            const question = confusion.answerQuestion(questionId, answer);
            return { success: true, data: question };
        } catch (error) {
            console.error('Error answering question:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('confusion:dismiss-question', async (event, questionId) => {
        try {
            const question = confusion.dismissQuestion(questionId);
            return { success: true, data: question };
        } catch (error) {
            console.error('Error dismissing question:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('confusion:defer-question', async (event, questionId) => {
        try {
            const question = confusion.deferQuestion(questionId);
            return { success: true, data: question };
        } catch (error) {
            console.error('Error deferring question:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('confusion:get-current-question', async () => {
        try {
            return { success: true, data: confusion.getCurrentQuestion() };
        } catch (error) {
            console.error('Error getting current question:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('confusion:get-pending-questions', async () => {
        try {
            return { success: true, data: confusion.getPendingQuestions() };
        } catch (error) {
            console.error('Error getting pending questions:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('confusion:get-deferred-questions', async () => {
        try {
            return { success: true, data: confusion.getDeferredQuestions() };
        } catch (error) {
            console.error('Error getting deferred questions:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('confusion:get-session-questions', async () => {
        try {
            return { success: true, data: confusion.getSessionQuestionsState() };
        } catch (error) {
            console.error('Error getting session questions:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('confusion:get-qa-for-docs', async () => {
        try {
            return { success: true, data: confusion.getQARecordsForDocumentation() };
        } catch (error) {
            console.error('Error getting Q&A for documentation:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ CONFUSION EVENTS ============
    // Forward confusion events to renderer
    confusion.confusionEvents.on('question:created', (question) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('confusion:question-created', question);

            // Show native notification if window is hidden (minimized to tray)
            if (!mainWindow.isVisible()) {
                const notification = new Notification({
                    title: 'Quick question',
                    body: question.question,
                    silent: false,
                });

                notification.on('click', () => {
                    mainWindow.show();
                    mainWindow.focus();
                });

                notification.show();
            }
        }
    });

    confusion.confusionEvents.on('question:answered', (question) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('confusion:question-answered', question);
        }
    });

    confusion.confusionEvents.on('question:dismissed', (question) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('confusion:question-dismissed', question);
        }
    });

    confusion.confusionEvents.on('question:deferred', (question) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('confusion:question-deferred', question);
        }
    });

    // ============ WIRE UP CAPTURE EVENTS TO CONFUSION DETECTION ============
    // When a screenshot is captured, optionally run confusion check
    // This is controlled by the observation mode state
    capture.captureEvents.on('screenshot:captured', async (metadata) => {
        try {
            // Only run confusion check if we have an active session
            const sessionCtx = context.getSessionContextState();
            if (sessionCtx) {
                // Run confusion check (it will handle rate limiting internally)
                // Note: Image data would need to be passed separately if needed
                const question = await confusion.runConfusionCheck([]);
                // Question creation is handled via event emission
            }
        } catch (error) {
            console.error('Error running confusion check from screenshot:', error);
        }
    });
}

function setupTaskDetectionIpcHandlers() {
    // ============ TASK DETECTION LIFECYCLE ============
    ipcMain.handle('taskdetection:init', async (event, sessionId, config) => {
        try {
            taskDetection.initTaskDetection(sessionId, config);
            return { success: true };
        } catch (error) {
            console.error('Error initializing task detection:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('taskdetection:end-session', async () => {
        try {
            const tasks = taskDetection.endSession();
            // Save tasks to storage
            const currentTask = taskDetection.getCurrentTask();
            if (currentTask) {
                storage.saveSessionTasks(currentTask.sessionId, tasks);
            }
            return { success: true, data: tasks };
        } catch (error) {
            console.error('Error ending task detection session:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ TASK PROCESSING ============
    ipcMain.handle('taskdetection:process-screenshot', async (event, screenshot) => {
        try {
            const assembledContext = context.assembleContext();
            const boundaryEvent = await taskDetection.processScreenshot(screenshot, assembledContext);
            return { success: true, data: boundaryEvent };
        } catch (error) {
            console.error('Error processing screenshot for task detection:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('taskdetection:handle-app-switch', async (event, appSwitchEvent) => {
        try {
            const assembledContext = context.assembleContext();
            const boundaryEvent = taskDetection.handleAppSwitch(appSwitchEvent, assembledContext);
            return { success: true, data: boundaryEvent };
        } catch (error) {
            console.error('Error handling app switch for task detection:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('taskdetection:user-task-indication', async (event, taskDescription) => {
        try {
            const task = taskDetection.handleUserTaskIndication(taskDescription);
            return { success: true, data: task };
        } catch (error) {
            console.error('Error handling user task indication:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ TASK GETTERS ============
    ipcMain.handle('taskdetection:get-current-task', async () => {
        try {
            return { success: true, data: taskDetection.getCurrentTask() };
        } catch (error) {
            console.error('Error getting current task:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('taskdetection:get-session-tasks', async () => {
        try {
            return { success: true, data: taskDetection.getSessionTasks() };
        } catch (error) {
            console.error('Error getting session tasks:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('taskdetection:get-tasks-for-docs', async () => {
        try {
            return { success: true, data: taskDetection.getTasksForDocumentation() };
        } catch (error) {
            console.error('Error getting tasks for documentation:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ TASK NAMING ============
    ipcMain.handle('taskdetection:infer-task-name', async (event, task) => {
        try {
            const assembledContext = context.assembleContext();
            const name = await taskDetection.inferTaskName(task, assembledContext);
            return { success: true, data: name };
        } catch (error) {
            console.error('Error inferring task name:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('taskdetection:name-unnamed-tasks', async () => {
        try {
            const assembledContext = context.assembleContext();
            await taskDetection.nameUnnamedTasks(assembledContext);
            return { success: true };
        } catch (error) {
            console.error('Error naming unnamed tasks:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ TASK MERGING ============
    ipcMain.handle('taskdetection:should-merge-tasks', async (event, task1, task2) => {
        try {
            return { success: true, data: taskDetection.shouldMergeTasks(task1, task2) };
        } catch (error) {
            console.error('Error checking if tasks should merge:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('taskdetection:merge-tasks', async (event, task1, task2) => {
        try {
            const merged = taskDetection.mergeTasks(task1, task2);
            return { success: true, data: merged };
        } catch (error) {
            console.error('Error merging tasks:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ CONFIGURATION ============
    ipcMain.handle('taskdetection:get-config', async () => {
        try {
            return { success: true, data: taskDetection.getConfig() };
        } catch (error) {
            console.error('Error getting task detection config:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('taskdetection:update-config', async (event, newConfig) => {
        try {
            taskDetection.updateConfig(newConfig);
            return { success: true };
        } catch (error) {
            console.error('Error updating task detection config:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ TASK STORAGE ============
    ipcMain.handle('taskdetection:save-tasks', async (event, sessionId, tasks) => {
        try {
            storage.saveSessionTasks(sessionId, tasks);
            return { success: true };
        } catch (error) {
            console.error('Error saving tasks:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('taskdetection:load-tasks', async (event, sessionId) => {
        try {
            return { success: true, data: storage.getSessionTasks(sessionId) };
        } catch (error) {
            console.error('Error loading tasks:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ TASK DETECTION EVENTS ============
    // Forward task detection events to renderer
    taskDetection.taskDetectionEvents.on('task:started', (task) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('taskdetection:task-started', task);
        }
        // Save task to storage
        if (task.sessionId) {
            storage.addSessionTask(task.sessionId, task);
        }
    });

    taskDetection.taskDetectionEvents.on('task:ended', (task) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('taskdetection:task-ended', task);
        }
        // Update task in storage
        if (task.sessionId) {
            storage.updateSessionTask(task.sessionId, task.id, task);
        }
    });

    taskDetection.taskDetectionEvents.on('task:switched', (data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('taskdetection:task-switched', data);
        }
    });

    taskDetection.taskDetectionEvents.on('task:interrupted', (task) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('taskdetection:task-interrupted', task);
        }
        // Update task in storage
        if (task.sessionId) {
            storage.updateSessionTask(task.sessionId, task.id, task);
        }
    });

    taskDetection.taskDetectionEvents.on('task:resumed', (task) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('taskdetection:task-resumed', task);
        }
    });

    taskDetection.taskDetectionEvents.on('task:merged', (data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('taskdetection:task-merged', data);
        }
    });

    taskDetection.taskDetectionEvents.on('task:named', (task) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('taskdetection:task-named', task);
        }
        // Update task in storage
        if (task.sessionId) {
            storage.updateSessionTask(task.sessionId, task.id, task);
        }
    });

    taskDetection.taskDetectionEvents.on('task:boundary', (boundaryEvent) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('taskdetection:boundary', boundaryEvent);
        }
        // Also update context with task boundary info
        try {
            if (boundaryEvent.type === 'task_switch' || boundaryEvent.type === 'task_end') {
                context.updateSessionContext({
                    type: 'task_boundary',
                    task: boundaryEvent.previousTask,
                    trigger: boundaryEvent.trigger
                });
            }
        } catch (error) {
            console.error('Error updating context from task boundary:', error);
        }
    });

    // ============ WIRE UP CAPTURE EVENTS TO TASK DETECTION ============
    // When a screenshot is captured, process it for task detection
    capture.captureEvents.on('screenshot:captured', async (metadata) => {
        try {
            const assembledContext = context.assembleContext();
            await taskDetection.processScreenshot(metadata, assembledContext);
        } catch (error) {
            console.error('Error processing screenshot for task detection:', error);
        }
    });

    // When app switches, handle it for task detection
    capture.captureEvents.on('app:switched', (data) => {
        try {
            const assembledContext = context.assembleContext();
            taskDetection.handleAppSwitch(data, assembledContext);
        } catch (error) {
            console.error('Error handling app switch for task detection:', error);
        }
    });
}

function setupSessionIpcHandlers() {
    // ============ SESSION INITIALIZATION ============
    ipcMain.handle('session:initialize', async () => {
        try {
            const result = session.initializeOnStartup();
            return { success: true, data: result };
        } catch (error) {
            console.error('Error initializing session:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ PROFILE MANAGEMENT ============
    ipcMain.handle('session:create-profile', async (event, name) => {
        try {
            const profile = session.createProfile(name);
            return { success: true, data: profile };
        } catch (error) {
            console.error('Error creating profile:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('session:load-profile', async (event, profileId) => {
        try {
            const profile = session.loadProfile(profileId);
            return { success: true, data: profile };
        } catch (error) {
            console.error('Error loading profile:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('session:list-profiles', async () => {
        try {
            const profiles = session.listProfiles();
            return { success: true, data: profiles };
        } catch (error) {
            console.error('Error listing profiles:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('session:get-current-profile', async () => {
        try {
            const profile = session.getCurrentProfile();
            return { success: true, data: profile };
        } catch (error) {
            console.error('Error getting current profile:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ SESSION LIFECYCLE ============
    ipcMain.handle('session:start', async (event, profileId) => {
        try {
            const sessionData = session.startSession(profileId);
            return { success: true, data: sessionData };
        } catch (error) {
            console.error('Error starting session:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('session:pause', async (event, reason) => {
        try {
            const sessionData = session.pauseSession(reason);
            return { success: true, data: sessionData };
        } catch (error) {
            console.error('Error pausing session:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('session:resume', async (event, sessionId) => {
        try {
            const sessionData = session.resumeSession(sessionId);
            return { success: true, data: sessionData };
        } catch (error) {
            console.error('Error resuming session:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('session:end', async () => {
        try {
            const sessionData = session.endSession();
            return { success: true, data: sessionData };
        } catch (error) {
            console.error('Error ending session:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('session:get-current', async () => {
        try {
            const sessionData = session.getCurrentSession();
            return { success: true, data: sessionData };
        } catch (error) {
            console.error('Error getting current session:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('session:get-stats', async () => {
        try {
            const stats = session.getSessionStats();
            return { success: true, data: stats };
        } catch (error) {
            console.error('Error getting session stats:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ SESSION RESUME (MULTI-DAY) ============
    ipcMain.handle('session:can-resume', async (event, sessionData) => {
        try {
            const canResume = session.canResumeSession(sessionData);
            return { success: true, data: canResume };
        } catch (error) {
            console.error('Error checking if session can resume:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('session:get-resumable', async (event, profileId) => {
        try {
            const resumable = session.getResumableSession(profileId);
            return { success: true, data: resumable };
        } catch (error) {
            console.error('Error getting resumable session:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ CRASH RECOVERY ============
    ipcMain.handle('session:check-crash', async () => {
        try {
            const crashed = session.checkForCrash();
            return { success: true, data: crashed };
        } catch (error) {
            console.error('Error checking for crash:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('session:recover-crash', async () => {
        try {
            const recovered = session.recoverFromCrash();
            return { success: true, data: recovered };
        } catch (error) {
            console.error('Error recovering from crash:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ ACTIVITY & IDLE ============
    ipcMain.handle('session:record-activity', async () => {
        try {
            session.recordActivity();
            return { success: true };
        } catch (error) {
            console.error('Error recording activity:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('session:detect-idle', async () => {
        try {
            const isIdle = session.detectIdle();
            return { success: true, data: isIdle };
        } catch (error) {
            console.error('Error detecting idle:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ SESSION STATS ============
    ipcMain.handle('session:update-screenshot-count', async (event, count) => {
        try {
            session.updateScreenshotCount(count);
            return { success: true };
        } catch (error) {
            console.error('Error updating screenshot count:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('session:increment-screenshot-count', async () => {
        try {
            session.incrementScreenshotCount();
            return { success: true };
        } catch (error) {
            console.error('Error incrementing screenshot count:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('session:update-task-count', async (event, count) => {
        try {
            session.updateTaskCount(count);
            return { success: true };
        } catch (error) {
            console.error('Error updating task count:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('session:update-question-count', async (event, count) => {
        try {
            session.updateQuestionCount(count);
            return { success: true };
        } catch (error) {
            console.error('Error updating question count:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ CONFIGURATION ============
    ipcMain.handle('session:get-config', async () => {
        try {
            const config = session.getConfig();
            return { success: true, data: config };
        } catch (error) {
            console.error('Error getting session config:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('session:update-config', async (event, updates) => {
        try {
            session.updateConfig(updates);
            return { success: true };
        } catch (error) {
            console.error('Error updating session config:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ APP STATE ============
    ipcMain.handle('session:get-app-state', async () => {
        try {
            const appState = session.getAppState();
            return { success: true, data: appState };
        } catch (error) {
            console.error('Error getting app state:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ CLEAR STATE ============
    ipcMain.handle('session:clear', async () => {
        try {
            session.clearSessionState();
            return { success: true };
        } catch (error) {
            console.error('Error clearing session state:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ SESSION EVENTS ============
    // Forward session events to renderer
    session.sessionEvents.on('session:started', (data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('session:started', data);
        }
    });

    session.sessionEvents.on('session:paused', (data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('session:paused', data);
        }
    });

    session.sessionEvents.on('session:resumed', (data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('session:resumed', data);
        }
    });

    session.sessionEvents.on('session:ended', (data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('session:ended', data);
        }
    });

    session.sessionEvents.on('session:idle-paused', (data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('session:idle-paused', data);
        }
    });

    session.sessionEvents.on('session:auto-resumed', (data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('session:auto-resumed', data);
        }
    });

    session.sessionEvents.on('session:crash-recovered', (data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('session:crash-recovered', data);
        }
    });

    session.sessionEvents.on('profile:created', (data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('session:profile-created', data);
        }
    });

    session.sessionEvents.on('profile:loaded', (data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('session:profile-loaded', data);
        }
    });

    // ============ WIRE UP CAPTURE EVENTS TO SESSION ============
    // When a screenshot is captured, record activity and update count
    capture.captureEvents.on('screenshot:captured', () => {
        try {
            session.recordActivity();
            session.incrementScreenshotCount();
        } catch (error) {
            console.error('Error updating session from screenshot:', error);
        }
    });
}

function setupDocumentationIpcHandlers() {
    // ============ DOCUMENTATION GENERATION ============
    ipcMain.handle('documentation:export', async (event, profileId, outputPath) => {
        try {
            const result = await documentation.exportDocumentation(profileId, outputPath);
            return result;
        } catch (error) {
            console.error('Error exporting documentation:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('documentation:generate', async (event, profileId) => {
        try {
            const result = await documentation.generateDocumentationForProfile(profileId);
            return result;
        } catch (error) {
            console.error('Error generating documentation:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('documentation:preview', async (event, profileId) => {
        try {
            const result = await documentation.getDocumentationPreview(profileId);
            return result;
        } catch (error) {
            console.error('Error getting documentation preview:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('documentation:aggregate', async (event, profileId) => {
        try {
            const inputs = documentation.aggregateSessions(profileId);
            return { success: true, data: inputs };
        } catch (error) {
            console.error('Error aggregating sessions:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('documentation:infer-steps', async (event, task, screenshots) => {
        try {
            const steps = await documentation.inferWorkflowSteps(task, screenshots);
            return { success: true, data: steps };
        } catch (error) {
            console.error('Error inferring workflow steps:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ DOCUMENTATION EVENTS ============
    // Forward documentation events to renderer
    documentation.documentationEvents.on('documentation:generating', (data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('documentation:generating', data);
        }
    });

    documentation.documentationEvents.on('documentation:complete', (data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('documentation:complete', data);
        }
    });

    documentation.documentationEvents.on('documentation:exported', (data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('documentation:exported', data);
        }
    });
}

function setupTraySessionEvents() {
    // Update tray menu when session state changes
    session.sessionEvents.on('session:started', (data) => {
        updateTrayMenu({
            sessionActive: true,
            isPaused: false,
            profileId: data.profileId || null,
        });
        // Switch to observation mode when session starts
        if (mainWindow && !mainWindow.isDestroyed()) {
            switchWindowMode(mainWindow, 'observation');
        }
    });

    session.sessionEvents.on('session:paused', () => {
        updateTrayMenu({ sessionActive: true, isPaused: true });
    });

    session.sessionEvents.on('session:resumed', () => {
        updateTrayMenu({ sessionActive: true, isPaused: false });
    });

    session.sessionEvents.on('session:ended', () => {
        updateTrayMenu({ sessionActive: false, isPaused: false });
        // Switch back to hub mode when session ends
        if (mainWindow && !mainWindow.isDestroyed()) {
            switchWindowMode(mainWindow, 'hub');
        }
    });

    session.sessionEvents.on('session:idle-paused', () => {
        updateTrayMenu({ sessionActive: true, isPaused: true });
    });

    session.sessionEvents.on('session:auto-resumed', () => {
        updateTrayMenu({ sessionActive: true, isPaused: false });
    });

    // Switch to question mode when confusion question is created
    confusion.confusionEvents.on('question:created', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            switchWindowMode(mainWindow, 'question');
        }
    });

    // Switch back to observation mode when question is resolved
    const switchBackToObservation = () => {
        const currentSession = session.getCurrentSession();
        if (currentSession && currentSession.status === 'active' && mainWindow && !mainWindow.isDestroyed()) {
            switchWindowMode(mainWindow, 'observation');
        }
    };

    confusion.confusionEvents.on('question:answered', switchBackToObservation);
    confusion.confusionEvents.on('question:dismissed', switchBackToObservation);
    confusion.confusionEvents.on('question:deferred', switchBackToObservation);
}

function setupGeneralIpcHandlers() {
    ipcMain.handle('get-app-version', async () => {
        return app.getVersion();
    });

    ipcMain.handle('quit-application', async event => {
        try {
            app.quit();
            return { success: true };
        } catch (error) {
            console.error('Error quitting application:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('open-external', async (event, url) => {
        try {
            await shell.openExternal(url);
            return { success: true };
        } catch (error) {
            console.error('Error opening external URL:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('open-data-folder', async () => {
        try {
            const os = require('node:os');
            const path = require('node:path');
            const dataDir = path.join(os.homedir(), '.workflow-shadow');
            await shell.openPath(dataDir);
            return { success: true };
        } catch (error) {
            console.error('Error opening data folder:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.on('update-keybinds', (event, newKeybinds) => {
        if (mainWindow) {
            // Also save to storage
            storage.setKeybinds(newKeybinds);
            updateGlobalShortcuts(newKeybinds, mainWindow, sendToRenderer, geminiSessionRef);
        }
    });

    // Debug logging from renderer
    ipcMain.on('log-message', (event, msg) => {
        console.log(msg);
    });

    // Minimize window to tray
    ipcMain.on('minimize-to-tray', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.hide();
        }
    });
}
